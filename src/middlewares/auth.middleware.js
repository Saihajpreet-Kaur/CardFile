import { verifyToken } from '../services/auth.service.js';
import AppError from '../utils/AppError.js';

/** Requires a valid "Authorization: Bearer <token>" header and sets req.user. */
export async function protect(req, _res, next) {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized('Authentication required. Send "Authorization: Bearer <token>"');
  }

  req.user = await verifyToken(token);
  next();
}

/** Role-based access. Use after protect: authorize('admin') */
export const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!allowedRoles.includes(req.user?.role)) throw AppError.forbidden();
    next();
  };
