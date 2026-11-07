import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../../components/Reveal.jsx'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import OwnerLiveClock from '../../components/OwnerLiveClock.jsx'
import { bulanIni, bulanLalu, daftarPelatih, daftarPemain, listKelas, listTagihan, pemainDiKelas, rataKehadiran, useDb } from '../../services/db.js'
import { bulanTeks, rupiah } from '../../utils/format.js'
import { validasiPeriodeBulan } from '../../utils/ownerDashboard.js'


function UangChart({ data, activeMonth, onPick }) {
  const max = Math.max(1, ...data.map((d) => d.v))
  const W = 600
  const H = 206
  const pad = { left: 18, right: 18, top: 17, bottom: 18 }
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom
  const x = (i) => data.length === 1 ? W / 2 : pad.left + (i * plotW) / (data.length - 1)
  const y = (v) => pad.top + plotH - (v / max) * (plotH - 16)
  const titik = data.map((d, i) => `${x(i)},${y(d.v)}`).join(' ')
  const area = `${x(0)},${H - pad.bottom} ${titik} ${x(data.length - 1)},${H - pad.bottom}`
  const step = Math.max(1, Math.ceil(data.length / 6))
  const selected = data.find((d) => d.b === activeMonth) || data[data.length - 1]
  return (
    <div className="owner-line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Grafik pemasukan ${data.length} bulan terakhir; pilih titik untuk melihat jumlah pemasukan setiap bulan`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="owner-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f47b36" stopOpacity=".25"/><stop offset="100%" stopColor="#f47b36" stopOpacity="0"/></linearGradient>
          <linearGradient id="owner-chart-line" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#f8ae71"/><stop offset="100%" stopColor="#e96721"/></linearGradient>
        </defs>
        {[0, .25, .5, .75, 1].map((f) => <line key={f} x1="0" x2={W} y1={pad.top + f * plotH} y2={pad.top + f * plotH} stroke="currentColor" strokeOpacity=".13" strokeDasharray="4 7" />)}
        <polygon points={area} fill="url(#owner-chart-fill)" />
        <polyline points={titik} fill="none" stroke="url(#owner-chart-line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => <g key={d.b} className={`owner-chart-point${d.b === selected?.b ? ' selected' : ''}`} role="button" tabIndex={0}
          aria-label={`${bulanTeks(d.b)}: ${rupiah(d.v)}. Klik untuk menampilkan rincian.`}
          onClick={() => onPick(d.b)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPick(d.b) } }}>
          <circle className="owner-chart-hit" cx={x(i)} cy={y(d.v)} r="13" fill="transparent" />
          <circle cx={x(i)} cy={y(d.v)} r={d.b === selected?.b ? 6.4 : 4.2} fill="var(--card)" stroke="#ea702b" strokeWidth="2.8" vectorEffect="non-scaling-stroke"/>
          <title>{bulanTeks(d.b)}: {rupiah(d.v)}</title>
        </g>)}
      </svg>
      <div className="owner-chart-labels" aria-hidden="true">
        {data.map((d, i) => (i % step === 0 || i === data.length - 1) &&
          <span key={d.b} style={{ left: `${((x(i)-pad.left)/plotW)*100}%` }}>{new Date(`${d.b}-01`).toLocaleDateString('id-ID', { month:'short', ...(data.length >= 12 ? {year:'2-digit'} : {}) })}</span>
        )}
      </div>
      {selected && <div className="owner-chart-selected" role="status" aria-live="polite"><span>Bulan dipilih <strong>{bulanTeks(selected.b)}</strong></span><b>{rupiah(selected.v)}</b></div>}
    </div>
  )
}

function PanelTitle({ icon, title, description, action }) {
  return <div className="owner-panel-heading"><div className="owner-panel-heading-left"><span className="owner-panel-icon"><OwnerIcon name={icon} size={20} /></span><div><h3>{title}</h3><p>{description}</p></div></div>{action}</div>
}

export default function Ringkasan() {
  useDb()
  const pemain = daftarPemain()
  const aktif = pemain.filter((p) => p.status === 'aktif').length
  const baru = pemain.filter((p) => p.status === 'baru').length
  const pelatih = daftarPelatih()
  const menunggu = pelatih.filter((p) => p.status === 'menunggu')
  const tagihan = listTagihan()
  const bulan = bulanIni()
  const masuk = tagihan.filter((t) => t.bulan === bulan && t.status === 'lunas').reduce((n, t) => n + t.jumlah, 0)
  const tunggak = tagihan.filter((t) => t.status === 'belum')
  const nTunggak = tunggak.reduce((n, t) => n + t.jumlah, 0)
  const rata = rataKehadiran()
  const [periodeInput, setPeriodeInput] = useState('6')
  const [periodeAktif, setPeriodeAktif] = useState(6)
  const [periodeError, setPeriodeError] = useState('')
  const [bulanDipilih, setBulanDipilih] = useState('')
  const terapkanPeriode = (event) => {
    event.preventDefault()
    const checked = validasiPeriodeBulan(periodeInput)
    if (!checked.valid) { setPeriodeError(checked.pesan); return }
    setPeriodeAktif(checked.jumlah)
    setPeriodeError('')
    setBulanDipilih('')
  }
  const rentangBulan = Array.from({ length: periodeAktif }, (_, i) => bulanLalu(periodeAktif - 1 - i))
  const perBulan = rentangBulan.map((b) => ({ b, v: tagihan.filter((t) => t.bulan === b && t.status === 'lunas').reduce((n, t) => n + Number(t.jumlah || 0), 0) }))
  const kelas = listKelas()
  const kelasData = kelas.map((k) => ({ ...k, hadir: rataKehadiran(k.id), jumlah: pemainDiKelas(k.id).length }))

  const kpi = [
    { label: 'Pemain aktif', nilai: aktif, ket: `${baru} pendaftar baru`, icon: 'players', tone: 'orange', path: '../pemain' },
    { label: 'Pelatih aktif', nilai: pelatih.filter((p) => p.status === 'aktif').length, ket: `${menunggu.length} menunggu persetujuan`, icon: 'coaches', tone: 'violet', path: '../pelatih' },
    { label: 'Pemasukan bulan ini', nilai: rupiah(masuk), ket: bulanTeks(bulan), icon: 'trend', tone: 'green', path: '../keuangan' },
    { label: 'Total tunggakan', nilai: rupiah(nTunggak), ket: `${tunggak.length} tagihan belum lunas`, icon: 'wallet', tone: 'rose', path: '../keuangan' },
    { label: 'Rata-rata kehadiran', nilai: rata === null ? '—' : `${rata}%`, ket: `${kelas.length} kelas akademi`, icon: 'activity', tone: 'blue', path: '../pemain' },
  ]

  return (
    <div className="view active owner-overview">
      <Reveal anim="up" className="owner-welcome">
        <div className="owner-welcome-text">
          <span className="owner-eyebrow"><span className="owner-live-dot"/> DASHBOARD AKADEMI</span>
          <h2>Pantau akademi, <span>semua dalam satu tempat.</span></h2>
          <p>Informasi pemain, pelatih, keuangan, dan kehadiran yang diperbarui dari data portal.</p>
        </div>
        <span className="owner-welcome-decoration" aria-hidden="true"><OwnerIcon name="overview" size={76} strokeWidth={1.1}/></span>
      </Reveal>

      {(menunggu.length > 0 || baru > 0) && <Reveal anim="up" className="owner-attention">
        <span className="owner-attention-icon"><OwnerIcon name="warning" size={19}/></span>
        <div><strong>Ada yang perlu ditinjau</strong><p>{[menunggu.length && `${menunggu.length} pelatih menunggu persetujuan`, baru && `${baru} pendaftar baru`].filter(Boolean).join(' · ')}</p></div>
        <Link to={menunggu.length ? '../pelatih' : '../pemain'} className="owner-attention-link">Tinjau <OwnerIcon name="arrow" size={17}/></Link>
      </Reveal>}

      <div className="owner-section-heading"><div className="portal-section-heading-copy"><div className="portal-section-heading-inline"><h2>Performa akademi</h2><OwnerLiveClock compact /></div><p>Data terkini akademi</p></div><span className="owner-period"><OwnerIcon name="calendar" size={16}/>{bulanTeks(bulan)}</span></div>
      <div className="owner-kpis">
        {kpi.map((k, i) => <Reveal key={k.label} anim="up" delay={i * 45} className={`card owner-kpi owner-tone-${k.tone}`}>
          <div className="owner-kpi-head"><span className="owner-kpi-icon"><OwnerIcon name={k.icon} size={21}/></span><span className="owner-kpi-open"><OwnerIcon name="arrow" size={17}/></span></div>
          <span className="owner-kpi-label">{k.label}</span><b className="owner-kpi-number">{k.nilai}</b><small className="owner-kpi-hint">{k.ket}</small>
          <Link to={k.path} aria-label={`Buka ${k.label}: ${k.nilai}`} className="owner-kpi-full-link" />
        </Reveal>)}
      </div>

      <div className="owner-chart-grid">
        <Reveal anim="up" className="card owner-chart-panel">
          <PanelTitle icon="trend" title="Tren pemasukan" description={`Total pembayaran lunas selama ${periodeAktif} bulan terakhir`} action={
            <form className="owner-chart-period-form" onSubmit={terapkanPeriode} noValidate>
              <label htmlFor="owner-chart-month-count">Periode (bulan)</label>
              <input id="owner-chart-month-count" inputMode="numeric" type="number" min="1" max="24" step="1" value={periodeInput}
                aria-invalid={Boolean(periodeError)} aria-describedby={periodeError ? 'owner-chart-period-error' : undefined}
                onChange={(e) => { setPeriodeInput(e.target.value); if (periodeError) setPeriodeError('') }} />
              <button type="submit" className="owner-chart-apply">Terapkan</button>
            </form>
          }/>
          {periodeError && <p id="owner-chart-period-error" role="alert" className="owner-chart-error">{periodeError}</p>}
          <div className="owner-chart-total"><b>{rupiah(masuk)}</b><span>Pemasukan {bulanTeks(bulan)}</span></div>
          <UangChart data={perBulan} activeMonth={bulanDipilih} onPick={setBulanDipilih}/>
          {!perBulan.some((d) => d.v > 0) && <p className="owner-chart-empty">Belum ada transaksi lunas dalam periode ini.</p>}
        </Reveal>
        <Reveal anim="up" delay={60} className="card owner-chart-panel owner-attendance-panel">
          <PanelTitle icon="activity" title="Kehadiran per kelas" description="Persentase berdasarkan sesi yang tercatat"/>
          <div className="owner-attendance-summary"><span className="owner-attendance-ring" style={{ '--p': `${rata ?? 0}%` }}><span>{rata === null ? '—' : `${rata}%`}</span></span><div><strong>Rata-rata kehadiran</strong><p>Dihitung dari kelas yang memiliki data absensi.</p></div></div>
          <div className="owner-attendance-list">
            {kelasData.length === 0 ? <p className="mut">Belum ada kelas yang tersedia.</p> : kelasData.map((k) => <div className="owner-attendance-item" key={k.id}>
              <div className="owner-attendance-name"><strong>{k.nama}</strong><span>{k.jumlah} pemain · {k.hadir === null ? 'Belum ada data' : `${k.hadir}%`}</span></div>
              <div className="owner-progress-track" role="progressbar" aria-label={`Kehadiran ${k.nama}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={k.hadir ?? 0}><span style={{ width: `${k.hadir ?? 0}%` }}/></div>
            </div>)}
          </div>
        </Reveal>
      </div>

      <Reveal anim="up" className="card owner-quick-panel">
        <div className="owner-quick-copy"><span className="owner-panel-icon"><OwnerIcon name="overview" size={20}/></span><div><h3>Akses cepat</h3><p>Kelola operasional akademi lebih efisien</p></div></div>
        <div className="owner-quick-links"><Link to="../pemain"><OwnerIcon name="players" size={18}/> Kelola pemain <OwnerIcon name="chevron" size={16}/></Link><Link to="../keuangan"><OwnerIcon name="wallet" size={18}/> Lihat keuangan <OwnerIcon name="chevron" size={16}/></Link><Link to="../berita"><OwnerIcon name="news" size={18}/> Kelola berita <OwnerIcon name="chevron" size={16}/></Link></div>
      </Reveal>
    </div>
  )
}
