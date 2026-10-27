import { body } from 'express-validator';
import { stripTags } from '../utils/sanitize.js';

const emailRule = () =>
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Enter a valid email address')
    .toLowerCase();

export const registerRules = [
  body('name')
    .isString()
    .withMessage('Name is required')
    .bail()
    .customSanitizer(stripTags)
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2-50 characters'),
  emailRule(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
    .withMessage('Password must be at least 8 characters with an uppercase letter, a lowercase letter and a number')
    .isLength({ max: 72 })
    .withMessage('Password must be at most 72 characters'),
];

export const loginRules = [
  emailRule(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];
