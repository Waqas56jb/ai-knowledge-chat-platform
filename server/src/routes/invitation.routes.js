import { Router } from 'express';
import * as c from '../controllers/invitation.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** Mounted at /admin/invitations. */
const r = Router();
r.use(authenticate, requireAdmin);
r.get('/', validate({ query: s.invitationQuery }), c.list);
r.post('/', validate({ body: s.createInvitationBody }), c.create);
r.get('/:id', validate({ params: s.idParam }), c.get);
r.post('/:id/resend', validate({ params: s.idParam, body: s.resendInvitationBody }), c.resend);
r.post('/:id/revoke', validate({ params: s.idParam }), c.revoke);
export default r;
