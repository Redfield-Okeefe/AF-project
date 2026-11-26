import sharp from 'sharp';
import {ApiError} from './auth.service.js';
import {tx,audit} from '../repositories/activation.repository.js';
const fail=(status,message)=>{throw new ApiError(status,message)};
const fields={owner:['nama','foto'],pelatih:['nama','wa','lisensi','foto'],pemain:['nama','wa','ortu','alamat','sekolah','tempatLahir','jersey','foto']};
const limits={nama:[2,100],wa:[0,25],ortu:[2,100],alamat:[0,1000],sekolah:[0,150],tempatLahir:[0,100],jersey:[0,5],lisensi:[0,120]};
export function profileInput(role,body){
 if(!fields[role]||!body||typeof body!=='object'||Array.isArray(body)||!Object.keys(body).length||Object.keys(body).some(k=>!fields[role].includes(k)))fail(400,'Field profil tidak diizinkan.');
 const v={};for(const [k,value] of Object.entries(body)){
  if(k==='foto'){if(typeof value!=='string'||value.length>400000||value&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))fail(400,'Foto JPEG tidak valid atau terlalu besar.');v[k]=value;continue;}
  if(typeof value!=='string')fail(400,'Data profil harus berupa teks.');
  const s=value.trim(),[min,max]=limits[k];if(s.length<min||s.length>max||s.includes('\0'))fail(400,'Field '+k+' tidak valid.');
  if(k==='jersey'&&s&&!['XS','S','M','L','XL'].includes(s))fail(400,'Ukuran jersey tidak valid.');
  if(k==='wa'&&s&&!/^(?:\+62|62|0)8\d{7,12}$/.test(s.replace(/[\s-]/g,'')))fail(400,'WhatsApp tidak valid.');
  v[k]=k==='wa'?s.replace(/[\s-]/g,''):s;
 }return v;
}
export async function profilePhoto(value){
 if(value==='')return null;
 try{const input=Buffer.from(value.slice('data:image/jpeg;base64,'.length),'base64');if(input.length>262144)throw Error('size');const im=sharp(input,{limitInputPixels:4000000});const meta=await im.metadata();if(meta.format!=='jpeg')throw Error('format');const out=await im.rotate().resize(360,360,{fit:'cover',withoutEnlargement:true}).jpeg({quality:80}).toBuffer();if(out.length>262144)throw Error('size');return out;}
 catch{fail(400,'Foto rusak atau melebihi batas ukuran.');}
}
const one=async(db,sql,args)=>(await db.query(sql,args)).rows[0];
async function account(db,u,lock=false){
 const a=await one(db,"SELECT id,full_name,email,role,status,profile_photo_jpeg FROM public.users WHERE id=$1 AND role=$2 AND status='aktif' AND session_version=$3 AND email_verified_at IS NOT NULL"+(lock?' FOR UPDATE':''),[u.id,u.role,u.session_version]);if(!a)fail(401,'Sesi tidak berlaku.');return a;
}
async function get(db,u,lock=false){
 const a=await account(db,u,lock),base={id:a.id,nama:a.full_name,email:a.email,status:a.status,foto:a.profile_photo_jpeg?'data:image/jpeg;base64,'+a.profile_photo_jpeg.toString('base64'):'',wa:'',lisensi:'',jk:'',tglLahir:'',tempatLahir:'',sekolah:'',jersey:'',ortu:'',alamat:''};
 if(a.role==='pemain'){
  const p=await one(db,"SELECT id,student_code,full_name,gender,birth_date::text AS birth_date,birth_place,school_name,guardian_name,contact_phone,address,jersey_size FROM public.players WHERE user_id=$1 AND status='aktif'"+(lock?' FOR UPDATE':''),[a.id]);if(!p)fail(409,'Biodata pemain belum siap.');
  return {...base,id:p.student_code||p.id,nama:p.full_name,jk:p.gender,tglLahir:p.birth_date,tempatLahir:p.birth_place||'',sekolah:p.school_name||'',jersey:p.jersey_size||'',wa:p.contact_phone||'',ortu:p.guardian_name,alamat:p.address||''};
 }
 if(a.role==='pelatih'){const p=await one(db,"SELECT phone,registration_whatsapp,license_name FROM public.coach_profiles WHERE user_id=$1"+(lock?' FOR UPDATE':''),[a.id]);if(!p)fail(409,'Profil pelatih belum siap.');return {...base,wa:p.phone||p.registration_whatsapp||'',lisensi:p.license_name||''};}
 return base;
}
export function createProfileService(pool){
 return {get:u=>get(pool,u),async save(u,body){
  const v=profileInput(u.role,body),photo='foto'in v?await profilePhoto(v.foto):undefined;
  return tx(pool,async db=>{
   // Serialize with status/account changes. The shared module lock prevents
   // concurrent class-management writes during profile changes.
   await db.query("SELECT pg_advisory_xact_lock(hashtext('bnr-academy-phase-456'))");
   const old=await get(db,u,true);
   if('nama'in v)await db.query("UPDATE public.users SET full_name=$2 WHERE id=$1",[u.id,v.nama]);
   if(photo!==undefined)await db.query("UPDATE public.users SET profile_photo_jpeg=$2 WHERE id=$1",[u.id,photo]);
   if(u.role==='pemain'){
    const merged={...old,...v};
    await db.query("UPDATE public.players SET full_name=$2,contact_phone=$3,guardian_name=$4,address=$5,school_name=$6,birth_place=$7,jersey_size=$8 WHERE user_id=$1",[u.id,merged.nama,merged.wa||null,merged.ortu,merged.alamat||null,merged.sekolah||null,merged.tempatLahir||null,merged.jersey||null]);
   }
   if(u.role==='pelatih'&&('wa'in v||'lisensi'in v)){
    if('wa'in v)await db.query("UPDATE public.coach_profiles SET phone=$2::varchar(25),registration_whatsapp=$3::text WHERE user_id=$1",[u.id,v.wa||null,v.wa||null]);
    if('lisensi'in v)await db.query("UPDATE public.coach_profiles SET license_name=$2::varchar(120) WHERE user_id=$1",[u.id,v.lisensi||null]);
   }
   await audit(db,u.id,'profile.update','users',u.id,{fields:Object.keys(v)});
   return get(db,u);
  }).catch(e=>{if(['40P01','40001'].includes(e.code))fail(409,'Data sedang berubah, coba kembali.');throw e;});
 }};
}
