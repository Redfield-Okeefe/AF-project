import {randomUUID} from 'node:crypto';
import {tx,audit} from './activation.repository.js';
import {ActivationError,LIMITS,otpCode,equalHash} from '../services/activation.crypto.js';
import {RESET,resetHash} from '../services/account-security.service.js';
const lock=(db,email)=>db.query("SELECT pg_advisory_xact_lock(hashtextextended('bnr-reset:' || $1::text,0))",[email]);
const lookup=(db,email,role)=>db.query("SELECT id,session_version FROM public.users WHERE lower(btrim(email))=$1 AND role=$2 AND email_verified_at IS NOT NULL FOR UPDATE",[email,role]);
const invalid=()=>new ActivationError(400,'OTP tidak valid, kedaluwarsa atau sudah digunakan.');
const response=id=>({challenge_id:id,expiresIn:300,resend_after_seconds:60,message:'Jika akun terdaftar dan terverifikasi, kode akan dikirim ke email.'});
export function createAccountSecurityRepository(pool,{secret,mailer}){
 return {
 async request({email,role}){
   mailer.ready();const id=randomUUID(),code=otpCode();
   return tx(pool,async db=>{
     await lock(db,email);
     const limits=(await db.query("SELECT count(*)::int AS n,COALESCE(bool_or(created_at>clock_timestamp()-interval '60 seconds'),false) AS cooldown FROM public.auth_challenges WHERE purpose=$1 AND lower(btrim(target_email))=$2 AND created_at>clock_timestamp()-interval '1 hour'",[RESET,email])).rows[0];
     if(limits.cooldown||limits.n>=LIMITS.maxRequestsPerHour)throw new ActivationError(429,'Tunggu 60 detik; maksimal 5 permintaan per jam.');
     const row=(await lookup(db,email,role)).rows[0];
     await db.query('UPDATE public.auth_challenges SET consumed_at=clock_timestamp() WHERE purpose=$1 AND lower(btrim(target_email))=$2 AND consumed_at IS NULL',[RESET,email]);
     await db.query("INSERT INTO public.auth_challenges(id,target_email,purpose,code_hash,expires_at) VALUES($1,$2,$3,$4,clock_timestamp()+interval '5 minutes')",[id,email,RESET,resetHash(secret,id,email,role,Number(row?.session_version??-1),code)]);
     if(row){
       try{await mailer.resetOtp({email,code});}
       catch{await db.query('UPDATE public.auth_challenges SET consumed_at=clock_timestamp() WHERE id=$1 AND purpose=$2',[id,RESET]);}
       await audit(db,row.id,'auth.reset.request','auth_challenges',id);
     }
     return response(id);
   });
 },
 async reset({email,role,challengeId,code,passwordHash}){
   const r=await tx(pool,async db=>{
     await lock(db,email);
     const user=(await lookup(db,email,role)).rows[0];
     const row=(await db.query("SELECT id,code_hash,attempts,consumed_at,expires_at>clock_timestamp() AS live FROM public.auth_challenges WHERE id=$1 AND purpose=$2 AND lower(btrim(target_email))=$3 FOR UPDATE",[challengeId,RESET,email])).rows[0];
     if(!row||row.consumed_at||!row.live||row.attempts>=LIMITS.maxAttempts)return false;
     if(!user||!equalHash(row.code_hash,resetHash(secret,challengeId,email,role,Number(user.session_version),code))){
       await db.query('UPDATE public.auth_challenges SET attempts=attempts+1,consumed_at=CASE WHEN attempts+1>=5 THEN clock_timestamp() ELSE consumed_at END WHERE id=$1 AND purpose=$2',[challengeId,RESET]);return false;
     }
     await db.query('UPDATE public.users SET password_hash=$2,password_changed_at=clock_timestamp(),session_version=session_version+1 WHERE id=$1',[user.id,passwordHash]);
     await db.query('UPDATE public.auth_challenges SET consumed_at=clock_timestamp() WHERE id=$1 AND purpose=$2',[challengeId,RESET]);
     await audit(db,user.id,'auth.password.reset','users',user.id);return true;
   });
   if(!r)throw invalid();return {message:'Password berhasil diperbarui. Silakan login kembali.'};
 },
 async credentials(id){return (await pool.query('SELECT password_hash,session_version FROM public.users WHERE id=$1',[id])).rows[0];},
 async change({id,version,oldHash,newHash}){
   return tx(pool,async db=>{
     const r=await db.query("UPDATE public.users SET password_hash=$4,password_changed_at=clock_timestamp(),session_version=session_version+1 WHERE id=$1 AND session_version=$2 AND password_hash=$3 AND status='aktif' RETURNING id",[id,version,oldHash,newHash]);
     if(!r.rowCount)throw new ActivationError(401,'Sesi tidak berlaku. Silakan login kembali.');
     await audit(db,id,'auth.password.change','users',id);return {message:'Password diperbarui. Silakan login kembali.'};
   });
 },
 async logout({id,role,version}){
   return tx(pool,async db=>{
     const r=await db.query('UPDATE public.users SET session_version=session_version+1 WHERE id=$1 AND role=$2 AND session_version=$3 RETURNING id',[id,role,version]);
     if(!r.rowCount)throw new ActivationError(401,'Sesi sudah berakhir.');
     await audit(db,id,'auth.logout','users',id);return {message:'Semua sesi akun diakhiri.'};
   });
 }
 };
}
