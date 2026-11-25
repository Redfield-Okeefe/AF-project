import {apiRequest} from './otp-contract.js'
import {getToken} from '../utils/auth.js'
const base=import.meta.env.VITE_API_URL
export const registrationsApiEnabled=Boolean(base)
const get=(path,auth=false)=>apiRequest(base,path,{method:'GET',token:auth?getToken():undefined})
const post=(path,body,auth=false)=>apiRequest(base,path,{body,token:auth?getToken():undefined})
export const programs=()=>get('/api/v1/programs')
export const submitRegistration=(f,programId)=>post('/api/v1/registrations',{full_name:f.nama,gender:f.jk,birth_date:f.tglLahir,birth_place:f.tempatLahir,school_name:f.sekolah,contact_email:f.email,contact_phone:f.wa,guardian_name:f.ortu,address:f.alamat,jersey_size:f.jersey,notes:f.catatan,program_id:programId})
export const registrations=(offset=0)=>get('/api/v1/owner/registrations?limit=25&offset='+offset,true)
export const registrationDetail=id=>get('/api/v1/owner/registrations/'+encodeURIComponent(id),true)
export const reviewRegistration=(id,decision,note)=>post('/api/v1/owner/registrations/'+encodeURIComponent(id)+'/'+decision,{review_note:note},true)
export const invitePlayer=id=>post('/api/v1/owner/registrations/'+encodeURIComponent(id)+'/invite',{},true)
