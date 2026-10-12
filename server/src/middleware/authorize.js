import { ApiError } from '../utils/ApiError.js';

/** Allow only the listed roles (role is read from the database profile, never from the request). */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};
export const requireAdmin = requireRole('admin');
/** Members and admins may create content (read-only users may not). */
export const requireWriter = requireRole('admin', 'member');
export const requireActiveAccount = (req, _res, next) => (req.user?.status === 'active' ? next() : next(ApiError.forbidden('This account is not active.')));
