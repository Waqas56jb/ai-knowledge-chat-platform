/**
 * Thin wrapper around the OpenAI SDK so the rest of the code (and tests) never touch the SDK directly.
 * The SDK retries transient errors (429/5xx/timeouts) with exponential backoff (OPENAI_MAX_RETRIES).
 */
import { openai, AI } from '../config/openai.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const isTransient = e => !e?.status || e.status === 429 || e.status >= 500;

function wrap(e, what) {
  logger.warn({ status: e?.status, code: e?.code, type: e?.type }, `OpenAI ${what} failed`);
  const err = new ApiError(503, 'AI_UNAVAILABLE', e?.status === 429 ? 'The AI service is busy. Please try again in a moment.' : 'The AI service could not complete the request. Please try again.');
  err.transient = isTransient(e);
  return err;
}

/** JSON-mode chat completion. Returns { content, usage, model }. */
export async function chatJson(messages, { maxTokens = AI.maxOutputTokens, temperature = 0.1 } = {}) {
  try {
    const r = await openai.chat.completions.create({ model: AI.chatModel, messages, temperature, max_tokens: maxTokens, response_format: { type: 'json_object' } });
    return { content: r.choices?.[0]?.message?.content || '', finishReason: r.choices?.[0]?.finish_reason, usage: r.usage || {}, model: r.model };
  } catch (e) { throw wrap(e, 'chat'); }
}

/** Streaming JSON-mode chat completion: calls onDelta(text) per content chunk, then returns the same shape as chatJson. */
export async function chatJsonStream(messages, onDelta, { maxTokens = AI.maxOutputTokens, temperature = 0.1 } = {}) {
  let content = '', finishReason, usage = {}, model;
  try {
    const stream = await openai.chat.completions.create({ model: AI.chatModel, messages, temperature, max_tokens: maxTokens, response_format: { type: 'json_object' }, stream: true, stream_options: { include_usage: true } });
    for await (const chunk of stream) {
      model = chunk.model || model;
      if (chunk.usage) usage = chunk.usage;
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;
      const d = choice.delta?.content;
      if (d) { content += d; onDelta(d); }
    }
  } catch (e) { throw wrap(e, 'chat'); }
  return { content, finishReason, usage, model };
}

/**
 * Embed texts in batches (bounded, sequential). Returns { vectors, tokens }.
 * Dimensions are verified against the configured value so a model change cannot corrupt the index.
 */
export async function embed(texts, { batchSize = AI.embeddingBatchSize, onProgress } = {}) {
  const vectors = []; let tokens = 0;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map(t => String(t).slice(0, 24000));
    let r;
    try { r = await openai.embeddings.create({ model: AI.embeddingModel, input: batch }); } catch (e) { throw wrap(e, 'embedding'); }
    for (const d of r.data.sort((a, b) => a.index - b.index)) {
      if (d.embedding.length !== AI.embeddingDimensions) {
        const err = new ApiError(500, 'EMBEDDING_DIMENSION_MISMATCH', `Embedding model returned ${d.embedding.length} dimensions; the index expects ${AI.embeddingDimensions}.`);
        err.transient = false; throw err;
      }
      vectors.push(d.embedding);
    }
    tokens += r.usage?.total_tokens || 0;
    if (onProgress) await onProgress(Math.min(texts.length, i + batchSize), texts.length);
  }
  return { vectors, tokens };
}
