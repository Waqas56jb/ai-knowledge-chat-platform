import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** Mounted at /admin/audit-logs. Read-only: no update/delete endpoints exist and the table is append-only. */
const r = Router();
r.use(authenticate, requireAdmin);
r.get('/', validate({ query: s.auditQuery }), c.listAudit);
r.get('/:id', validate({ params: s.idParam }), c.getAudit);
export default r;
