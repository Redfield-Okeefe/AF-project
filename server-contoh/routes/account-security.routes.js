import express from 'express';
import rateLimit from 'express-rate-limit';
import {ApiError} from '../services/auth.service.js';
import {ActivationError} from '../services/activation.crypto.js';
import {createMailer} from '../services/mail.service.js';
import {createAccountSecurityService} from '../services/account-security.service.js';
import {createAccountSecurityRepository} from '../repositories/account-security.repository.js';
export function mountAccountSecurity(app,authenticate,pool,config){
 const service=createAccountSecurityService(createAccountSecurityRepository(pool,{secret:config.secret,mailer:createMailer()}),config);
 const json=express.json({limit:'8kb'});
 const limiter=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false,message:{ok:false,message:'Terlalu banyak percobaan.'}});
 const handle=fn=>(req,res,next)=>Promise.resolve().then(async()=>{
   res.set('Cache-Control','no-store');res.json({ok:true,...await fn(req)});
 }).catch(e=>next(e instanceof ActivationError?new ApiError(e.status,e.message):e));
 app.post('/api/v1/auth/forgot-password',limiter,json,handle(req=>service.request(req.body)));
 app.post('/api/v1/auth/reset-password',limiter,json,handle(req=>service.reset(req.body)));
 app.post('/api/v1/auth/change-password',authenticate,limiter,json,handle(req=>service.change(req.user,req.body)));
 app.post('/api/v1/auth/logout',limiter,handle(req=>service.logout(/^Bearer ([^\s]+)$/i.exec(req.get('Authorization')||'')?.[1])));
}
