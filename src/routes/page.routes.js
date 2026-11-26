import { Router } from 'express';
import { renderHome } from '../controllers/page.controller.js';

const router = Router();

router.get('/', renderHome);

export default router;
