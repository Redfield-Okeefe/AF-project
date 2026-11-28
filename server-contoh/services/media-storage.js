import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {ApiError} from './auth.service.js';

const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const cloudNameRE=new RegExp('^cloudinary:(gallery|home):('+uuid+')$');
const localNameRE=new RegExp('^'+uuid+'\\.jpg$');
export function cloudinaryConfig(raw=process.env.CLOUDINARY_URL,folder=process.env.CLOUDINARY_FOLDER||'bnr-academy/staging'){
 let url;try{url=new URL(raw)}catch{throw new Error('CLOUDINARY_URL tidak valid.')}
 if(url.protocol!=='cloudinary:'||!url.username||!url.password||! /^(?:[a-z0-9_-]{1,100})$/.test(url.hostname)||url.port||!['','/'].includes(url.pathname)||url.search||url.hash||! /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(folder)||folder.length>100)
  throw new Error('Konfigurasi Cloudinary tidak valid.');
 let key,secret;try{key=decodeURIComponent(url.username);secret=decodeURIComponent(url.password)}catch{throw new Error('Kredensial Cloudinary tidak valid.')}
 if(!/^\d+$/.test(key)||!secret.trim())throw new Error('Kredensial Cloudinary tidak valid.');
 return {cloud:url.hostname,key,secret,folder};
}
export function signCloudinary(params,secret){
 return createHash('sha256').update(Object.keys(params).sort().map(k=>k+'='+params[k]).join('&')+secret).digest('hex');
}
export function createMediaStorage({mode=process.env.MEDIA_MODE||'local',directory,raw,folder,fetcher=globalThis.fetch,now=()=>Date.now(),uuidFactory=randomUUID}={}){
 if(!['local','cloudinary'].includes(mode))throw new Error('MEDIA_MODE harus local atau cloudinary.');
 const c=mode==='cloudinary'?cloudinaryConfig(raw,folder):null;
 const idFor=name=>{const m=cloudNameRE.exec(name);return m&&c?c.folder+'/'+m[1]+'/'+m[2]:null;};
 async function signed(action,fields,data){
  const params={...fields,timestamp:String(Math.floor(now()/1000))};
  const form=new FormData();
  for(const [k,v] of Object.entries(params))form.append(k,v);
  form.append('api_key',c.key);form.append('signature',signCloudinary(params,c.secret));
  if(data)form.append('file',new Blob([data],{type:'image/jpeg'}),'photo.jpg');
  try{
   const r=await fetcher('https://api.cloudinary.com/v1_1/'+c.cloud+'/image/'+action,{method:'POST',body:form,signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error('provider rejected');
   return await r.json();
  }catch{throw new ApiError(503,'Penyimpanan Cloudinary tidak tersedia. Coba kembali.');}
 }
 async function remove(name){
  if(!name)return;
  if(cloudNameRE.test(name)){
   const id=idFor(name);if(!id)throw new Error('Media cloud memerlukan konfigurasi Cloudinary.');
   const r=await signed('destroy',{public_id:id,invalidate:'true'});
   if(!['ok','not found'].includes(r.result))throw new Error('Penghapusan Cloudinary gagal.');
  }else if(localNameRE.test(name)){
   // A cloud service must never try to delete a local development file.
   if(mode==='local')await unlink(path.join(directory,name)).catch(e=>{if(e.code!=='ENOENT')throw e;});
  }else throw new Error('Identitas media tidak valid.');
 }
 return {mode,
  url(name){
   if(cloudNameRE.test(name)){
    const id=idFor(name);if(!id)throw new Error('Media cloud memerlukan konfigurasi Cloudinary.');
    return 'https://res.cloudinary.com/'+c.cloud+'/image/upload/'+id+'.jpg';
   }
   if(!localNameRE.test(name))throw new Error('Identitas media tidak valid.');
   return '/media/files/'+name;
  },
  async save(data,scope){
   if(!['gallery','home'].includes(scope))throw new Error('Scope media tidak valid.');
   const uuidValue=uuidFactory();
   if(mode==='local'){
    const name=uuidValue+'.jpg';await mkdir(directory,{recursive:true});await writeFile(path.join(directory,name),data,{flag:'wx'});return name;
   }
   const name='cloudinary:'+scope+':'+uuidValue;
   const id=idFor(name);if(!id)throw new Error('Identitas media tidak valid.');
   try{
    const r=await signed('upload',{public_id:id,overwrite:'false',asset_folder:c.folder+'/'+scope},data);
    if(r.public_id!==id||r.format!=='jpg'||r.resource_type!=='image'||r.type!=='upload')throw new ApiError(503,'Respons upload Cloudinary tidak valid.');
    return name;
   }catch(e){
    // A timeout may still have created the asset. Best-effort cleanup of our new UUID only.
    await remove(name).catch(()=>console.error('Pembersihan upload Cloudinary gagal; periksa Media Library.'));
    throw e;
   }
  },remove
 };
}
