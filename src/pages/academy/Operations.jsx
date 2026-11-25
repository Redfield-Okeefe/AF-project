import {useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import OwnerPageHeading from '../../components/OwnerPageHeading.jsx'
import {academyApiEnabled} from '../../services/academy.js'
import {Programs,Classes} from './Classes.jsx'
import {Sessions,AttendanceReport} from './Sessions.jsx'
const tabs=[['kelas','players','Kelas','Kelompok & anggota'],['program','target','Program','Kurikulum & usia'],['jadwal','calendar','Jadwal','Latihan & pertandingan'],['absensi','activity','Rekap absensi','Riwayat kehadiran']]
export function OwnerOperations(){
 const [tab,setTab]=useState('kelas'),[search]=useSearchParams()
 return <div className="view active adm owner-admin-page academy-ops academy-workspace"><OwnerPageHeading icon="stadium" title="Akademi &amp; Kelas" description="Kelola seluruh kegiatan pelatihan dalam satu ruang kerja." meta={academyApiEnabled?'Data akademi · PostgreSQL':'Preview desain · Data fiktif'}/>
 {!academyApiEnabled&&<div className="academy-preview-note"><OwnerIcon name="monitor" size={18}/> Mode desain — semua perubahan hanya simulasi browser, tidak terhubung ke backend.</div>}
 <nav className="academy-nav" aria-label="Manajemen akademi">{tabs.map(([k,icon,t,sub])=><button key={k} type="button" className={'academy-nav-item '+(tab===k?'is-active':'')} aria-pressed={tab===k} onClick={()=>setTab(k)}><span className="academy-nav-icon"><OwnerIcon name={icon} size={20}/></span><span><b>{t}</b><small>{sub}</small></span></button>)}</nav>
 <section aria-label={tabs.find(t=>t[0]===tab)[2]} className="academy-panel">{tab==='kelas'?<Classes preselect={search.get('player')||''}/>:tab==='program'?<Programs/>:tab==='jadwal'?<Sessions mode="owner"/>:<AttendanceReport/>}</section></div>
}
