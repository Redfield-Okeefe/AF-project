import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {randomUUID} from 'node:crypto';
import {ActivationError,uuid,validateCode,proofKey} from './activation.crypto.js';
import {coachEmail,parseCoachForm,parseReview} from './coach-registration.validation.js';
const AUDIENCE='bnr-academy-coach-status';
export function createCoachRegistrationService(repo,config,{hashPassword=p=>bcrypt.hash(p,12),comparePassword=(p,h)=>bcrypt.compare(p,h),allowTest=false}={}){
  const options={allowTest};
  const key=proofKey(config.secret);
  const statusToken=user=>jwt.sign({purpose:'coach_status',role:'pelatih',sv:Number(user.session_version??0)},key,{algorithm:'HS256',subject:user.id,issuer:config.issuer,audience:AUDIENCE,expiresIn:'30m',jwtid:randomUUID()});
  const fullToken=user=>jwt.sign({role:'pelatih',sv:Number(user.session_version??0)},config.secret,{algorithm:'HS256',subject:user.id,issuer:config.issuer,audience:config.audience,expiresIn:config.expiresIn,jwtid:randomUUID()});
  const restricted=user=>({ok:true,token:statusToken(user),role:'pelatih',restricted:true,user});
  return {
    async request(body){return repo.request(coachEmail(body?.email,options));},
    async register(body){
      const {password,...form}=parseCoachForm(body,options);
      const challengeId=uuid(body.challenge_id),code=validateCode(body.code);
      const passwordHash=await hashPassword(password);
      return restricted(await repo.register({...form,challengeId,code,passwordHash}));
    },
    // Called only after the normal login endpoint has rejected a coach login (403).
    // Password is checked again; a restricted JWT cannot authenticate against normal APIs.
    async restrictedLogin(body){
      const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>255)throw new ActivationError(400,'Email tidak valid.');
      const row=await repo.credentials(email);
      const password=body?.password;
      if(typeof password!=='string'||Buffer.byteLength(password,'utf8')>72||!row||!await comparePassword(password,row.password_hash))throw new ActivationError(401,'Email atau password salah.');
      if(!['menunggu','ditolak','nonaktif'].includes(row.status))throw new ActivationError(403,'Silakan login ulang.');
      const {password_hash,...user}=row;
      return restricted(user);
    },
    async status(token){
      if(typeof token!=='string'||token.length>4096)throw new ActivationError(401,'Token tidak valid.');
      let claims,limited=false;
      try{claims=jwt.verify(token,key,{algorithms:['HS256'],issuer:config.issuer,audience:AUDIENCE});limited=true;}
      catch{try{claims=jwt.verify(token,config.secret,{algorithms:['HS256'],issuer:config.issuer,audience:config.audience});}catch{throw new ActivationError(401,'Sesi berakhir. Silakan login ulang.');}}
      if(claims?.role!=='pelatih'||limited&&claims.purpose!=='coach_status'||typeof claims.exp!=='number')throw new ActivationError(403,'Akses hanya untuk pelatih.');
      const user=await repo.get(uuid(claims.sub));
      if(!user||claims.sv!==Number(user.session_version??0))throw new ActivationError(401,'Sesi berakhir. Silakan login ulang.');
      // An approved coach can upgrade a still-valid limited session; active APIs independently recheck DB state.
      return {user,restricted:user.status!=='aktif',...(limited&&user.status==='aktif'?{token:fullToken(user),role:'pelatih'}:{})};
    },
    list:()=>repo.list(),
    review:(id,actor,body)=>repo.review(uuid(id),actor,parseReview(body))
  };
}
