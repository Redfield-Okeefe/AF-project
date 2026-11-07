import { Link, useOutletContext } from 'react-router-dom'
import Reveal from '../../components/Reveal.jsx'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import OwnerLiveClock from '../../components/OwnerLiveClock.jsx'
import { ambilAkun, ambilKelas, bulanIni, infoUntuk, iso, listSesi, listTagihan, statPemain, useDb } from '../../services/db.js'
import { fmtTanggal, rupiah } from '../../utils/format.js'

export default function Ringkasan() {
  useDb()
  const { profil } = useOutletContext()
  const email = profil?.email || ''
  const akun = ambilAkun(email)
  const kelas = akun?.kelasId ? ambilKelas(akun.kelasId) : null
  const stat = statPemain(email)
  const sesi = kelas ? listSesi([kelas.id]).filter(s => s.tanggal >= iso()).slice(0,4) : []
  const kabar = infoUntuk(email).slice(0,3)
  const tagihan = listTagihan().filter(t => t.pemainEmail === email)
  const tertunggak = tagihan.filter(t => t.status === 'belum')
  const bulan = tagihan.find(t => t.bulan === bulanIni())
  const cards = [
    { label:'Kelas akademi',value:kelas?.nama || '—',detail:kelas?.usia || 'Belum ditetapkan',icon:'players',to:'../jadwal'},
    { label:'Kehadiran',value:stat.persen == null ? '—' : stat.persen+'%',detail:stat.hadir+' dari '+stat.pertemuan+' sesi',icon:'activity',to:'../biodata'},
    { label:'Latihan mendatang',value:sesi.length,detail:sesi.length?'Lihat jadwal lengkap':'Belum ada sesi',icon:'calendar',to:'../jadwal'},
    { label:'Status iuran',value:bulan?.status==='lunas'?'Lunas':bulan?'Belum lunas':'—',detail:tertunggak.length+' tagihan tertunda',icon:'wallet',to:'../bayar'}
  ]
  return <div className="view active workspace-overview">
    <Reveal anim="up" className="workspace-hero">
      <div><span className="workspace-eyebrow"><span className="workspace-live-dot"/> PORTAL PEMAIN</span>
      <h2>Halo, {profil?.nama?.split(' ')[0] || akun?.nama?.split(' ')[0] || 'Pemain'}! <span>Siap bermain hari ini?</span></h2>
      <p>Lihat jadwal, perkembangan latihan, pengumuman, dan pembayaran akademimu dalam satu tempat.</p>
      <div className="workspace-hero-actions"><Link className="workspace-button" to="../jadwal"><OwnerIcon name="calendar" size={17}/> Lihat jadwal <OwnerIcon name="arrow" size={16}/></Link><Link className="workspace-button subtle" to="../biodata">Profil saya</Link></div></div>
      <span className="workspace-hero-art" aria-hidden="true"><OwnerIcon name="players" size={105}/></span>
    </Reveal>
    {!kelas && <div className="workspace-note"><OwnerIcon name="warning" size={18}/>Belum ada kelas yang ditetapkan Owner untuk akunmu.</div>}
    <div className="workspace-section-head player-overview-head"><div className="portal-section-heading-copy"><h2>Ringkasan akademi</h2><p>Data akademi Anda</p></div><OwnerLiveClock compact /></div>
    <div className="workspace-stats">{cards.map((c,i)=><Reveal key={c.label} anim="up" delay={i*40} className="workspace-stat">
      <span className="workspace-stat-icon"><OwnerIcon name={c.icon} size={21}/></span><span className="workspace-stat-label">{c.label}</span><strong>{c.value}</strong><span className="workspace-stat-detail">{c.detail}</span><Link to={c.to} aria-label={'Buka '+c.label} className="workspace-stat-link"/></Reveal>)}</div>
    <div className="workspace-columns">
      <Reveal className="card workspace-panel" anim="up"><div className="workspace-panel-head"><div><span className="workspace-panel-icon"><OwnerIcon name="calendar"/></span><div><h3>Jadwal terdekat</h3><p>{kelas?.nama || 'Menunggu penempatan kelas'}</p></div></div><Link to="../jadwal">Semua jadwal <OwnerIcon name="arrow" size={15}/></Link></div>
      {sesi.length?<div>{sesi.map(s=><div key={s.id} className="workspace-row"><span className="workspace-date"><b>{new Date(s.tanggal+'T12:00:00').getDate()}</b><small>{new Date(s.tanggal+'T12:00:00').toLocaleDateString('id-ID',{month:'short'})}</small></span><div className="workspace-row-copy"><strong>{s.judul}</strong><span>{fmtTanggal(s.tanggal)} · {s.mulai}–{s.selesai} · {s.lokasi}</span></div><span className="workspace-chip">{s.tipe}</span></div>)}</div>:<div className="workspace-empty">Belum ada jadwal latihan mendatang.</div>}</Reveal>
      <Reveal className="card workspace-panel" anim="up"><div className="workspace-panel-head"><div><span className="workspace-panel-icon"><OwnerIcon name="news"/></span><div><h3>Pengumuman</h3><p>Kabar terbaru akademi</p></div></div><Link to="../pengumuman">Lihat semua <OwnerIcon name="arrow" size={15}/></Link></div>
      {kabar.length?<div>{kabar.map(k=><div key={k.id} className="workspace-row"><span className="workspace-ann-icon"><OwnerIcon name="news"/></span><div className="workspace-row-copy"><strong>{k.judul}</strong><span>{fmtTanggal(k.tgl)} · {k.namaOleh || 'Akademi'}</span></div></div>)}</div>:<div className="workspace-empty">Belum ada pengumuman.</div>}</Reveal>
    </div>
    <Reveal anim="up" className="workspace-bottom-banner"><div><span className="workspace-panel-icon"><OwnerIcon name="wallet"/></span><div><h3>Administrasi pembayaran</h3><p>{tertunggak.length?tertunggak.length+' tagihan belum lunas · '+rupiah(tertunggak.reduce((sum,t)=>sum+Number(t.jumlah||0),0)):'Lihat riwayat dan status pembayaranmu.'}</p></div></div><Link to="../bayar" className="workspace-button">Lihat pembayaran <OwnerIcon name="arrow" size={16}/></Link></Reveal>
  </div>
}
