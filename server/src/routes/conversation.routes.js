import { Router } from 'express';
import * as c from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireWriter } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** Every handler checks ownership in SQL (user_id = caller). */
const r = Router();
r.use(authenticate);
r.get('/', validate({ query: s.conversationQuery }), c.listConversations);
r.post('/', requireWriter, validate({ body: s.createConversationBody }), c.createConversation);
r.get('/:id', validate({ params: s.idParam }), c.getConversation);
r.patch('/:id', validate({ params: s.idParam, body: s.renameConversationBody }), c.renameConversation);
r.delete('/:id', validate({ params: s.idParam }), c.deleteConversation);
r.get('/:id/messages', validate({ params: s.idParam, query: s.messagesQuery }), c.listMessages);
export default r;
