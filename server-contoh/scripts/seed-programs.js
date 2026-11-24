import {databaseConfig} from '../config/env.js';
import {getPool,verifyDatabase,closePool} from '../config/database.js';
const name='DEMO - Program Pendaftaran (KU 6–17)';
try {
  const {url}=databaseConfig();
  if(!process.argv.includes('--local-dev')||process.env.NODE_ENV==='production'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))
    throw new Error('Seed program hanya untuk database development lokal.');
  const pool=getPool();await verifyDatabase(pool);
  // Dedicated fake program; never overwrite official program data or invent tariffs.
  await pool.query("INSERT INTO public.programs(name,description,min_age_years,max_age_years,status) VALUES($1,'PROGRAM FIKTIF untuk pengujian lokal, bukan penawaran resmi',6,17,'aktif') ON CONFLICT DO NOTHING",[name]);
  const row=(await pool.query('SELECT id,name,status,min_age_years,max_age_years FROM public.programs WHERE lower(btrim(name))=lower(btrim($1))',[name])).rows[0];
  if(!row||row.status!=='aktif'||row.min_age_years!==6||row.max_age_years!==17)throw new Error('Program uji tidak sesuai/diarsipkan. Periksa DBeaver; tidak ada data lama yang ditimpa.');
  console.log('Program pengujian siap (tarif tidak ditentukan).');console.table([row]);
}catch(error){console.error('Seed program gagal:',error.code||error.message);process.exitCode=1;}
finally{await closePool();}
