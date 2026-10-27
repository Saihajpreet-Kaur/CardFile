import { body, param, query } from 'express-validator';
import {
  CONTACT_LIMITS,
  CONTACT_SORT_OPTIONS,
  CONTACT_STATUS,
  PAGINATION,
  PHONE_REGEX,
} from '../constants/index.js';
import { normalizePhone, normalizeTags, stripTags } from '../utils/sanitize.js';

export const contactIdRule = param('id').isUUID().withMessage('Invalid contact id');

const optionalText = (field, max) =>
  body(field)
    .optional({ values: 'null' })
    .isString()
    .withMessage(`${field} must be text`)
    .bail()
    .customSanitizer(stripTags)
    .isLength({ max })
    .withMessage(`${field} must be at most ${max} characters`);

const contactFieldRules = ({ isUpdate }) => [
  (isUpdate ? body('firstName').optional() : body('firstName'))
    .isString()
    .withMessage('firstName is required')
    .bail()
    .customSanitizer(stripTags)
    .isLength({ min: 1, max: CONTACT_LIMITS.NAME_MAX })
    .withMessage(`firstName must be 1-${CONTACT_LIMITS.NAME_MAX} characters`),
  optionalText('lastName', CONTACT_LIMITS.NAME_MAX),
  body('email')
    .optional({ values: 'null' })
    .isString()
    .bail()
    .trim()
    .toLowerCase()
    .if((value) => value !== '')
    .isEmail()
    .withMessage('Enter a valid email address'),
  body('phone')
    .optional({ values: 'null' })
    .isString()
    .bail()
    .customSanitizer(normalizePhone)
    .if((value) => value !== '')
    .matches(PHONE_REGEX)
    .withMessage('Phone must contain 7-15 digits (optional leading +)'),
  optionalText('company', CONTACT_LIMITS.TEXT_MAX),
  optionalText('designation', CONTACT_LIMITS.TEXT_MAX),
  optionalText('notes', CONTACT_LIMITS.NOTES_MAX),
  body('tags')
    .optional({ values: 'null' })
    .customSanitizer(normalizeTags)
    .custom((tags) => tags.length <= CONTACT_LIMITS.TAGS_MAX_COUNT)
    .withMessage(`At most ${CONTACT_LIMITS.TAGS_MAX_COUNT} tags are allowed`),
  body('isFavourite')
    .optional()
    .isBoolean()
    .withMessage('isFavourite must be true or false')
    .toBoolean(),
];

export const createContactRules = contactFieldRules({ isUpdate: false });

export const updateContactRules = [contactIdRule, ...contactFieldRules({ isUpdate: true })];

const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive whole number')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: PAGINATION.MAX_LIMIT })
    .withMessage(`limit must be between 1 and ${PAGINATION.MAX_LIMIT}`)
    .toInt(),
];

const filterRules = [
  query('sort')
    .optional()
    .isIn(CONTACT_SORT_OPTIONS)
    .withMessage(`sort must be one of: ${CONTACT_SORT_OPTIONS.join(', ')}`),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('search must be at most 100 characters'),
  query('tag').optional().isString().trim().toLowerCase(),
  query('company').optional().isString().trim(),
  query('favourite')
    .optional()
    .isBoolean()
    .withMessage('favourite must be true or false')
    .toBoolean(),
  query('status')
    .optional()
    .isIn(Object.values(CONTACT_STATUS))
    .withMessage(`status must be one of: ${Object.values(CONTACT_STATUS).join(', ')}`),
];

/** ?page=1&limit=10&sort=-createdAt&search=&tag=&company=&favourite=true&status=active */
export const listContactsRules = [...paginationRules, ...filterRules];

export const exportContactsRules = filterRules;
