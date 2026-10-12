import { api, ApiError } from './api';

/** Idempotency key for POST /chat; reused when a failed question is retried. */
export const newClientMessageId = () => {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export const chatService = {
  /** POST /chat → { conversationId, conversation, userMessage, message, answer, citations, outcome } */
  send({ message, conversationId, clientMessageId, scope }) {
    const body = { message, clientMessageId };
    if (conversationId) body.conversationId = conversationId;
    if (scope && scope !== 'all') body.scope = scope;
    return api.post('/chat', body);
  },
  /**
   * POST /chat/stream. handlers: { onStatus(stage), onText(text), onCitation(citation) }.
   * Resolves with the same result as send(); a server error event throws ApiError.
   */
  async stream({ message, conversationId, clientMessageId, scope }, handlers = {}) {
    const body = { message, clientMessageId };
    if (conversationId) body.conversationId = conversationId;
    if (scope && scope !== 'all') body.scope = scope;
    let result = null;
    await api.stream('/chat/stream', body, (event, data) => {
      if (event === 'status') handlers.onStatus && handlers.onStatus(data.stage);
      else if (event === 'delta') handlers.onText && handlers.onText(data.text);
      else if (event === 'citation') handlers.onCitation && handlers.onCitation(data.citation);
      else if (event === 'done') result = data;
      else if (event === 'error') {
        const e = data.error || {};
        throw new ApiError(e.message || 'The answer could not be generated.', { code: e.code || 'UNKNOWN', status: e.status || 500, details: e.details || null, requestId: e.requestId || null });
      }
    });
    if (!result) throw new ApiError('The connection was interrupted. Please try again.', { code: 'NETWORK_ERROR', status: 0, details: { retryable: true } });
    return result;
  },
  feedback: (messageId, rating, comment) => api.post(`/messages/${messageId}/feedback`, comment ? { rating, comment } : { rating })
};
