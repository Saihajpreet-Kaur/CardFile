import { body, param } from 'express-validator';
import { INTERACTION_TYPES } from '../constants/index.js';
import { stripTags } from '../utils/sanitize.js';
import { contactIdRule } from './contact.validator.js';

const toIsoDate = (value) => new Date(value).toISOString();

export const listInteractionsRules = [contactIdRule];

export const createInteractionRules = [
  contactIdRule,
  body('type')
    .isIn(INTERACTION_TYPES)
    .withMessage(`type must be one of: ${INTERACTION_TYPES.join(', ')}`),
  body('note')
    .isString()
    .withMessage('note is required')
    .bail()
    .customSanitizer(stripTags)
    .isLength({ min: 1, max: 1000 })
    .withMessage('note must be 1-1000 characters'),
  body('date')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('date must be a valid date (YYYY-MM-DD or ISO 8601)')
    .customSanitizer(toIsoDate),
  body('followUpDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('followUpDate must be a valid date (YYYY-MM-DD or ISO 8601)')
    .customSanitizer(toIsoDate),
];

export const deleteInteractionRules = [
  contactIdRule,
  param('interactionId').isUUID().withMessage('Invalid interaction id'),
];
