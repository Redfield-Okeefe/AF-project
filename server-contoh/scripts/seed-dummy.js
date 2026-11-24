import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { databaseConfig } from '../config/env.js';
import { getPool,verifyDatabase,closePool } from '../config/database.js';
// Reserved fictional identities. Never modify an existing account or use on production.
const definitions=[
  {role:'owner',email:'owner@bnr.test',name:'Owner Demo'},
  {role:'pelatih',email:'pelatih@bnr.test',name:'Pelatih Demo'},
  {role:'pemain',email:'pemain@bnr.test',name:'Pemain Demo'}
];
let client;
try {
  const {url}=databaseConfig();
  if (!process.argv.includes('--local-dev') || process.env.NODE_ENV==='production' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname)) throw new Error('Seed dummy hanya untuk PostgreSQL lokal, bukan produksi.');
  const pool=getPool();await verifyDatabase(pool);
  client=await pool.connect();await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(62026003)');
  const existing=await client.query('SELECT email FROM public.users WHERE lower(btrim(email))=ANY($1::text[])',[definitions.map(d=>d.email)]);
  if(existing.rowCount){throw new Error('Sebagian atau seluruh email dummy sudah ada. Tidak ada data yang ditimpa. Gunakan kredensial sebelumnya; periksa DBeaver jika perlu reset.');}
  const creds=[];const ids={};
  for(const d of definitions){
    const password=`BNR-${randomBytes(18).toString('base64url')}`;
    const hash=await bcrypt.hash(password,12);
    const {rows}=await client.query(`INSERT INTO public.users(full_name,email,password_hash,role,status,email_verified_at) VALUES($1,$2,$3,$4,'aktif',now()) RETURNING id`,[d.name,d.email,hash,d.role]);
    ids[d.role]=rows[0].id;creds.push({role:d.role,email:d.email,password});
  }
  await client.query(`INSERT INTO public.coach_profiles(user_id,license_name,years_experience,biography) VALUES($1,'Lisensi fiktif (dummy)',1,'Akun pengujian lokal')`,[ids.pelatih]);
  const player=(await client.query(`INSERT INTO public.players(user_id,student_code,full_name,gender,birth_date,guardian_name,contact_email,jersey_size,status,notes)
    VALUES($1,'DEMO-AUTH-001','Pemain Demo','Laki-laki',DATE '2015-01-01','Wali Demo','pemain@bnr.test','M','aktif','Data fiktif untuk pengujian lokal') RETURNING id`,[ids.pemain])).rows[0];
  // Archived test program: no fake public offering or tariff.
  const program=(await client.query(`INSERT INTO public.programs(name,description,status) VALUES('DEMO - Program Uji Autentikasi','Data fiktif lokal','arsip') RETURNING id`)).rows[0];
  await client.query(`INSERT INTO public.registrations(registration_number,player_id,program_id,status,reviewed_by,reviewed_at,review_note)
    VALUES('DEMO-AUTH-REG-001',$1,$2,'diterima',$3,now(),'Persetujuan fiktif oleh script seed lokal')`,[player.id,program.id,ids.owner]);
  await client.query('COMMIT');
  console.log('Seed berhasil. Simpan password berikut secara privat; ditampilkan sekali di terminal lokal.');
  console.table(creds);
  console.log('Tidak ada OTP/email yang dikirim. Jangan commit atau bagikan kredensial dummy.');
}catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});console.error('Seed dibatalkan:',error.code || error.message);process.exitCode=1;}
finally{if(client)client.release();await closePool();}
