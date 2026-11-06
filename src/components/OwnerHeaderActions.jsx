import { useEffect, useRef, useState } from 'react'
import OwnerIcon from './OwnerIcon.jsx'

// Foto asli belum disertakan di project. Avatar menampilkan ilustrasi sampai Owner mengunggah fotonya.
const OWNER_NAME = 'Muhammad Naufal Gonzales'

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const length = Math.min(image.naturalWidth, image.naturalHeight)
        const side = 320
        canvas.width = side
        canvas.height = side
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Browser tidak mendukung pemrosesan foto.')
        ctx.drawImage(image, (image.naturalWidth - length) / 2, (image.naturalHeight - length) / 2, length, length, 0, 0, side, side)
        resolve(canvas.toDataURL('image/jpeg', .8))
      } catch (err) { reject(err) } finally { URL.revokeObjectURL(url) }
    }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak dapat dibaca.')) }
    image.src = url
  })
}

function OwnerPhoto({ photo, size = 'normal' }) {
  return (
    <span className={`owner-photo owner-photo-${size}`} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : <OwnerIcon name="user" size={size === 'large' ? 32 : 23} strokeWidth={1.75} />}
    </span>
  )
}

export default function OwnerHeaderActions({ setMode, theme, profil, simpan }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const root = useRef(null)
  const input = useRef(null)
  const light = theme !== 'dark'
  const activeLabel = light ? 'Light mode' : 'Night mode'
  const nextLabel = light ? 'Night mode' : 'Light mode'

  useEffect(() => {
    if (!open) return
    const outside = (e) => { if (!root.current?.contains(e.target)) setOpen(false) }
    const escape = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Gunakan foto JPG, PNG, atau WebP.'); return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Ukuran foto maksimal 4 MB.'); return
    }
    try {
      setSaving(true)
      const foto = await resizeImage(file)
      await simpan({ ...profil, nama: OWNER_NAME, foto })
    } catch (err) { setError(err?.message || 'Gagal menyimpan foto.') }
    finally { setSaving(false) }
  }

  return (
    <div className="owner-header-actions" ref={root}>
      <div className="owner-profile-name" aria-label={`${OWNER_NAME}, Owner`}>
        <strong>{OWNER_NAME}</strong><span>Owner</span>
      </div>
      <button
        type="button" className="owner-theme-icon-btn"
        onClick={() => setMode(light ? 'dark' : 'light')}
        aria-label={`Saat ini ${activeLabel}. Aktifkan ${nextLabel}.`}
        aria-pressed={!light}
        title={`Tema: ${activeLabel} · Klik untuk ${nextLabel}`}
      >
        <span className="owner-theme-icon-animation" key={theme}><OwnerIcon name={light ? 'moon' : 'sun'} size={20}/></span>
      </button>
      <span className="owner-sr-only" role="status" aria-live="polite">{activeLabel}</span>
      <button type="button" className={`owner-photo-button${open ? ' is-open' : ''}`}
        aria-label="Lihat profil Muhammad Naufal Gonzales" aria-expanded={open}
        aria-haspopup="dialog" aria-controls="owner-profile-popup"
        onClick={() => { setOpen(!open); setError('') }}
      >
        <OwnerPhoto photo={profil.foto} />
      </button>
      {open && (
        <div id="owner-profile-popup" className="owner-profile-popup" role="dialog" aria-label="Profil Owner">
          <div className="owner-profile-popup-head">
            <OwnerPhoto photo={profil.foto} size="large" />
            <div><strong>{OWNER_NAME}</strong><span>Owner</span></div>
          </div>
          <div className="owner-profile-popup-foot">
            <button type="button" className="owner-photo-upload" disabled={saving} onClick={() => input.current?.click()}>
              <OwnerIcon name="camera" size={17}/>{saving ? 'Menyimpan foto...' : profil.foto ? 'Ganti foto profil' : 'Unggah foto profil'}
            </button>
            {error && <p className="owner-photo-error" role="alert">{error}</p>}
            <p className="owner-photo-help">Foto ditampilkan dalam lingkaran. JPG, PNG, atau WebP (maks. 4 MB).</p>
          </div>
          <input ref={input} className="owner-sr-only" tabIndex={-1} aria-label="Pilih foto profil owner" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/>
        </div>
      )}
    </div>
  )
}
