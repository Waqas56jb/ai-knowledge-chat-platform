/** OpenAI client (server-side only). Models and limits come from env, never hardcoded elsewhere. */
import OpenAI from 'openai';
import { env } from './env.js';

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: env.OPENAI_TIMEOUT_MS, maxRetries: env.OPENAI_MAX_RETRIES });

export const AI = Object.freeze({
  chatModel: env.OPENAI_CHAT_MODEL,
  embeddingModel: env.OPENAI_EMBEDDING_MODEL,
  embeddingDimensions: env.OPENAI_EMBEDDING_DIMENSIONS,
  maxOutputTokens: env.OPENAI_MAX_OUTPUT_TOKENS,
  maxContextChunks: env.MAX_CONTEXT_CHUNKS,
  maxHistoryMessages: env.MAX_HISTORY_MESSAGES,
  embeddingBatchSize: 64,
  maxChunkContextChars: 1600
});
