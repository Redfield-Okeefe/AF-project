// Schema metadata only: no application rows, passwords, OTPs or tokens.
import {getPool,closePool} from '../config/database.js';
const targets=['users','coach_profiles','players','registrations','programs','classes','coach_assignments','class_enrollments','training_sessions','attendance'];
let client;
try{
 client=await getPool().connect();
 await client.query('BEGIN READ ONLY');
 const db=(await client.query("SELECT current_database() AS database,current_setting('server_version') AS version")).rows[0];
 if(db.database!=='bnr_academy')throw Error('Database bukan bnr_academy');
 const columns=(await client.query("SELECT c.relname AS table_name,a.attnum AS position,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS data_type,a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS default_expression,a.attidentity AS identity,a.attgenerated AS generated FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relname=ANY($1::text[]) ORDER BY c.relname,a.attnum",[targets])).rows;
 const constraints=(await client.query("SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,pg_get_constraintdef(k.oid,true) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) ORDER BY c.relname,k.conname",[targets])).rows;
 const indexes=(await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname",[targets])).rows;
 const enums=(await client.query("SELECT DISTINCT c.relname AS table_name,a.attname AS column_name,t.typname AS enum_type,e.enumlabel,e.enumsortorder FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped JOIN pg_type t ON t.oid=a.atttypid JOIN pg_enum e ON e.enumtypid=CASE WHEN t.typtype='d' THEN t.typbasetype ELSE t.oid END WHERE n.nspname='public' AND c.relname=ANY($1::text[]) ORDER BY c.relname,a.attname,e.enumsortorder",[targets])).rows;
 const triggers=(await client.query("SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND NOT t.tgisinternal ORDER BY c.relname,t.tgname",[targets])).rows;
 const tableCount=(await client.query("SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows[0].total;
 await client.query('COMMIT');
 const missing=targets.filter(t=>!columns.some(c=>c.table_name===t));
 console.log(JSON.stringify({db,tableCount,missing,columns,constraints,indexes,enums,triggers},null,2));
}catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});console.error('Inspeksi skema gagal:',error.code||error.name);process.exitCode=1;}
finally{if(client)client.release();await closePool();}
