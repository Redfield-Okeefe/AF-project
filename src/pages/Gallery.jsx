import { useEffect, useMemo, useState } from 'react'
import Reveal from '../components/Reveal.jsx'
import CircularGallery from '../components/CircularGallery.jsx'
import { GALLERY } from '../data/config.js'

/* Foto galeri diambil dari GALLERY di src/data/config.js.
   Isi "image" dengan path foto (contoh '/foto/latihan-01.jpg', file ditaruh di public/foto).
   Kalau "image" masih kosong, otomatis dibuat kartu gradien dengan judulnya. */
const svgTile = (title, gradient) => {
  const [a = '#2563eb', b = '#7c3aed'] = gradient.match(/#[0-9a-f]{6}/gi) || []
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="570" viewBox="0 0 800 570">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="800" height="570" fill="url(#g)"/>` +
    `<text x="400" y="270" font-size="110" text-anchor="middle">⚽</text>` +
    `<text x="400" y="390" font-size="38" font-weight="700" font-family="sans-serif" fill="#fff" text-anchor="middle">${title.replace(/&/g, '&amp;')}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function Gallery() {
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)')
    const change = () => setIsCompact(query.matches)
    change()
    query.addEventListener?.('change', change)
    return () => query.removeEventListener?.('change', change)
  }, [])
  const items = useMemo(
    () => GALLERY.map((g) => ({
      image: g.image || svgTile(g.title, g.gradient || ''),
      text: g.title,
      alt: g.title,
      description: g.description,
    })),
    []
  )

  return (
    <div className="w">
      <Reveal as="h2" anim="down">Gallery</Reveal>
      <Reveal as="p" anim="down" delay={100} className="sub">Dokumentasi kegiatan di akademi kami.</Reveal>
      {isCompact ? (
        <div className="mobile-gallery-grid" aria-label="Foto kegiatan akademi">
          {items.map((item, index) => (
            <figure className="mobile-gallery-card" key={index}>
              <img src={item.image} alt={item.alt || item.text} loading="lazy" decoding="async" />
              <figcaption>{item.text}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
      <div className="gallery-desktop" style={{ height: 'clamp(380px, 62vh, 600px)', position: 'relative' }}>
        <CircularGallery
          items={items}
          bend={3.5}
          textColor="#2a2d4a"
          font={'bold 30px "Segoe UI", system-ui, sans-serif'}
          borderRadius={0.1}
          scrollEase={0.05}
          itemSize={0.98}
          itemAspect={1.4}
          gap={0.22}
          wave={0.3}
          fadeEdges={0.05}
          scrollSpeed={1.5}
          autoScroll={1}
          openOnClick={false}
        />
      </div>
      )}
    </div>
  )
}
