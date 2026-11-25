import {useState} from 'react'
import {Link,useOutletContext} from 'react-router-dom'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import OwnerLiveClock from '../../components/OwnerLiveClock.jsx'
import {apiRequest} from '../../services/otp-contract.js'
import {getToken} from '../../utils/auth.js'
import {localDay} from '../../services/academy.js'
import {useLoad,Notice,Empty} from './shared.jsx'
export const readDashboard=month=>apiRequest(import.meta.env.VITE_API_URL,'/api/v1/me/dashboard'+(month?'?month='+encodeURIComponent(month):''),{method:'GET',token:getToken()}).then(r=>r.dashboard)
const roleName={owner:'Owner',pelatih:'Pelatih',pemain:'Pemain'}
function download(d){
 const fields=[['Periode',d.period],['Kelas aktif',d.classes.length],['Sesi',d.sessions.total],['Selesai',d.sessions.completed],['Dibatalkan',d.sessions.canceled],['Hadir',d.attendance.hadir],['Izin',d.attendance.izin],['Sakit',d.attendance.sakit],['Alpa',d.attendance.alpa],['Belum dicatat',d.attendance.unrecorded],['Persentase hadir',d.attendance.percentage??'']];
 const csv='\ufeff'+[['Indikator','Nilai'],...fields].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='bnr-operasional-'+d.period+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function OperationalDashboard({role}){
 const {profil}=useOutletContext(),[month,setMonth]=useState(localDay().slice(0,7)),state=useLoad(()=>readDashboard(month),[month]),d=state.data;
 const metrics=d?[...(role==='owner'?[['Pemain aktif',d.accounts.active_players,'players'],['Pelatih aktif',d.accounts.active_coaches,'coaches'],['Pendaftaran menunggu',d.accounts.pending_registrations,'user'],['Pelatih menunggu',d.accounts.pending_coaches,'coaches']]:role==='pelatih'?[['Pemain aktif di kelas',d.active_players,'players']]:[]),['Kelas aktif',role==='pemain'?d.classes.map(c=>c.name).join(', ')||'Belum ada':d.classes.length,'players'],['Sesi dalam periode',d.sessions.total,'calendar'],['Kehadiran dalam periode',d.attendance.percentage==null?'—':d.attendance.percentage+'%','activity'],['Jadwal mendatang',d.upcoming_count,'calendar']]:[];
 return <div className="view active workspace-overview academy-ops academy-workspace"><div className="workspace-hero"><div><span className="workspace-eyebrow">PORTAL {roleName[role].toUpperCase()} · DATA AKTUAL</span><h2>Halo, {profil?.nama||roleName[role]}</h2><p>Ringkasan operasional akademi berdasarkan PostgreSQL.</p></div><OwnerLiveClock/></div>
 <div className="card academy-toolbar"><div><b>Periode laporan</b><p className="mut small">Jumlah akun dan kelas merupakan kondisi saat ini; sesi dan kehadiran mengikuti bulan.</p></div><label>Bulan <input type="month" value={month} max={localDay().slice(0,7)} onChange={e=>{if(e.target.value)setMonth(e.target.value)}}/></label><button className="abtn ghost" onClick={state.reload}>Muat ulang</button>{d&&role==='owner'&&<button className="abtn" onClick={()=>download(d)}>Ekspor CSV</button>}</div>
 <Notice state={state}/>{d&&<><div className="academy-summary">{metrics.map(([title,value,icon])=><div className="card academy-stat" key={title}><span className="academy-stat-icon"><OwnerIcon name={icon} size={20}/></span><div><span>{title}</span><strong>{value}</strong></div></div>)}</div>
 <div className="card"><h3>Rekap kehadiran</h3><div className="academy-metrics">{[['Hadir','hadir'],['Izin','izin'],['Sakit','sakit'],['Alpa','alpa'],['Belum dicatat','unrecorded']].map(([label,key])=><div key={key}><b>{d.attendance[key]}</b><small>{label}</small></div>)}</div><p className="mut small">Persentase berdasarkan absensi tercatat, bukan sesi yang belum dicatat.</p></div>
 <div className="card"><h3>Sesi mendatang</h3><Empty when={!d.upcoming.length}>Belum ada jadwal mendatang.</Empty>{d.upcoming.map(s=><div className="academy-row academy-member" key={s.id}><div><b>{s.title}</b><p className="mut small">{s.class_name} · {s.session_date} · {s.start_time}–{s.end_time} WIB</p></div><span>{s.venue}</span></div>)}<Link className="abtn ghost" to={role==='owner'?'/owner/akademi':'../jadwal'}>Lihat jadwal</Link></div>
 <div className="card"><h3>Modul berikutnya</h3><p className="mut">Penilaian, berita dan pengumuman masih menunggu integrasi. Statistik keuangan belum tersedia; tidak menampilkan angka dummy.</p></div></>}</div>
}
