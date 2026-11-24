import { ApiError } from '../services/auth.service.js';
export const authorize = (...roles) => (req,res,next) => {
  if (!req.user) return next(new ApiError(401,'Login diperlukan.'));
  if (!roles.includes(req.user.role)) return next(new ApiError(403,'Anda tidak berwenang mengakses fitur ini.'));
  next();
};
