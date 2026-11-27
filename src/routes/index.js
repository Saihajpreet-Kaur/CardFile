import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import authRoutes from './auth.routes.js';
import contactRoutes from './contact.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import listRoutes from './list.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.get('/health', getHealth);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contacts', contactRoutes);
router.use('/lists', listRoutes);
router.use(dashboardRoutes); // /dashboard/summary and /followups

export default router;
