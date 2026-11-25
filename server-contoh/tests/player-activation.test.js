import {test} from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {randomBytes} from 'node:crypto';
import {inviteToken,tokenHash,proofKey,scopePrefix} from '../services/activation.crypto.js';
import {createPlayerActivationService,validatePassword} from '../services/player-activation.service.js';
import {createPlayerActivationRepository} from '../repositories/player-activation.repository.js';
const ids=['11','12','13','14','15','16'].map(x=>'00000000-0000-4000-8000-0000000000'+x);
const [invitationId,registrationId,challengeId,playerId,accountId,otherId]=ids;
const email='login-a@bnr.test',password='ExamplePassphrase!42',token=inviteToken();
const config={secret:randomBytes(48).toString('hex'),issuer:'bnr-academy'};
const proof=jwt.sign({purpose:'activate_player',email,invitation_id:invitationId,registration_id:registrationId},proofKey(config.secret),{algorithm:'HS256',subject:challengeId,issuer:config.issuer,audience:'bnr-academy-email-verification',expiresIn:600});
const body={invitation_token:token,verification_token:proof,password,password_confirmation:password};
const mailer={ready(){}};
test('password policy, confirmation and bcrypt byte limit',()=>{
  assert.equal(validatePassword(password,password),password);
  assert.equal(validatePassword('Abc12345','Abc12345'),'Abc12345');
  for(const p of ['short',' '.repeat(12),'😀'.repeat(19),'a'.repeat(73),'longpassword\0'])assert.throws(()=>validatePassword(p,p),{status:400});
  assert.throws(()=>validatePassword(password,'mismatch'),{status:400});
});
test('bcrypt stores hash, not cleartext',async()=>{
  const svc=createPlayerActivationService({async activate(x){assert.equal(x.email,email);assert.notEqual(x.passwordHash,password);assert.ok(await bcrypt.compare(password,x.passwordHash));assert.equal(x.invitationHash,tokenHash(token));return {account_created:true};}},config,mailer);
  assert.equal((await svc.activate(body)).account_created,true);
});
test('bad proof, mismatched email and injected identity denied before hashing',async()=>{
  const svc=createPlayerActivationService({activate(){throw Error('unexpected repository');}},config,mailer,{hashPassword(){throw Error('unexpected hash');}});
  await assert.rejects(svc.activate({...body,verification_token:'invalid'}),{status:401});
  await assert.rejects(svc.activate({...body,email:'other@bnr.test'}),{status:400});
  for(const field of ['role','player_id','registration_id','status','password_hash','full_name','user_id'])await assert.rejects(svc.activate({...body,[field]:'owner'}),{status:400});
  await assert.rejects(svc.activate({}),{status:400});
});
const input={invitationHash:tokenHash(token),invitationId,registrationId,challengeId,email,passwordHash:'hash-fixture'};
const result=(...rows)=>({rows,rowCount:rows.length});
function mock(opts={}){
  const calls=[];
  const client={async query(sql,params=[]){
    calls.push({sql,params});
    if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)||sql.includes('pg_advisory_xact_lock'))return result();
    if(sql.startsWith('SELECT registration_id FROM'))return result({registration_id:registrationId});
    if(sql.includes('FROM public.registrations r JOIN'))return result({id:registrationId,registration_number:'REG-TEST',registration_status:'diterima',player_status:'aktif',player_id:playerId,full_name:'Fiktif',user_id:opts.used?accountId:null,contact_email:'family@bnr.test'});
    if(sql.startsWith('SELECT id,registration_id,target_email'))return result({id:opts.cross?otherId:invitationId,registration_id:registrationId,target_email:'family@bnr.test',used_at:null,live:true});
    if(sql.includes('FROM public.auth_challenges'))return result({id:opts.superseded?otherId:challengeId,target_email:email,consumed_at:new Date(),attempts:opts.attempts??1,proof_live:!opts.expired,code_hash:scopePrefix(invitationId)+'fixture'});
    if(sql.includes('SELECT 1 FROM public.audit_logs'))return opts.unverified?result():result({one:1});
    if(sql.startsWith('SELECT id FROM public.users'))return opts.duplicate?result({id:otherId}):result();
    if(sql.startsWith('INSERT INTO public.users')){if(opts.uniqueRace)throw Object.assign(Error('unique'),{code:'23505'});return result({id:accountId,email,role:'pemain',status:'aktif'});}
    if(sql.startsWith('UPDATE public.players'))return opts.linkFailure?result():result({id:playerId,student_code:'BNR-TEST'});
    if(sql.startsWith('UPDATE public.account_activation_tokens'))return opts.invitationExpired?result():result({id:invitationId});
    if(sql.startsWith('INSERT INTO public.audit_logs')){if(opts.auditFailure)throw Error('audit failed');return result();}
    throw Error('Unexpected SQL: '+sql);
  },release(){calls.push({sql:'RELEASE'});}};
  return {calls,connect:async()=>client};
}
test('account, link, consume invitation and audit commit together',async()=>{
  const db=mock();const r=await createPlayerActivationRepository(db).activate(input);
  assert.equal(r.account_created,true);assert.equal(r.user.role,'pemain');assert.equal(r.player.id,playerId);assert.equal(r.user.password_hash,undefined);assert.equal(r.token,undefined);
  const insert=db.calls.find(c=>c.sql.startsWith('INSERT INTO public.users'));
  assert.deepEqual(insert.params,['Fiktif',email,'hash-fixture']);assert.match(insert.sql,/'pemain','aktif'/);
  assert.ok(db.calls.some(c=>c.sql.startsWith('UPDATE public.players')));
  assert.ok(db.calls.some(c=>c.sql.startsWith('UPDATE public.account_activation_tokens')));
  assert.ok(db.calls.some(c=>c.sql.startsWith('INSERT INTO public.audit_logs')));
  assert.equal(db.calls.at(-2).sql,'COMMIT');
});
for(const opt of ['used','cross','superseded','expired','unverified','duplicate','uniqueRace','linkFailure','invitationExpired']){
  test('rollback: '+opt,async()=>{
    const db=mock({[opt]:true});
    await assert.rejects(createPlayerActivationRepository(db).activate(input),{status:409});
    assert.equal(db.calls.at(-2).sql,'ROLLBACK');
    assert.ok(!db.calls.some(c=>c.sql==='COMMIT'));
    if(['used','cross','superseded','expired','unverified','duplicate'].includes(opt))assert.ok(!db.calls.some(c=>c.sql.startsWith('INSERT INTO public.users')));
  });
}
test('max OTP attempts cannot activate',async()=>{
  const db=mock({attempts:5});await assert.rejects(createPlayerActivationRepository(db).activate(input),{status:409});assert.equal(db.calls.at(-2).sql,'ROLLBACK');
});
test('audit failure rolls back all writes',async()=>{
  const db=mock({auditFailure:true});await assert.rejects(createPlayerActivationRepository(db).activate(input),/audit failed/);assert.equal(db.calls.at(-2).sql,'ROLLBACK');
});
