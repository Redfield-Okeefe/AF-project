import { useTheme } from '../hooks/useTheme.jsx'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <button type="button" className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={dark ? 'Ubah ke tema terang' : 'Ubah ke tema gelap'}
      title={dark ? 'Ubah ke tema terang' : 'Ubah ke tema gelap'}
      aria-pressed={dark}>
      <span className="theme-toggle-orb" aria-hidden="true">
        {dark ? (
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none"><path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.7 8.7 0 1 0 20.2 15.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </span>
    </button>
  )
}
