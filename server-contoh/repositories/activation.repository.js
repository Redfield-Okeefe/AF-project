import {randomUUID} from 'node:crypto';
import {ActivationError,PURPOSE,LIMITS,activationEmail,tokenHash,inviteToken,otpCode,hashOtp,scopePrefix,otpDecision} from '../services/activation.crypto.js';
export async function tx(pool,fn){
  const db=await pool.connect();
  try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result;}
  catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}
  finally{db.release();}
}
export async function audit(db,actor,action,entity,id,meta={}){
  await db.query('INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)',[actor,action,entity,id,JSON.stringify(meta)]);
}
const invalidInvite=()=>new ActivationError(409,'Undangan tidak berlaku atau pendaftaran belum siap.');
function eligible(row){
  return row&&row.registration_status==='diterima'&&row.player_status==='aktif'&&!row.user_id;
}
// Called in a transaction, with registration/player locked first to serialize
// reissue, request and verify; no cleartext token or OTP is stored.
export async function findInvite(db,hash){
  const ref=(await db.query('SELECT registration_id FROM public.account_activation_tokens WHERE token_hash=$1',[hash])).rows[0];
  if(!ref)throw invalidInvite();
  const r=(await db.query("SELECT r.id,r.registration_number,r.status AS registration_status,p.id AS player_id,p.full_name,p.status AS player_status,p.user_id,p.contact_email FROM public.registrations r JOIN public.players p ON p.id=r.player_id WHERE r.id=$1 FOR UPDATE OF r,p",[ref.registration_id])).rows[0];
  if(!eligible(r))throw invalidInvite();
  const i=(await db.query('SELECT id,registration_id,target_email,used_at,expires_at,expires_at>clock_timestamp() AS live FROM public.account_activation_tokens WHERE token_hash=$1 AND registration_id=$2 FOR UPDATE',[hash,r.id])).rows[0];
  if(!i||i.used_at||!i.live||i.target_email.trim().toLowerCase()!==String(r.contact_email||'').trim().toLowerCase())throw invalidInvite();
  return {...i,registration_number:r.registration_number,player_id:r.player_id,full_name:r.full_name};
}
export function createActivationRepository(pool,{secret,mailer}){
  return {
    async issue(registrationId,actor){
      mailer.ready();
      return tx(pool,async db=>{
        const owner=await db.query("SELECT id FROM public.users WHERE id=$1 AND role='owner' AND status='aktif' AND email_verified_at IS NOT NULL FOR SHARE",[actor]);
        if(!owner.rowCount)throw new ActivationError(403,'Akun Owner tidak aktif.');
        const r=(await db.query("SELECT r.id,r.registration_number,r.status AS registration_status,p.id AS player_id,p.full_name,p.status AS player_status,p.user_id,p.contact_email FROM public.registrations r JOIN public.players p ON p.id=r.player_id WHERE r.id=$1 FOR UPDATE OF r,p",[registrationId])).rows[0];
        if(!r)throw new ActivationError(404,'Pendaftaran tidak ditemukan.');
        if(!eligible(r))throw invalidInvite();
        const email=activationEmail(r.contact_email);
        const recent=await db.query("SELECT 1 FROM public.account_activation_tokens WHERE registration_id=$1 AND created_at>clock_timestamp()-interval '60 seconds' LIMIT 1",[registrationId]);
        if(recent.rowCount)throw new ActivationError(429,'Tunggu 60 detik sebelum membuat undangan baru.');
        // used_at also represents invalidation of an older unused invitation.
        await db.query('UPDATE public.account_activation_tokens SET used_at=clock_timestamp() WHERE registration_id=$1 AND used_at IS NULL',[registrationId]);
        const token=inviteToken();
        const i=(await db.query("INSERT INTO public.account_activation_tokens(registration_id,token_hash,target_email,expires_at) VALUES($1,$2,$3,now()+interval '24 hours') RETURNING id,expires_at",[registrationId,tokenHash(token),email])).rows[0];
        await audit(db,actor,'activation.invite','account_activation_tokens',i.id,{registration_id:registrationId});
        // Bounded local SMTP in the transaction: on SMTP error rollback.
        // Rare commit failure after accepted SMTP can leave an unusable message.
        await mailer.invite({email,number:r.registration_number,token});
        return {registration_id:registrationId,invitation_id:i.id,expires_at:i.expires_at};
      });
    },
    async request({invitationToken,email}){
      mailer.ready();
      const hash=tokenHash(invitationToken);
      return tx(pool,async db=>{
        // Rate limit per email across registrations, also per invitation.
        await db.query("SELECT pg_advisory_xact_lock(hashtextextended('bnr-otp:' || $1::text,0))",[email]);
        const i=await findInvite(db,hash);
        const prefix=scopePrefix(i.id)+'%';
        const count=(await db.query("SELECT count(*)::int AS n,COALESCE(bool_or(created_at>clock_timestamp()-interval '60 seconds'),false) AS cooldown FROM public.auth_challenges WHERE purpose=$1 AND created_at>clock_timestamp()-interval '1 hour' AND (lower(btrim(target_email))=$2 OR code_hash LIKE $3)",[PURPOSE,email,prefix])).rows[0];
        if(count.cooldown||count.n>=LIMITS.maxRequestsPerHour)throw new ActivationError(429,'Tunggu sebelum meminta OTP baru (60 detik; maksimal 5 per jam).');
        // New OTP supersedes any previous challenge for this invitation.
        await db.query("UPDATE public.auth_challenges SET consumed_at=clock_timestamp() WHERE purpose=$1 AND code_hash LIKE $2 AND consumed_at IS NULL",[PURPOSE,prefix]);
        const id=randomUUID(),code=otpCode();
        const challenge=(await db.query("INSERT INTO public.auth_challenges(id,target_email,purpose,code_hash,expires_at) VALUES($1,$2,$3,$4,LEAST(now()+interval '5 minutes',$5::timestamptz)) RETURNING id,expires_at",[id,email,PURPOSE,hashOtp(secret,id,i.id,email,code),i.expires_at])).rows[0];
        await audit(db,null,'activation.otp.request','auth_challenges',id,{invitation_id:i.id});
        await mailer.otp({email,code,number:i.registration_number});
        return {challenge_id:challenge.id,expires_at:challenge.expires_at,resend_after_seconds:LIMITS.cooldownSeconds};
      });
    },
    async verify({invitationToken,email,challengeId,code}){
      mailer.ready();
      const hash=tokenHash(invitationToken);
      const result=await tx(pool,async db=>{
        const i=await findInvite(db,hash);
        const row=(await db.query("SELECT id,target_email,purpose,code_hash,attempts,consumed_at,expires_at>clock_timestamp() AS live FROM public.auth_challenges WHERE id=$1 AND purpose=$2 AND lower(btrim(target_email))=$3 FOR UPDATE",[challengeId,PURPOSE,email])).rows[0];
        const expected=hashOtp(secret,challengeId,i.id,email,code);
        const decision=otpDecision(row,expected,i.id);
        if(decision==='unavailable')return {error:true};
        if(decision==='incorrect'){
          // Return error after commit so attempts are not rolled back.
          await db.query('UPDATE public.auth_challenges SET attempts=attempts+1,consumed_at=CASE WHEN attempts+1 >= $2 THEN clock_timestamp() ELSE consumed_at END WHERE id=$1',[challengeId,LIMITS.maxAttempts]);
          return {error:true};
        }
        await db.query('UPDATE public.auth_challenges SET consumed_at=clock_timestamp() WHERE id=$1',[challengeId]);
        await audit(db,null,'activation.otp.verify','auth_challenges',challengeId,{invitation_id:i.id});
        return {challengeId,invitationId:i.id,email,registrationId:i.registration_id};
      });
      if(result.error)throw new ActivationError(400,'OTP tidak valid, kedaluwarsa, sudah digunakan, atau batas percobaan tercapai.');
      return result;
    }
  };
}
