import express from 'express';
import {authorize} from '../middleware/authorize.js';
import {createProfileService} from '../services/profile.service.js';
export function mountProfile(app,authenticate,pool){
 const service=createProfileService(pool),auth=[authenticate,authorize('owner','pelatih','pemain')];
 const handle=fn=>(req,res,next)=>Promise.resolve().then(async()=>{res.set('Cache-Control','no-store');res.json({ok:true,profile:await fn(req)});}).catch(next);
 app.get('/api/v1/me/profile',...auth,handle(req=>service.get(req.user)));
 app.patch('/api/v1/me/profile',...auth,express.json({limit:'450kb'}),handle(req=>service.save(req.user,req.body)));
}
