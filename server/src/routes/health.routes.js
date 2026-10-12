import { Router } from 'express';
import { health, ready } from '../controllers/misc.controller.js';

const r = Router();
r.get('/', health);
r.get('/ready', ready);
export default r;
