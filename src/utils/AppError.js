/**
 * Operational error with an HTTP status code.
 * Throw it anywhere in a request; the central error handler turns it into a JSON response.
 */
export default class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Resource already exists', details) {
    return new AppError(message, 409, details);
  }

  static validation(details) {
    return new AppError('Validation failed', 422, details);
  }
}
