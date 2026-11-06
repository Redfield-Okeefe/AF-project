import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import OwnerIcon from '../components/OwnerIcon.jsx'
import { SITE } from '../data/config.js'

// Urutan kartu: kiri pemain, tengah owner, kanan pelatih
const KARTU = [
  { to: '/login/pemain', ikon: 'ball', judul: 'Pemain', deskripsi: 'Jadwal dan aktivitas latihan' },
  { to: '/login/owner', ikon: 'shield', judul: 'Owner', deskripsi: 'Kelola akademi dan laporan' },
  { to: '/login/pelatih', ikon: 'whistle', judul: 'Pelatih', deskripsi: 'Kelas, absensi, dan penilaian' },
]

export default function LoginPortal() {
  useEffect(() => { document.title = `Portal Login — ${SITE.name} Academy` }, [])

  return (
    <div className="portal">
      <div className="portal-theme-toggle"><ThemeToggle /></div>
      <Link className="portal-back" to="/">← Beranda</Link>
      <div className="portal-in">
        <Reveal anim="down" className="portal-logo">
          <BrandLogo className="logo-img big" />B.N.R <b>ACADEMY</b>
        </Reveal>

        <div className="portal-heading"><span className="portal-eyebrow">PORTAL AKADEMI</span><h1>Selamat datang kembali</h1><p>Pilih peran untuk masuk ke akun Anda.</p></div>
        <div className="portal-cards">
          {KARTU.map((k, i) => (
            <Reveal key={k.to} as={Link} to={k.to} anim="up" delay={i * 100} className="portal-card">
              <span className="portal-ico" aria-hidden="true"><OwnerIcon name={k.ikon} size={37} strokeWidth={1.65}/></span>
              <span className="portal-txt">
                <b>{k.judul}</b>
                <small>{k.deskripsi}</small>
              </span>
              <span className="portal-arr" aria-hidden="true"><OwnerIcon name="arrow" size={19}/></span>
            </Reveal>
          ))}
        </div>

        <p className="portal-foot">{SITE.name} Academy · Portal Login</p>
      </div>
    </div>
  )
}
