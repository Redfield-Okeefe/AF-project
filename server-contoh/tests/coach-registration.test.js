import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {parseCoachForm,validateCoachPassword,coachOtpHash,parseReview,canReview} from '../services/coach-registration.validation.js';
import {createCoachRegistrationService} from '../services/coach-registration.service.js';
import {createCoachRegistrationRepository} from '../repositories/coach-registration.repository.js';
const config={secret:randomBytes(48).toString('hex'),issuer:'bnr-academy',audience:'bnr-academy-api',expiresIn:'30m'};
const id=randomUUID(),challenge=randomUUID(),email='coach@example.test',password='Abc12345';
const body={nama:'Pelatih Uji',email,wa:'0812-3456-7890',lisensi:'',password,password_confirmation:password,challenge_id:challenge,code:'012345',peran:'pelatih'};
const user={id,email,nama:body.nama,status:'menunggu',role:'pelatih'};
test('frontend password 8 characters + letters and digits, bcrypt limit',()=>{
  assert.equal(validateCoachPassword(password,password),password);
  for(const p of ['12345678','abcdefgh','Abc1234','a1'.repeat(37),'abc12345\0'])assert.throws(()=>validateCoachPassword(p,p),{status:400});
  assert.throws(()=>validateCoachPassword(password,'different'),{status:400});
});
test('Gmail, local test email, WA and optional license validation',()=>{
  assert.equal(parseCoachForm({...body,email:'Test@gmail.com'}).email,'test@gmail.com');
  assert.equal(parseCoachForm(body,{allowTest:true}).wa,'081234567890');
  for(const patch of [{wa:'123'},{lisensi:'x'.repeat(61)},{nama:'ab'},{status:'aktif'},{role:'owner'},{peran:'player'}])assert.throws(()=>parseCoachForm({...body,...patch},{allowTest:true}),{status:400});
  assert.throws(()=>parseCoachForm(body),{status:400});
});
test('OTP HMAC is scoped and does not contain plaintext',()=>{
  const h=coachOtpHash(config.secret,challenge,email,'012345');
  assert.equal(h.length,64);assert.notEqual(h,coachOtpHash(config.secret,randomUUID(),email,'012345'));
});
test('owner state transitions and mandatory rejection reason',()=>{
  assert.ok(canReview('menunggu','aktif'));assert.ok(canReview('menunggu','ditolak'));assert.ok(canReview('ditolak','aktif'));
  assert.ok(canReview('aktif','nonaktif'));assert.ok(canReview('nonaktif','aktif'));
  assert.ok(!canReview('aktif','ditolak'));assert.throws(()=>parseReview({status:'ditolak',alasan:' '}),{status:400});
});
test('registration hashes password, returns restricted token, active status upgrades only after approval',async()=>{
  let state='menunggu';
  const repo={async register(x){assert.equal(x.passwordHash,'hash-fixture');assert.equal(x.password,undefined);assert.equal(x.challengeId,challenge);return user;},async get(){return {...user,status:state};}};
  const svc=createCoachRegistrationService(repo,config,{allowTest:true,hashPassword:async()=> 'hash-fixture'});
  const r=await svc.register(body);assert.equal(r.restricted,true);
  assert.throws(()=>jwt.verify(r.token,config.secret,{audience:config.audience}));
  assert.equal((await svc.status(r.token)).token,undefined);
  state='aktif';const approved=await svc.status(r.token);
  assert.equal(approved.restricted,false);assert.equal(jwt.verify(approved.token,config.secret,{audience:config.audience}).role,'pelatih');
});
test('pending status login validates password and never leaks hash',async()=>{
  const svc=createCoachRegistrationService({credentials:async()=>({...user,password_hash:'hash'})},config,{allowTest:true,comparePassword:async p=>p===password});
  await assert.rejects(svc.restrictedLogin({email,password:'wrong'}),{status:401});
  const r=await svc.restrictedLogin({email,password});assert.equal(r.user.password_hash,undefined);assert.equal(r.restricted,true);
});
function mock({wrong=false,auditFail=false,consumed=false}={}){
  const calls=[];const result=(...rows)=>({rows,rowCount:rows.length});
  const client={async query(sql,params=[]){
    calls.push({sql,params});
    if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)||sql.includes('pg_advisory_xact_lock'))return result();
    if(sql.startsWith('SELECT id FROM public.users'))return result();
    if(sql.includes('FROM public.coach_registration_otp WHERE id='))return result({id:challenge,code_hash:coachOtpHash(config.secret,challenge,email,wrong?'123456':'012345'),attempts:0,consumed_at:consumed?new Date():null,live:true});
    if(sql.startsWith('INSERT INTO public.users'))return result({id});
    if(sql.startsWith('INSERT INTO public.coach_profiles')||sql.startsWith('UPDATE public.coach_registration_otp'))return result();
    if(sql.startsWith('INSERT INTO public.audit_logs')){if(auditFail)throw Error('audit failed');return result();}
    if(sql.startsWith('SELECT u.id'))return result(user);
    throw Error('unexpected '+sql);
  },release(){calls.push({sql:'RELEASE'});}};
  return {calls,connect:async()=>client};
}
const input={email,nama:body.nama,wa:body.wa,lisensi:'',passwordHash:'hash',challengeId:challenge,code:'012345'};
test('coach user/profile/OTP/audit commit together',async()=>{
  const db=mock();const r=await createCoachRegistrationRepository(db,{secret:config.secret}).register(input);
  assert.equal(r.status,'menunggu');assert.equal(db.calls.at(-2).sql,'COMMIT');
  assert.match(db.calls.find(c=>c.sql.startsWith('INSERT INTO public.users')).sql,/'pelatih','nonaktif'/);
});
test('incorrect OTP attempt committed; no account created',async()=>{
  const db=mock({wrong:true});await assert.rejects(createCoachRegistrationRepository(db,{secret:config.secret}).register(input),{status:400});
  assert.equal(db.calls.at(-2).sql,'COMMIT');assert.ok(db.calls.some(c=>c.sql.includes('attempts=attempts+1')));assert.ok(!db.calls.some(c=>c.sql.startsWith('INSERT INTO public.users')));
});
test('consumed OTP cannot create account',async()=>{
  const db=mock({consumed:true});await assert.rejects(createCoachRegistrationRepository(db,{secret:config.secret}).register(input),{status:400});assert.ok(!db.calls.some(c=>c.sql.startsWith('INSERT INTO public.users')));
});
test('audit failure rolls back registration',async()=>{
  const db=mock({auditFail:true});await assert.rejects(createCoachRegistrationRepository(db,{secret:config.secret}).register(input),/audit failed/);assert.equal(db.calls.at(-2).sql,'ROLLBACK');
});
