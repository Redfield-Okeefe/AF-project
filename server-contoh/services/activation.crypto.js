import {createHash,createHmac,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
export const PURPOSE='activate_player';
export const LIMITS=Object.freeze({inviteHours:24,otpMinutes:5,cooldownSeconds:60,maxAttempts:5,maxRequestsPerHour:5,proofMinutes:10});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ActivationError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export const uuid=v=>{if(typeof v!=='string'||!UUID.test(v))throw new ActivationError(400,'ID tidak valid.');return v.toLowerCase();};
export function demoEmail(v){
  const email=typeof v==='string'?v.trim().toLowerCase():'';
  // Local testing only; prevent mailing operational addresses.
  if(email.length>255||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.test$/.test(email))throw new ActivationError(400,'Gunakan alamat email dummy berakhiran .test untuk fase lokal.');
  return email;
}
export function inviteToken(){return randomBytes(32).toString('base64url');}
export function tokenHash(token){
  if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token))throw new ActivationError(400,'Format undangan tidak valid.');
  return createHash('sha256').update(token).digest('hex');
}
export function otpCode(){return String(randomInt(0,1000000)).padStart(6,'0');}
export function validateCode(code){
  if(typeof code!=='string'||! /^\d{6}$/.test(code))throw new ActivationError(400,'OTP harus terdiri dari enam digit.');
  return code;
}
export function scopePrefix(invitationId){return 'v1:'+uuid(invitationId)+':';}
function key(secret,context){return createHmac('sha256',secret).update('bnr-academy/'+context+'/v1').digest();}
export function hashOtp(secret,challengeId,invitationId,email,code){
  const value=JSON.stringify([PURPOSE,uuid(challengeId),uuid(invitationId),demoEmail(email),validateCode(code)]);
  return scopePrefix(invitationId)+createHmac('sha256',key(secret,'otp')).update(value).digest('hex');
}
export function equalHash(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length&&timingSafeEqual(x,y);
}
// Separate key and audience so verification proof cannot be a login JWT.
export const proofKey=secret=>key(secret,'email-verification-proof');
export function otpDecision(row,expected,invitationId){
  if(!row||row.consumed_at||!row.live||row.attempts>=LIMITS.maxAttempts||!String(row.code_hash).startsWith(scopePrefix(invitationId)))return 'unavailable';
  return equalHash(row.code_hash,expected)?'verified':'incorrect';
}
