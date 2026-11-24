import express from 'express';
import rateLimit from 'express-rate-limit';
import {authorize} from '../middleware/authorize.js';
import {ApiError} from '../services/auth.service.js';
import {ActivationError} from '../services/activation.crypto.js';
import {createMailer} from '../services/mail.service.js';
import {createActivationRepository} from '../repositories/activation.repository.js';
import {createActivationService} from '../services/activation.service.js';
import {createPlayerActivationRepository} from '../repositories/player-activation.repository.js';
import {createPlayerActivationService} from '../services/player-activation.service.js';
export function mountActivation(app,authenticate,pool,config){
  const mailer=createMailer();
  const service=createActivationService(createActivationRepository(pool,{secret:config.secret,mailer}),config);
  const playerActivation=createPlayerActivationService(createPlayerActivationRepository(pool),config,mailer);
  const json=express.json({limit:'8kb'});
  const limiter=rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:true,legacyHeaders:false,message:{ok:false,message:'Terlalu banyak permintaan aktivasi.'}});
  const handle=(status,fn)=>(req,res,next)=>Promise.resolve().then(async()=>{
    res.set('Cache-Control','no-store');res.status(status).json({ok:true,...await fn(req)});
  }).catch(e=>next(e instanceof ActivationError?new ApiError(e.status,e.message):e));
  app.post('/api/v1/owner/registrations/:id/invite',authenticate,authorize('owner'),limiter,handle(201,req=>service.invite(req.params.id,req.user.id)));
  app.post('/api/v1/auth/otp/request',limiter,json,handle(201,req=>service.request(req.body)));
  app.post('/api/v1/auth/otp/verify',limiter,json,handle(200,req=>service.verify(req.body)));
  const activationLimiter=rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:true,legacyHeaders:false,message:{ok:false,message:'Terlalu banyak percobaan pembuatan akun.'}});
  app.post('/api/v1/auth/player/activate',limiter,activationLimiter,json,handle(201,req=>playerActivation.activate(req.body)));
}
