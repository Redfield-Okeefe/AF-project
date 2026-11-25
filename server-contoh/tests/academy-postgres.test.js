import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import express from 'express';
import {mountAcademy} from '../routes/academy.routes.js';
import {errorHandler} from '../middleware/errorHandler.js';
import {ApiError} from '../services/auth.service.js';
import {jakartaDate} from '../validators/registration.validator.js';
const url=process.env.ACADEMY_TEST_DATABASE_URL;
test('Fase 4–6 real PostgreSQL: owner/coach/player HTTP, transactions, conflicts, history',async()=>{
 if(process.env.GITHUB_ACTIONS!=='true'||!url)throw Error('Only run on isolated GitHub Actions database.');
 const parsed=new URL(url);if(parsed.hostname!=='127.0.0.1'||parsed.pathname!=='/bnr_academy_ci'||parsed.username!=='bnr_ci')throw Error('Unsafe fixture database.');
 const db=new pg.Pool({connectionString:url});
 let server;
 try{
  const check=(await db.query("SELECT current_database() AS name, to_regclass('public.users') AS existing")).rows[0];assert.equal(check.name,'bnr_academy_ci');assert.equal(check.existing,null,'Fixture must be empty.');
  await db.query(await readFile(new URL('./academy-fixture.sql',import.meta.url),'utf8'));
  async function user(role,name){const {rows:[u]}=await db.query("INSERT INTO users(full_name,email,role,status,email_verified_at) VALUES($1,$2,$3,'aktif',now()) RETURNING id,role,session_version",[name,name+'@bnr.test',role]);if(role==='pelatih')await db.query("INSERT INTO coach_profiles(user_id,registration_review_status) VALUES($1,'aktif')",[u.id]);return u;}
  const owner=await user('owner','Owner'),coach=await user('pelatih','Coach'),other=await user('pelatih','Other'),player=await user('pemain','Player'),outsider=await user('pemain','Outsider');
  const tokens={owner,coach,other,player,outsider};const app=express();const auth=(q,s,n)=>{const u=tokens[q.get('Authorization')];if(!u)return n(new ApiError(401,'Login'));q.user=u;n();};mountAcademy(app,auth,db);app.use(errorHandler);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
  const base='http://127.0.0.1:'+server.address().port+'/api/v1';
  async function call(role,method,path,status,body){const r=await fetch(base+path,{method,headers:{Authorization:role,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,method+' '+path+' '+JSON.stringify(data));return data;}
  const {program:{id:pid}}=await call('owner','POST','/owner/programs',201,{name:'Junior test',min_age_years:6,max_age_years:14,weekly_sessions:2,display_fee:200000});
  async function child(u,name){const birth=(await db.query("SELECT ((clock_timestamp() AT TIME ZONE 'Asia/Jakarta')::date-interval '10 years')::date AS d")).rows[0].d;const {rows:[p]}=await db.query("INSERT INTO players(user_id,full_name,gender,birth_date,status) VALUES($1,$2,'Laki-laki',$3,'aktif') RETURNING id",[u.id,name,birth]);await db.query("INSERT INTO registrations(player_id,program_id,status) VALUES($1,$2,'diterima')",[p.id,pid]);return p.id;}
  const playerId=await child(player,'Player'),outsiderId=await child(outsider,'Outsider');
  const klass={name:'U-12 test',program_id:pid,min_age_years:6,max_age_years:14,gender_category:'campuran',capacity:1};
  const {class:{id:cid}}=await call('owner','POST','/owner/classes',201,klass);
  const {class:{id:cid2}}=await call('owner','POST','/owner/classes',201,{...klass,name:'U-12 test B'});
  await call('owner','POST','/owner/classes',409,klass);await call('coach','POST','/owner/classes',403,klass);
  const day=jakartaDate(),yesterday=new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10),tomorrow=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  const root='/owner/classes/'+cid;
  await call('owner','POST',root+'/coaches',201,{coach_user_id:coach.id,start_date:day});
  await call('owner','POST',root+'/coaches',409,{coach_user_id:other.id,start_date:day});
  await call('owner','POST',root+'/players',201,{player_id:playerId,start_date:day});
  await call('owner','POST',root+'/players',409,{player_id:outsiderId,start_date:day});
  await call('owner','POST','/owner/classes/'+cid2+'/players',409,{player_id:playerId,start_date:day});
  await call('owner','GET',root+'/members',200);
  assert.deepEqual((await call('coach','GET','/me/classes',200)).items.map(c=>c.id),[cid]);
  assert.equal((await call('other','GET','/me/classes',200)).items.length,0);
  assert.deepEqual((await call('player','GET','/me/classes',200)).items.map(c=>c.id),[cid]);
  assert.equal((await call('outsider','GET','/me/classes',200)).items.length,0);
  // Backdate fixture membership one day; API never accepts backdated assignment.
  await db.query("UPDATE class_enrollments SET start_date=$1 WHERE class_id=$2",[yesterday,cid]);await db.query("UPDATE coach_assignments SET start_date=$1 WHERE class_id=$2",[yesterday,cid]);
  const s={class_id:cid,session_type:'latihan',title:'Latihan',session_date:yesterday,start_time:'10:00',end_time:'11:00',venue:'Lapangan A'};
  const {session:{id:sid}}=await call('coach','POST','/coach/sessions',201,s);
  await call('other','POST','/coach/sessions',403,s);
  await call('coach','POST','/coach/sessions',409,{...s,title:'Bentrok',start_time:'10:30'});
  const {session:{id:future}}=await call('coach','POST','/coach/sessions',201,{...s,session_date:tomorrow});
  await call('coach','PUT','/coach/sessions/'+future,200,{...s,session_date:tomorrow,title:'Revisi'});
  await call('coach','PUT','/coach/sessions/'+future+'/attendance',409,{items:[{player_id:playerId,status:'hadir'}]});
  await call('coach','POST','/coach/sessions/'+future+'/cancel',200);
  await call('coach','PUT','/coach/sessions/'+future+'/attendance',409,{items:[{player_id:playerId,status:'hadir'}]});
  assert.equal((await call('player','GET','/me/sessions',200)).items.length,2);
  assert.equal((await call('outsider','GET','/me/sessions',200)).items.length,0);
  await call('other','GET','/coach/sessions/'+sid+'/attendance',403);
  const roster=await call('coach','GET','/coach/sessions/'+sid+'/attendance',200);assert.deepEqual(roster.items.map(x=>x.player_id),[playerId]);
  await call('coach','PUT','/coach/sessions/'+sid+'/attendance',403,{items:[{player_id:outsiderId,status:'hadir'}]});
  for(const status of ['hadir','izin','hadir'])await call('coach','PUT','/coach/sessions/'+sid+'/attendance',200,{items:[{player_id:playerId,status}]});
  assert.equal((await db.query('SELECT count(*)::int AS n FROM attendance')).rows[0].n,1);
  await call('coach','POST','/coach/sessions/'+sid+'/cancel',409);
  assert.equal((await call('player','GET','/me/attendance',200)).items[0].status,'hadir');
  assert.equal((await call('outsider','GET','/me/attendance',200)).items.length,0);
  assert.equal((await call('owner','GET','/me/attendance',200)).items.length,1);
  await call('owner','PATCH',root+'/status',409,{status:'arsip'});
  const member=(await call('owner','GET',root+'/members',200)).players[0];
  await call('owner','PATCH',root+'/players/'+member.id+'/end',200,{end_date:day});
  await call('owner','POST','/owner/classes/'+cid2+'/players',201,{player_id:playerId,start_date:tomorrow});
  assert.equal((await call('player','GET','/me/attendance',200)).items[0].status,'hadir');
  assert.ok((await db.query('SELECT count(*)::int AS n FROM audit_logs')).rows[0].n>=10);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await db.end();}
});
