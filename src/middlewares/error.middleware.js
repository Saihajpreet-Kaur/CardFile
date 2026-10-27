import multer from 'multer';
import config from '../config/index.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'File is too large',
  LIMIT_FILE_COUNT: 'Only one file can be uploaded at a time',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field name',
};

/** Converts known library errors into an AppError with the right status code. */
function normalizeError(error) {
  if (error instanceof AppError) return error;

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return new AppError(MULTER_MESSAGES[error.code] ?? error.message, statusCode);
  }

  // Errors thrown by express.json()
  if (error.type === 'entity.parse.failed') {
    return AppError.badRequest('Request body contains invalid JSON');
  }
  if (error.type === 'entity.too.large') {
    return new AppError('Request body is too large', 413);
  }

  // Errors thrown by csv-parse
  if (typeof error.code === 'string' && error.code.startsWith('CSV_')) {
    return AppError.badRequest(`Could not read the CSV file: ${error.message}`);
  }

  const wrapped = new AppError(error.message, error.statusCode ?? error.status ?? 500);
  wrapped.stack = error.stack;
  return wrapped;
}

/** 404 for any route that did not match. */
export function notFound(req, _res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler - every thrown or rejected error ends up here.
 * Express recognises an error handler by its 4 arguments.
 */
export function errorHandler(error, req, res, next) {
  // A streamed response (e.g. CSV export) already started - let Express close the connection
  if (res.headersSent) return next(error);

  const appError = normalizeError(error);
  const isServerError = appError.statusCode >= 500;

  if (isServerError) {
    logger.error(`${req.method} ${req.originalUrl} failed`, error);
  }

  res.status(appError.statusCode).json({
    success: false,
    message: isServerError && config.isProduction ? 'Something went wrong' : appError.message,
    ...(appError.details && { details: appError.details }),
    ...(isServerError && !config.isProduction && { stack: appError.stack }),
  });
}
