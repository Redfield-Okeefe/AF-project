/* Existing Gallery/Beranda API contract retained; shared PostgreSQL pool and
 * current-account JWT authorization replace the old in-memory auth adapter.
 * Existing upload directory and singleton Home UUID are unchanged. */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { authorize } from './middleware/authorize.js';
import { ApiError } from './services/auth.service.js';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'media-uploads');
const homeId = '00000000-0000-4000-8000-000000000001';
const uuidRE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const upload = multer({storage:multer.memoryStorage(), limits:{fileSize:8*1024*1024,files:1,fields:3,fieldSize:4096},fileFilter(req,file,cb){
  if (!['image/jpeg','image/png','image/webp'].includes(file.mimetype)) return cb(new ApiError(400,'Pilih JPG, PNG, atau WebP.'));
  cb(null,true);
}}).single('photo');
const handleUpload = (req,res,next)=>upload(req,res,error=>error ? next(error instanceof ApiError ? error : new ApiError(400,'Unggahan tidak valid. Foto maksimal 8 MB.')) : next());
const wrap = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const removeFile = async name=>{ if(name) await unlink(path.join(dir,path.basename(name))).catch(error=>{if(error.code!=='ENOENT') console.error('Pembersihan foto gagal:',error.code);}); };
const toMedia = row=>row ? {id:row.id,title:row.title,description:row.description,img:`/media/files/${row.file_name}`,width:row.width,height:row.height,createdAt:row.created_at} : null;
async function encode(file){
  let data,info;
  try {
    const meta=await sharp(file.buffer,{limitInputPixels:25000000}).metadata();
    if(!['jpeg','png','webp'].includes(meta.format)) throw new Error('format');
    ({data,info}=await sharp(file.buffer,{limitInputPixels:25000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:82,mozjpeg:true}).toBuffer({resolveWithObject:true}));
  } catch { throw new ApiError(400,'Foto rusak atau format/ukuran gambar tidak didukung.'); }
  await mkdir(dir,{recursive:true});
  const name=`${randomUUID()}.jpg`;
  await writeFile(path.join(dir,name),data,{flag:'wx'});
  return {file_name:name,width:info.width,height:info.height};
}
async function transaction(pool, fn){
  const client=await pool.connect();
  try { await client.query('BEGIN'); const result=await fn(client); await client.query('COMMIT'); return result; }
  catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
}
export function setupMedia(app,authenticate,pool){
  const owner=[authenticate,authorize('owner')];
  app.use('/media/files',express.static(dir,{fallthrough:false,etag:true,maxAge:'7d',index:false,dotfiles:'deny',setHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');}}));
  app.get('/media/gallery',wrap(async(req,res)=>{
    const r=await pool.query("SELECT * FROM public.public_media WHERE scope='gallery' ORDER BY created_at DESC LIMIT 80");
    res.json({items:r.rows.map(toMedia)});
  }));
  app.get('/media/home',wrap(async(req,res)=>{
    const r=await pool.query("SELECT * FROM public.public_media WHERE id=$1 AND scope='home'",[homeId]);
    res.json({item:toMedia(r.rows[0])});
  }));
  app.post('/media/gallery',...owner,handleUpload,wrap(async(req,res)=>{
    if(!req.file) throw new ApiError(400,'Pilih foto sebelum mengunggah.');
    const title=String(req.body.title||'Kegiatan Akademi').trim().slice(0,100)||'Kegiatan Akademi';
    const saved=await encode(req.file);
    let row;
    try {
      row=await transaction(pool,async db=>{
        await db.query('SELECT pg_advisory_xact_lock(62026001)');
        const count=await db.query("SELECT COUNT(*)::int AS count FROM public.public_media WHERE scope='gallery'");
        if(count.rows[0].count>=80) throw new ApiError(400,'Gallery maksimal 80 foto.');
        return (await db.query("INSERT INTO public.public_media(id,scope,title,file_name,width,height,description) VALUES($1,'gallery',$2,$3,$4,$5,'Dokumentasi Akademi') RETURNING *",[randomUUID(),title,saved.file_name,saved.width,saved.height])).rows[0];
      });
    } catch(error){await removeFile(saved.file_name);throw error;}
    res.status(201).json({item:toMedia(row)});
  }));
  app.delete('/media/gallery/:id',...owner,wrap(async(req,res)=>{
    if(!uuidRE.test(req.params.id)) throw new ApiError(400,'ID foto tidak valid.');
    const r=await pool.query("DELETE FROM public.public_media WHERE id=$1 AND scope='gallery' RETURNING file_name",[req.params.id]);
    if(!r.rowCount) throw new ApiError(404,'Foto tidak ditemukan.');
    await removeFile(r.rows[0].file_name);res.json({ok:true});
  }));
  app.put('/media/home',...owner,handleUpload,wrap(async(req,res)=>{
    const title=String(req.body.title||'Sorotan Akademi').trim().slice(0,100)||'Sorotan Akademi';
    const description=String(req.body.description||'').trim().slice(0,200);
    const saved=req.file ? await encode(req.file) : null;
    let result;
    try {
      result=await transaction(pool,async db=>{
        await db.query('SELECT pg_advisory_xact_lock(62026002)');
        const old=(await db.query("SELECT * FROM public.public_media WHERE id=$1 AND scope='home'",[homeId])).rows[0];
        if(!saved&&!old) throw new ApiError(400,'Pilih foto sorotan terlebih dahulu.');
        const f=saved||old;
        const row=(await db.query(`INSERT INTO public.public_media(id,scope,title,description,file_name,width,height)
          VALUES($1,'home',$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,
          file_name=EXCLUDED.file_name,width=EXCLUDED.width,height=EXCLUDED.height,created_at=now() RETURNING *`,[homeId,title,description,f.file_name,f.width,f.height])).rows[0];
        return {row,oldFile:saved&&old ? old.file_name : null};
      });
    }catch(error){await removeFile(saved?.file_name);throw error;}
    await removeFile(result.oldFile);res.json({item:toMedia(result.row)});
  }));
  app.delete('/media/home',...owner,wrap(async(req,res)=>{
    const r=await transaction(pool,async db=>{await db.query('SELECT pg_advisory_xact_lock(62026002)');return db.query("DELETE FROM public.public_media WHERE id=$1 AND scope='home' RETURNING file_name",[homeId]);});
    await removeFile(r.rows[0]?.file_name);res.json({ok:true});
  }));
}
