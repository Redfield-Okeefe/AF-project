import {getToken} from '../utils/auth.js'
const API_URL=import.meta.env.VITE_API_URL
export const accountApiEnabled=Boolean(API_URL)
async function request(path,body,auth=false,method='POST'){
 if(!API_URL)throw new Error('Fitur keamanan akun memerlukan backend.')
 const r=await fetch(API_URL.replace(/\/$/,'')+'/api/v1/auth/'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+getToken()}:{})},...(method==='POST'?{body:JSON.stringify(body||{})}:{})})
 const data=await r.json().catch(()=>({}))
 if(!r.ok)throw Object.assign(new Error(data.message||'Permintaan gagal.'),{status:r.status})
 return data
}
export const requestReset=(email,role)=>request('forgot-password',{email,role})
export const resetPassword=body=>request('reset-password',body)
export const changePassword=body=>request('change-password',body,true)
export const logoutAccount=()=>request('logout',{},true)
export const checkAccount=()=>request('me',null,true,'GET')
export function passwordError(password,confirmation){
 if(password.length<8||!/[A-Za-z]/.test(password)||!/\d/.test(password)||new TextEncoder().encode(password).length>72||password.includes('\0'))return 'Password minimal 8 karakter, huruf dan angka, maksimal 72 byte UTF-8.'
 return password!==confirmation?'Konfirmasi password tidak sama.':''
}
