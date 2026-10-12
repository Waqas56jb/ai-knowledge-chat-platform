import { Router } from 'express';
import * as c from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireWriter } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import * as s from '../schemas/index.js';

/** Mounted at /chat. Read-only users cannot generate answers. */
export const chatRouter = Router();
chatRouter.post('/', authenticate, requireWriter, chatLimiter, validate({ body: s.chatBody }), c.chat);
chatRouter.post('/stream', authenticate, requireWriter, chatLimiter, validate({ body: s.chatBody }), c.chatStream);

/** Mounted at /messages. */
export const messageRouter = Router();
messageRouter.post('/:id/feedback', authenticate, validate({ params: s.idParam, body: s.feedbackBody }), c.feedback);
