import OwnerIcon from './OwnerIcon.jsx'
import { useLiveNow } from '../hooks/useLiveNow.js'

// Dipakai di judul ringkasan tiap portal. Pada layar kecil tanggal disingkat
// agar bisa berada di samping judul tanpa memaksa halaman bergeser horizontal.
export default function OwnerLiveClock({ compact = false }) {
  const now = useLiveNow()
  const tanggal = new Intl.DateTimeFormat('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(now)
  const tanggalSingkat = new Intl.DateTimeFormat('id-ID', { day:'numeric', month:'short' }).format(now)
  const jam = new Intl.DateTimeFormat('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(now)

  return <div
    className={`owner-live-clock${compact ? ' portal-section-clock' : ''}`}
    title="Tanggal dan jam sesuai waktu lokal perangkat"
    aria-label={`Waktu perangkat: ${tanggal}, pukul ${jam}`}
  >
    <OwnerIcon name="calendar" size={15}/>
    <time dateTime={now.toISOString()}>
      {compact
        ? <>
            <span className="portal-clock-full">{tanggal} · <b>{jam}</b></span>
            <span className="portal-clock-short">{tanggalSingkat} · <b>{jam}</b></span>
          </>
        : <>{tanggal}<span className="owner-clock-divider"> · </span><b>{jam}</b></>}
    </time>
  </div>
}
