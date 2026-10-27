import { Router } from 'express';
import { renderApp, renderHome } from '../controllers/page.controller.js';

const router = Router();

router.get('/', renderHome);
router.get('/app', renderApp);

export default router;
