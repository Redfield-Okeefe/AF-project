import {ApiError} from './auth.service.js';
import {createAcademyRepository} from '../repositories/academy.repository.js';
import {jakartaDate} from '../validators/registration.validator.js';
import {tx} from '../repositories/activation.repository.js';
export function periodInput(month,day=jakartaDate()){
 const m=month??day.slice(0,7);
 if(typeof m!=='string'||!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(m)||m>day.slice(0,7))throw new ApiError(400,'Periode bulan tidak valid atau di masa depan.');
 return m;
}
export function summarize(classes,sessions,attendance,month,day){
 const periodSessions=sessions.filter(s=>s.session_date.startsWith(month)),a=attendance.filter(s=>s.session_date.startsWith(month));
 const count=Object.fromEntries(['hadir','izin','sakit','alpa'].map(k=>[k,a.filter(r=>r.status===k).length]));
 const recorded=Object.values(count).reduce((x,y)=>x+y,0);
 const upcoming=sessions.filter(s=>s.status==='terjadwal'&&s.session_date>=day).sort((a,b)=>(a.session_date+a.start_time).localeCompare(b.session_date+b.start_time));
 return {period:month,as_of:day,classes:classes.filter(c=>c.status==='aktif').map(c=>({id:c.id,name:c.name})),sessions:{total:periodSessions.length,scheduled:periodSessions.filter(s=>s.status==='terjadwal').length,completed:periodSessions.filter(s=>s.status==='selesai').length,canceled:periodSessions.filter(s=>s.status==='dibatalkan').length},attendance:{...count,recorded,unrecorded:a.length-recorded,percentage:recorded?Math.round(count.hadir/recorded*100):null},upcoming_count:upcoming.length,upcoming:upcoming.slice(0,5)};
}
export function createDashboardService(pool){
 return {async read(u,month){
  const day=jakartaDate(),period=periodInput(month,day);
  return tx(pool,async db=>{
   await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const actor=(await db.query("SELECT id FROM public.users WHERE id=$1 AND role=$2 AND status='aktif' AND email_verified_at IS NOT NULL AND session_version=$3",[u.id,u.role,u.session_version])).rows[0];if(!actor)throw new ApiError(401,'Sesi tidak berlaku.');
   const repo=createAcademyRepository(db);
   const classes=await repo.classes(u),sessions=await repo.sessions(u),attendance=await repo.attendance(u);
   const data=summarize(classes,sessions,attendance,period,day);
   if(u.role==='owner'){
    data.accounts=(await db.query("SELECT (SELECT count(*)::int FROM public.players WHERE status='aktif') AS active_players,(SELECT count(*)::int FROM public.users WHERE role='pelatih' AND status='aktif') AS active_coaches,(SELECT count(*)::int FROM public.registrations WHERE status='menunggu') AS pending_registrations,(SELECT count(*)::int FROM public.users WHERE role='pelatih' AND status='menunggu') AS pending_coaches")).rows[0];
   }else if(u.role==='pelatih'){
    data.active_players=(await db.query("SELECT count(DISTINCT p.id)::int AS n FROM public.class_enrollments e JOIN public.players p ON p.id=e.player_id WHERE e.class_id=ANY($1::uuid[]) AND p.status='aktif' AND e.start_date<=$2::date AND (e.end_date IS NULL OR e.end_date>=$2::date)",[data.classes.map(c=>c.id),day])).rows[0].n;
   }
   return data;
  });
 }};
}
