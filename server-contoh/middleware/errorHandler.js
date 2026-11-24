import { ApiError } from '../services/auth.service.js';
export function errorHandler(error,req,res,next) {
  if (res.headersSent) return next(error);
  if (error instanceof ApiError) return res.status(error.status).json({ok:false,message:error.message});
  if (error.type === 'entity.parse.failed') return res.status(400).json({ok:false,message:'Format JSON tidak valid.'});
  if (error.type === 'entity.too.large') return res.status(413).json({ok:false,message:'Ukuran request terlalu besar.'});
  if (error.status === 404 || error.code === 'ENOENT') return res.status(404).json({ok:false,message:'Data tidak ditemukan.'});
  // Never send stack traces, SQL, tokens, or credentials to clients.
  console.error('API error:', error.code || error.name);
  res.status(500).json({ok:false,message:'Terjadi kesalahan server. Periksa terminal backend.'});
}
