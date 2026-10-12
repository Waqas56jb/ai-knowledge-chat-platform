import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** Mounted at /admin/processing. */
const r = Router();
r.use(authenticate, requireAdmin);
r.get('/', validate({ query: s.jobQuery }), c.listJobs);
r.get('/:id', validate({ params: s.idParam }), c.getJob);
r.post('/:id/retry', validate({ params: s.idParam }), c.retryJob);
r.post('/:id/cancel', validate({ params: s.idParam }), c.cancelJob);
export default r;
