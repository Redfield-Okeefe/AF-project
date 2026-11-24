import { ApiError } from '../services/auth.service.js';
export function authenticateWith(auth) {
  return async (req,res,next) => {
    try {
      const match = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') || '');
      if (!match) throw new ApiError(401,'Token Bearer diperlukan.');
      req.user = await auth.authenticate(match[1]);
      next();
    } catch (error) { next(error); }
  };
}
