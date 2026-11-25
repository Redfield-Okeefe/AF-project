import {useEffect,useState} from 'react'
import {readDashboard} from '../academy/OperationalDashboard.jsx'
import {academyApiEnabled,academyWorkspaceEnabled} from '../../services/academy.js'
import PortalLayout from '../../components/PortalLayout.jsx'
import { daftarPelatih, daftarPemain, useDb } from '../../services/db.js'

const menu = [
  { to: 'dashboard', icon: '📊', ownerIcon: 'overview', label: 'Dashboard', title: 'Dashboard Owner', sub: 'Pantau aktivitas dan performa akademi' },
  { to: 'pelatih', icon: '🧑‍🏫', ownerIcon: 'coaches', label: 'Pelatih', title: 'Pelatih', sub: 'Persetujuan dan pengelolaan pelatih' },
  { to: 'pemain', icon: '⚽', ownerIcon: 'players', label: 'Pemain', title: 'Pemain & Pendaftar', sub: 'Data pemain, kelas, dan status' },
  { to: 'keuangan', icon: '💰', ownerIcon: 'wallet', label: 'Keuangan', title: 'Keuangan', sub: 'Pembayaran, tunggakan, dan laporan' },
  { to: 'berita', icon: '📰', ownerIcon: 'news', label: 'Berita', title: 'Kelola Berita', sub: 'Terbitkan kabar terbaru akademi' },
  { to: 'media', icon: '📷', ownerIcon: 'camera', label: 'Media & Foto', title: 'Media & Foto', sub: 'Kelola Gallery dan foto Beranda' },
  { to: 'pengaturan', icon: '⚙️', ownerIcon: 'settings', label: 'Pengaturan', title: 'Pengaturan', sub: 'Kelas, harga, dan rekening' },
]

export default function OwnerLayout() {
  useDb()
  const [counts,setCounts]=useState(null)
  useEffect(()=>{if(!academyApiEnabled)return;let live=true;const refresh=()=>readDashboard().then(d=>{if(live)setCounts(d.accounts)}).catch(()=>{if(live)setCounts(null)});refresh();const timer=setInterval(refresh,30000);return()=>{live=false;clearInterval(timer)}},[])
  const menunggu = academyApiEnabled?(counts?.pending_coaches||0):daftarPelatih().filter((p) => p.status === 'menunggu').length
  const baru = academyApiEnabled?(counts?.pending_registrations||0):daftarPemain().filter((p) => p.status === 'baru').length
  return (
    <PortalLayout
      roleLabel="Owner"
      ownerMode
      menu={(academyWorkspaceEnabled?[...menu.slice(0,3),{to:'akademi',ownerIcon:'players',label:'Akademi & Kelas',title:'Akademi & Kelas',sub:'Program, kelas, jadwal dan absensi'},...menu.slice(3)]:menu).map((m) => (m.to === 'pelatih' ? { ...m, badge: menunggu } : m.to === 'pemain' ? { ...m, badge: baru } : m))}
    />
  )
}
