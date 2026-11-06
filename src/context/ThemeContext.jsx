import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'bnr-academy-theme'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme: () => setTheme(current => current === 'dark' ? 'light' : 'dark'),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme harus digunakan di dalam ThemeProvider')
  return context
}
