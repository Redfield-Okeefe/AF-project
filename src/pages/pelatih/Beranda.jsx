import { Link } from 'react-router-dom'
import Reveal from '../../components/Reveal.jsx'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import { iso, listInfo, listSesi, pemainDiKelas, rataKehadiran } from '../../services/db.js'
import { fmtTanggal } from '../../utils/format.js'
import { useSaya } from './useSaya.js'

export default function Beranda() {
  const { email, akun, kelas, kelasIds } = useSaya()
  const hari = iso()
  const semua = listSesi(kelasIds)
  const mendatang = semua.filter(s => s.tanggal >= hari).slice(0,5)
  const hariIni = semua.filter(s => s.tanggal === hari)
  const kabar = listInfo().filter(i => i.oleh === email).slice(0,3)
  const pemain = kelas.reduce((n,k)=>n+pemainDiKelas(k.id).length,0)
  const presentase = kelas.map(k=>rataKehadiran(k.id)).filter(n=>n!=null)
  const rerata = presentase.length?Math.round(presentase.reduce((s,n)=>s+n,0)/presentase.length):null
  const cards = [
    {label:'Kelas diampu',value:kelas.length,detail:'Kelas saya',icon:'players',to:'../jadwal'},
    {label:'Total pemain',value:pemain,detail:'Seluruh kelas saya',icon:'coaches',to:'../absensi'},
    {label:'Sesi hari ini',value:hariIni.length,detail:'Jadwal latihan hari ini',icon:'calendar',to:'../jadwal'},
    {label:'Rata-rata kehadiran',value:rerata===null?'—':rerata+'%',detail:'Dari data absensi',icon:'activity',to:'../absensi'}
  ]
  return <div className="view active workspace-overview">
    <Reveal anim="up" className="workspace-hero"><div><span className="workspace-eyebrow"><span className="workspace-live-dot"/> WORKSPACE PELATIH</span>
      <h2>Selamat datang, Coach {akun?.nama?.split(' ')[0] || 'Pelatih'}! <span>Bangun talenta terbaik.</span></h2>
      <p>Kelola latihan, kehadiran, perkembangan pemain, dan pengumuman dari satu dashboard.</p>
      <div className="workspace-hero-actions"><Link className="workspace-button" to="../jadwal"><OwnerIcon name="calendar" size={17}/> Kelola jadwal <OwnerIcon name="arrow" size={16}/></Link><Link className="workspace-button subtle" to="../absensi"><OwnerIcon name="check" size={17}/> Isi absensi</Link></div></div><span className="workspace-hero-art" aria-hidden="true"><OwnerIcon name="activity" size={105}/></span></Reveal>
    {!kelas.length&&<div className="workspace-note"><OwnerIcon name="warning" size={18}/>Belum ada kelas yang ditugaskan oleh Owner. Statistik akan muncul setelah penugasan.</div>}
    <div className="workspace-section-head"><div><h2>Ringkasan pelatihan</h2><p>Data dari kelas yang kamu ampu</p></div><span className="workspace-period"><OwnerIcon name="calendar" size={16}/>{fmtTanggal(hari)}</span></div>
    <div className="workspace-stats">{cards.map((c,i)=><Reveal key={c.label} anim="up" delay={i*40} className="workspace-stat"><span className="workspace-stat-icon"><OwnerIcon name={c.icon} size={21}/></span><span className="workspace-stat-label">{c.label}</span><strong>{c.value}</strong><span className="workspace-stat-detail">{c.detail}</span><Link to={c.to} aria-label={'Buka '+c.label} className="workspace-stat-link"/></Reveal>)}</div>
    <div className="workspace-columns">
      <Reveal anim="up" className="card workspace-panel"><div className="workspace-panel-head"><div><span className="workspace-panel-icon"><OwnerIcon name="calendar"/></span><div><h3>Agenda latihan</h3><p>Sesi mendatang</p></div></div><Link to="../jadwal">Kelola jadwal <OwnerIcon name="arrow" size={15}/></Link></div>
      {mendatang.length?<div>{mendatang.map(s=><div className="workspace-row" key={s.id}><span className="workspace-date"><b>{new Date(s.tanggal+'T12:00:00').getDate()}</b><small>{new Date(s.tanggal+'T12:00:00').toLocaleDateString('id-ID',{month:'short'})}</small></span><div className="workspace-row-copy"><strong>{s.judul}</strong><span>{fmtTanggal(s.tanggal)} · {s.mulai} · {s.lokasi}</span></div><span className="workspace-chip">{s.tipe}</span></div>)}</div>:<div className="workspace-empty">Belum ada agenda mendatang.</div>}</Reveal>
      <Reveal anim="up" className="card workspace-panel"><div className="workspace-panel-head"><div><span className="workspace-panel-icon"><OwnerIcon name="activity"/></span><div><h3>Kelas saya</h3><p>Aktivitas dan kehadiran</p></div></div><Link to="../absensi">Absensi <OwnerIcon name="arrow" size={15}/></Link></div>
      {kelas.length?<div>{kelas.map(k=><div className="workspace-row" key={k.id}><span className="workspace-ann-icon"><OwnerIcon name="players"/></span><div className="workspace-row-copy"><strong>{k.nama}</strong><span>{pemainDiKelas(k.id).length} pemain · {k.usia}</span></div><span className="workspace-chip">{rataKehadiran(k.id)==null?'—':rataKehadiran(k.id)+'%'}</span></div>)}</div>:<div className="workspace-empty">Belum ada kelas aktif.</div>}</Reveal>
    </div>
    <Reveal anim="up" className="workspace-bottom-banner"><div><span className="workspace-panel-icon"><OwnerIcon name="news"/></span><div><h3>Pengumuman akademi</h3><p>{kabar.length?kabar[0].judul:'Belum ada pengumuman yang dibuat.'}</p></div></div><Link className="workspace-button" to="../pengumuman">Kelola pengumuman <OwnerIcon name="arrow" size={16}/></Link></Reveal>
    <div className="workspace-shortcuts"><Link to="../absensi"><OwnerIcon name="check"/> Absensi <OwnerIcon name="arrow" size={15}/></Link><Link to="../penilaian"><OwnerIcon name="trend"/> Penilaian <OwnerIcon name="arrow" size={15}/></Link><Link to="../profil"><OwnerIcon name="user"/> Profil saya <OwnerIcon name="arrow" size={15}/></Link></div>
  </div>
}
