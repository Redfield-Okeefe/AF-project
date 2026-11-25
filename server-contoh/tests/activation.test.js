import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {inviteToken,tokenHash,otpCode,hashOtp,equalHash,demoEmail,activationEmail,validateCode,otpDecision,proofKey} from '../services/activation.crypto.js';
import {createActivationService,readVerificationProof} from '../services/activation.service.js';
import {createActivationRepository} from '../repositories/activation.repository.js';
const id='00000000-0000-4000-8000-000000000031';
const i1='00000000-0000-4000-8000-000000000032';
const i2='00000000-0000-4000-8000-000000000033';
const r1='00000000-0000-4000-8000-000000000034';
const actor='00000000-0000-4000-8000-000000000035';
const email='first@bnr.test',code='012345',secret=randomBytes(48).toString('hex');
const config={secret,issuer:'bnr-academy',audience:'bnr-academy-api'};
const token=inviteToken(),hash=hashOtp(secret,id,i1,email,code);
const row={id,code_hash:hash,attempts:0,consumed_at:null,live:true};
test('undangan acak 32 byte, SHA256, format tidak valid ditolak',()=>{
  assert.match(token,/^[A-Za-z0-9_-]{43}$/);assert.notEqual(token,inviteToken());assert.match(tokenHash(token),/^[0-9a-f]{64}$/);assert.notEqual(token,tokenHash(token));assert.throws(()=>tokenHash('bad'),{status:400});
});
test('OTP 6 digit termasuk nol awal',()=>{
  for(let n=0;n<20;n++)assert.match(otpCode(),/^\d{6}$/);
  assert.equal(validateCode(code),code);assert.throws(()=>validateCode(12345),{status:400});
});
test('hanya email dummy .test, normalisasi tanpa injeksi header',()=>{
  assert.equal(demoEmail(' FIRST@BNR.TEST '),email);assert.throws(()=>demoEmail('real@gmail.com'),{status:400});assert.throws(()=>demoEmail('a@bnr.test\nBcc:b@bnr.test'),{status:400});
});
test('HMAC terikat pada challenge, undangan, email dan kode',()=>{
  assert.ok(equalHash(hash,hashOtp(secret,id,i1,email,code)));
  for(const args of [[secret,id,i2,email,code],[secret,i2,i1,email,code],[secret,id,i1,'second@bnr.test',code],[secret,id,i1,email,'012346'],['different-secret',id,i1,email,code]])assert.ok(!equalHash(hash,hashOtp(...args)));
  assert.ok(!equalHash(hash,'x'));
});
test('OTP benar, salah, kedaluwarsa, consumed, batas percobaan, lintas undangan',()=>{
  assert.equal(otpDecision(row,hash,i1),'verified');
  assert.equal(otpDecision(row,hashOtp(secret,id,i1,email,'012346'),i1),'incorrect');
  assert.equal(otpDecision({...row,live:false},hash,i1),'unavailable');
  assert.equal(otpDecision({...row,consumed_at:new Date()},hash,i1),'unavailable');
  assert.equal(otpDecision({...row,attempts:5},hash,i1),'unavailable');
  assert.equal(otpDecision(row,hash,i2),'unavailable');
});
test('bukti OTP berbeda dari JWT login dan terikat undangan/email',async()=>{
  const service=createActivationService({verify:async()=>({challengeId:id,invitationId:i1,registrationId:r1,email})},config);
  const result=await service.verify({purpose:'activate_player',invitation_token:token,email,challenge_id:id,code});
  assert.equal(result.account_created,false);
  assert.deepEqual(readVerificationProof(result.verification_token,config),{challengeId:id,invitationId:i1,registrationId:r1,email});
  assert.throws(()=>jwt.verify(result.verification_token,config.secret,{algorithms:['HS256'],audience:config.audience,issuer:config.issuer}));
  const expired=jwt.sign({purpose:'activate_player',email,invitation_id:i1,registration_id:r1},proofKey(secret),{subject:id,algorithm:'HS256',audience:'bnr-academy-email-verification',issuer:config.issuer,expiresIn:-1});
  assert.throws(()=>readVerificationProof(expired,config),{status:401});
});
test('purpose lain dan email non-Gmail/non-test ditolak sebelum repository',()=>{
  const svc=createActivationService({request(){throw Error('unexpected DB');}},config);
  assert.throws(()=>svc.request({purpose:'reset_password',email,invitation_token:token}),{status:400});
  assert.throws(()=>svc.request({purpose:'activate_player',email:'real@example.com',invitation_token:token}),{status:400});
});
const result=(...rows)=>({rows,rowCount:rows.length});
const reg={id:r1,registration_number:'REG-TEST',registration_status:'diterima',player_status:'aktif',user_id:null,contact_email:'family@bnr.test'};
function fake(handlers){
  const calls=[];
  const db={async query(sql,params=[]){calls.push({sql,params});if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return result();for(const [s,fn] of handlers)if(sql.includes(s))return fn(params);throw Error('Unexpected SQL: '+sql);},release(){calls.push({sql:'RELEASE'});}};
  return {calls,connect:async()=>db};
}
const baseHandlers=[
  ['SELECT registration_id FROM public.account_activation_tokens',()=>result({registration_id:r1})],
  ['FROM public.registrations r JOIN',()=>result(reg)],
  ['SELECT id,registration_id,target_email',()=>result({id:i1,registration_id:r1,target_email:reg.contact_email,used_at:null,live:true,expires_at:new Date(Date.now()+600000)})]
];
const mailer={ready(){},async invite(){},async otp(){}};
function setupVerify(override={}){
  return fake([...baseHandlers,['SELECT id,target_email,purpose',()=>result({...row,...override})],['UPDATE public.auth_challenges',()=>result()],['INSERT INTO public.audit_logs',()=>result()]]);
}
test('salah OTP: increment attempts dikomit sebelum error',async()=>{
  const db=setupVerify();
  await assert.rejects(createActivationRepository(db,{secret,mailer}).verify({invitationToken:token,email,challengeId:id,code:'012346'}),{status:400});
  assert.ok(db.calls.some(c=>c.sql.includes('attempts=attempts+1')));assert.equal(db.calls.at(-2).sql,'COMMIT');
});
test('OTP benar: consumed, audit dan commit',async()=>{
  const db=setupVerify();
  const proof=await createActivationRepository(db,{secret,mailer}).verify({invitationToken:token,email,challengeId:id,code});
  assert.equal(proof.invitationId,i1);assert.ok(db.calls.some(c=>c.sql.includes('SET consumed_at=')));assert.ok(db.calls.some(c=>c.sql.includes('INSERT INTO public.audit_logs')));assert.equal(db.calls.at(-2).sql,'COMMIT');
});
test('challenge lintas undangan tidak increment attempts',async()=>{
  const db=setupVerify({code_hash:hashOtp(secret,id,i2,email,code)});
  await assert.rejects(createActivationRepository(db,{secret,mailer}).verify({invitationToken:token,email,challengeId:id,code}),{status:400});
  assert.ok(!db.calls.some(c=>c.sql.includes('UPDATE public.auth_challenges')));
});
test('OTP expired/attempt limit/consumed ditolak tanpa perubahan',async()=>{
  for(const patch of [{live:false},{attempts:5},{consumed_at:new Date()}]){
    const db=setupVerify(patch);await assert.rejects(createActivationRepository(db,{secret,mailer}).verify({invitationToken:token,email,challengeId:id,code}),{status:400});assert.ok(!db.calls.some(c=>c.sql.includes('UPDATE public.auth_challenges')));
  }
});
test('cooldown dan batas per jam sebelum mengirim',async()=>{
  for(const count of [{n:1,cooldown:true},{n:5,cooldown:false}]){
    const db=fake([['pg_advisory_xact_lock',()=>result()],...baseHandlers,['SELECT count(*)::int',()=>result(count)]]);
    await assert.rejects(createActivationRepository(db,{secret,mailer}).request({invitationToken:token,email}),{status:429});assert.equal(db.calls.at(-2).sql,'ROLLBACK');
  }
});
test('undangan ditolak jika registrasi belum diterima',async()=>{
  const db=fake([['FROM public.users',()=>result({id:actor})],['FROM public.registrations r JOIN',()=>result({...reg,registration_status:'ditolak'})]]);
  await assert.rejects(createActivationRepository(db,{secret,mailer}).issue(r1,actor),{status:409});assert.ok(!db.calls.some(c=>c.sql.includes('INSERT INTO public.account_activation_tokens')));
});
test('SMTP gagal: undangan rollback, tidak mengirim token dalam response',async()=>{
  const db=fake([['FROM public.users',()=>result({id:actor})],['FROM public.registrations r JOIN',()=>result(reg)],['SELECT 1 FROM public.account_activation_tokens',()=>result()],['UPDATE public.account_activation_tokens',()=>result()],['INSERT INTO public.account_activation_tokens',()=>result({id:i1,expires_at:new Date()})],['INSERT INTO public.audit_logs',()=>result()]]);
  let raw;
  await assert.rejects(createActivationRepository(db,{secret,mailer:{...mailer,async invite({token}){raw=token;throw Error('SMTP offline');}}}).issue(r1,actor),/SMTP offline/);
  const insert=db.calls.find(c=>c.sql.includes('INSERT INTO public.account_activation_tokens'));
  assert.equal(insert.params[1],tokenHash(raw));assert.notEqual(insert.params[1],raw);assert.equal(db.calls.at(-2).sql,'ROLLBACK');
});

test('Gmail activation email allowed with local Mailpit',()=>{assert.equal(activationEmail(' EXAMPLE@gmail.com '),'example@gmail.com');assert.equal(activationEmail(email),email);assert.throws(()=>activationEmail('other@example.com'),{status:400});assert.ok(hashOtp(secret,id,i1,'example@gmail.com',code).startsWith('v1:'));});
