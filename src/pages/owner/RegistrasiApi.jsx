import {useEffect,useState} from 'react'
import OwnerPageHeading from '../../components/OwnerPageHeading.jsx'
import {registrations,registrationDetail,reviewRegistration,invitePlayer} from '../../services/registrations.js'
export default function RegistrasiApi(){
 const [rows,setRows]=useState([]),[offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState(''),[detail,setDetail]=useState(null),[q,setQ]=useState(''),[filter,setFilter]=useState('')
 const [revision,setRevision]=useState(0)
 useEffect(()=>{let live=true;setBusy(true);setError('');registrations(offset).then(r=>{if(live)setRows(r.items)}).catch(e=>{if(live){setRows([]);setError(e.message)}}).finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[offset,revision])
 async function action(fn,message){if(busy)return;setBusy(true);setError('');setInfo('');try{await fn();setInfo(message);setDetail(null);setRevision(n=>n+1)}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function show(id){if(busy)return;setBusy(true);setError('');try{const r=await registrationDetail(id);setDetail(r.registration)}catch(e){setError(e.message)}finally{setBusy(false)}}
 function reject(id){const note=window.prompt('Alasan penolakan (minimal 3 karakter):');if(note&&note.trim().length>=3)action(()=>reviewRegistration(id,'reject',note.trim()),'Pendaftaran ditolak.')}
 const items=rows.filter(r=>(!filter||r.status===filter)&&(!q.trim()||[r.full_name,r.registration_number,r.program_name].some(v=>String(v??'').toLowerCase().includes(q.trim().toLowerCase()))))
 return <div className="view active adm owner-admin-page">
  <OwnerPageHeading icon="players" title="Manajemen pemain" description="Pendaftaran akademi dan undangan aktivasi dari PostgreSQL." meta="Mode backend"/>
  <div className="card owner-filter-card"><p className="mut">Tinjau pendaftaran, terima atau tolak, lalu kirim undangan ke email kontak. Penempatan kelas dan pembayaran tetap dijadwalkan pada fase berikutnya.</p><div className="filter-bar"><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari nama atau nomor pendaftaran (halaman ini)" aria-label="Cari pendaftaran"/><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Status pendaftaran"><option value="">Semua status</option><option value="menunggu">Menunggu</option><option value="diterima">Diterima</option><option value="ditolak">Ditolak</option><option value="dibatalkan">Dibatalkan</option></select><button className="abtn ghost" disabled={busy} onClick={()=>setRevision(n=>n+1)}>Muat ulang</button></div></div>
  {error&&<div className="alert err" role="alert">{error}</div>}{info&&<div className="alert ok" role="status">{info}</div>}
  {busy&&!rows.length&&<p className="mut">Memuat data...</p>}{!busy&&!items.length&&!error&&<p className="mut">Tidak ada pendaftaran yang cocok.</p>}
  {items.map(p=><div key={p.id} className="card pemain-row owner-player-card"><div className="adm-row nobox"><div className="adm-info"><b>{p.full_name} <span className="pill">{p.status}</span></b><small className="mut">{p.registration_number} · {p.program_name}</small></div><div className="adm-btns">
   {p.status==='menunggu'&&<><button className="abtn" disabled={busy} onClick={()=>action(()=>reviewRegistration(p.id,'approve',''),'Pendaftaran diterima. Kirim undangan berikutnya.')}>Terima</button><button className="abtn ghost" disabled={busy} onClick={()=>reject(p.id)}>Tolak</button></>}
   {p.status==='diterima'&&<button className="abtn" disabled={busy} onClick={()=>action(()=>invitePlayer(p.id),'Undangan dikirim ke Mailpit.')}>Kirim undangan</button>}
   <button className="abtn ghost" disabled={busy} onClick={()=>detail?.id===p.id?setDetail(null):show(p.id)}>Detail</button>
  </div></div>{detail?.id===p.id&&<dl className="dl detail-box"><div><dt>Email kontak</dt><dd>{detail.contact_email}</dd></div><div><dt>WhatsApp</dt><dd>{detail.contact_phone}</dd></div><div><dt>Wali</dt><dd>{detail.guardian_name}</dd></div><div><dt>Tanggal lahir</dt><dd>{detail.birth_date}</dd></div><div><dt>Sekolah</dt><dd>{detail.school_name}</dd></div><div><dt>Jersey</dt><dd>{detail.jersey_size}</dd></div><div className="full"><dt>Alamat</dt><dd>{detail.address}</dd></div><div className="full"><dt>Catatan keputusan</dt><dd>{detail.review_note||'–'}</dd></div></dl>}</div>)}
  <div className="adm-actions"><button className="abtn ghost" disabled={busy||offset===0} onClick={()=>{setRows([]);setDetail(null);setOffset(x=>Math.max(0,x-25))}}>Sebelumnya</button><button className="abtn ghost" disabled={busy||rows.length<25} onClick={()=>{setRows([]);setDetail(null);setOffset(x=>x+25)}}>Berikutnya</button></div>
 </div>
}
