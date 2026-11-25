import {test} from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {randomUUID,randomBytes} from 'node:crypto';
import {resetHash,resetIdentity,readLogoutClaims,createAccountSecurityService} from '../services/account-security.service.js';
import {createAccountSecurityRepository} from '../repositories/account-security.repository.js';
import {proofKey} from '../services/activation.crypto.js';
const id=randomUUID(),challenge=randomUUID(),email='user@bnr.test',role='pemain',code='012345';
const config={secret:randomBytes(48).toString('hex'),issuer:'bnr-academy',audience:'bnr-academy-api'};
const input={email,role,challengeId:challenge,code,passwordHash:'hash'};
test('reset HMAC bound to email, role, challenge and session version',()=>{
 const h=resetHash(config.secret,challenge,email,role,0,code);
 for(const args of [[randomUUID(),email,role,0,code],[challenge,'other@bnr.test',role,0,code],[challenge,email,'owner',0,code],[challenge,email,role,1,code],[challenge,email,role,0,'012346']])assert.notEqual(h,resetHash(config.secret,...args));
});
test('reset identity maps player and validates role',()=>{
 assert.deepEqual(resetIdentity({email:' USER@BNR.TEST ',role:'player'}),{email,role});
 assert.throws(()=>resetIdentity({email,role:'admin'}),{status:400});
});
test('logout accepts versioned tokens and isolates limited coach audience',()=>{
 const sign=(claims,key,aud)=>jwt.sign(claims,key,{subject:id,issuer:config.issuer,audience:aud,expiresIn:600});
 assert.equal(readLogoutClaims(sign({role,sv:0},config.secret,config.audience),config).version,0);
 assert.equal(readLogoutClaims(sign({role:'pelatih',sv:0,purpose:'coach_status'},proofKey(config.secret),'bnr-academy-coach-status'),config).role,'pelatih');
 assert.throws(()=>readLogoutClaims(sign({role},config.secret,config.audience),config),{status:401});
 assert.throws(()=>readLogoutClaims(sign({role:'pelatih',sv:0,purpose:'activate_player'},proofKey(config.secret),'bnr-academy-coach-status'),config),{status:401});
});
test('change and reset validate password without passing plaintext to repository',async()=>{
 const svc=createAccountSecurityService({credentials:async()=>({password_hash:'old',session_version:0}),change:async x=>{assert.equal(x.newHash,'hash');return true;},reset:async x=>{assert.equal(x.passwordHash,'hash');assert.equal(x.password,undefined);return true;}},config,{hash:async()=> 'hash',compare:async p=>p==='oldPassword1'});
 await assert.rejects(svc.change({id,session_version:0},{current_password:'wrong',password:'New12345',password_confirmation:'New12345'}),{status:401});
 assert.ok(await svc.change({id,session_version:0},{current_password:'oldPassword1',password:'New12345',password_confirmation:'New12345'}));
 assert.ok(await svc.reset({email,role,challenge_id:challenge,code,password:'New12345',password_confirmation:'New12345'}));
});
function mock({wrong=false,unknown=false,consumed=false}={}){
 const calls=[];const result=(...rows)=>({rows,rowCount:rows.length});
 const client={async query(sql,params=[]){calls.push({sql,params});
 if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)||sql.includes('pg_advisory_xact_lock'))return result();
 if(sql.startsWith('SELECT id,session_version FROM public.users'))return unknown?result():result({id,session_version:0});
 if(sql.startsWith('SELECT id,code_hash'))return result({id:challenge,code_hash:resetHash(config.secret,challenge,email,role,0,wrong?'654321':code),attempts:0,live:true,consumed_at:consumed?new Date():null});
 if(sql.startsWith('UPDATE')||sql.startsWith('INSERT'))return result({id});
 throw Error('Unexpected '+sql);
 },release(){calls.push({sql:'RELEASE'});}};
 return {calls,connect:async()=>client};
}
test('reset updates hash and session version without changing status',async()=>{
 const db=mock();await createAccountSecurityRepository(db,{secret:config.secret}).reset(input);
 const q=db.calls.find(c=>c.sql.startsWith('UPDATE public.users'));
 assert.match(q.sql,/session_version=session_version\+1/);assert.ok(!q.sql.includes('status='));assert.equal(db.calls.at(-2).sql,'COMMIT');
});
for(const flags of [{wrong:true},{unknown:true},{consumed:true}]){
 test('invalid OTP leaves account unchanged '+JSON.stringify(flags),async()=>{
 const db=mock(flags);await assert.rejects(createAccountSecurityRepository(db,{secret:config.secret}).reset(input),{status:400});
 assert.ok(!db.calls.some(c=>c.sql.startsWith('UPDATE public.users')));assert.equal(db.calls.at(-2).sql,'COMMIT');
 });
}
