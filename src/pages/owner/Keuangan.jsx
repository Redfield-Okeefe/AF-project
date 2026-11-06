import { useState } from 'react'
import OwnerPageHeading from '../../components/OwnerPageHeading.jsx'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import { bulanIni, bulanLalu, buatTagihan, listTagihan, namaDari, setLunas, useDb, ambilKelas, ambilAkun } from '../../services/db.js'
import { unduhCsv } from '../../utils/csv.js'
import { bulanTeks, fmtTanggal, rupiah } from '../../utils/format.js'
import { useToast } from '../../utils/useToast.jsx'

export default function Keuangan() {
  useDb()
  const [bulan, setBulan] = useState(bulanIni())
  const [filter, setFilter] = useState('')
  const [toast, info] = useToast()

  const semua = listTagihan()
  const bulanan = semua.filter((t) => t.bulan === bulan)
  const lunas = bulanan.filter((t) => t.status === 'lunas')
  const belum = bulanan.filter((t) => t.status === 'belum')
  const tunggakanLama = semua.filter((t) => t.status === 'belum' && t.bulan < bulan)
  const daftar = bulanan.filter((t) => !filter || t.status === filter)
  const jml = (l) => l.reduce((n, t) => n + t.jumlah, 0)
  const opsiBulan = [5, 4, 3, 2, 1, 0].map((n) => bulanLalu(n))
  if (!opsiBulan.includes(bulan)) opsiBulan.push(bulan)

  const buat = () => {
    const n = buatTagihan(bulan)
    info(n ? `${n} tagihan dibuat ✓` : 'Semua pemain aktif sudah punya tagihan pada periode ini')
  }
  const tandai = (t, ok, metode) => { setLunas(t.id, ok, metode); info(ok ? 'Ditandai lunas ✓' : 'Status dikembalikan ke belum bayar') }

  const ekspor = () => unduhCsv(`laporan-keuangan-${bulan}.csv`, [
    ['Bulan', 'Pemain', 'Kelas', 'Jumlah', 'Status', 'Metode', 'Tanggal bayar'],
    ...bulanan.map((t) => [bulanTeks(t.bulan), namaDari(t.pemainEmail), ambilKelas(ambilAkun(t.pemainEmail)?.kelasId)?.nama || '', t.jumlah, t.status, t.metode, t.tglBayar]),
  ])

  return (
    <div className="view active adm owner-admin-page">
      <OwnerPageHeading icon="wallet" title="Laporan keuangan" description="Pantau iuran, tunggakan, dan transaksi per periode." meta={bulanTeks(bulan)}/>
      <div className="card owner-filter-card">
        <div className="owner-filter-intro"><OwnerIcon name="calendar" size={18}/><strong>Periode & tindakan</strong></div>
        <div className="filter-bar">
          <select value={bulan} onChange={(e) => setBulan(e.target.value)} aria-label="Pilih bulan">
            {opsiBulan.map((b) => <option key={b} value={b}>{bulanTeks(b)}</option>)}
          </select>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter status">
            <option value="">Semua status</option><option value="belum">Belum bayar</option><option value="lunas">Lunas</option>
          </select>
          <button type="button" className="abtn" onClick={buat}>+ Buat tagihan periode terpilih</button>
          <button type="button" className="abtn ghost" onClick={ekspor} disabled={!bulanan.length}>⬇ Ekspor CSV</button>
        </div>
      </div>

      <div className="kpis owner-finance-kpis">
        <div className="card kpi"><small className="mut">Sudah dibayar</small><b>{rupiah(jml(lunas))}</b><span className="mut">{lunas.length} tagihan</span></div>
        <div className="card kpi"><small className="mut">Belum dibayar</small><b>{rupiah(jml(belum))}</b><span className="mut">{belum.length} tagihan</span></div>
        <div className="card kpi"><small className="mut">Tunggakan bulan sebelumnya</small><b>{rupiah(jml(tunggakanLama))}</b><span className="mut">{tunggakanLama.length} tagihan</span></div>
      </div>

      <div className="owner-page-section-title"><div><h3>Rincian tagihan</h3><p>Transaksi pada {bulanTeks(bulan)}</p></div><span className="owner-counter">{daftar.length} tagihan</span></div>
      {daftar.length === 0 && <div className="card"><p className="mut">Belum ada tagihan untuk {bulanTeks(bulan)}. Klik "Buat tagihan periode terpilih" untuk membuatnya bagi semua pemain aktif.</p></div>}
      {daftar.map((t) => (
        <div key={t.id} className="card adm-row">
          <div className="adm-info">
            <b>{namaDari(t.pemainEmail)} <span className={`pill ${t.status === 'lunas' ? 'ok' : 'warn'}`}>{t.status === 'lunas' ? 'Lunas' : 'Belum bayar'}</span></b>
            <small className="mut">
              {rupiah(t.jumlah)}{t.status === 'lunas' ? ` · ${t.metode} · ${fmtTanggal(t.tglBayar)}` : ''}
            </small>
          </div>
          <div className="adm-btns">
            {t.status === 'belum' ? (
              <>
                <button type="button" className="abtn" onClick={() => tandai(t, true, 'Transfer')}>Lunas (transfer)</button>
                <button type="button" className="abtn ghost" onClick={() => tandai(t, true, 'Tunai')}>Lunas (tunai)</button>
              </>
            ) : (
              <button type="button" className="abtn ghost" onClick={() => tandai(t, false)}>Batalkan lunas</button>
            )}
          </div>
        </div>
      ))}
      {toast}
    </div>
  )
}
