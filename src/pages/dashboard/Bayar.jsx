import Finance from '../academy/Finance.jsx'
import {academyApiEnabled} from '../../services/academy.js'
import { useRef, useState } from 'react'
import Reveal from '../../components/Reveal.jsx'

const rekening = {
  'Transfer Bank BCA': 'Rekening contoh — tidak tersedia untuk transfer',
  'Transfer Bank Mandiri': 'Rekening contoh — tidak tersedia untuk transfer',
  QRIS: 'Simulasi QRIS — tidak menerima pembayaran',
}

// TODO: ganti dengan data dari API
const riwayat = [
  { bulan: 'September 2026', tgl: 'Dibayar 3 Sep' },
  { bulan: 'Agustus 2026', tgl: 'Dibayar 4 Agu' },
  { bulan: 'Juli 2026', tgl: 'Dibayar 2 Jul' },
]

export default function Bayar(){return academyApiEnabled?<Finance owner={false}/>:<BayarDemo/>}
function BayarDemo() {
  const [method, setMethod] = useState('Transfer Bank BCA')
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')
  const fileRef = useRef(null)
  const timer = useRef(null)

  const toast = (text) => {
    setMsg(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 2800)
  }

  const kirim = () => {
    if (!file) return toast('Pilih file bukti transfer dulu')
    // TODO: upload `file` ke backend (FormData)
    toast('Simulasi bukti selesai. Tidak ada file atau transaksi yang dikirim.')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="view active">
      <div className="alert" role="status">MODE DEMO — Tagihan dan riwayat hanya contoh. Jangan melakukan transfer atau memilih dokumen keuangan asli.</div>
      <div className="pay">
        <Reveal anim="left" className="card bill">
          <span className="pill warn">Belum Dibayar</span>
          <h3>Iuran Latihan Oktober 2026</h3>
          <div className="amount">Rp 350.000</div>
          <p className="mut">Jatuh tempo: 25 Oktober 2026</p>

          <label>Metode Pembayaran
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.keys(rekening).map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <p className="rek">{rekening[method]}</p>

          <label>Upload Bukti Transfer
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <button className="btn" onClick={kirim}>Kirim Bukti Pembayaran</button>
        </Reveal>

        <Reveal anim="right" className="card">
          <h3>Riwayat Pembayaran</h3>
          <ul className="hist">
            {riwayat.map((r) => (
              <li key={r.bulan}>
                <div><b>{r.bulan}</b><small className="mut">{r.tgl}</small></div>
                <span className="pill ok">Lunas</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
      <div className={`toast${msg ? ' show' : ''}`}>{msg}</div>
    </div>
  )
}
