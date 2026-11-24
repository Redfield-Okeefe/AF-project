import express from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authorize } from '../middleware/authorize.js';
export function mountAuth(app, auth, authenticate) {
  const controller = authController(auth);
  const limiter = rateLimit({windowMs:10*60*1000,limit:20,standardHeaders:true,legacyHeaders:false,message:{ok:false,message:'Terlalu banyak percobaan login. Coba lagi nanti.'}});
  const json = express.json({limit:'10kb'});
  app.post('/api/v1/auth/login', limiter, json, controller.login);
  app.post('/login', limiter, json, controller.legacyLogin);
  app.get('/api/v1/auth/me', authenticate, controller.me);
  for (const role of ['owner','pelatih','pemain']) {
    app.get(`/api/v1/auth/check/${role}`, authenticate, authorize(role), (req,res)=>res.json({ok:true,role:req.user.role}));
  }
  // Fail closed until persistent registration and OTP flows are implemented.
  const deferred = (req,res)=>res.status(501).json({ok:false,message:'Fitur ini belum diimplementasikan pada fase login PostgreSQL.'});
  app.post(['/auth/otp/request','/auth/otp/verify','/api/v1/auth/coach/register','/api/v1/auth/player/activate','/api/v1/auth/forgot-password','/api/v1/auth/reset-password','/pendaftaran','/pembayaran','/api/v1/auth/logout'], deferred);
}
