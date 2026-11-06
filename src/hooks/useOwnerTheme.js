import { useEffect, useState } from 'react'

const STORAGE_KEY = 'af_owner_theme_preference'
const VALID = new Set(['system', 'light', 'dark'])

function initialMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return VALID.has(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}
function systemIsDark() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Hanya aktif pada Portal Owner. Default mengikuti setting OS, bisa override manual. */
export function useOwnerTheme(enabled = true) {
  const [mode, setMode] = useState(initialMode)
  const [darkSystem, setDarkSystem] = useState(systemIsDark)
  useEffect(() => {
    if (!enabled || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => setDarkSystem(event.matches)
    setDarkSystem(media.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [enabled])
  useEffect(() => {
    if (!enabled) return
    try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* storage tidak tersedia */ }
  }, [enabled, mode])
  return { mode, setMode, theme: mode === 'system' ? (darkSystem ? 'dark' : 'light') : mode }
}
