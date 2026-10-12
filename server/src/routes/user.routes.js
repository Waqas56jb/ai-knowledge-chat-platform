import { Router } from 'express';
import * as c from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

const r = Router();
r.use(authenticate);
r.get('/me', c.getMe);
r.get('/me/overview', c.overview);
r.patch('/me', validate({ body: s.updateMeBody }), c.updateMe);
r.delete('/me/conversations', c.deleteMyConversations);
export default r;
