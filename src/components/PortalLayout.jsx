import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearSession } from '../utils/auth.js'
import { accountApiEnabled, logoutAccount } from '../services/accountSecurity.js'
import ChangePassword from './ChangePassword.jsx'
import { SITE } from '../data/config.js'
import Avatar from './Avatar.jsx'
import BrandLogo from './BrandLogo.jsx'
import { muatProfil, profilCepat, simpanProfil } from '../services/profile.js'
import OwnerIcon from './OwnerIcon.jsx'
import { useTheme } from '../hooks/useTheme.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import OwnerHeaderActions from './OwnerHeaderActions.jsx'

// Kerangka dashboard (sidebar + topbar) yang dipakai portal pemain, pelatih, dan owner.
// menu: [{ to, icon, label, title, sub, badge? }]
export default function PortalLayout({ menu, roleLabel, ownerMode = false }) {
  const [open, setOpen] = useState(false)
  const [security,setSecurity]=useState(false)
  const [logoutBusy,setLogoutBusy]=useState(false)
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { setTheme, theme } = useTheme()

  // profil akun yang sedang login (nama, foto, kontak). Dibagikan ke halaman anak lewat Outlet.
  const [profil, setProfil] = useState(profilCepat)
  const [profileReady,setProfileReady]=useState(!accountApiEnabled),[profileError,setProfileError]=useState(''),[profileRevision,setProfileRevision]=useState(0)
  useEffect(() => {let live=true;setProfileError('');muatProfil().then(p=>{if(live){setProfil(p);setProfileReady(true)}}).catch(e=>{if(live)setProfileError(e.message)});return()=>{live=false}},[profileRevision])
  const simpan = async (data) => {
    if(!profileReady)throw new Error('Profil belum berhasil dimuat. Muat ulang profil dahulu.')
    const baru = await simpanProfil(data)
    setProfil(baru)
    return baru
  }

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onEscape)
    const oldOverflow = document.body.style.overflow
    if (window.matchMedia('(max-width: 900px)').matches) document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onEscape); document.body.style.overflow = oldOverflow }
  }, [open])

  const current = menu.find((m) => pathname.endsWith(m.to)) || menu[0]

  const finishLogout=()=>{clearSession();nav('/login')}
  const logout = async () => {
    if (logoutBusy || !window.confirm(accountApiEnabled?'Keluar dari semua sesi akun?':'Yakin ingin keluar?')) return
    setLogoutBusy(true)
    if(accountApiEnabled){try{await logoutAccount()}catch(e){if(e.status!==401)window.alert('Server tidak dapat mencabut seluruh sesi. Sesi browser ini akan diakhiri.')}}
    clearSession();nav('/')
  }

  return (
    <div className={`dash owner-portal${ownerMode ? '' : ' workspace-portal'}`} data-theme={theme}>
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="logo"><BrandLogo /><span className="portal-brand-text">B.N.R <b>ACADEMY</b></span></div>
        <button type="button" className="owner-close-sidebar" onClick={() => setOpen(false)} aria-label="Tutup menu portal"><OwnerIcon name="close" size={19}/></button>
        <div className="sidebar-role">{roleLabel} Workspace</div>
        <nav className="side-menu" aria-label={`Menu ${roleLabel}`}>
          {menu.map((m) => (
            <NavLink key={m.to} to={m.to} onClick={() => setOpen(false)} className={({ isActive }) => `item${isActive ? ' active' : ''}`}>
              <span className="menu-icon"><OwnerIcon name={m.ownerIcon || 'overview'} size={19} /></span><span className="menu-label">{m.label}</span>
              {m.badge > 0 && <em className="badge">{m.badge}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom"><span className="sidebar-version">{SITE.name} Academy · Portal</span>
        {accountApiEnabled && <button type="button" className="item" onClick={()=>{setSecurity(x=>!x);setOpen(false)}}><span className="menu-icon"><OwnerIcon name="lock" size={19}/></span><span className="menu-label">Ubah Password</span></button>}
        <button disabled={logoutBusy} className="item logout" onClick={logout}><span className="menu-icon"><OwnerIcon name="logout" size={19} /></span><span className="menu-label">Keluar</span></button></div>
      </aside>
      <div className={`overlay${open ? ' show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <main className="main">
        <header className="topbar">
          <button className="burger" aria-label="Buka menu portal" aria-expanded={open} onClick={() => setOpen(true)}><OwnerIcon name="menu" /></button>
          <div className="portal-topbar-heading">
            <h1>{current.title}</h1>
            <p className="mut">{current.sub}</p>
          </div>
          {ownerMode
            ? <OwnerHeaderActions setMode={setTheme} theme={theme} profil={profil} simpan={simpan} />
            : <div className="portal-header-actions"><ThemeToggle /><div className="user"><Avatar foto={profil.foto} nama={profil.nama} /><div><b>{profil.nama}</b><small className="mut">{roleLabel}</small></div></div></div>}
        </header>

        {/* Bar atas selebar konten; halaman portal tetap punya padding tersendiri. */}
        <div className="portal-main-content">
          {/* key = pathname supaya animasi masuk ulang tiap pindah menu */}
          {security&&<ChangePassword onComplete={finishLogout} onClose={()=>setSecurity(false)}/>}
          {profileError&&<div className="alert err" role="alert">{profileError} <button className="abtn ghost" onClick={()=>setProfileRevision(v=>v+1)}>Muat ulang profil</button></div>}
          {!profileReady&&!profileError?<p className="mut">Memuat profil akun...</p>:<Outlet key={pathname} context={{ profil, simpan, profileReady }} />}
        </div>
      </main>
    </div>
  )
}
