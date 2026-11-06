import React from 'react'

/** Ikon SVG konsisten untuk Portal Owner, tanpa dependensi tambahan. */
export default function OwnerIcon({ name, size = 20, strokeWidth = 1.85, className = '' }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
    coaches: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 8a3 3 0 0 1 0 6m2 6h2v-2a6 6 0 0 0-4-5.7"/></>,
    players: <><circle cx="9" cy="8" r="3"/><path d="M2.8 20v-1.4A5.6 5.6 0 0 1 8.4 13h1.2a5.6 5.6 0 0 1 5.6 5.6V20"/><circle cx="18.5" cy="9" r="2"/><path d="M17 15.6a4.5 4.5 0 0 1 4 4.4"/></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10V6a3 3 0 0 1 3-3h12"/><path d="M15 13h6v4h-6a2 2 0 0 1 0-4Z"/><circle cx="16.5" cy="15" r=".6" fill="currentColor" stroke="none"/></>,
    news: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4m3 0h1"/></>,
    settings: <><path d="M10 2h4l.7 2.3 2 1.1 2.3-.6 2 3.4-1.6 1.7v2.2l1.6 1.7-2 3.4-2.3-.6-2 1.1L14 22h-4l-.7-2.3-2-1.1-2.3.6-2-3.4 1.6-1.7v-2.2L3 10.2l2-3.4 2.3.6 2-1.1L10 2Z" transform="translate(0,-1) scale(1,.92)"/><circle cx="12" cy="11" r="2.6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    moon: <path d="M20.8 13.2A9 9 0 0 1 10.8 3.2 9 9 0 1 0 20.8 13.2Z"/>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1.6a7 7 0 0 1 14 0V21"/></>,
    camera: <><rect x="3" y="7" width="18" height="14" rx="3"/><circle cx="12" cy="14" r="3"/><path d="M8 7l1.3-3h5.4L16 7"/></>,
    monitor: <><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8m-4-4v4"/></>,
    logout: <><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="m15 16 4-4-4-4m4 4H9"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
    warning: <><path d="m10.3 3.7-8 13.9A2 2 0 0 0 4 20.6h16a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    activity: <><path d="M2 12h4l3-7 5 14 3-7h5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
  }
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name] || paths.overview}</svg>
}
