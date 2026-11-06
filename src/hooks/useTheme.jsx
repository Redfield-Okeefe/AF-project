import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'bnr_academy_theme'
const valid = value => value === 'light' || value === 'dark'

function readTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (valid(saved)) return saved
  } catch {}
  return 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme)
  const setTheme = value => setThemeState(current => {
    const next = typeof value === 'function' ? value(current) : value
    return valid(next) ? next : current
  })
  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try { localStorage.setItem(KEY, theme) } catch {}
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme harus digunakan di dalam ThemeProvider')
  return value
}
