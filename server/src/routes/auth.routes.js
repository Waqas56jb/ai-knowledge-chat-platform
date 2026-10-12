import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, invitationLimiter } from '../middleware/rateLimit.js';
import * as s from '../schemas/index.js';

const r = Router();
r.post('/login', authLimiter, validate({ body: s.loginBody }), c.login);
r.post('/refresh', authLimiter, validate({ body: s.refreshBody }), c.refresh);
r.post('/logout', authenticate, c.logout);
r.get('/me', authenticate, c.me);
r.post('/forgot-password', authLimiter, validate({ body: s.forgotBody }), c.forgotPassword);
r.post('/reset-password', authLimiter, validate({ body: s.resetBody }), c.resetPassword);
r.post('/validate-invitation', invitationLimiter, validate({ body: s.inviteTokenBody }), c.validateInvitation);
// "register" and "accept-invitation" are the same invitation-only flow
r.post('/accept-invitation', invitationLimiter, validate({ body: s.acceptInviteBody }), c.acceptInvitation);
r.post('/register', invitationLimiter, validate({ body: s.acceptInviteBody }), c.acceptInvitation);
export default r;
