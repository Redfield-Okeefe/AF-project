export const GMAIL_RE=/^[a-z0-9._%+-]+@gmail\.com$/i
export const TEST_RE=/^[a-z0-9._%+-]+@[a-z0-9.-]+\.test$/i
export const normalizeEmail=e=>String(e??'').trim().toLowerCase()
export const validOtpEmail=(email,localApi=false)=>GMAIL_RE.test(normalizeEmail(email))||(localApi&&TEST_RE.test(normalizeEmail(email)))
export const validInvitation=token=>/^[A-Za-z0-9_-]{43}$/.test(String(token??'').trim())
export const normalizeApiBase=base=>String(base??'').trim().replace(/\/+$/,'').replace(/\/api\/v1$/,'')
export async function apiRequest(base,path,{method='POST',body,token,fetcher=fetch}={}){
 let r
 try{r=await fetcher(normalizeApiBase(base)+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})})}
 catch{throw new Error('Backend tidak dapat dijangkau. Pastikan npm start berjalan di port 3001 dan origin frontend diizinkan.')}
 const data=await r.json().catch(()=>null)
 if(!r.ok)throw Object.assign(new Error(data?.message||'Permintaan API gagal (HTTP '+r.status+').'),{status:r.status})
 if(!data||data.ok===false)throw new Error(data?.message||'Respons backend tidak valid.')
 return data
}
export function createOtpApi(base,fetcher=fetch){
 const post=(path,body)=>apiRequest(base,path,{body,fetcher})
 const scope=f=>({purpose:'activate_player',email:normalizeEmail(f.email),invitation_token:String(f.invitation_token??'').trim()})
 return {
 request:f=>f.peran==='pelatih'?post('/api/v1/auth/coach/otp/request',{email:normalizeEmail(f.email)}):post('/api/v1/auth/otp/request',scope(f)),
 async verify(f){
  if(f.peran==='pelatih')return post('/api/v1/auth/coach/register',{email:normalizeEmail(f.email),code:f.code,nama:f.nama,password:f.password,password_confirmation:f.password_confirmation,challenge_id:f.challenge_id,peran:'pelatih',lisensi:f.lisensi,wa:f.wa})
  const proof=await post('/api/v1/auth/otp/verify',{...scope(f),challenge_id:f.challenge_id,code:f.code})
  if(!proof.verified||!proof.verification_token)throw new Error('Bukti verifikasi pemain tidak diterima.')
  const created=await post('/api/v1/auth/player/activate',{invitation_token:scope(f).invitation_token,email:scope(f).email,verification_token:proof.verification_token,password:f.password,password_confirmation:f.password_confirmation})
  if(!created.account_created)throw new Error('Aktivasi akun belum berhasil.')
  return {...created,role:'player',requiresLogin:true}
 }
 }
}
export function otpSeconds(data,now=Date.now()){
 if(data?.expires_at){const ms=Date.parse(data.expires_at)-now;return Number.isFinite(ms)?Math.max(0,Math.min(300,Math.floor(ms/1000))):0}
 return Number.isFinite(data?.expiresIn)?Math.max(0,Math.min(300,data.expiresIn)):300
}
