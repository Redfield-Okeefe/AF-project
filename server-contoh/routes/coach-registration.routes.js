import express from 'express';
import rateLimit from 'express-rate-limit';
import {authorize} from '../middleware/authorize.js';
import {ApiError} from '../services/auth.service.js';
import {ActivationError} from '../services/activation.crypto.js';
import {createMailer} from '../services/mail.service.js';
import {createCoachRegistrationRepository} from '../repositories/coach-registration.repository.js';
import {createCoachRegistrationService} from '../services/coach-registration.service.js';
export function mountCoachRegistration(app,authenticate,pool,config,auth){
  const mailer=createMailer();
  const service=createCoachRegistrationService(createCoachRegistrationRepository(pool,{secret:config.secret,mailer}),config,{allowTest:process.env.NODE_ENV!=='production'});
  const json=express.json({limit:'10kb'});
  const limiter=rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:true,legacyHeaders:false,message:{ok:false,message:'Terlalu banyak permintaan.'}});
  const loginLimiter=rateLimit({windowMs:10*60*1000,limit:20,standardHeaders:true,legacyHeaders:false,message:{ok:false,message:'Terlalu banyak percobaan login.'}});
  const handle=(status,fn)=>(req,res,next)=>Promise.resolve().then(async()=>{
    res.set('Cache-Control','no-store');res.status(status).json({ok:true,...await fn(req)});
  }).catch(e=>next(e instanceof ActivationError?new ApiError(e.status,e.message):e));
  app.post('/api/v1/auth/coach/otp/request',limiter,json,handle(201,req=>service.request(req.body)));
  app.post('/api/v1/auth/coach/register',limiter,json,handle(201,req=>service.register(req.body)));
  app.post('/api/v1/auth/coach/login',loginLimiter,json,handle(200,async req=>{
    // Never trust a client-supplied role; this endpoint is for coaches only.
    const body={email:req.body?.email,password:req.body?.password,role:'pelatih'};
    try{return await auth.login(body);}catch(e){if(e.status!==403)throw e;return service.restrictedLogin(body);}
  }));
  app.get('/api/v1/auth/coach/status',handle(200,req=>service.status(/^Bearer ([^\s]+)$/i.exec(req.get('Authorization')||'')?.[1])));
  app.get('/api/v1/owner/coaches',authenticate,authorize('owner'),handle(200,async()=>({coaches:await service.list()})));
  app.patch('/api/v1/owner/coaches/:id/status',authenticate,authorize('owner'),json,handle(200,async req=>({user:await service.review(req.params.id,req.user.id,req.body)})));
}
