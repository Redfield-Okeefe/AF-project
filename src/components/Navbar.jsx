import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import OwnerIcon from './OwnerIcon.jsx'

const links = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/pendaftaran', label: 'Pendaftaran' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/berita', label: 'Berita' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const close = () => setOpen(false)
  // Tutup menu seluler saat navigasi berubah.
  useEffect(() => { setOpen(false) }, [location.pathname])
  // Escape closes the mobile navigation. Prevent background page scroll while open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false) }
    const prevOverflow = document.body.style.overflow
    const media = window.matchMedia('(max-width: 960px)')
    const setLock = () => { document.body.style.overflow = media.matches ? 'hidden' : prevOverflow }
    setLock()
    document.addEventListener('keydown', onKeyDown)
    media.addEventListener?.('change', setLock)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      media.removeEventListener?.('change', setLock)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  return (
    <nav className="nav" aria-label="Navigasi utama">
      <Link className="logo" to="/" onClick={close}><BrandLogo /><span className="nama-bnr">B.N.R</span> <b>ACADEMY</b></Link>

      <div id="menu-publik" className={`menu${open ? ' open' : ''}`}>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} onClick={close} className={({ isActive }) => (isActive ? 'on' : '')}>
            {l.label}
          </NavLink>
        ))}
        <Link className="mobile-login-link" to="/login" onClick={close}><span>Login</span><OwnerIcon name="arrow" size={19} /></Link>
      </div>

      <div className="nav-right">
        <ThemeToggle className="nav-theme-toggle" />
        <Link className="btn" to="/login" onClick={close}>Login</Link>
        <button className="burger" aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} aria-controls="menu-publik" onClick={() => setOpen(!open)}><OwnerIcon name={open ? 'close' : 'menu'} size={22}/></button>
      </div>
    </nav>
  )
}
