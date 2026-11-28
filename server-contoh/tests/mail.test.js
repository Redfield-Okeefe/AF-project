import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMailer} from '../services/mail.service.js';
const options={mode:'resend',environment:'production',apiKey:'re_mock_test',testRecipient:'tester@gmail.com'};
test('Resend sends four existing flows via HTTPS only to actual allowlisted email',async()=>{
 const calls=[];const mail=createMailer({...options,fetcher:async(url,req)=>{calls.push({url,req});return {ok:true,json:async()=>({id:'test'})}}});
 const data={email:'tester@gmail.com',code:'123456',number:'TEST',token:'test-token'};
 for(const method of ['resetOtp','coachOtp','invite','otp'])await mail[method](data);
 assert.equal(calls.length,4);
 for(const {url,req} of calls){assert.equal(url,'https://api.resend.com/emails');const b=JSON.parse(req.body);assert.deepEqual(b.to,['tester@gmail.com']);assert.match(b.from,/onboarding@resend.dev/);assert.equal(req.headers.Authorization,'Bearer re_mock_test');}
 await assert.rejects(mail.coachOtp({...data,email:'other@gmail.com'}),{status:503});assert.equal(calls.length,4);
});
test('Resend rejects missing secrets and hides provider error details',async()=>{
 assert.throws(()=>createMailer({...options,apiKey:''}));
 assert.throws(()=>createMailer({...options,testRecipient:''}));
 const mail=createMailer({...options,fetcher:async()=>{throw Error('provider secret detail')}});
 await assert.rejects(mail.resetOtp({email:'tester@gmail.com',code:'123456'}),{status:503,message:'Email staging gagal dikirim. Periksa konfigurasi Resend.'});
 assert.throws(()=>createMailer({mode:'mailpit',environment:'production'}));
 assert.throws(()=>createMailer({mode:'disabled'}).ready(),{status:503});
});
