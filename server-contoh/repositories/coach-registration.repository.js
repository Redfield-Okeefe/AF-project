import {randomUUID} from 'node:crypto';
import {tx,audit} from './activation.repository.js';
import {ActivationError,otpCode,equalHash} from '../services/activation.crypto.js';
import {coachOtpHash,canReview} from '../services/coach-registration.validation.js';

const SELECT = "SELECT u.id,u.full_name AS nama,u.email,u.role,u.session_version,CASE WHEN u.status='aktif' THEN 'aktif' ELSE COALESCE(NULLIF(c.registration_review_status,'aktif'),u.status::text) END AS status,c.registration_whatsapp AS wa,c.license_name AS lisensi,c.registration_rejection_reason AS alasan,c.registration_created_at AS dibuat FROM public.users u JOIN public.coach_profiles c ON c.user_id=u.id WHERE u.role='pelatih' AND u.email_verified_at IS NOT NULL";
const lockEmail=(db,email)=>db.query("SELECT pg_advisory_xact_lock(hashtextextended('bnr-account:' || $1::text,0))",[email]);
const findExisting=(db,email)=>db.query('SELECT id FROM public.users WHERE lower(btrim(email))=$1 LIMIT 1',[email]);
const duplicate=()=>new ActivationError(409,'Email sudah digunakan. Silakan login.');
const invalidOtp=()=>new ActivationError(400,'OTP salah, kedaluwarsa, sudah digunakan, atau batas percobaan tercapai.');
export function createCoachRegistrationRepository(pool,{secret,mailer}){
  return {
    async request(email){
      mailer.ready();
      return tx(pool,async db=>{
        await lockEmail(db,email);
        if((await findExisting(db,email)).rowCount)throw duplicate();
        const limits=(await db.query("SELECT count(*)::int AS n,COALESCE(bool_or(created_at>clock_timestamp()-interval '60 seconds'),false) AS cooldown FROM public.auth_challenges WHERE purpose='register_coach' AND lower(btrim(target_email))=$1 AND created_at>clock_timestamp()-interval '1 hour'",[email])).rows[0];
        if(limits.cooldown||limits.n>=5)throw new ActivationError(429,'Tunggu 60 detik; maksimal 5 OTP per jam.');
        await db.query("UPDATE public.auth_challenges SET consumed_at=clock_timestamp() WHERE purpose='register_coach' AND lower(btrim(target_email))=$1 AND consumed_at IS NULL",[email]);
        const id=randomUUID(),code=otpCode();
        await db.query("INSERT INTO public.auth_challenges(id,target_email,purpose,code_hash,expires_at) VALUES($1,$2,'register_coach',$3,clock_timestamp()+interval '5 minutes')",[id,email,coachOtpHash(secret,id,email,code)]);
        await mailer.coachOtp({email,code});
        await audit(db,null,'coach.otp.request','auth_challenges',id);
        return {challenge_id:id,expiresIn:300,resend_after_seconds:60};
      });
    },
    async register({email,nama,wa,lisensi,passwordHash,challengeId,code}){
      try{
        const result=await tx(pool,async db=>{
          await lockEmail(db,email);
          if((await findExisting(db,email)).rowCount)throw duplicate();
          const row=(await db.query("SELECT id,code_hash,attempts,consumed_at,expires_at>clock_timestamp() AS live FROM public.auth_challenges WHERE id=$1 AND purpose='register_coach' AND lower(btrim(target_email))=$2 FOR UPDATE",[challengeId,email])).rows[0];
          if(!row||row.consumed_at||!row.live||row.attempts>=5)return {invalid:true};
          if(!equalHash(row.code_hash,coachOtpHash(secret,challengeId,email,code))){
            await db.query('UPDATE public.auth_challenges SET attempts=attempts+1,consumed_at=CASE WHEN attempts+1>=5 THEN clock_timestamp() ELSE consumed_at END WHERE id=$1 AND purpose=\'register_coach\'',[challengeId]);
            return {invalid:true};
          }
          // Use the existing nonaktif account status until approved. Profile review status tracks pending/rejection separately.
          const account=(await db.query("INSERT INTO public.users(full_name,email,password_hash,role,status,email_verified_at) VALUES($1,$2,$3,'pelatih','nonaktif',clock_timestamp()) RETURNING id",[nama,email,passwordHash])).rows[0];
          await db.query("INSERT INTO public.coach_profiles(user_id,license_name,years_experience,biography,registration_whatsapp,registration_review_status) VALUES($1,$2,0,'',$3,'menunggu')",[account.id,lisensi,wa]);
          await db.query('UPDATE public.auth_challenges SET consumed_at=clock_timestamp() WHERE id=$1 AND purpose=\'register_coach\'',[challengeId]);
          await audit(db,account.id,'coach.registration.complete','users',account.id,{challenge_id:challengeId});
          return {user:(await db.query(SELECT+' AND u.id=$1',[account.id])).rows[0]};
        });
        if(result.invalid)throw invalidOtp();
        return result.user;
      }catch(e){if(e.code==='23505')throw duplicate();throw e;}
    },
    async list(){return (await pool.query(SELECT+' ORDER BY c.registration_created_at DESC,u.id')).rows;},
    async get(id){return (await pool.query(SELECT+' AND u.id=$1',[id])).rows[0]||null;},
    async credentials(email){return (await pool.query(SELECT.replace('SELECT u.id','SELECT u.password_hash,u.id')+' AND lower(btrim(u.email))=$1',[email])).rows[0]||null;},
    async review(id,actor,{status,alasan}){
      return tx(pool,async db=>{
        const owner=await db.query("SELECT id FROM public.users WHERE id=$1 AND role='owner' AND status='aktif' AND email_verified_at IS NOT NULL FOR SHARE",[actor]);
        if(!owner.rowCount)throw new ActivationError(403,'Owner tidak aktif.');
        const row=(await db.query(SELECT+' AND u.id=$1 FOR UPDATE OF u,c',[id])).rows[0];
        if(!row)throw new ActivationError(404,'Pelatih tidak ditemukan.');
        if(!canReview(row.status,status))throw new ActivationError(409,'Perubahan status tidak diizinkan.');
        await db.query(status==='aktif'?"UPDATE public.users SET status='aktif' WHERE id=$1":"UPDATE public.users SET status='nonaktif',session_version=session_version+CASE WHEN status='aktif' THEN 1 ELSE 0 END WHERE id=$1",[id]); 
        await db.query('UPDATE public.coach_profiles SET registration_review_status=$2,registration_rejection_reason=$3 WHERE user_id=$1',[id,status,alasan||null]);
        await audit(db,actor,'coach.review.'+status,'users',id,{previous_status:row.status});
        return (await db.query(SELECT+' AND u.id=$1',[id])).rows[0];
      });
    }
  };
}
