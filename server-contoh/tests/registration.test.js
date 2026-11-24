import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ageAt,jakartaDate,validateRegistration,checkProgram,validateReview,validateList,requireId} from '../validators/registration.validator.js';
import {createRegistrationService} from '../services/registration.service.js';
import {createRegistrationRepository} from '../repositories/registration.repository.js';
const programId='00000000-0000-4000-8000-000000000011';
const playerId='00000000-0000-4000-8000-000000000012';
const registrationId='00000000-0000-4000-8000-000000000013';
const ownerId='00000000-0000-4000-8000-000000000014';
const active={id:programId,status:'aktif',min_age_years:6,max_age_years:17};
const form={full_name:'  Murid   Demo ',gender:'Laki-laki',birth_date:'2016-11-25',birth_place:'Kota Demo',school_name:'Sekolah Fiktif',guardian_name:'Wali Demo',contact_email:'DEMO@example.test',contact_phone:'+62 812-3456-7890',address:'Alamat fiktif pengujian',jersey_size:'M',program_id:programId};
const today='2026-11-24';
test('validasi normalisasi dan abaikan field otoritas dari publik',()=>{
  const data=validateRegistration({...form,status:'aktif',role:'owner',user_id:ownerId},today);
  assert.equal(data.age,9);assert.equal(data.full_name,'Murid Demo');assert.equal(data.contact_email,'demo@example.test');assert.equal(data.contact_phone,'6281234567890');
  assert.equal(data.status,undefined);assert.equal(data.role,undefined);assert.equal(data.user_id,undefined);assert.equal(data.notes,null);
});
test('usia sebelum/sesudah ulang tahun dan zona Jakarta',()=>{
  assert.equal(ageAt(form.birth_date,today),9);assert.equal(ageAt(form.birth_date,'2026-11-25'),10);
  assert.equal(jakartaDate(new Date('2026-11-24T18:00:00Z')),'2026-11-25');
});
for(const [name,patch] of Object.entries({empty:{full_name:''},future:{birth_date:'2027-01-01'},invalidDate:{birth_date:'2016-02-30'},email:{contact_email:'invalid'},phone:{contact_phone:'abcd'},jersey:{jersey_size:'XXL'},program:{program_id:'bad'},guardian:{guardian_name:''},gender:{gender:'bad'}})){
  test('tolak input '+name,()=>assert.throws(()=>validateRegistration({...form,...patch},today),{status:400}));
}
test('program aktif dan usia sesuai',()=>assert.doesNotThrow(()=>checkProgram(active,10)));
test('tolak program arsip/hilang dan usia di luar rentang',()=>{
  for(const p of [null,{...active,status:'arsip'}])assert.throws(()=>checkProgram(p,10),{status:400});
  assert.throws(()=>checkProgram(active,18),{status:400});
});
test('validasi keputusan dan paginasi',()=>{
  assert.equal(validateReview({},'diterima'),null);
  assert.throws(()=>validateReview({},'ditolak'),{status:400});
  assert.equal(validateReview({review_note:' Alasan uji '},'ditolak'),'Alasan uji');
  assert.deepEqual(validateList({limit:'10',offset:'0',status:'menunggu'},['menunggu']),{limit:10,offset:0,status:'menunggu'});
  assert.throws(()=>validateList({limit:'101'},[]),{status:400});
  assert.throws(()=>requireId('invalid'),{status:400});
});
function fakePool(handlers){
  const calls=[];
  const client={async query(sql,params=[]){calls.push({sql,params});if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[],rowCount:0};for(const [pattern,fn] of handlers){if(sql.includes(pattern))return fn(params);}throw Error('Unexpected SQL: '+sql);},release(){calls.push({sql:'RELEASE'});}};
  return {calls,connect:async()=>client};
}
const result=(...rows)=>({rows,rowCount:rows.length});
const setupCreate=duplicate=>fakePool([
  ['pg_advisory_xact_lock',()=>result()],
  ['FROM public.programs',()=>result(active)],
  ['SELECT id FROM public.players',()=>duplicate?result({id:playerId}):result()],
  ['INSERT INTO public.players',()=>result({id:playerId})],
  ['INSERT INTO public.registrations',()=>result({id:registrationId,status:'menunggu'})],
  ['INSERT INTO public.audit_logs',()=>result()]
]);
test('pendaftaran: insert calon, pengajuan, audit dalam transaksi',async()=>{
  const db=setupCreate(false);const repo=createRegistrationRepository(db);
  assert.equal((await repo.create(validateRegistration(form,today))).status,'menunggu');
  assert.equal(db.calls[0].sql,'BEGIN');assert.equal(db.calls.at(-2).sql,'COMMIT');
  assert.ok(db.calls.some(c=>c.sql.includes('INSERT INTO public.audit_logs')));
});
test('duplikasi: rollback dan tidak membuat pemain baru',async()=>{
  const db=setupCreate(true);
  await assert.rejects(createRegistrationRepository(db).create(validateRegistration(form,today)),{status:409});
  assert.ok(db.calls.some(c=>c.sql==='ROLLBACK'));assert.ok(!db.calls.some(c=>c.sql.includes('INSERT INTO public.players')));
});
function setupReview(status='menunggu',auditFailure=false){
  return fakePool([
    ['FROM public.users',()=>result({id:ownerId})],
    ['FOR UPDATE OF r,p',()=>result({id:registrationId,status,player_id:playerId,program_id:programId,player_status:'calon',user_id:null})],
    ['SELECT status FROM public.programs',()=>result(active)],
    ["status='diterima' LIMIT",()=>result()],
    ['UPDATE public.players',()=>result({id:playerId})],
    ['UPDATE public.registrations',params=>result({id:registrationId,status:params[1]})],
    ['INSERT INTO public.audit_logs',()=>{if(auditFailure)throw Error('audit failure');return result();}]
  ]);
}
test('persetujuan: pemain aktif tanpa akun, audit dan commit',async()=>{
  const db=setupReview();
  const r=await createRegistrationRepository(db).review(registrationId,'diterima',null,ownerId);
  assert.equal(r.status,'diterima');assert.equal(r.player_status,'aktif');assert.equal(r.account_created,false);
  assert.ok(db.calls.some(c=>c.sql.includes('UPDATE public.players')));assert.equal(db.calls.at(-2).sql,'COMMIT');
});
test('penolakan: biodata calon dipertahankan',async()=>{
  const db=setupReview();
  const r=await createRegistrationRepository(db).review(registrationId,'ditolak','Alasan uji',ownerId);
  assert.equal(r.player_status,'calon');assert.ok(!db.calls.some(c=>c.sql.includes('UPDATE public.players')));
});
test('keputusan berulang ditolak dan rollback',async()=>{
  const db=setupReview('diterima');
  await assert.rejects(createRegistrationRepository(db).review(registrationId,'diterima',null,ownerId),{status:409});
  assert.ok(db.calls.some(c=>c.sql==='ROLLBACK'));
});
test('audit gagal: seluruh transaksi dibatalkan',async()=>{
  const db=setupReview('menunggu',true);
  await assert.rejects(createRegistrationRepository(db).review(registrationId,'diterima',null,ownerId),/audit failure/);
  assert.ok(db.calls.some(c=>c.sql==='ROLLBACK'));assert.ok(!db.calls.some(c=>c.sql==='COMMIT'));
});
test('service menolak request tidak valid sebelum menyentuh database',()=>{
  const svc=createRegistrationService({create(){throw Error('unexpected repository');}});
  assert.throws(()=>svc.submit({}),{status:400});
});
