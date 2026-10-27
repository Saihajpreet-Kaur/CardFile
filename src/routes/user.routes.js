import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { ROLES } from '../constants/index.js';
import { authorize, protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateRoleRules } from '../validators/user.validator.js';

const router = Router();

// Every route in this file is admin-only
router.use(protect, authorize(ROLES.ADMIN));

router.get('/', userController.listUsers);
router.patch('/:id/role', updateRoleRules, validate, userController.updateRole);

export default router;
