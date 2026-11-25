import {createHmac} from 'node:crypto';
import {ActivationError,uuid,validateCode} from './activation.crypto.js';

export function coachEmail(value,{allowTest=false}={}){
  const email=typeof value==='string'?value.trim().toLowerCase():'';
  if(email.length>255||(!/^[a-z0-9._%+-]+@gmail\.com$/.test(email)&&!(allowTest&&/^[a-z0-9._%+-]+@[a-z0-9.-]+\.test$/.test(email))))throw new ActivationError(400,'Gunakan alamat Gmail pribadi.');
  return email;
}
export function validateCoachPassword(password,confirmation){
  if(typeof password!=='string'||password.length<8||!/[A-Za-z]/.test(password)||!/\d/.test(password)||Buffer.byteLength(password,'utf8')>72||password.includes('\0'))throw new ActivationError(400,'Password minimal 8 karakter, mengandung huruf dan angka, maksimal 72 byte UTF-8.');
  if(password!==confirmation)throw new ActivationError(400,'Konfirmasi password tidak sama.');
  return password;
}
export function parseCoachForm(body,options){
  if(!body||typeof body!=='object'||Array.isArray(body)||['role','status','user_id','password_hash','review_status'].some(k=>Object.hasOwn(body,k))||body.peran!==undefined&&body.peran!=='pelatih')throw new ActivationError(400,'Role dan status ditentukan server.');
  const email=coachEmail(body.email,options);
  const nama=typeof body.nama==='string'?body.nama.trim():'';
  const wa=typeof body.wa==='string'?body.wa.replace(/[\s-]/g,''):'';
  const lisensi=typeof body.lisensi==='string'?body.lisensi.trim():body.lisensi==null?'':null;
  if(nama.length<3||nama.length>120||nama.includes('\0'))throw new ActivationError(400,'Nama lengkap 3–120 karakter.');
  if(!/^(\+62|62|0)8[0-9]{7,12}$/.test(wa))throw new ActivationError(400,'Nomor WhatsApp tidak valid.');
  if(lisensi===null||lisensi.length>60||lisensi.includes('\0'))throw new ActivationError(400,'Lisensi maksimal 60 karakter.');
  const password=validateCoachPassword(body.password,body.password_confirmation);
  return {email,nama,wa,lisensi,password};
}
export function coachOtpHash(secret,id,email,code){
  return createHmac('sha256',secret).update(JSON.stringify(['bnr-coach-register-v1',uuid(id),email,validateCode(code)])).digest('hex');
}
export function parseReview(body){
  const status=body?.status;
  if(!['aktif','ditolak','nonaktif'].includes(status))throw new ActivationError(400,'Status tidak valid.');
  const alasan=typeof body?.alasan==='string'?body.alasan.trim():'';
  if(status==='ditolak'&&(!alasan||alasan.length>1000||alasan.includes('\0')))throw new ActivationError(400,'Alasan penolakan wajib diisi (maksimal 1000 karakter).');
  return {status,alasan:status==='ditolak'?alasan:''};
}
export function canReview(from,to){
  return (from==='menunggu'&&['aktif','ditolak'].includes(to))||(from==='ditolak'&&to==='aktif')||(from==='aktif'&&to==='nonaktif')||(from==='nonaktif'&&to==='aktif');
}
