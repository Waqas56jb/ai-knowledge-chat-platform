import { Router } from 'express';
import * as c from '../controllers/misc.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

const r = Router();
r.use(authenticate);
r.get('/', validate({ query: s.notificationQuery }), c.listNotifications);
r.post('/read-all', c.readAllNotifications);
r.patch('/:id/read', validate({ params: s.idParam }), c.readNotification);
export default r;
