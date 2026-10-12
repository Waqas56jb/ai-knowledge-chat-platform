import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** Mounted at /admin/analytics. */
const r = Router();
r.use(authenticate, requireAdmin, validate({ query: s.analyticsQuery }));
r.get('/overview', c.analyticsOverview);
r.get('/users', c.analyticsUsers);
r.get('/conversations', c.analyticsConversations);
r.get('/knowledge', c.analyticsKnowledge);
r.get('/query-outcomes', c.analyticsOutcomes);
export default r;
