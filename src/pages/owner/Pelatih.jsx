import {Link} from 'react-router-dom'
import { useEffect, useState } from 'react'
import { coachApiEnabled, ownerCoaches, ownerReviewCoach } from '../../services/coach.js'
import Reveal from '../../components/Reveal.jsx'
import OwnerPageHeading from '../../components/OwnerPageHeading.jsx'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import { daftarPelatih, kelasPelatih, setStatusAkun, useDb } from '../../services/db.js'
import { fmtTanggal } from '../../utils/format.js'
import { useToast } from '../../utils/useToast.jsx'

const PILL = { aktif: 'ok', menunggu: 'warn', ditolak: 'err', nonaktif: 'mut' }

export default function Pelatih() {
  useDb()
  const [toast, info] = useToast()
  const [remote, setRemote] = useState([])
  const [remoteError, setRemoteError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!coachApiEnabled) return
    let live = true
    ownerCoaches().then(r => { if (live) setRemote(r.coaches) }).catch(e => { if (live) setRemoteError(e.message) })
    return () => { live = false }
  }, [])
  const semua = coachApiEnabled ? remote : daftarPelatih()
  const change = async (p, status, alasan = '') => {
    if (!coachApiEnabled) { setStatusAkun(p.email, status, alasan); return true }
    if (busy) return false
    setBusy(true)
    try {
      const r = await ownerReviewCoach(p.id, status, alasan)
      setRemote(prev => prev.map(x => x.id === p.id ? r.user : x)); setRemoteError(''); return true
    } catch (e) { setRemoteError(e.message); return false }
    finally { setBusy(false) }
  }
  const menunggu = semua.filter((p) => p.status === 'menunggu')
  const lain = semua.filter((p) => p.status !== 'menunggu')

  const setuju = async (p) => { if (await change(p, 'aktif')) info(`${p.nama} disetujui ✓`) }
  const tolak = async (p) => {
    const alasan = window.prompt(`Alasan menolak ${p.nama}? (akan terlihat oleh pelatih)`)
    if (alasan === null) return
    if (!alasan.trim()) return info('Alasan penolakan wajib diisi')
    if (await change(p, 'ditolak', alasan.trim())) info('Pendaftaran ditolak')
  }
  const ubah = async (p, status) => {
    if (status === 'nonaktif' && !window.confirm(`Nonaktifkan ${p.nama}? Ia tidak bisa membuka portal pelatih.`)) return
    if (await change(p, status)) info(status === 'aktif' ? `${p.nama} diaktifkan` : `${p.nama} dinonaktifkan`)
  }

  return (
    <div className="view active adm owner-admin-page">
      <OwnerPageHeading icon="coaches" title="Manajemen pelatih" description="Tinjau pendaftaran pelatih dan kelola status mengajar." meta={`${semua.length} total pelatih`}/>
      {remoteError && <div className="alert err">{remoteError}</div>}
      <div className="owner-page-section-title"><div><h3>Menunggu persetujuan</h3><p>Pendaftar yang membutuhkan keputusan Owner</p></div><span className="owner-counter">{menunggu.length} menunggu</span></div>
      {menunggu.length === 0 && <div className="card"><p className="mut">Tidak ada pendaftar baru.</p></div>}
      {menunggu.map((p) => (
        <Reveal key={p.email} anim="left" className="card adm-row">
          <div className="adm-info">
            <span className="owner-list-kicker"><OwnerIcon name="clock" size={14}/> Menunggu ditinjau</span><b>{p.nama}</b>
            <small className="mut">{p.email} · {p.wa || 'WA belum diisi'}</small>
            <small className="mut">Lisensi: {p.lisensi || '–'} · Mendaftar {fmtTanggal(p.dibuat.slice(0, 10))}</small>
          </div>
          <div className="adm-btns">
            <button type="button" disabled={busy} className="abtn" onClick={() => setuju(p)}>Setujui</button>
            <button type="button" disabled={busy} className="abtn danger" onClick={() => tolak(p)}>Tolak</button>
          </div>
        </Reveal>
      ))}

      <div className="owner-page-section-title"><div><h3>Daftar pelatih</h3><p>Status akun dan penempatan kelas</p></div><span className="owner-counter">{lain.length} pelatih</span></div>
      {lain.length === 0 && <div className="card"><p className="mut">Belum ada pelatih.</p></div>}
      {lain.map((p) => {
        const kls = coachApiEnabled ? [] : kelasPelatih(p.email)
        return (
          <div key={p.email} className="card adm-row">
            <div className="adm-info">
              <b>{p.nama} <span className={`pill ${PILL[p.status]}`}>{p.status}</span></b>
              <small className="mut">{p.email} · {p.wa || '–'} · Lisensi: {p.lisensi || '–'}</small>
              <small className="mut">Kelas: {kls.length ? kls.map((k) => k.nama).join(', ') : coachApiEnabled ? 'Lihat penugasan di Akademi & Kelas' : 'belum ada (atur di Pengaturan)'}</small>
              {p.status === 'ditolak' && p.alasan && <small className="mut">Alasan: {p.alasan}</small>}
            </div>
            <div className="adm-btns">
              {coachApiEnabled&&p.status==='aktif'&&<Link className="abtn ghost" to="/owner/akademi">Atur penugasan</Link>}
              {p.status === 'aktif'
                ? <button type="button" disabled={busy} className="abtn danger" onClick={() => ubah(p, 'nonaktif')}>Nonaktifkan</button>
                : <button type="button" disabled={busy} className="abtn ghost" onClick={() => ubah(p, 'aktif')}>{p.status === 'ditolak' ? 'Setujui' : 'Aktifkan'}</button>}
            </div>
          </div>
        )
      })}
      {toast}
    </div>
  )
}
