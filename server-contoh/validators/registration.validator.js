export class RegistrationError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
const fail=message=>{throw new RegistrationError(400,message);};
export const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function requireId(value,label='ID'){
  if(typeof value!=='string'||!UUID_RE.test(value))fail(label+' tidak valid.');
  return value.toLowerCase();
}
export function jakartaDate(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return p.year+'-'+p.month+'-'+p.day;
}
export function ageAt(birth,today=jakartaDate()){
  const valid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s.slice(0,4)!=='0000'&&
    !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  if(!valid(birth)||!valid(today)||birth>today)fail('Tanggal lahir tidak valid.');
  const age=Number(today.slice(0,4))-Number(birth.slice(0,4))-(today.slice(5)<birth.slice(5)?1:0);
  if(age>120)fail('Tanggal lahir di luar rentang yang wajar.');
  return age;
}
function field(body,key,label,min,max,optional=false){
  const raw=body[key];
  if(optional&&(raw==null||raw===''))return null;
  if(typeof raw!=='string')fail(label+' harus berupa teks.');
  const value=raw.trim();
  if(optional&&!value)return null;
  if(value.length<min||value.length>max||value.includes('\0'))fail(label+' tidak valid (panjang '+min+'–'+max+' karakter).');
  return value;
}
function object(body){
  if(!body||typeof body!=='object'||Array.isArray(body))fail('Body JSON harus berupa objek.');
}
export function validateRegistration(body,today=jakartaDate()){
  object(body);
  // Public clients cannot set user_id, status, role, fees, reviewer or student_code.
  const full_name=field(body,'full_name','Nama pemain',2,100).replace(/\s+/gu,' ');
  const gender=field(body,'gender','Jenis kelamin',1,16);
  if(!['Laki-laki','Perempuan'].includes(gender))fail('Jenis kelamin tidak valid.');
  const birth_date=field(body,'birth_date','Tanggal lahir',10,10);
  const age=ageAt(birth_date,today);
  const contact_email=field(body,'contact_email','Email',3,255).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email))fail('Format email tidak valid.');
  const rawPhone=field(body,'contact_phone','WhatsApp',8,25);
  let contact_phone=rawPhone.replace(/[\s()-]/g,'');
  if(contact_phone.startsWith('+'))contact_phone=contact_phone.slice(1);
  if(contact_phone.startsWith('0'))contact_phone='62'+contact_phone.slice(1);
  if(!/^62[1-9]\d{7,12}$/.test(contact_phone))fail('Gunakan nomor WhatsApp Indonesia yang valid (08 atau +62).');
  const jersey_size=field(body,'jersey_size','Ukuran jersey',1,5);
  if(!['XS','S','M','L','XL'].includes(jersey_size))fail('Ukuran jersey tidak valid.');
  return {full_name,gender,birth_date,age,contact_email,contact_phone,jersey_size,
    birth_place:field(body,'birth_place','Tempat lahir',1,100),
    school_name:field(body,'school_name','Asal sekolah',1,150),
    guardian_name:field(body,'guardian_name','Nama wali',2,100),
    address:field(body,'address','Alamat',5,1000),
    notes:field(body,'notes','Catatan',1,1000,true),
    program_id:requireId(body.program_id,'Program')};
}
export function checkProgram(program,age){
  if(!program||program.status!=='aktif')fail('Program tidak tersedia atau tidak aktif.');
  if((program.min_age_years!=null&&age<program.min_age_years)||(program.max_age_years!=null&&age>program.max_age_years))fail('Usia pemain tidak sesuai dengan program.');
}
export function validateReview(body,decision){
  object(body??{});
  if(!['diterima','ditolak'].includes(decision))fail('Keputusan tidak valid.');
  return field(body??{},'review_note','Catatan keputusan',decision==='ditolak'?3:1,1000,decision!=='ditolak');
}
export function validateList(query,allowedStatuses){
  const parse=(key,fallback,max)=>{
    const v=query[key];
    if(v===undefined)return fallback;
    if(typeof v!=='string'||!/^\d+$/.test(v)||!Number.isSafeInteger(Number(v))||Number(v)>max)fail(key+' tidak valid.');
    return Number(v);
  };
  const limit=parse('limit',25,100),offset=parse('offset',0,100000);
  if(limit<1)fail('limit minimal 1.');
  const status=query.status;
  if(status!==undefined&&!allowedStatuses.includes(status))fail('Filter status tidak valid.');
  return {limit,offset,status:status??null};
}
