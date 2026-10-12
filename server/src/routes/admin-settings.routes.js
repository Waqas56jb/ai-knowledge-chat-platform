import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import * as s from '../schemas/index.js';

/** Mounted at /admin/settings. */
const r = Router();
r.use(authenticate, requireAdmin);
r.get('/', c.getSettings);
r.patch('/', validate({ body: s.settingsBody }), c.updateSettings);
r.post('/reset', validate({ body: s.settingsResetBody }), c.resetSettings);
export default r;
