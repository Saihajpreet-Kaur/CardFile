import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

/**
 * Runs after a list of express-validator rules.
 * Stops the request with 422 and a list of field errors if any rule failed.
 */
export function validate(req, _res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const details = result
      .array({ onlyFirstError: true })
      .map((error) => ({ field: error.path, location: error.location, message: error.msg }));

    throw AppError.validation(details);
  }

  next();
}
