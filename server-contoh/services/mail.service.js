import nodemailer from 'nodemailer';
import {coachEmail} from './coach-registration.validation.js';
import {ActivationError,demoEmail} from './activation.crypto.js';
export function createMailer({mode=process.env.MAIL_MODE||'disabled',environment=process.env.NODE_ENV}={}){
  // Existing API remains available if mail testing has not been enabled.
  const enabled=mode==='mailpit'&&environment!=='production';
  if(mode!=='disabled'&&mode!=='mailpit')throw new Error('MAIL_MODE harus disabled atau mailpit.');
  if(mode==='mailpit'&&!enabled)throw new Error('Mailpit tidak boleh dipakai pada production.');
  const transport=enabled?nodemailer.createTransport({host:'127.0.0.1',port:1025,secure:false,ignoreTLS:true,connectionTimeout:3000,greetingTimeout:3000,socketTimeout:5000,logger:false,debug:false}):null;
  function ready(){if(!transport)throw new ActivationError(503,'Email lokal belum aktif. Jalankan Mailpit dan atur MAIL_MODE=mailpit.');}
  async function send(to,subject,text,coach=false){
    ready();
    to=coach==='reset'?String(to).trim().toLowerCase():coach?coachEmail(to,{allowTest:true}):demoEmail(to);
    if(!/^[a-z0-9._%+!-]+@[a-z0-9.-]+\.[a-z0-9]+$/.test(to)||to.length>255)throw new ActivationError(400,'Email tidak valid.');
    try {
      const result=await transport.sendMail({from:'BNR Development <no-reply@bnr.test>',to,subject,text,disableFileAccess:true,disableUrlAccess:true});
      if(!result.accepted?.length)throw Error('SMTP rejected');
    } catch {throw new ActivationError(503,'Email lokal gagal dikirim. Periksa Mailpit port 1025.');}
  }
  return {ready,enabled,resetOtp:({email,code})=>send(email,'[BNR DEV] OTP reset password','PENGUJIAN LOKAL - kode OTP: '+code+'\nBerlaku 5 menit. Jangan bagikan.','reset'),coachOtp:({email,code})=>send(email,'[BNR DEV] OTP registrasi pelatih','PENGUJIAN LOKAL - kode OTP: '+code+'\nBerlaku 5 menit. Jangan bagikan.',true),invite:({email,number,token})=>send(email,'[BNR DEV] Undangan aktivasi '+number,
    'PENGUJIAN LOKAL - bukan akun resmi.\nNomor pendaftaran: '+number+'\nKode undangan: '+token+'\nBerlaku 24 jam dan terikat pada pendaftaran ini. Jangan bagikan. Aktivasi akun tersedia pada Fase 3B.'),
    otp:({email,code,number})=>send(email,'[BNR DEV] OTP aktivasi '+number,
    'PENGUJIAN LOKAL - bukan akun resmi.\nNomor pendaftaran: '+number+'\nKode OTP: '+code+'\nBerlaku 5 menit. Jangan bagikan.')};
}
