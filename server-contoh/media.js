/* Media API B.N.R Academy — PostgreSQL + penyimpanan JPG pada disk.
 * Operasi tulis hanya untuk JWT role Owner/admin; tidak menerima token demo frontend.
 * Run di server lokal/deploy sendiri, tidak berjalan di GitHub Pages.
 */
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import pg from 'pg'

const dir=path.join(path.dirname(fileURLToPath(import.meta.url)), 'media-uploads')
const homeId='00000000-0000-4000-8000-000000000001'
const { Pool }=pg
const schema=`
CREATE TABLE IF NOT EXISTS public_media (
  id UUID PRIMARY KEY,
  scope VARCHAR(10) NOT NULL CHECK (scope IN ('gallery','home')),
  title VARCHAR(100) NOT NULL,
  description VARCHAR(200) NOT NULL DEFAULT '',
  file_name VARCHAR(100) NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_public_media_gallery ON public_media(scope, created_at DESC);
`
const upload=multer({
 storage:multer.memoryStorage(),
 limits:{fileSize:8*1024*1024,files:1},
 fileFilter:(req,file,cb)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.mimetype))
    return cb(new Error('Pilih foto JPG, PNG, atau WebP.'))
  cb(null,true)
 }
}).single('photo')
const unlinks=async name=>{if(name)try{await unlink(path.join(dir,path.basename(name)))}catch{/*ignore*/}}
const toMedia=row=>row?{
 id:row.id,title:row.title,description:row.description,
 img:`/media/files/${row.file_name}`,width:row.width,height:row.height,
 createdAt:row.created_at
}:null

export function setupMedia(app,wajibLogin){
  const databaseUrl=process.env.DATABASE_URL
  const pool=databaseUrl?new Pool({connectionString:databaseUrl,max:5}):null
  let ready=null
  if(pool){
    ready=pool.query(schema).catch(err=>{
      console.error('Media PostgreSQL tidak siap:',err.message)
      return null
    })
  }
  app.use('/media/files',express.static(dir,{
    fallthrough:false,etag:true,maxAge:'7d',
    setHeaders(res){res.setHeader('X-Content-Type-Options','nosniff')}
  }))
  async function requireDb(req,res,next){
    if(!pool) return res.status(503).json({message:'Atur DATABASE_URL untuk mengaktifkan penyimpanan foto bersama.'})
    if(!await ready) return res.status(503).json({message:'PostgreSQL belum siap. Periksa DATABASE_URL dan tabel public_media.'})
    next()
  }
  function onlyOwner(req,res,next){
    if(!['owner','admin'].includes(req.user?.role)) return res.status(403).json({message:'Hanya Owner yang boleh mengelola foto.'})
    next()
  }
  const error=(res,e)=>{
    console.error('Media API:',e.message)
    return res.status(500).json({message:'Operasi foto gagal. Periksa database dan ruang penyimpanan.'})
  }
  const auth=[wajibLogin,onlyOwner]
  const handleUpload=(req,res,next)=>upload(req,res,e=>{
    if(!e)return next()
    return res.status(400).json({message:e instanceof multer.MulterError&&e.code==='LIMIT_FILE_SIZE'?'Foto maksimal 8 MB.':e.message})
  })
  const encode=async file=>{
    if(!file)return null
    const meta=await sharp(file.buffer,{limitInputPixels:25000000}).metadata()
    if(!['jpeg','png','webp'].includes(meta.format))throw new Error('Format file tidak didukung.')
    const {data,info}=await sharp(file.buffer,{limitInputPixels:25000000})
      .rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true})
      .jpeg({quality:82,mozjpeg:true}).toBuffer({resolveWithObject:true})
    await mkdir(dir,{recursive:true})
    const name=`${randomUUID()}.jpg`
    await writeFile(path.join(dir,name),data,{flag:'wx'})
    return {file_name:name,width:info.width,height:info.height}
  }
  app.get('/media/gallery',requireDb,async(req,res)=>{
    try{
      const r=await pool.query("SELECT * FROM public_media WHERE scope='gallery' ORDER BY created_at DESC LIMIT 80")
      res.json({items:r.rows.map(toMedia)})
    }catch(e){error(res,e)}
  })
  app.get('/media/home',requireDb,async(req,res)=>{
    try{
      const r=await pool.query("SELECT * FROM public_media WHERE id=$1",[homeId])
      res.json({item:toMedia(r.rows[0])})
    }catch(e){error(res,e)}
  })
  app.post('/media/gallery',...auth,requireDb,handleUpload,async(req,res)=>{
    if(!req.file)return res.status(400).json({message:'Pilih foto sebelum mengunggah.'})
    const title=String(req.body.title||'Kegiatan Akademi').trim().slice(0,100)||'Kegiatan Akademi'
    let saved
    try{
      const count=await pool.query("SELECT COUNT(*)::int AS count FROM public_media WHERE scope='gallery'")
      if(count.rows[0].count>=80)return res.status(400).json({message:'Gallery maksimal 80 foto. Hapus foto lama terlebih dahulu.'})
      saved=await encode(req.file)
      const r=await pool.query(
        "INSERT INTO public_media(id,scope,title,file_name,width,height,description) VALUES($1,'gallery',$2,$3,$4,$5,'Dokumentasi Akademi') RETURNING *",
        [randomUUID(),title,saved.file_name,saved.width,saved.height])
      res.status(201).json({item:toMedia(r.rows[0])})
    }catch(e){await unlinks(saved?.file_name);if(e.message==='Format file tidak didukung.')return res.status(400).json({message:e.message});error(res,e)}
  })
  app.delete('/media/gallery/:id',...auth,requireDb,async(req,res)=>{
    if(!/^[a-f\d-]{36}$/i.test(req.params.id))return res.status(400).json({message:'ID foto tidak valid.'})
    try{
      const r=await pool.query("DELETE FROM public_media WHERE id=$1 AND scope='gallery' RETURNING file_name",[req.params.id])
      if(!r.rowCount)return res.status(404).json({message:'Foto tidak ditemukan.'})
      await unlinks(r.rows[0].file_name)
      res.json({ok:true})
    }catch(e){error(res,e)}
  })
  app.put('/media/home',...auth,requireDb,handleUpload,async(req,res)=>{
    const title=String(req.body.title||'Sorotan Akademi').trim().slice(0,100)||'Sorotan Akademi'
    const description=String(req.body.description||'').trim().slice(0,200)
    let saved
    try{
      const old=(await pool.query("SELECT * FROM public_media WHERE id=$1",[homeId])).rows[0]
      if(!req.file&&!old)return res.status(400).json({message:'Pilih foto sorotan terlebih dahulu.'})
      saved=req.file?await encode(req.file):null
      const f=saved||old
      const r=await pool.query(`
      INSERT INTO public_media(id,scope,title,description,file_name,width,height)
      VALUES($1,'home',$2,$3,$4,$5,$6)
      ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,
        file_name=EXCLUDED.file_name,width=EXCLUDED.width,height=EXCLUDED.height,created_at=now()
      RETURNING *`,[homeId,title,description,f.file_name,f.width,f.height])
      if(saved&&old)await unlinks(old.file_name)
      res.json({item:toMedia(r.rows[0])})
    }catch(e){await unlinks(saved?.file_name);if(e.message==='Format file tidak didukung.')return res.status(400).json({message:e.message});error(res,e)}
  })
  app.delete('/media/home',...auth,requireDb,async(req,res)=>{
    try{
      const r=await pool.query("DELETE FROM public_media WHERE id=$1 RETURNING file_name",[homeId])
      if(r.rows.length)await unlinks(r.rows[0].file_name)
      res.json({ok:true})
    }catch(e){error(res,e)}
  })
}
