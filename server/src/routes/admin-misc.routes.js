import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** Mounted at /admin/conversations — administrative review; every detail view is audited. */
export const adminConversationRouter = Router();
adminConversationRouter.use(authenticate, requireAdmin);
adminConversationRouter.get('/', validate({ query: s.adminConversationQuery }), c.listConversations);
adminConversationRouter.get('/:id', validate({ params: s.idParam }), c.getConversation);
adminConversationRouter.post('/:id/review', validate({ params: s.idParam, body: s.reviewBody }), c.reviewConversation);

/** Mounted at /admin/search. */
export const adminSearchRouter = Router();
adminSearchRouter.get('/', authenticate, requireAdmin, validate({ query: s.searchQuery }), c.search);

/** Mounted at /admin/content-gaps — questions the knowledge base could not answer, grouped, with triage status. */
export const adminContentGapRouter = Router();
adminContentGapRouter.use(authenticate, requireAdmin);
adminContentGapRouter.get('/', validate({ query: s.gapQuery }), c.listGaps);
adminContentGapRouter.get('/:id', validate({ params: s.gapParam }), c.getGap);
adminContentGapRouter.patch('/:id', validate({ params: s.gapParam, body: s.gapBody }), c.updateGap);
