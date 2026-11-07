import { useEffect, useMemo, useState } from 'react'
import Masonry from '../components/Masonry.jsx'
import { GALLERY } from '../data/config.js'
import { GALLERY_PHOTOS } from '../data/galleryPhotos.js'
import './Gallery.css'

function imagePath(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

function columnsFor(width) {
  if (width < 360) return 1
  if (width <= 760) return 2
  if (width <= 1080) return 3
  return 4
}

export default function Gallery() {
  const [screenWidth, setScreenWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [colorMode, setColorMode] = useState('mono')
  useEffect(() => {
    const update = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  const items = useMemo(() => GALLERY_PHOTOS.map((photo, index) => {
    // Tetap menghormati foto asli yang nantinya diatur pada GALLERY lama.
    const photoPath = photo.image || GALLERY[index]?.image || ''
    const original = Boolean(photoPath)
    return {
      id: photo.id,
      img: original ? imagePath(photoPath) : photo.img,
      title: original ? (GALLERY[index]?.title || photo.title) : photo.title,
      description: original ? 'Dokumentasi Akademi' : photo.description,
      alt: original ? `Dokumentasi: ${GALLERY[index]?.title || photo.title}` : photo.alt,
      width: photo.width,
      height: photo.height,
      url: original ? undefined : photo.url
    }
  }), [])

  const mobile = screenWidth <= 760
  return (
    <section className="w bnr-gallery-page">
      <header className="bnr-gallery-heading">
        <span className="bnr-gallery-eyebrow">GALERI AKTIVITAS</span>
        <h2>Gallery</h2>
        <p className="sub">Jelajahi momen latihan, pertandingan, dan kebersamaan melalui galeri bergaya Masonry.</p>
        <div className="bnr-gallery-meta">
          <p className="bnr-gallery-note">Foto olahraga sementara berasal dari Pexels sebagai ilustrasi desain; belum merupakan dokumentasi resmi B.N.R Academy.</p>
        </div>
      </header>
      <div className="bnr-gallery-toolbar">
        <span className="bnr-gallery-toolbar-label">Tampilan foto</span>
        <div className="bnr-gallery-color-options" role="group" aria-label="Pilihan warna Gallery">
          <button type="button" aria-pressed={colorMode === 'mono'} onClick={() => setColorMode('mono')}>Hitam Putih</button>
          <button type="button" aria-pressed={colorMode === 'color'} onClick={() => setColorMode('color')}>Warna Asli</button>
        </div>
      </div>
      <Masonry
        className="bnr-gallery-masonry"
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        items={items}
        columns={columnsFor(screenWidth)}
        columnWidth={220}
        gap={mobile ? 10 : 16}
        radius={mobile ? 13 : 18}
        animateFrom="bottom"
        stagger={mobile ? 0.025 : 0.04}
        duration={mobile ? 0.4 : 0.55}
        bounce={0.08}
        blurToFocus={!mobile}
        revealOnScroll
        hoverEffect={mobile ? 'none' : 'zoom'}
        captions={mobile ? 'always' : 'hover'}
        lightbox
        draggable={!mobile}
      />
    </section>
  )
}
