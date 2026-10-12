import { Router } from 'express';
import * as c from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** Mounted at /admin/users. */
const r = Router();
r.use(authenticate, requireAdmin);
r.get('/', validate({ query: s.adminUserQuery }), c.list);
r.get('/:id', validate({ params: s.idParam }), c.get);
r.patch('/:id', validate({ params: s.idParam, body: s.adminUpdateUserBody }), c.update);
r.post('/:id/suspend', validate({ params: s.idParam }), c.suspend);
r.post('/:id/reactivate', validate({ params: s.idParam }), c.reactivate);
r.post('/:id/revoke', validate({ params: s.idParam }), c.revoke);
r.delete('/:id', validate({ params: s.idParam }), c.remove);
export default r;
