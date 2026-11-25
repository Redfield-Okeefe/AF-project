import {useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import OwnerPageHeading from '../../components/OwnerPageHeading.jsx'
import {Programs,Classes} from './Classes.jsx'
import {Sessions,AttendanceReport} from './Sessions.jsx'
export function OwnerOperations(){
 const [tab,setTab]=useState('kelas'),[search]=useSearchParams()
 return <div className="view active adm owner-admin-page academy-ops"><OwnerPageHeading icon="players" title="Akademi &amp; Kelas" description="Program, kelas, penugasan pelatih, jadwal dan absensi." meta="PostgreSQL"/><div className="academy-tabs" role="group" aria-label="Manajemen akademi">{[['kelas','Kelas'],['program','Program'],['jadwal','Jadwal'],['absensi','Rekap absensi']].map(([k,t])=><button key={k} type="button" className={'abtn '+(tab===k?'':'ghost')} aria-pressed={tab===k} onClick={()=>setTab(k)}>{t}</button>)}</div>{tab==='kelas'?<Classes preselect={search.get('player')||''}/>:tab==='program'?<Programs/>:tab==='jadwal'?<Sessions mode="owner"/>:<AttendanceReport/>}</div>
}
