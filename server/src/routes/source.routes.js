import { Router } from 'express';
import * as c from '../controllers/source.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** User-facing source browser: only sources the caller may access (same rule as RAG retrieval). */
const r = Router();
r.use(authenticate);
r.get('/', validate({ query: s.userSourceQuery }), c.list);
r.get('/:sourceId', validate({ params: s.sourceIdParam }), c.get);
r.get('/:sourceId/chunks', validate({ params: s.sourceIdParam, query: s.chunkQuery }), c.chunks);
r.get('/:sourceId/download', validate({ params: s.sourceIdParam }), c.download);
export default r;
