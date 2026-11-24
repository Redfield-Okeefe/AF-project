import jwt from 'jsonwebtoken';
import {randomUUID} from 'node:crypto';
import {ActivationError,PURPOSE,LIMITS,demoEmail,uuid,tokenHash,validateCode,proofKey} from './activation.crypto.js';
const AUDIENCE='bnr-academy-email-verification';
function bodyInput(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||body.purpose!==PURPOSE)throw new ActivationError(400,'purpose harus activate_player pada Fase 3A.');
  tokenHash(body.invitation_token);
  return {invitationToken:body.invitation_token,email:demoEmail(body.email)};
}
export function createActivationService(repo,config){
  return {
    invite:(id,actor)=>repo.issue(uuid(id),actor),
    request:body=>repo.request(bodyInput(body)),
    async verify(body){
      const result=await repo.verify({...bodyInput(body),challengeId:uuid(body.challenge_id),code:validateCode(body.code)});
      const verification_token=jwt.sign({purpose:PURPOSE,email:result.email,invitation_id:result.invitationId,registration_id:result.registrationId},proofKey(config.secret),{algorithm:'HS256',subject:result.challengeId,issuer:config.issuer,audience:AUDIENCE,expiresIn:LIMITS.proofMinutes*60,jwtid:randomUUID()});
      return {verified:true,verification_token,expires_in:LIMITS.proofMinutes*60,account_created:false};
    }
  };
}
// Foundation for 3B only: future account creation must additionally check DB
// invitation/challenge binding, consume invitation atomically, and enforce unique email.
export function readVerificationProof(token,config){
  try {
    const p=jwt.verify(token,proofKey(config.secret),{algorithms:['HS256'],issuer:config.issuer,audience:AUDIENCE});
    if(typeof p!=='object'||p.purpose!==PURPOSE||typeof p.exp!=='number')throw Error('invalid');
    return {challengeId:uuid(p.sub),invitationId:uuid(p.invitation_id),registrationId:uuid(p.registration_id),email:demoEmail(p.email)};
  }catch{throw new ActivationError(401,'Bukti verifikasi tidak berlaku.');}
}
