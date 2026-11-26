import { body, param } from 'express-validator';
import { LIST_COLORS, LIST_LIMITS } from '../constants/index.js';
import { stripTags } from '../utils/sanitize.js';

export const listIdRule = param('id').isMongoId().withMessage('Invalid list id');

const listFieldRules = ({ isUpdate }) => [
  (isUpdate ? body('name').optional() : body('name'))
    .isString()
    .withMessage('name is required')
    .bail()
    .customSanitizer(stripTags)
    .isLength({ min: 1, max: LIST_LIMITS.NAME_MAX })
    .withMessage(`name must be 1-${LIST_LIMITS.NAME_MAX} characters`),
  body('description')
    .optional({ values: 'null' })
    .isString()
    .bail()
    .customSanitizer(stripTags)
    .isLength({ max: LIST_LIMITS.DESCRIPTION_MAX })
    .withMessage(`description must be at most ${LIST_LIMITS.DESCRIPTION_MAX} characters`),
  body('color')
    .optional()
    .isIn(LIST_COLORS)
    .withMessage(`color must be one of: ${LIST_COLORS.join(', ')}`),
];

export const createListRules = listFieldRules({ isUpdate: false });

export const updateListRules = [listIdRule, ...listFieldRules({ isUpdate: true })];

export const changeMembersRules = [
  listIdRule,
  body('action').isIn(['add', 'remove']).withMessage('action must be add or remove'),
  body('contactIds')
    .isArray({ min: 1, max: 500 })
    .withMessage('contactIds must be a list of 1-500 contact ids'),
  body('contactIds.*').isMongoId().withMessage('Every contact id must be valid'),
];

