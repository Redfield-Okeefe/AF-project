import {useState} from 'react'
import {changePassword,passwordError} from '../services/accountSecurity.js'
export default function ChangePassword({onComplete,onClose}){
 const [old,setOld]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function submit(e){e.preventDefault();const p=passwordError(password,confirmation);if(p){setError(p);return}
  setBusy(true);setError('')
  try{await changePassword({current_password:old,password,password_confirmation:confirmation});onComplete()}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <div className="card" role="region" aria-label="Ubah password"><h3>Ubah Password</h3><p className="mut">Semua sesi akan berakhir setelah password berhasil diubah.</p>
  <form onSubmit={submit}><label>Password lama<input type="password" autoComplete="current-password" required value={old} onChange={e=>setOld(e.target.value)}/></label>
   <label>Password baru<input type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>Konfirmasi password<input type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
   {error&&<div className="alert err" role="alert">{error}</div>}
   <div className="adm-actions"><button type="submit" className="abtn" disabled={busy}>{busy?'Menyimpan...':'Simpan'}</button><button type="button" className="abtn ghost" disabled={busy} onClick={onClose}>Batal</button></div>
  </form></div>
}
