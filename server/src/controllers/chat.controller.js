import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { toLimitOffset, pageMeta } from '../utils/pagination.js';
import { sendMessage } from '../services/chat.service.js';
import * as conv from '../services/conversation.service.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const chatPayload = req => ({ ...req.body, clientMessageId: req.body.clientMessageId || req.get('Idempotency-Key') || undefined });

export const chat = asyncHandler(async (req, res) => {
  ok(res, await sendMessage(req.user, chatPayload(req)));
});

/**
 * Same as POST /chat, answered as Server-Sent Events:
 *   status { stage: 'searching' | 'writing' } · delta { text } · citation { citation } · done { …POST /chat result } · error { error }
 * The answer is still validated and saved even if the client disconnects mid-stream.
 */
export async function chatStream(req, res) {
  res.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  let open = true;
  res.on('close', () => { open = false; });
  const send = (event, data) => { if (open) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
  try {
    const result = await sendMessage(req.user, chatPayload(req), {
      onStatus: stage => send('status', { stage }),
      onText: text => send('delta', { text }),
      onCitation: citation => send('citation', { citation })
    });
    send('done', result);
  } catch (err) {
    const e = err instanceof ApiError ? err : null;
    if (!e) logger.error({ requestId: req.id, route: req.originalUrl, err: { name: err?.name, code: err?.code, message: err?.message } }, 'unhandled error');
    send('error', { error: e
      ? { code: e.code, message: e.message, status: e.status, requestId: req.id, ...(e.details ? { details: e.details } : {}) }
      : { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.', status: 500, requestId: req.id } });
  }
  res.end();
}
export const feedback = asyncHandler(async (req, res) => ok(res, { feedback: await conv.setFeedback(req.user, req.params.id, req.body) }));

export const listConversations = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const { rows, total } = await conv.listOwnConversations(req.user, q, toLimitOffset(q));
  ok(res, rows, pageMeta(q, total));
});
export const createConversation = asyncHandler(async (req, res) => ok(res, conv.conversationOut(await conv.createConversation(req.user, req.body)), undefined, 201));
export const getConversation = asyncHandler(async (req, res) => ok(res, await conv.getOwnConversation(req.user, req.params.id, {})));
export const renameConversation = asyncHandler(async (req, res) => ok(res, await conv.renameConversation(req.user, req.params.id, req.body.title)));
export const deleteConversation = asyncHandler(async (req, res) => { await conv.deleteConversation(req.user, req.params.id); ok(res, { deleted: true }); });
export const listMessages = asyncHandler(async (req, res) => ok(res, await conv.listOwnMessages(req.user, req.params.id, req.validQuery)));
