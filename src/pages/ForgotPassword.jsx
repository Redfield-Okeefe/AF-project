import {useEffect,useState} from 'react'
import {Link,Navigate,useParams} from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import CodeSlots from '../components/CodeSlots.jsx'
import {accountApiEnabled,requestReset,resetPassword,passwordError} from '../services/accountSecurity.js'
const roles={pemain:'pemain',pelatih:'pelatih',owner:'owner'}
export default function ForgotPassword(){
 const {peran}=useParams(),role=roles[peran]
 const [email,setEmail]=useState(''),[challenge,setChallenge]=useState(''),[code,setCode]=useState('')
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),[cooldown,setCooldown]=useState(0),[remaining,setRemaining]=useState(0)
 useEffect(()=>{if(!challenge||done)return;const t=setInterval(()=>{setCooldown(x=>Math.max(0,x-1));setRemaining(x=>Math.max(0,x-1))},1000);return()=>clearInterval(t)},[challenge,done])
 if(!role)return <Navigate to="/login" replace/>
 if(!accountApiEnabled)return <Navigate to={'/login/'+peran} replace/>
 async function send(e){
  e?.preventDefault();if(busy)return
  setBusy(true);setError('')
  try{const r=await requestReset(email.trim().toLowerCase(),role);setChallenge(r.challenge_id);setCode('');setCooldown(r.resend_after_seconds||60);setRemaining(r.expiresIn||300)}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function submit(e){
  e.preventDefault();if(busy)return
  const problem=passwordError(password,confirmation)
  if(problem||code.length!==6||!remaining){setError(problem||'Masukkan OTP yang masih berlaku.');return}
  setBusy(true);setError('')
  try{await resetPassword({email,role,challenge_id:challenge,code,password,password_confirmation:confirmation});setDone(true);setPassword('');setConfirmation('');setCode('')}
  catch(e){setError(e.message);setCode('')}finally{setBusy(false)}
 }
 return <div className="login auth-login-page"><Reveal as="div" anim="zoom" className="card auth-login-card">
  <span className="auth-login-eyebrow">B.N.R FUTSAL ACADEMY · {peran.toUpperCase()}</span><h2>Lupa Password</h2>
  {done?<><p className="alert ok" role="status">Password berhasil diperbarui. Semua sesi lama telah diakhiri.</p><Link className="btn big" to={'/login/'+peran}>Kembali ke Login</Link></>:<>
   {!challenge?<form onSubmit={send}><p className="sub">Masukkan email akun Anda.</p><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="btn big" disabled={busy}>{busy?'Memproses...':'Kirim OTP'}</button></form>:
   <form onSubmit={submit}><p className="sub">Jika akun terdaftar dan terverifikasi, kode dikirim ke {email}.</p>
    <div className="otp-box"><CodeSlots length={6} value={code} onChange={setCode} disabled={busy} slotSize={34} gap={6} ariaLabel="Kode OTP reset password"/></div>
    <p className="mut">Berlaku {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</p>
    <label>Password baru<input type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter, huruf + angka"/></label>
    <label>Konfirmasi password<input type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
    <button className="btn big" disabled={busy||code.length!==6||!remaining}>Simpan Password</button>
    <p className="foot"><button type="button" className="linkbtn" disabled={busy||cooldown>0} onClick={send}>Kirim ulang {cooldown>0?'('+cooldown+' dtk)':''}</button> · <button type="button" className="linkbtn" disabled={busy} onClick={()=>{setChallenge('');setCode('');setPassword('');setConfirmation('');setError('')}}>Ganti email</button></p>
   </form>}
   {error&&<div className="alert err" role="alert">{error}</div>}
   <p className="foot"><Link to={'/login/'+peran}>Kembali ke Login</Link></p>
  </>}
 </Reveal></div>
}
