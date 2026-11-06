import OwnerIcon from './OwnerIcon.jsx'
import { useLiveNow } from '../hooks/useLiveNow.js'

export default function OwnerLiveClock() {
  const now = useLiveNow()
  const tanggal = new Intl.DateTimeFormat('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(now)
  const jam = new Intl.DateTimeFormat('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(now)
  return <div className="owner-live-clock" title="Tanggal dan jam sesuai waktu lokal perangkat" aria-label={`Waktu perangkat: ${tanggal}, pukul ${jam}`}>
    <OwnerIcon name="calendar" size={15}/><time dateTime={now.toISOString()}>{tanggal}<span className="owner-clock-divider"> · </span><b>{jam}</b></time>
  </div>
}
