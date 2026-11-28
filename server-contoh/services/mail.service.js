import nodemailer from 'nodemailer';
import {coachEmail} from './coach-registration.validation.js';
import {ActivationError,activationEmail} from './activation.crypto.js';

const emailRE=/^[a-z0-9._%+!-]+@[a-z0-9.-]+\.[a-z0-9]+$/;
export function createMailer({mode=process.env.MAIL_MODE||'disabled',environment=process.env.NODE_ENV,
  apiKey=process.env.RESEND_API_KEY,testRecipient=process.env.RESEND_TEST_RECIPIENT,fetcher=globalThis.fetch}={}){
  const local=mode==='mailpit'&&environment!=='production';
  const resend=mode==='resend';
  if(!['disabled','mailpit','resend'].includes(mode))throw new Error('MAIL_MODE harus disabled, mailpit atau resend.');
  if(mode==='mailpit'&&!local)throw new Error('Mailpit tidak boleh dipakai pada production.');
  const allowed=String(testRecipient||'').trim().toLowerCase();
  if(resend&&(!/^re_\S+$/.test(apiKey||'')||!emailRE.test(allowed)||allowed.endsWith('.test')||allowed.length>255))
    throw new Error('Mode Resend testing memerlukan RESEND_API_KEY dan RESEND_TEST_RECIPIENT yang valid.');
  const enabled=local||resend;
  const transport=local?nodemailer.createTransport({host:'127.0.0.1',port:1025,secure:false,ignoreTLS:true,connectionTimeout:3000,greetingTimeout:3000,socketTimeout:5000,logger:false,debug:false}):null;
  function ready(){if(!enabled)throw new ActivationError(503,'Layanan email belum aktif.');}
  async function send(to,subject,text,coach=false){
    ready();
    to=coach==='reset'?String(to).trim().toLowerCase():coach?coachEmail(to,{allowTest:local}):activationEmail(to);
    if(!emailRE.test(to)||to.length>255)throw new ActivationError(400,'Email tidak valid.');
    // Never redirect OTPs to the operator: only the actual, explicitly allowed recipient.
    if(resend&&to!==allowed)throw new ActivationError(503,'Email staging hanya tersedia untuk akun pengujian yang diizinkan.');
    try {
      if(resend){
        const result=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from:'BNR Futsal Academy <onboarding@resend.dev>',to:[to],subject,text}),signal:AbortSignal.timeout(8000)});
        if(!result.ok||!(await result.json()).id)throw Error('Email rejected');
      }else{
        const result=await transport.sendMail({from:'BNR Development <no-reply@bnr.test>',to,subject,text,disableFileAccess:true,disableUrlAccess:true});
        if(!result.accepted?.length)throw Error('SMTP rejected');
      }
    } catch {throw new ActivationError(503,resend?'Email staging gagal dikirim. Periksa konfigurasi Resend.':'Email lokal gagal dikirim. Periksa Mailpit port 1025.');}
  }
  const prefix=resend?'[BNR STAGING] ':'[BNR DEV] ';
  const notice=resend?'PENGUJIAN STAGING - bukan akun resmi.':'PENGUJIAN LOKAL - bukan akun resmi.';
  return {ready,enabled,resetOtp:({email,code})=>send(email,prefix+'OTP reset password',notice+'\nKode OTP: '+code+'\nBerlaku 5 menit. Jangan bagikan.','reset'),coachOtp:({email,code})=>send(email,prefix+'OTP registrasi pelatih',notice+'\nKode OTP: '+code+'\nBerlaku 5 menit. Jangan bagikan.',true),invite:({email,number,token})=>send(email,prefix+'Undangan aktivasi '+number,
    notice+'\nNomor pendaftaran: '+number+'\nKode undangan: '+token+'\nBerlaku 24 jam dan terikat pada pendaftaran ini. Jangan bagikan.'),
    otp:({email,code,number})=>send(email,prefix+'OTP aktivasi '+number,
    notice+'\nNomor pendaftaran: '+number+'\nKode OTP: '+code+'\nBerlaku 5 menit. Jangan bagikan.')};
}
