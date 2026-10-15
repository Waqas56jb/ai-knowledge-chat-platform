import { Router } from 'express';
import * as c from '../controllers/source.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { ingestLimiter } from '../middleware/rateLimit.js';
import { uploadDocument } from '../middleware/upload.js';
import * as s from '../schemas/index.js';

/** Mounted at /admin/knowledge. */
const r = Router();
r.use(authenticate, requireAdmin);
r.get('/', validate({ query: s.adminSourceQuery }), c.adminList);
r.post('/youtube', ingestLimiter, validate({ body: s.youtubeSourceBody }), c.addYoutube);
r.post('/text', ingestLimiter, validate({ body: s.textSourceBody }), c.addText);
r.post('/documents', ingestLimiter, uploadDocument, c.addDocument);
r.post('/bulk', validate({ body: s.bulkSourcesBody }), c.adminBulk);
r.get('/:sourceId', validate({ params: s.sourceIdParam }), c.adminGet);
r.patch('/:sourceId', validate({ params: s.sourceIdParam, body: s.updateSourceBody }), c.adminUpdate);
r.delete('/:sourceId', validate({ params: s.sourceIdParam }), c.adminDelete);
r.post('/:sourceId/process', validate({ params: s.sourceIdParam }), c.adminProcess);
r.post('/:sourceId/retry', validate({ params: s.sourceIdParam }), c.adminRetry);
r.post('/:sourceId/disable', validate({ params: s.sourceIdParam }), c.adminDisable);
r.post('/:sourceId/enable', validate({ params: s.sourceIdParam }), c.adminEnable);
r.get('/:sourceId/download', validate({ params: s.sourceIdParam }), c.download);
export default r;
