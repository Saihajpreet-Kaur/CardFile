import { Router } from 'express';
import { getSummary } from '../controllers/dashboard.controller.js';
import { listFollowUps } from '../controllers/interaction.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { listFollowUpsRules } from '../validators/interaction.validator.js';

// Mounted at /api: GET /api/dashboard/summary and GET /api/followups
const router = Router();

router.get('/dashboard/summary', protect, getSummary);
router.get('/followups', protect, listFollowUpsRules, validate, listFollowUps);

export default router;

