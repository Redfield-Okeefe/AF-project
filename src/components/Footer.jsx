import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import { SITE } from '../data/config.js'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <Link to="/" className="logo"><BrandLogo /><span className="nama-bnr">B.N.R</span> <b>ACADEMY</b></Link>
          <p>Tempat bertumbuh, berlatih, dan membangun karakter melalui futsal.</p>
        </div>
        <div className="footer-links"><b>Jelajahi</b><Link to="/">Beranda</Link><Link to="/berita">Berita & Pengumuman</Link><Link to="/gallery">Galeri</Link><Link to="/pendaftaran">Pendaftaran</Link></div>
        <div className="footer-links"><b>Akademi</b><Link to="/contact">Hubungi Kami</Link><Link to="/login">Portal Akademi</Link><a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a></div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} {SITE.name} Academy. Seluruh hak cipta dilindungi.</div>
    </footer>
  )
}
