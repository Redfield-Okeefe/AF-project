import {ActivationError,PURPOSE,scopePrefix,LIMITS} from '../services/activation.crypto.js';
import {tx,audit,findInvite} from './activation.repository.js';
const invalid=()=>new ActivationError(409,'Undangan atau verifikasi tidak berlaku lagi. Minta undangan/OTP baru.');
export function createPlayerActivationRepository(pool){
  return {
    async activate({invitationHash,invitationId,registrationId,challengeId,email,passwordHash}){
      try{
        return await tx(pool,async db=>{
          // Global email namespace for current and future account creation flows.
          await db.query("SELECT pg_advisory_xact_lock(hashtextextended('bnr-account:' || $1::text,0))",[email]);
          // Locks registration, player and invitation. Shared with issue/request/verify.
          const invitation=await findInvite(db,invitationHash);
          if(invitation.id!==invitationId||invitation.registration_id!==registrationId)throw invalid();
          const challenge=(await db.query("SELECT id,target_email,consumed_at,attempts,consumed_at>clock_timestamp()-interval '10 minutes' AS proof_live FROM public.auth_challenges WHERE purpose=$1 AND code_hash LIKE $2 ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE",[PURPOSE,scopePrefix(invitationId)+'%'])).rows[0];
          // A newer request invalidates an earlier proof, even if it had been verified.
          if(!challenge||challenge.id!==challengeId||String(challenge.target_email).trim().toLowerCase()!==email||!challenge.consumed_at||!challenge.proof_live||challenge.attempts>=LIMITS.maxAttempts)throw invalid();
          // Distinguish successful verification from consumed-by-resend/attempt-limit.
          const verified=await db.query("SELECT 1 FROM public.audit_logs WHERE action='activation.otp.verify' AND entity_type='auth_challenges' AND entity_id=$1 AND metadata->>'invitation_id'=$2 LIMIT 1",[challengeId,invitationId]);
          if(!verified.rowCount)throw invalid();
          const existing=await db.query('SELECT id FROM public.users WHERE lower(btrim(email))=$1 LIMIT 1',[email]);
          if(existing.rowCount)throw new ActivationError(409,'Email login sudah digunakan. Pilih email berbeda dan lakukan verifikasi ulang.');
          // Values never come from public role/status or name fields.
          let account;
          try{
            account=(await db.query("INSERT INTO public.users(full_name,email,password_hash,role,status,email_verified_at) VALUES($1,$2,$3,'pemain','aktif',clock_timestamp()) RETURNING id,full_name,email,role,status,email_verified_at",[invitation.full_name,email,passwordHash])).rows[0];
          }catch(error){
            if(error.code==='23505')throw new ActivationError(409,'Email login sudah digunakan.');
            throw error;
          }
          const linked=await db.query("UPDATE public.players SET user_id=$1 WHERE id=$2 AND user_id IS NULL AND status='aktif' RETURNING id,student_code",[account.id,invitation.player_id]);
          if(linked.rowCount!==1)throw invalid();
          const consumed=await db.query("UPDATE public.account_activation_tokens SET used_at=clock_timestamp() WHERE id=$1 AND used_at IS NULL AND expires_at>clock_timestamp() RETURNING id",[invitationId]);
          if(consumed.rowCount!==1)throw invalid();
          // No login JWT in this response; use the existing login flow.
          await audit(db,account.id,'activation.player.complete','users',account.id,{registration_id:registrationId,player_id:linked.rows[0].id,invitation_id:invitationId,challenge_id:challengeId});
          return {account_created:true,user:account,player:{id:linked.rows[0].id,student_code:linked.rows[0].student_code}};
        });
      }catch(error){throw error;}
    }
  };
}
