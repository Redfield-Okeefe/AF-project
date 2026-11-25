import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerStatusRepository} from '../repositories/player-status.repository.js';
import {createRegistrationService} from '../services/registration.service.js';
const id='00000000-0000-4000-8000-000000000012',uid='00000000-0000-4000-8000-000000000013',actor={id:'00000000-0000-4000-8000-000000000014',role:'owner',session_version:2};
const result=(...rows)=>({rows,rowCount:rows.length});
function fixture(opts={}){
 const calls=[];const client={async query(sql,params=[]){calls.push({sql,params});
 if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return result();
 if(sql.includes("role='owner'"))return opts.ownerDenied?result():result({id:actor.id});
 if(sql.includes('FROM public.players'))return opts.missing?result():result({id,status:opts.status||'aktif',user_id:opts.noAccount?null:uid});
 if(sql.includes('FROM public.registrations')&&!sql.startsWith('UPDATE'))return opts.notAccepted?result():result({ok:true});
 if(sql.includes('FROM public.users'))return result({id:uid,status:opts.status||'aktif',role:opts.wrongRole?'owner':'pemain',email_verified_at:new Date()});
 if(sql.startsWith('UPDATE public.players'))return result({id,status:params[1],user_id:opts.noAccount?null:uid});
 if(sql.startsWith('UPDATE public.users')||sql.startsWith('UPDATE public.account_activation_tokens'))return result();
 if(sql.includes('INSERT INTO public.audit_logs')){if(opts.auditFail)throw Error('audit error');return result();}
 throw Error('Unexpected SQL: '+sql);},release(){calls.push({sql:'RELEASE'})}};
 return {calls,repo:createPlayerStatusRepository({connect:async()=>client})};
}
test('owner deactivates player and account, revokes session and invitation, writes audit',async()=>{const {repo,calls}=fixture();assert.equal((await repo.change(id,'nonaktif',actor)).status,'nonaktif');assert.ok(calls.some(x=>x.sql.includes('session_version=session_version+1')&&x.params[0]===uid&&x.params[1]==='nonaktif'));assert.ok(calls.some(x=>x.sql.startsWith('UPDATE public.account_activation_tokens')));assert.ok(calls.some(x=>x.sql.includes('INSERT INTO public.audit_logs')));assert.equal(calls.at(-2).sql,'COMMIT');});
test('reactivation requires new session, leaves consumed invitations untouched',async()=>{const {repo,calls}=fixture({status:'nonaktif'});assert.equal((await repo.change(id,'aktif',actor)).status,'aktif');assert.ok(calls.some(x=>x.sql.includes('session_version=session_version+1')));assert.ok(!calls.some(x=>x.sql.startsWith('UPDATE public.account_activation_tokens')));});
test('accepted player without login can be deactivated without creating account',async()=>{const {repo,calls}=fixture({noAccount:true});await repo.change(id,'nonaktif',actor);assert.ok(!calls.some(x=>x.sql.startsWith('UPDATE public.users')));assert.ok(calls.some(x=>x.sql.startsWith('UPDATE public.account_activation_tokens')));});
for(const [name,opts,status,code] of [['missing',{missing:true},'nonaktif',404],['owner denied',{ownerDenied:true},'nonaktif',403],['candidate',{status:'calon'},'aktif',409],['duplicate',{status:'nonaktif'},'nonaktif',409],['unaccepted',{notAccepted:true},'nonaktif',409],['wrong linked role',{wrongRole:true},'nonaktif',409]]){
 test(name+' rejected without writes',async()=>{const {repo,calls}=fixture(opts);await assert.rejects(repo.change(id,status,actor),{status:code});assert.ok(!calls.some(x=>x.sql.startsWith('UPDATE ')));assert.ok(calls.some(x=>x.sql==='ROLLBACK'));});
}
test('audit failure rolls back all status writes',async()=>{const {repo,calls}=fixture({auditFail:true});await assert.rejects(repo.change(id,'nonaktif',actor),/audit error/);assert.ok(calls.some(x=>x.sql==='ROLLBACK'));assert.ok(!calls.some(x=>x.sql==='COMMIT'));});
test('service rejects invalid id/status and non-owner actor before repository',()=>{const service=createRegistrationService({}, {change(){throw Error('unexpected repository')}});assert.throws(()=>service.changePlayerStatus('bad',{status:'aktif'},actor),{status:400});assert.throws(()=>service.changePlayerStatus(id,{status:'owner'},actor),{status:400});assert.throws(()=>service.changePlayerStatus(id,{status:'aktif',user_id:uid},actor),{status:400});assert.throws(()=>service.changePlayerStatus(id,{status:'aktif'},{...actor,role:'pelatih'}),{status:403});});
