import OwnerPageHeading from '../../components/OwnerPageHeading.jsx'
export default function FinancePending({owner=false}){
 return <div className="view active adm owner-admin-page"><OwnerPageHeading icon="wallet" title={owner?'Keuangan akademi':'Tagihan latihan'} description="Integrasi keuangan PostgreSQL sedang disiapkan."/><section className="card academy-form" role="status"><h3>Fitur pembayaran belum tersedia</h3><p className="mut">{owner?'Pembuatan tagihan, pengaturan rekening, dan verifikasi pembayaran akan tersedia setelah integrasi Fase 10.':'Tagihan dan riwayat pembayaran aktual belum dapat diakses. Pengiriman bukti belum diaktifkan.'}</p><p>Jangan melakukan transfer berdasarkan data contoh atau menganggap tagihan sudah lunas.</p></section></div>
}
