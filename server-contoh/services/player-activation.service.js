import bcrypt from 'bcryptjs';
import {validateCoachPassword} from './coach-registration.validation.js';
import {ActivationError,activationEmail,tokenHash} from './activation.crypto.js';
import {readVerificationProof} from './activation.service.js';
export function validatePassword(password,confirmation){
  return validateCoachPassword(password,confirmation);
}
export function createPlayerActivationService(repo,config,mailer,{hashPassword=password=>bcrypt.hash(password,12)}={}){
  return {
    async activate(body){
      if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.verification_token!=='string'||!body.verification_token||body.verification_token.length>4096)throw new ActivationError(400,'Undangan dan bukti verifikasi wajib diisi.');
      const invitationHash=tokenHash(body.invitation_token);
      const password=validatePassword(body.password,body.password_confirmation);
      mailer.ready(); // local-only; no SMTP message is sent during account creation
      let proof=readVerificationProof(body.verification_token,config);
      if(body.email!==undefined&&activationEmail(body.email)!==proof.email)throw new ActivationError(400,'Email login harus sama dengan email yang diverifikasi.');
      // Reject attempts to select role or player identity from the public form.
      if(['role','status','user_id','player_id','registration_id','full_name','password_hash'].some(k=>Object.hasOwn(body,k)))throw new ActivationError(400,'Identitas dan role ditentukan oleh undangan.');
      const passwordHash=await hashPassword(password);
      // Recheck expiry after expensive hashing.
      proof=readVerificationProof(body.verification_token,config);
      return repo.activate({...proof,invitationHash,passwordHash});
    }
  };
}
