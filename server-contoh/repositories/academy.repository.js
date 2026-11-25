import {tx,audit} from './activation.repository.js';
import {ApiError} from '../services/auth.service.js';
import {eligibility} from '../services/academy.validation.js';
const fail=(status,message)=>{throw new ApiError(status,message)};
const one=async(db,sql,args=[]) => (await db.query(sql,args)).rows[0];
const rows=async(db,sql,args=[]) => (await db.query(sql,args)).rows;
const today="(clock_timestamp() AT TIME ZONE 'Asia/Jakarta')::date";
const now="(clock_timestamp() AT TIME ZONE 'Asia/Jakarta')";
const active=(alias,day)=>alias+'.start_date<='+day+' AND ('+alias+'.end_date IS NULL OR '+alias+'.end_date>='+day+')';
const liveCoach=(alias)=>alias+".role='pelatih' AND "+alias+".status='aktif' AND "+alias+".email_verified_at IS NOT NULL";
const classSelect="c.id,c.name,c.program_id,c.min_age_years,c.max_age_years,c.gender_category,c.capacity,c.status,pr.name AS program_name";
const sessionSelect="s.id,s.class_id,c.name AS class_name,s.session_type,s.title,s.session_date::text AS session_date,to_char(s.start_time,'HH24:MI') AS start_time,to_char(s.end_time,'HH24:MI') AS end_time,s.venue,s.status,s.notes";
const accepted="EXISTS(SELECT 1 FROM public.registrations r WHERE r.player_id=p.id AND r.status='diterima')";
async function actorCheck(db,u){const actor=await one(db,"SELECT id FROM public.users WHERE id=$1 AND role=$2 AND status='aktif' AND session_version=$3 AND email_verified_at IS NOT NULL FOR SHARE",[u.id,u.role,u.session_version]);if(!actor)fail(401,'Sesi tidak berlaku.');}
async function locked(pool,u,fn){
 try{return await tx(pool,async db=>{await db.query("SELECT pg_advisory_xact_lock(hashtext('bnr-academy-phase-456'))");await actorCheck(db,u);return fn(db);});}
 catch(e){if(e.code==='23505')fail(409,'Data sudah ada atau relasi aktif bertabrakan.');if(e.code==='40P01'||e.code==='40001')fail(409,'Data sedang berubah. Muat ulang dan coba lagi.');throw e;}
}
function owner(u){if(u.role!=='owner')fail(403,'Hanya Owner.');}
function coach(u){if(u.role!=='pelatih')fail(403,'Hanya Pelatih.');}
async function klass(db,id){const c=await one(db,"SELECT * FROM public.classes WHERE id=$1 FOR UPDATE",[id]);if(!c)fail(404,'Kelas tidak ditemukan.');return c;}
async function program(db,id){const p=await one(db,"SELECT * FROM public.programs WHERE id=$1 FOR SHARE",[id]);if(!p||p.status!=='aktif')fail(409,'Program tidak aktif.');return p;}
async function classReady(db,id){const c=await klass(db,id);if(c.status!=='aktif')fail(409,'Kelas tidak aktif.');if(!c.program_id)fail(409,'Kelas belum memiliki program.');await program(db,c.program_id);return c;}
async function accessCoach(db,u,cid,day){
 coach(u);
 const a=await one(db,"SELECT a.id FROM public.coach_assignments a WHERE a.class_id=$1 AND a.coach_user_id=$2 AND "+active('a',today)+" AND "+active('a','$3::date')+" LIMIT 1",[cid,u.id,day]);
 if(!a)fail(403,'Kelas atau tanggal sesi di luar penugasan Anda.');
}
async function session(db,id){const s=await one(db,"SELECT id,class_id,session_date::text AS session_date,start_time,end_time,status FROM public.training_sessions WHERE id=$1 FOR UPDATE",[id]);if(!s)fail(404,'Sesi tidak ditemukan.');return s;}
async function noAttendance(db,id){if(await one(db,"SELECT id FROM public.attendance WHERE session_id=$1 LIMIT 1",[id]))fail(409,'Sesi sudah memiliki absensi.');}
async function roster(db,s){return rows(db,"SELECT DISTINCT p.id AS player_id,p.full_name,p.student_code,a.status,a.notes FROM public.class_enrollments e JOIN public.players p ON p.id=e.player_id LEFT JOIN public.attendance a ON a.player_id=p.id AND a.session_id=$1 WHERE e.class_id=$2 AND "+active('e','$3::date')+" AND "+accepted+" ORDER BY p.full_name,p.id",[s.id,s.class_id,s.session_date]);}
async function conflict(db,v,exclude=null){
 // All class/assignment/session writes share an advisory transaction lock.
 const r=await one(db,"SELECT s.id FROM public.training_sessions s WHERE ($1::uuid IS NULL OR s.id<>$1) AND s.status<>'dibatalkan' AND s.session_date=$2::date AND s.start_time<$4::time AND s.end_time>$3::time AND (s.class_id=$5 OR lower(btrim(s.venue))=lower(btrim($6)) OR EXISTS(SELECT 1 FROM public.coach_assignments a JOIN public.coach_assignments b ON b.coach_user_id=a.coach_user_id WHERE a.class_id=$5 AND b.class_id=s.class_id AND "+active('a','$2::date')+" AND "+active('b','$2::date')+")) LIMIT 1",[exclude,v.session_date,v.start_time,v.end_time,v.class_id,v.venue]);
 if(r)fail(409,'Jadwal bertabrakan dengan kelas, pelatih, atau lokasi.');
}
function scope(u,kind){
 if(u.role==='owner')return {sql:'TRUE',args:[]};
 const day=kind==='session'?'s.session_date':today;
 if(u.role==='pelatih')return {sql:"EXISTS(SELECT 1 FROM public.coach_assignments a WHERE a.class_id=c.id AND a.coach_user_id=$1 AND "+active('a',today)+" AND "+active('a',day)+")",args:[u.id]};
 return {sql:"EXISTS(SELECT 1 FROM public.class_enrollments e JOIN public.players p ON p.id=e.player_id WHERE e.class_id=c.id AND p.user_id=$1 AND p.status='aktif' AND "+active('e',day)+")",args:[u.id]};
}
export function createAcademyRepository(pool){
 return {
 async programs(u){owner(u);return rows(pool,"SELECT id,name,description,min_age_years,max_age_years,weekly_sessions,display_fee,status FROM public.programs ORDER BY name");},
 saveProgram(u,v,pid=null){owner(u);return locked(pool,u,async db=>{
   let p;if(pid){p=await one(db,"SELECT * FROM public.programs WHERE id=$1 FOR UPDATE",[pid]);if(!p||p.status!=='aktif')fail(409,'Program tidak aktif.');if((p.min_age_years!==v.min_age_years||p.max_age_years!==v.max_age_years)&&await one(db,"SELECT id FROM public.classes WHERE program_id=$1 AND status='aktif' LIMIT 1",[pid]))fail(409,'Rentang usia program tidak dapat diubah selama masih memiliki kelas aktif.');}
   const args=[v.name,v.description,v.min_age_years,v.max_age_years,v.weekly_sessions,v.display_fee];
   const r=pid?await one(db,"UPDATE public.programs SET name=$1,description=$2,min_age_years=$3,max_age_years=$4,weekly_sessions=$5,display_fee=$6 WHERE id=$7 RETURNING id",[...args,pid]):await one(db,"INSERT INTO public.programs(name,description,min_age_years,max_age_years,weekly_sessions,display_fee) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",args);
   await audit(db,u.id,pid?'program.update':'program.create','programs',r.id);return r;
 });},
 programStatus(u,pid,status){owner(u);return locked(pool,u,async db=>{
   const p=await one(db,"SELECT id,status FROM public.programs WHERE id=$1 FOR UPDATE",[pid]);if(!p)fail(404,'Program tidak ditemukan.');if(status==='arsip'&&(await one(db,"SELECT id FROM public.classes WHERE program_id=$1 AND status='aktif' LIMIT 1",[pid])||await one(db,"SELECT id FROM public.registrations WHERE program_id=$1 AND status='menunggu' LIMIT 1",[pid])))fail(409,'Masih ada kelas aktif atau pendaftaran menunggu.');
   await db.query("UPDATE public.programs SET status=$2 WHERE id=$1",[pid,status]);await audit(db,u.id,'program.status','programs',pid,{status});return {id:pid,status};
 });},
 async classes(u){const x=scope(u,'class');return rows(pool,"SELECT "+classSelect+" FROM public.classes c LEFT JOIN public.programs pr ON pr.id=c.program_id WHERE "+x.sql+" AND "+(u.role==='owner'?'TRUE':"c.status='aktif'")+" ORDER BY c.name",x.args);},
 async options(u){owner(u);const [coaches,players]=await Promise.all([rows(pool,"SELECT u.id,u.full_name,u.email FROM public.users u JOIN public.coach_profiles cp ON cp.user_id=u.id WHERE "+liveCoach('u')+" AND COALESCE(cp.registration_review_status,'aktif')='aktif' ORDER BY u.full_name"),rows(pool,"SELECT p.id,p.full_name,p.student_code FROM public.players p WHERE p.status='aktif' AND "+accepted+" ORDER BY p.full_name")]);return {coaches,players};},
 async members(u,cid){owner(u);const [coaches,players]=await Promise.all([rows(pool,"SELECT a.id,a.coach_user_id,u.full_name,a.assignment_type,a.start_date::text AS start_date,a.end_date::text AS end_date,u.status FROM public.coach_assignments a JOIN public.users u ON u.id=a.coach_user_id WHERE a.class_id=$1 ORDER BY a.end_date NULLS FIRST,a.start_date DESC",[cid]),rows(pool,"SELECT e.id,e.player_id,p.full_name,p.student_code,p.status,e.start_date::text AS start_date,e.end_date::text AS end_date FROM public.class_enrollments e JOIN public.players p ON p.id=e.player_id WHERE e.class_id=$1 ORDER BY e.end_date NULLS FIRST,e.start_date DESC",[cid])]);return {coaches,players};},
 saveClass(u,v,cid=null){owner(u);return locked(pool,u,async db=>{
   const p=await program(db,v.program_id);
   if((v.min_age_years!=null&&p.min_age_years!=null&&v.min_age_years<p.min_age_years)||(v.max_age_years!=null&&p.max_age_years!=null&&v.max_age_years>p.max_age_years)||(v.min_age_years!=null&&p.max_age_years!=null&&v.min_age_years>p.max_age_years)||(v.max_age_years!=null&&p.min_age_years!=null&&v.max_age_years<p.min_age_years))fail(409,'Rentang usia kelas harus sesuai program.');
   if(cid){const c=await klass(db,cid);if(c.status!=='aktif')fail(409,'Aktifkan kelas terlebih dahulu.');const n=await one(db,"SELECT count(*)::int AS n FROM public.class_enrollments WHERE class_id=$1 AND (end_date IS NULL OR end_date>="+today+")",[cid]);if(n.n&&(c.program_id!==v.program_id||c.min_age_years!==v.min_age_years||c.max_age_years!==v.max_age_years||c.gender_category!==v.gender_category))fail(409,'Tutup keanggotaan sebelum mengubah program, usia, atau kategori.');if(v.capacity!=null&&n.n>v.capacity)fail(409,'Kapasitas lebih kecil dari keanggotaan yang masih berlaku.');}
   const args=[v.program_id,v.name,v.min_age_years,v.max_age_years,v.gender_category,v.capacity];
   const r=cid?await one(db,"UPDATE public.classes SET program_id=$1,name=$2,min_age_years=$3,max_age_years=$4,gender_category=$5,capacity=$6 WHERE id=$7 RETURNING id",[...args,cid]):await one(db,"INSERT INTO public.classes(program_id,name,min_age_years,max_age_years,gender_category,capacity,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",[...args,u.id]);
   await audit(db,u.id,cid?'class.update':'class.create','classes',r.id);return r;
 });},
 classStatus(u,cid,status){owner(u);return locked(pool,u,async db=>{
   const c=await klass(db,cid);
   if(status==='aktif'){if(!c.program_id)fail(409,'Kelas belum memiliki program.');await program(db,c.program_id);}
   else if(await one(db,"SELECT id FROM public.class_enrollments WHERE class_id=$1 AND (end_date IS NULL OR end_date>="+today+") UNION ALL SELECT id FROM public.coach_assignments WHERE class_id=$1 AND (end_date IS NULL OR end_date>="+today+") UNION ALL SELECT id FROM public.training_sessions WHERE class_id=$1 AND status='terjadwal' LIMIT 1",[cid]))fail(409,'Tutup penugasan/keanggotaan dan selesaikan atau batalkan jadwal dahulu.');
   await db.query("UPDATE public.classes SET status=$2 WHERE id=$1",[cid,status]);await audit(db,u.id,'class.status','classes',cid,{status});return {id:cid,status};
 });},
 enroll(u,cid,v){owner(u);return locked(pool,u,async db=>{
   const c=await classReady(db,cid),pr=await program(db,c.program_id);
   const p=await one(db,"SELECT p.id,p.status,p.birth_date::text AS birth_date,p.gender FROM public.players p WHERE p.id=$1 AND "+accepted+" AND EXISTS(SELECT 1 FROM public.registrations r WHERE r.player_id=p.id AND r.status='diterima' AND r.program_id=$2) FOR UPDATE",[v.target,c.program_id]);
   if(!p)fail(409,'Pemain harus memiliki pendaftaran diterima untuk program kelas.');eligibility(p,c,pr,v.start_date);
   if(await one(db,"SELECT id FROM public.class_enrollments WHERE player_id=$1 AND (end_date IS NULL OR end_date>=$2::date) LIMIT 1",[p.id,v.start_date]))fail(409,'Pemain memiliki periode kelas yang bertumpuk. Tutup periode lama dahulu.');
   const n=await one(db,"SELECT count(*)::int AS n FROM public.class_enrollments WHERE class_id=$1 AND (end_date IS NULL OR end_date>=$2::date)",[cid,v.start_date]);if(c.capacity!=null&&n.n>=c.capacity)fail(409,'Kapasitas kelas penuh.');
   const r=await one(db,"INSERT INTO public.class_enrollments(player_id,class_id,start_date,assigned_by) VALUES($1,$2,$3,$4) RETURNING id",[p.id,cid,v.start_date,u.id]);await audit(db,u.id,'class.enroll','class_enrollments',r.id,{class_id:cid,player_id:p.id});return r;
 });},
 assign(u,cid,v){owner(u);return locked(pool,u,async db=>{
   await classReady(db,cid);
   if(!await one(db,"SELECT u.id FROM public.users u JOIN public.coach_profiles cp ON cp.user_id=u.id WHERE u.id=$1 AND "+liveCoach('u')+" AND COALESCE(cp.registration_review_status,'aktif')='aktif' FOR SHARE OF u,cp",[v.target]))fail(409,'Pelatih tidak aktif atau belum disetujui.');
   if(await one(db,"SELECT id FROM public.coach_assignments WHERE class_id=$1 AND (coach_user_id=$2 OR ($3='utama' AND assignment_type='utama')) AND (end_date IS NULL OR end_date>=$4::date) LIMIT 1",[cid,v.target,v.assignment_type,v.start_date]))fail(409,'Penugasan pelatih bertumpuk.');
   // Reject adding a coach when already scheduled classes overlap.
   if(await one(db,"SELECT x.id FROM public.training_sessions x JOIN public.training_sessions y ON y.class_id<>x.class_id AND y.session_date=x.session_date AND y.start_time<x.end_time AND y.end_time>x.start_time JOIN public.coach_assignments a ON a.class_id=y.class_id AND a.coach_user_id=$2 WHERE x.class_id=$1 AND x.session_date>=$3::date AND x.status<>'dibatalkan' AND y.status<>'dibatalkan' AND "+active('a','x.session_date')+" LIMIT 1",[cid,v.target,v.start_date]))fail(409,'Penugasan menyebabkan benturan jadwal pelatih.');
   const r=await one(db,"INSERT INTO public.coach_assignments(class_id,coach_user_id,assignment_type,start_date,assigned_by) VALUES($1,$2,$3,$4,$5) RETURNING id",[cid,v.target,v.assignment_type,v.start_date,u.id]);await audit(db,u.id,'class.assign','coach_assignments',r.id,{class_id:cid,coach_user_id:v.target});return r;
 });},
 endMembership(u,cid,mid,end,isCoach){owner(u);return locked(pool,u,async db=>{
   await klass(db,cid);const table=isCoach?'coach_assignments':'class_enrollments';
   const m=await one(db,"SELECT *,start_date::text AS start_day FROM public."+table+" WHERE id=$1 AND class_id=$2 FOR UPDATE",[mid,cid]);if(!m)fail(404,'Relasi tidak ditemukan.');if(m.end_date!=null||end<m.start_day)fail(409,'Periode sudah ditutup atau tanggal akhir sebelum mulai.');
   if(!isCoach&&await one(db,"SELECT a.id FROM public.attendance a JOIN public.training_sessions s ON s.id=a.session_id WHERE s.class_id=$1 AND a.player_id=$2 AND s.session_date>$3::date LIMIT 1",[cid,m.player_id,end]))fail(409,'Ada absensi setelah tanggal akhir.');
   await db.query("UPDATE public."+table+" SET end_date=$2 WHERE id=$1",[mid,end]);await audit(db,u.id,'class.membership.end',table,mid,{class_id:cid,end_date:end});return {id:mid,end_date:end};
 });},
 async sessions(u){const x=scope(u,'session');return rows(pool,"SELECT "+sessionSelect+" FROM public.training_sessions s JOIN public.classes c ON c.id=s.class_id WHERE "+x.sql+" ORDER BY s.session_date DESC,s.start_time DESC",x.args);},
 saveSession(u,v,sid=null){coach(u);return locked(pool,u,async db=>{
   await classReady(db,v.class_id);await accessCoach(db,u,v.class_id,v.session_date);
   if(sid){const s=await session(db,sid);if(s.class_id!==v.class_id)fail(409,'Kelas sesi tidak boleh diubah.');await accessCoach(db,u,s.class_id,s.session_date);if(s.status!=='terjadwal')fail(409,'Sesi sudah selesai atau dibatalkan.');await noAttendance(db,sid);}
   // Permit backfill of an earlier session during the current assignment for attendance testing/history.
   await conflict(db,v,sid);
   const args=[v.class_id,v.session_type,v.title,v.session_date,v.start_time,v.end_time,v.venue,v.notes];
   const r=sid?await one(db,"UPDATE public.training_sessions SET class_id=$1,session_type=$2,title=$3,session_date=$4,start_time=$5,end_time=$6,venue=$7,notes=$8 WHERE id=$9 RETURNING id",[...args,sid]):await one(db,"INSERT INTO public.training_sessions(class_id,session_type,title,session_date,start_time,end_time,venue,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",[...args,u.id]);await audit(db,u.id,sid?'session.update':'session.create','training_sessions',r.id,{class_id:v.class_id});return r;
 });},
 cancelSession(u,sid){if(!['owner','pelatih'].includes(u.role))fail(403,'Tidak berwenang.');return locked(pool,u,async db=>{
   const s=await session(db,sid);if(u.role==='pelatih')await accessCoach(db,u,s.class_id,s.session_date);if(s.status!=='terjadwal')fail(409,'Sesi tidak dapat dibatalkan.');await noAttendance(db,sid);await db.query("UPDATE public.training_sessions SET status='dibatalkan' WHERE id=$1",[sid]);await audit(db,u.id,'session.cancel','training_sessions',sid);return {id:sid,status:'dibatalkan'};
 });},
 async attendanceRoster(u,sid){coach(u);return tx(pool,async db=>{await actorCheck(db,u);const s=await session(db,sid);await accessCoach(db,u,s.class_id,s.session_date);return {session:s,items:await roster(db,s)};});},
 saveAttendance(u,sid,items){coach(u);return locked(pool,u,async db=>{
   const s=await session(db,sid);await classReady(db,s.class_id);await accessCoach(db,u,s.class_id,s.session_date);if(s.status==='dibatalkan')fail(409,'Sesi dibatalkan.');
   if(!await one(db,"SELECT id FROM public.training_sessions WHERE id=$1 AND session_date+end_time<="+now,[sid]))fail(409,'Absensi dapat disimpan setelah jam sesi selesai (WIB).');
   const list=await roster(db,s),allowed=new Map(list.map(p=>[p.player_id,p]));
   if(items.some(p=>!allowed.has(p.player_id)))fail(403,'Ada pemain di luar peserta sesi.');
   if(items.length!==list.length)fail(400,'Isi absensi seluruh peserta sesi.');
   // No partial batch. Preserve original row ID and only update when values change.
   for(const p of items)await db.query("INSERT INTO public.attendance(session_id,player_id,status,notes,recorded_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(session_id,player_id) DO UPDATE SET status=EXCLUDED.status,notes=EXCLUDED.notes,recorded_by=EXCLUDED.recorded_by,recorded_at=clock_timestamp() WHERE attendance.status IS DISTINCT FROM EXCLUDED.status OR attendance.notes IS DISTINCT FROM EXCLUDED.notes",[sid,p.player_id,p.status,p.notes,u.id]);
   await db.query("UPDATE public.training_sessions SET status='selesai' WHERE id=$1 AND status='terjadwal'",[sid]);await audit(db,u.id,'attendance.save','training_sessions',sid,{items:items.map(p=>({player_id:p.player_id,previous:allowed.get(p.player_id).status,status:p.status}))});return {id:sid,count:items.length,status:'selesai'};
 });},
 async attendance(u){const args=u.role==='owner'?[]:[u.id];const filter=u.role==='owner'?'TRUE':u.role==='pemain'?'p.user_id=$1':"EXISTS(SELECT 1 FROM public.coach_assignments a WHERE a.coach_user_id=$1 AND a.class_id=s.class_id AND "+active('a',today)+" AND "+active('a','s.session_date')+")";
   return rows(pool,"SELECT p.id AS player_id,p.full_name,s.id AS session_id,c.name AS class_name,s.title,s.session_date::text AS session_date,a.status FROM public.training_sessions s JOIN public.classes c ON c.id=s.class_id JOIN public.class_enrollments e ON e.class_id=s.class_id AND "+active('e','s.session_date')+" JOIN public.players p ON p.id=e.player_id LEFT JOIN public.attendance a ON a.player_id=p.id AND a.session_id=s.id WHERE s.status<>'dibatalkan' AND s.session_date+s.end_time<="+now+" AND "+filter+" ORDER BY s.session_date DESC,s.start_time DESC,p.full_name",args);
 }
 };
}
