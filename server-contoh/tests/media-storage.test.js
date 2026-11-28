import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {cloudinaryConfig,createMediaStorage,signCloudinary} from '../services/media-storage.js';
const raw='cloudinary://123456:secret-example@bnr-test',id='12345678-1234-4234-8234-123456789012',folder='bnr-academy/staging',publicId=folder+'/gallery/'+id;
test('signed cloud upload and destroy use scoped public IDs and secret never goes in form',async()=>{
 const calls=[];const s=createMediaStorage({mode:'cloudinary',raw,folder,uuidFactory:()=>id,now:()=>1700000000000,fetcher:async(url,req)=>{
  calls.push({url,req});return {ok:true,json:async()=>url.endsWith('/upload')?{public_id:publicId,resource_type:'image',type:'upload',format:'jpg'}:{result:'ok'}};
 }});
 const name=await s.save(Buffer.from('jpeg'),'gallery');
 assert.equal(name,'cloudinary:gallery:'+id);assert.equal(s.url(name),'https://res.cloudinary.com/bnr-test/image/upload/'+publicId+'.jpg');
 const fields=calls[0].req.body;assert.equal(fields.get('api_key'),'123456');assert.equal(fields.get('public_id'),publicId);assert.equal(fields.get('overwrite'),'false');assert.equal(fields.get('asset_folder'),folder+'/gallery');
 const expected=createHash('sha256').update('asset_folder='+folder+'/gallery&overwrite=false&public_id='+publicId+'&timestamp=1700000000secret-example').digest('hex');
 assert.equal(fields.get('signature'),expected);assert.ok(!fields.has('api_secret'));assert.equal(calls[0].url,'https://api.cloudinary.com/v1_1/bnr-test/image/upload');
 await s.remove(name);assert.equal(calls[1].req.body.get('public_id'),publicId);assert.equal(calls[1].req.body.get('invalidate'),'true');
 await assert.rejects(s.remove('cloudinary:news:'+id));assert.equal(calls.length,2);
});
test('invalid cloud config, failed upload cleanup and local media compatibility',async()=>{
 assert.throws(()=>cloudinaryConfig('https://user:secret@host'));
 assert.throws(()=>cloudinaryConfig(raw,'../bad'));
 assert.equal(signCloudinary({b:'2',a:'1'},'x'),createHash('sha256').update('a=1&b=2x').digest('hex'));
 const calls=[];const s=createMediaStorage({mode:'cloudinary',raw,folder,uuidFactory:()=>id,fetcher:async(url)=>{calls.push(url);return url.endsWith('/upload')?{ok:false}:{ok:true,json:async()=>({result:'not found'})}}});
 await assert.rejects(s.save(Buffer.from('jpeg'),'gallery'),{status:503});assert.equal(calls.length,2);
 const directory=await mkdtemp(path.join(os.tmpdir(),'bnr-media-'));
 try{const local=createMediaStorage({mode:'local',directory,uuidFactory:()=>id});const name=await local.save(Buffer.from('jpeg'),'home');assert.equal(local.url(name),'/media/files/'+id+'.jpg');assert.equal((await readFile(path.join(directory,name))).toString(),'jpeg');await local.remove(name);await assert.rejects(readFile(path.join(directory,name)));}finally{await rm(directory,{recursive:true,force:true});}
});
