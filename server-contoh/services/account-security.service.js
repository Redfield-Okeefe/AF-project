import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {createHmac} from 'node:crypto';
import {ActivationError,proofKey,uuid,validateCode} from './activation.crypto.js';
import {validateCoachPassword} from './coach-registration.validation.js';
import {normalizeRole} from './auth.service.js';
export const RESET='reset_password';
export const resetHash=(secret,id,email,role,version,code)=>createHmac('sha256',proofKey(secret)).update(JSON.stringify([RESET,uuid(id),email,role,version,validateCode(code)])).digest('hex');
export function resetIdentity(body){
  const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
  const role=normalizeRole(body?.role??body?.peran);
  if(!/^[a-z0-9._%+!-]+@[a-z0-9.-]+\.[a-z0-9]+$/.test(email)||email.length>255||!role)throw new ActivationError(400,'Email atau portal tidak valid.');
  return {email,role};
}
export function readLogoutClaims(token,config){
  try{
    let p;
    try{p=jwt.verify(token,config.secret,{algorithms:['HS256'],issuer:config.issuer,audience:config.audience});}
    catch{p=jwt.verify(token,proofKey(config.secret),{algorithms:['HS256'],issuer:config.issuer,audience:'bnr-academy-coach-status'});if(p.purpose!=='coach_status'||p.role!=='pelatih')throw Error('invalid');}
    if(!['owner','pelatih','pemain'].includes(p.role)||!Number.isInteger(p.sv)||p.sv<0||typeof p.exp!=='number')throw Error('invalid');
    return {id:uuid(p.sub),role:p.role,version:p.sv};
  }catch{throw new ActivationError(401,'Sesi tidak berlaku. Silakan login ulang.');}
}
export function createAccountSecurityService(repo,config,{hash=p=>bcrypt.hash(p,12),compare=(p,h)=>bcrypt.compare(p,h)}={}){
 return {
  request:body=>repo.request(resetIdentity(body)),
  async reset(body){
    const identity=resetIdentity(body), password=validateCoachPassword(body.password,body.password_confirmation);
    const challengeId=uuid(body.challenge_id),code=validateCode(body.code);
    return repo.reset({...identity,challengeId,code,passwordHash:await hash(password)});
  },
  async change(user,body){
    const next=validateCoachPassword(body?.password,body?.password_confirmation),old=body?.current_password;
    if(typeof old!=='string'||!old||Buffer.byteLength(old)>72||old===next)throw new ActivationError(400,'Password lama dan password baru harus berbeda dan valid.');
    const row=await repo.credentials(user.id);
    if(!row||Number(row.session_version)!==user.session_version||!await compare(old,row.password_hash))throw new ActivationError(401,'Password lama atau sesi tidak valid.');
    return repo.change({id:user.id,version:user.session_version,oldHash:row.password_hash,newHash:await hash(next)});
  },
  logout:token=>repo.logout(readLogoutClaims(token,config))
 };
}
