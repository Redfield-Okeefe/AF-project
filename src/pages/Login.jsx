import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import OwnerIcon from '../components/OwnerIcon.jsx'
import { loginUser } from '../services/api.js'
import { homeFor, setSession } from '../utils/auth.js'

// Form login per peran. Alamat: /login/pemain, /login/owner, /login/pelatih
const PERAN = {
  pemain: {
    role: 'player', judul: 'Login Pemain', sub: 'Masuk sebagai pemain atau orang tua.',
    daftar: { to: '/daftar-akun', teks: 'Belum punya akun?', aksi: 'Buat akun' },
  },
  pelatih: {
    role: 'pelatih', judul: 'Login Pelatih', sub: 'Masuk ke portal pelatih.',
    daftar: { to: '/daftar-akun?peran=pelatih', teks: 'Pelatih baru?', aksi: 'Daftar sebagai pelatih' },
  },
  owner: {
    role: 'owner', judul: 'Login Owner', sub: 'Khusus pemilik akademi. Akun owner tidak bisa didaftarkan sendiri.',
    daftar: null,
  },
}
const NAMA_ROLE = { player: 'pemain', pelatih: 'pelatih', owner: 'owner' }

export default function Login() {
  const { peran } = useParams()
  const cfg = PERAN[peran]
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { setError('') }, [peran])
  if (!cfg) return <Navigate to="/login" replace />

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Ambil nilai nyata dari input, bukan hanya state: browser autofill bisa
      // memperbarui DOM tanpa memicu onChange React.
      const data = new FormData(e.currentTarget)
      const email = String(data.get('email') || '').trim().toLowerCase()
      const password = String(data.get('password') || '')
      const res = await loginUser({ email, password, peran: cfg.role })
      const role = res.role === 'admin' ? 'owner' : res.role || 'player'
      // jangan biarkan akun peran lain masuk lewat pintu yang salah
      if (role !== cfg.role) throw new Error(`Akun ini terdaftar sebagai ${NAMA_ROLE[role]}. Pilih portal ${NAMA_ROLE[role]} untuk masuk.`)
      setSession(res.token, role, res.user || { email, nama: '' })
      nav(homeFor(role))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login auth-login-page">
      <div className="login-theme-toggle"><ThemeToggle /></div>
      <Reveal as="form" key={peran} anim="zoom" className="card auth-login-card" onSubmit={submit}>
        <div className="auth-login-mark"><OwnerIcon name={peran === 'owner' ? 'shield' : peran === 'pelatih' ? 'whistle' : 'ball'} size={32} strokeWidth={1.7}/></div>
        <span className="auth-login-eyebrow">B.N.R FUTSAL ACADEMY · PORTAL {peran.toUpperCase()}</span>
        <h2>{cfg.judul}</h2>
        <p className="sub">{cfg.sub}</p>
        <label className="auth-input-label" htmlFor="auth-email">Email</label>
        <div className="auth-input-wrap"><OwnerIcon name="mail" size={20}/><input id="auth-email" name="email" type="email" required value={form.email} placeholder="nama@email.com" autoComplete="username"
          onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <label className="auth-input-label" htmlFor="auth-password">Password</label>
        <div className="auth-input-wrap"><OwnerIcon name="lock" size={20}/><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} required value={form.password} placeholder="Masukkan password" autoComplete="current-password"
          onChange={(e) => setForm({ ...form, password: e.target.value })} /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPassword}><OwnerIcon name={showPassword ? 'eye-off' : 'eye'} size={19}/></button></div>
        {error && <div className="alert err" role="alert">{error}</div>}
        <button className="btn big auth-login-submit" type="submit" disabled={loading}><OwnerIcon name="log-in" size={19}/>{loading ? 'Memproses...' : 'Masuk ke Portal'}</button>
        {cfg.daftar && <p className="foot">{cfg.daftar.teks} <Link to={cfg.daftar.to}>{cfg.daftar.aksi}</Link></p>}
        <p className="foot auth-login-back"><Link to="/login"><OwnerIcon name="arrow-left" size={16}/> Pilih portal lain</Link></p>
      </Reveal>
    </div>
  )
}
