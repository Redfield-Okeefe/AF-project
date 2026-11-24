import {RegistrationError} from '../validators/registration.validator.js';
import {ApiError} from '../services/auth.service.js';
const handle=fn=>(req,res,next)=>Promise.resolve().then(()=>{
  res.set('Cache-Control','no-store');
  return fn(req,res);
}).catch(error=>next(error instanceof RegistrationError?new ApiError(error.status,error.message):error));
export function registrationController(service){
  return {
    programs:handle(async(req,res)=>res.json({ok:true,items:await service.listPrograms()})),
    submit:handle(async(req,res)=>res.status(201).json({ok:true,registration:await service.submit(req.body)})),
    list:handle(async(req,res)=>res.json({ok:true,items:await service.listRegistrations(req.query)})),
    detail:handle(async(req,res)=>res.json({ok:true,registration:await service.registrationDetail(req.params.id)})),
    players:handle(async(req,res)=>res.json({ok:true,items:await service.listPlayers(req.query)})),
    player:handle(async(req,res)=>res.json({ok:true,player:await service.playerDetail(req.params.id)})),
    approve:handle(async(req,res)=>res.json({ok:true,registration:await service.review(req.params.id,'diterima',req.body,req.user.id)})),
    reject:handle(async(req,res)=>res.json({ok:true,registration:await service.review(req.params.id,'ditolak',req.body,req.user.id)}))
  };
}
