import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { KATEGORI_BERITA, WARNA_BERITA } from '../../data/config.js'
import { deleteNews, listNews, saveNews } from '../../services/news.js'
import { coverStyle, fmtTanggal } from '../../utils/format.js'
import { iso } from '../../services/db.js'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import OwnerPageHeading from '../../components/OwnerPageHeading.jsx'

const kosong = () => ({
  judul: '', kategori: KATEGORI_BERITA[0], tanggal: iso(),
  ringkas: '', isi: '', emoji: '📰', warna: WARNA_BERITA[0].value, gambar: '',
})

// Perkecil foto (lebar maks 900px) supaya muat di penyimpanan browser
function kompres(file, lebarMaks = 900) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return reject(new Error('Format gambar harus JPG, PNG, WEBP, atau GIF.'))
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Gambar terlalu besar. Maksimal 8 MB.'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const skala = Math.min(1, lebarMaks / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * skala)
      c.height = Math.round(img.height * skala)
      const ctx = c.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Tidak dapat memproses gambar.')); return }
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca.')) }
    img.src = url
  })
}

export default function KelolaBerita() {
  const [daftar, setDaftar] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null) // null = tampil daftar
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const timer = useRef(null)

  const muat = () =>
    listNews().then(setDaftar).catch((e) => setError(e.message)).finally(() => setLoading(false))

  useEffect(() => { muat(); return () => clearTimeout(timer.current) }, [])

  const info = (t) => {
    setToast(t)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2500)
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const bukaForm = (b) => { setError(''); setForm(b ? { ...b } : kosong()) }

  const pilihFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const gambar = await kompres(file)
      setForm((f) => ({ ...f, gambar }))
    } catch (err) {
      setError(err.message)
    }
    e.target.value = ''
  }

  const simpan = async (e) => {
    e.preventDefault()
    if (!form.judul.trim() || !form.ringkas.trim() || !form.isi.trim()) {
      setError('Judul, ringkasan, dan isi berita wajib diisi.')
      return
    }
    if (!form.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(form.tanggal) || Number.isNaN(new Date(`${form.tanggal}T00:00:00`).getTime())) {
      setError('Tanggal berita tidak valid.')
      return
    }
    if (form.gambar && !form.gambar.startsWith('data:image/') && !/^https:\/\/[^\s]+$/i.test(form.gambar)) {
      setError('Tautan gambar harus menggunakan HTTPS atau unggah gambar dari perangkat.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveNews({ ...form, judul: form.judul.trim(), ringkas: form.ringkas.trim(), isi: form.isi.trim() })
      await muat()
      info(form.id ? 'Berita diperbarui ✓' : 'Berita diterbitkan ✓')
      setForm(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const hapus = async (b) => {
    if (!window.confirm(`Hapus berita "${b.judul}"?`)) return
    try {
      await deleteNews(b.id)
      setDaftar((d) => d.filter((x) => x.id !== b.id))
      info('Berita dihapus')
    } catch (err) {
      setError(err.message)
    }
  }

  /* ---------- Form tambah / ubah ---------- */
  if (form) {
    return (
      <div className="view active adm owner-admin-page">
        <OwnerPageHeading icon="news" title={form.id ? 'Edit berita' : 'Berita baru'} description="Siapkan judul, konten, dan sampul sebelum diterbitkan." actions={<button type="button" className="abtn ghost" onClick={() => setForm(null)} disabled={saving}>Kembali ke daftar</button>}/>
        <form className="card owner-news-editor" onSubmit={simpan} noValidate>
          <h3>{form.id ? 'Ubah Berita' : 'Tulis Berita Baru'}</h3>
          {error && <div className="alert err" role="alert">{error}</div>}

          <label>Judul
            <input value={form.judul} onChange={set('judul')} maxLength={140} placeholder="Judul berita" />
          </label>

          <div className="adm-2">
            <label>Kategori
              <select value={form.kategori} onChange={set('kategori')}>
                {KATEGORI_BERITA.map((k) => <option key={k}>{k}</option>)}
              </select>
            </label>
            <label>Tanggal
              <input type="date" value={form.tanggal} onChange={set('tanggal')} />
            </label>
          </div>

          <label>Ringkasan (tampil di daftar berita)
            <textarea rows={2} value={form.ringkas} onChange={set('ringkas')} maxLength={220} />
          </label>

          <label>Isi berita (satu baris = satu paragraf)
            <textarea rows={9} value={form.isi} onChange={set('isi')} />
          </label>

          <label>Gambar sampul (opsional)
            <input type="file" accept="image/*" onChange={pilihFoto} />
          </label>
          <label>atau tempel tautan gambar
            <input value={form.gambar.startsWith('data:') ? '' : form.gambar} onChange={set('gambar')} placeholder="https://..." />
          </label>

          <div className="adm-2">
            <label>Emoji sampul (jika tanpa gambar)
              <input value={form.emoji} onChange={set('emoji')} maxLength={4} />
            </label>
            <label>Warna sampul
              <select value={form.warna} onChange={set('warna')}>
                {WARNA_BERITA.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </label>
          </div>

          <p className="mut adm-prev-label">Pratinjau sampul</p>
          <div className="ncover adm-prev" style={coverStyle(form)}>{!form.gambar && form.emoji}</div>
          {form.gambar && <button type="button" className="abtn ghost" onClick={() => setForm((f) => ({ ...f, gambar: '' }))}>Hapus gambar</button>}

          <div className="adm-actions">
            <button type="submit" className="abtn" disabled={saving}>{saving ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Terbitkan'}</button>
            <button type="button" className="abtn ghost" onClick={() => setForm(null)} disabled={saving}>Batal</button>
          </div>
        </form>
      </div>
    )
  }

  /* ---------- Daftar berita ---------- */
  return (
    <div className="view active adm owner-admin-page">
      <OwnerPageHeading icon="news" title="Kelola berita" description="Publikasikan informasi dan kabar terbaru akademi." meta={`${daftar.length} berita`} actions={<button type="button" className="abtn" onClick={() => bukaForm()}><OwnerIcon name="news" size={16}/> Tulis Berita</button>}/>
      <div className="owner-page-section-title"><div><h3>Daftar berita</h3><p>Kelola publikasi yang sudah dibuat</p></div></div>

      {error && <div className="alert err" role="alert">{error}</div>}
      {loading && <p className="mut">Memuat...</p>}
      {!loading && daftar.length === 0 && <div className="card"><p className="mut">Belum ada berita. Klik "Tulis Berita" untuk membuat yang pertama.</p></div>}

      {daftar.map((b) => (
        <div key={b.id} className="card adm-row owner-news-row">
          <div className="ncover adm-thumb" style={coverStyle(b)}>{!b.gambar && b.emoji}</div>
          <div className="adm-info">
            <b>{b.judul}</b>
            <small className="mut">{b.kategori} · {fmtTanggal(b.tanggal)}</small>
          </div>
          <div className="adm-btns">
            <Link className="abtn ghost" to={`/berita/${b.slug}`} target="_blank">Lihat</Link>
            <button type="button" className="abtn ghost" onClick={() => bukaForm(b)}>Ubah</button>
            <button type="button" className="abtn danger" onClick={() => hapus(b)}>Hapus</button>
          </div>
        </div>
      ))}

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  )
}
