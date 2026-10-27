import { body, param } from 'express-validator';
import { ROLES } from '../constants/index.js';

export const updateRoleRules = [
  param('id').isUUID().withMessage('Invalid user id'),
  body('role')
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
];
