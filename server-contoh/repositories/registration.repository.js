import {randomUUID} from 'node:crypto';
import {RegistrationError,checkProgram} from '../validators/registration.validator.js';
const registrationFields='r.id,r.registration_number,r.player_id,r.program_id,r.status,r.submitted_at,r.reviewed_by,r.reviewed_at,r.review_note,p.full_name,p.birth_date::text AS birth_date,p.gender,pr.name AS program_name,p.status AS player_status';
const registrationFrom=' FROM public.registrations r JOIN public.players p ON p.id=r.player_id JOIN public.programs pr ON pr.id=r.program_id';
const playerFields='p.id,p.student_code,p.user_id,p.full_name,p.gender,p.birth_date::text AS birth_date,p.status,p.created_at';
const details='p.birth_place,p.school_name,p.guardian_name,p.contact_email,p.contact_phone,p.address,p.jersey_size,p.notes';
async function tx(pool,fn){
  const client=await pool.connect();
  try {await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
}
async function audit(db,actor,action,id,metadata){
  await db.query('INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)',
    [actor,action,'registrations',id,JSON.stringify(metadata)]);
}
export function createRegistrationRepository(pool){
  return {
    async listPrograms(){
      return (await pool.query("SELECT id,name,description,min_age_years,max_age_years,weekly_sessions,display_fee FROM public.programs WHERE status='aktif' ORDER BY name,id")).rows;
    },
    async create(data){
      return tx(pool,async db=>{
        // Serialize attempts using normalized name + DOB, not shared family contact.
        await db.query("SELECT pg_advisory_xact_lock(hashtextextended(lower(regexp_replace(btrim($1::text),'[[:space:]]+',' ','g')) || '|' || $2::text,0))",[data.full_name,data.birth_date]);
        const program=(await db.query('SELECT id,status,min_age_years,max_age_years FROM public.programs WHERE id=$1 FOR SHARE',[data.program_id])).rows[0];
        checkProgram(program,data.age);
        const duplicate=await db.query("SELECT id FROM public.players WHERE lower(regexp_replace(btrim(full_name),'[[:space:]]+',' ','g'))=lower(regexp_replace(btrim($1::text),'[[:space:]]+',' ','g')) AND birth_date=$2::date LIMIT 1",[data.full_name,data.birth_date]);
        // Never overwrite/link an existing person from an unauthenticated form.
        if(duplicate.rowCount)throw new RegistrationError(409,'Pendaftaran belum dapat diproses. Hubungi akademi untuk pemeriksaan data.');
        const p=(await db.query(
          "INSERT INTO public.players(full_name,gender,birth_date,birth_place,school_name,guardian_name,contact_email,contact_phone,address,jersey_size,notes,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'calon') RETURNING id",
          [data.full_name,data.gender,data.birth_date,data.birth_place,data.school_name,data.guardian_name,data.contact_email,data.contact_phone,data.address,data.jersey_size,data.notes])).rows[0];
        const number='REG-'+randomUUID().replace(/-/g,''); // 36 chars, not a public access token
        const r=(await db.query("INSERT INTO public.registrations(registration_number,player_id,program_id,status) VALUES($1,$2,$3,'menunggu') RETURNING id,registration_number,status,submitted_at",[number,p.id,program.id])).rows[0];
        await audit(db,null,'registration.submit',r.id,{program_id:program.id});
        // Return receipt only; no public lookup by predictable personal attributes.
        return r;
      });
    },
    async listRegistrations({status,limit,offset}){
      return (await pool.query('SELECT '+registrationFields+registrationFrom+' WHERE ($1::text IS NULL OR r.status=$1) ORDER BY r.submitted_at DESC,r.id LIMIT $2 OFFSET $3',[status,limit,offset])).rows;
    },
    async registrationDetail(id){
      const r=(await pool.query('SELECT '+registrationFields+','+details+registrationFrom+' WHERE r.id=$1',[id])).rows[0];
      if(!r)throw new RegistrationError(404,'Pendaftaran tidak ditemukan.');
      return r;
    },
    async listPlayers({status,limit,offset}){
      return (await pool.query('SELECT '+playerFields+' FROM public.players p WHERE ($1::text IS NULL OR p.status=$1) ORDER BY p.created_at DESC,p.id LIMIT $2 OFFSET $3',[status,limit,offset])).rows;
    },
    async playerDetail(id){
      const p=(await pool.query('SELECT '+playerFields+','+details+' FROM public.players p WHERE p.id=$1',[id])).rows[0];
      if(!p)throw new RegistrationError(404,'Pemain tidak ditemukan.');
      return p;
    },
    async review(id,decision,note,actor){
      return tx(pool,async db=>{
        // Recheck Owner inside write transaction. Lock until commit.
        const user=await db.query("SELECT id FROM public.users WHERE id=$1 AND role='owner' AND status='aktif' AND email_verified_at IS NOT NULL FOR SHARE",[actor]);
        if(!user.rowCount)throw new RegistrationError(403,'Akun Owner tidak aktif.');
        const item=(await db.query("SELECT r.id,r.status,r.player_id,r.program_id,p.status AS player_status,p.user_id,p.student_code FROM public.registrations r JOIN public.players p ON p.id=r.player_id WHERE r.id=$1 FOR UPDATE OF r,p",[id])).rows[0];
        if(!item)throw new RegistrationError(404,'Pendaftaran tidak ditemukan.');
        if(item.status!=='menunggu'||item.player_status!=='calon'||item.user_id)throw new RegistrationError(409,'Pendaftaran sudah diproses atau status pemain tidak sesuai.');
        if(decision==='diterima'){
          const program=(await db.query('SELECT status FROM public.programs WHERE id=$1 FOR SHARE',[item.program_id])).rows[0];
          if(program?.status!=='aktif')throw new RegistrationError(409,'Program sudah tidak aktif. Periksa kembali pendaftaran.');
          const other=await db.query("SELECT id FROM public.registrations WHERE player_id=$1 AND status='diterima' LIMIT 1",[item.player_id]);
          if(other.rowCount)throw new RegistrationError(409,'Pemain sudah memiliki pendaftaran diterima.');
          await db.query("UPDATE public.players SET status='aktif',student_code=COALESCE(student_code,$2) WHERE id=$1",[item.player_id,'BNR-'+item.player_id.replace(/-/g,'').slice(0,26)]);
        }
        // Rejection preserves candidate biodata for history; no login is created.
        const r=(await db.query('UPDATE public.registrations SET status=$2,reviewed_by=$3,reviewed_at=now(),review_note=$4 WHERE id=$1 RETURNING id,registration_number,player_id,status,reviewed_at',[id,decision,actor,note])).rows[0];
        await audit(db,actor,decision==='diterima'?'registration.approve':'registration.reject',id,{previous_status:'menunggu',status:decision});
        return {...r,player_status:decision==='diterima'?'aktif':'calon',account_created:false};
      });
    }
  };
}
