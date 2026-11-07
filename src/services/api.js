import { ambilAkun, daftarAkun, loginDemo, setStatusAkun } from './db.js'
// Jika VITE_API_URL kosong -> mode DEMO (berhasil tanpa server).
const API_URL = import.meta.env.VITE_API_URL

async function post(path, body) {
  if (!API_URL) {
    await new Promise((r) => setTimeout(r, 600))
    // Kredensial preview lokal/GitHub Pages saja. Tidak aktif jika VITE_API_URL diatur.
    // Email internal dipisahkan untuk mencegah satu akun demo menjadi tiga role sekaligus.
    if (path === '/login' && String(body?.email || '').trim().toLowerCase() === '12345@gmail.com') {
      if (body?.password !== '12345678') throw new Error('Password akun demo tidak sesuai.')
      const role = body?.peran
      const demoEmail = { player: 'preview.player@bnr.demo', owner: 'preview.owner@bnr.demo', pelatih: 'preview.coach@bnr.demo' }
      const demoName = { player: 'Pemain Demo', owner: 'Owner Demo', pelatih: 'Coach Demo' }
      if (!demoEmail[role]) throw new Error('Pilih portal pemain, pelatih, atau owner.')
      let user = ambilAkun(demoEmail[role])
      if (!user) user = daftarAkun({ email: demoEmail[role], nama: demoName[role], role })
      if (role === 'pelatih' && user.status !== 'aktif') user = setStatusAkun(user.email, 'aktif')
      return { ok: true, demo: true, token: 'demo-preview', role, user: { email: user.email, nama: user.nama, status: user.status } }
    }
    // Perilaku demo lama dipertahankan agar akun pengujian sebelumnya tidak rusak.
    if (path === '/login') {
      const u = loginDemo(String(body?.email || ''), body?.peran)
      return { ok: true, demo: true, token: 'demo', role: u.role, user: { email: u.email, nama: u.nama, status: u.status } }
    }
    return { ok: true, demo: true }
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Terjadi kesalahan, coba lagi.')
  }
  return res.json()
}

// Sesuaikan endpoint dengan backend Anda
export const registerPlayer = (data) => post('/pendaftaran', data)
export const loginUser = (data) => post('/login', data)
export const confirmPayment = (data) => post('/pembayaran', data)
