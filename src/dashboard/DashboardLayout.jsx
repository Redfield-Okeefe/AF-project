import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearSession } from '../../utils/auth.js'
import { SITE } from '../../data/config.js'

const menu = [
  { to: 'biodata', icon: '👤', label: 'Biodata', title: 'Biodata', sub: 'Data pemain yang terdaftar' },
  { to: 'jadwal', icon: '📅', label: 'Jadwal', title: 'Jadwal', sub: 'Jadwal latihan dan pertandingan' },
  { to: 'pengumuman', icon: '📢', label: 'Pengumuman', title: 'Pengumuman', sub: 'Informasi terbaru dari akademi', badge: 3 },
  { to: 'bayar', icon: '💳', label: 'Bayar Latihan', title: 'Bayar Latihan', sub: 'Tagihan dan riwayat pembayaran' },
]

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const nav = useNavigate()
  const current = menu.find((m) => pathname.endsWith(m.to)) || menu[0]

  const logout = () => {
    if (window.confirm('Yakin ingin keluar?')) {
      clearSession()
      nav('/')
    }
  }

  return (
    <div className="dash">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="logo">⚽ B.N.R <b>ACADEMY</b></div>
        <nav className="side-menu">
          {menu.map((m) => (
            <NavLink key={m.to} to={m.to} onClick={() => setOpen(false)} className={({ isActive }) => `item${isActive ? ' active' : ''}`}>
              <span>{m.icon}</span> {m.label}
              {m.badge && <em className="badge">{m.badge}</em>}
            </NavLink>
          ))}
        </nav>
        <button className="item logout" onClick={logout}><span>🚪</span> Keluar</button>
      </aside>
      <div className={`overlay${open ? ' show' : ''}`} onClick={() => setOpen(false)} />

      <main className="main">
        <header className="topbar">
          <button className="burger" aria-label="Menu" onClick={() => setOpen(true)}>☰</button>
          <div>
            <h1>{current.title}</h1>
            <p className="mut">{current.sub}</p>
          </div>
          <div className="user">
            <div className="avatar">R</div>
            <div><b>Rizky Pratama</b><small className="mut">Pemain · Intermediate</small></div>
          </div>
        </header>

        {/* key = pathname supaya animasi masuk ulang tiap pindah menu */}
        <Outlet key={pathname} />
      </main>
    </div>
  )
}
