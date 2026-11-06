import { useEffect, useState } from 'react'

/** Waktu lokal browser; disinkronkan setiap detik dan ketika tab kembali aktif. */
export function useLiveNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const update = () => setNow(new Date())
    const interval = window.setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
    }
  }, [])
  return now
}
