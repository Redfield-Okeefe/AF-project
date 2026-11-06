import PortalLayout from '../../components/PortalLayout.jsx'
import { jumlahInfoBaru, useDb } from '../../services/db.js'
import { getUser } from '../../utils/auth.js'

const menu = [
  { to:'ringkasan', ownerIcon:'overview', label:'Ringkasan', title:'Dashboard Pemain', sub:'Aktivitas dan informasi akademi' },
  { to: 'biodata', ownerIcon:'user', icon: '👤', label: 'Biodata', title: 'Biodata', sub: 'Data pemain yang terdaftar' },
  { to: 'jadwal', ownerIcon:'calendar', icon: '📅', label: 'Jadwal', title: 'Jadwal', sub: 'Jadwal latihan dan pertandingan' },
  { to: 'pengumuman', ownerIcon:'news', icon: '📢', label: 'Pengumuman', title: 'Pengumuman', sub: 'Informasi terbaru dari akademi' },
  { to: 'bayar', ownerIcon:'wallet', icon: '💳', label: 'Bayar Latihan', title: 'Bayar Latihan', sub: 'Tagihan dan riwayat pembayaran' },
]

export default function DashboardLayout() {
  useDb()
  const baru = jumlahInfoBaru(getUser()?.email || '')
  return <PortalLayout roleLabel="Pemain" menu={menu.map((m) => (m.to === 'pengumuman' ? { ...m, badge: baru } : m))} />
}
