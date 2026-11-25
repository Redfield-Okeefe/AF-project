import {useEffect,useState} from 'react'
import {Navigate} from 'react-router-dom'
import {getRole,homeFor,isLoggedIn,getToken,clearSession} from '../utils/auth.js'
import {accountApiEnabled,checkAccount} from '../services/accountSecurity.js'
// Coach restricted sessions are validated in PelatihLayout; normal roles must pass server checks.
export default function RoleRoute({role,children}){
 const token=getToken(),mine=getRole()||'player',remote=accountApiEnabled&&role!=='pelatih'
 const [verified,setVerified]=useState(''),[error,setError]=useState('')
 useEffect(()=>{
  if(!remote||!token||mine!==role)return
  let live=true,busy=false
  const check=async()=>{
   if(busy)return;busy=true
   try{
    const r=await checkAccount(),expected=role==='player'?'pemain':role
    if(!live)return
    if(r.user?.role!==expected){clearSession();setVerified('');setError('Sesi tidak sesuai.');return}
    setVerified(token);setError('')
   }catch(e){
    if(!live)return
    setVerified('');setError(e.message)
    if(e.status===401||e.status===403)clearSession()
   }finally{busy=false}
  }
  check();const t=setInterval(check,15000)
  return()=>{live=false;clearInterval(t)}
 },[remote,token,mine,role])
 if(!isLoggedIn())return <Navigate to={role==='owner'?'/login/owner':'/login'} replace/>
 if(mine!==role)return <Navigate to={homeFor(mine)} replace/>
 if(remote&&verified!==token)return <div className="wait-page"><div className="card"><h2>Memeriksa sesi</h2><p>{error||'Memeriksa akses akun...'}</p><button type="button" className="abtn ghost" onClick={()=>{clearSession();setVerified('');setError('Sesi diakhiri.')}}>Kembali ke Login</button></div></div>
 return children
}
