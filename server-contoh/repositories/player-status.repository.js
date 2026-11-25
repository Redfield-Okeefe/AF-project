import {tx,audit} from './activation.repository.js';
import {RegistrationError} from '../validators/registration.validator.js';
const conflict=message=>new RegistrationError(409,message);
export function createPlayerStatusRepository(pool){
 return {
  async change(id,status,actor){
   return tx(pool,async db=>{
    const owner=await db.query("SELECT id FROM public.users WHERE id=$1 AND role='owner' AND status='aktif' AND email_verified_at IS NOT NULL AND session_version=$2 FOR SHARE",[actor.id,actor.session_version]);
    if(!owner.rowCount)throw new RegistrationError(403,'Akun atau sesi Owner tidak aktif.');
    const p=(await db.query("SELECT id,status,user_id FROM public.players WHERE id=$1 FOR UPDATE",[id])).rows[0];
    if(!p)throw new RegistrationError(404,'Pemain tidak ditemukan.');
    if(!['aktif','nonaktif'].includes(p.status)||!['aktif','nonaktif'].includes(status)||p.status===status)throw conflict('Perubahan status pemain tidak diizinkan.');
    const accepted=await db.query("SELECT 1 FROM public.registrations WHERE player_id=$1 AND status='diterima' LIMIT 1",[id]);
    if(!accepted.rowCount)throw conflict('Pemain belum memiliki pendaftaran yang diterima.');
    if(p.user_id){
     const u=(await db.query("SELECT id,status,role,email_verified_at FROM public.users WHERE id=$1 FOR UPDATE",[p.user_id])).rows[0];
     if(!u||u.role!=='pemain'||!u.email_verified_at||!['aktif','nonaktif'].includes(u.status))throw conflict('Akun yang terkait tidak sesuai. Periksa data pemain.');
     // Revoke all pre-existing sessions in both transition directions.
     await db.query("UPDATE public.users SET status=$2,session_version=session_version+1 WHERE id=$1",[p.user_id,status]);
    }
    const updated=(await db.query("UPDATE public.players SET status=$2 WHERE id=$1 RETURNING id,status,user_id",[id,status])).rows[0];
    if(status==='nonaktif'){
     // An invitation issued before deactivation must not work after reactivation.
     await db.query("UPDATE public.account_activation_tokens SET used_at=clock_timestamp() WHERE used_at IS NULL AND registration_id IN (SELECT id FROM public.registrations WHERE player_id=$1)",[id]);
    }
    await audit(db,actor.id,'player.status.change','players',id,{previous_status:p.status,status,account_linked:Boolean(p.user_id)});
    return updated;
   });
  }
 };
}
