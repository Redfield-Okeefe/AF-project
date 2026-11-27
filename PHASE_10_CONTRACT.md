# Fase 10 — Keuangan dan Manajemen Tagihan (rancangan)
Status: 10A review source dan persiapan inspeksi; 10B–10D menunggu metadata database. Bukan kontrak API final.
## Sumber dan batasan
- branch main: Owner Keuangan memakai services/db.js; Pemain Bayar memakai nominal dan riwayat contoh. Pengaturan API belum mendukung rekening; pembayaran pendaftaran API sudah dibatasi.
- target existing: fee_types, invoices, invoice_items, payment_accounts, payments. Inspeksi metadata saja, tidak membaca baris transaksi. Pertahankan 23 tabel jika mencukupi.
- pembayaran manual lokal dengan data fiktif; cloud tahap 11 dan QRIS tahap 12. Tidak ada transfer nyata pada testing.
## 10B: tagihan dan rekening
- Owner CRUD jenis biaya dan rekening aktif (nonaktifkan tanpa menghapus riwayat). Pemain hanya baca rekening yang boleh digunakan.
- Owner membuat tagihan bulanan individu/batch atau biaya tambahan. Validasi pemain aktif dan terdaftar, nominal rupiah integer positif berasal dari server, periode WIB, jatuh tempo, rincian snapshot harga.
- Keunikan biaya bulanan berdasarkan identitas/jenis/periode yang sesuai skema; idempotensi batch dan transaksi PostgreSQL. Harga baru tidak mengubah tagihan lama.
- Status tagihan diturunkan/dikelola konsisten dengan pembayaran terverifikasi; tidak boleh mengubah status lunas langsung dari browser.
## 10C: pembayaran manual
- Pemain hanya mengirim bukti untuk tagihan sendiri. Rancangan awal pembayaran penuh, tidak menerima cicilan sebelum aturan disepakati. Nominal dari tagihan, rekening aktif, hanya satu pending per tagihan; transaksi lock/idempotensi.
- Bukti private: autentikasi/otorisasi download, batas ukuran, cek isi file (JPEG/PNG diproses ulang; PDF perlu desain validasi tersendiri), nama acak dan tidak disajikan dari public static. Strategi penyimpanan mengikuti metadata dan kebutuhan staging; jangan menyimpan bukti asli di repo atau log.
- Owner verifikasi transfer setelah rekonsiliasi manual atau catat tunai. Penolakan beralasan dan boleh kirim ulang. Verifikasi berulang tidak menggandakan penerimaan, audit tanpa menyimpan bukti/PII dalam payload audit.
- Pembatalan/koreksi transaksi final bukan sekadar toggle lunas; perlu kebijakan reversal yang disepakati, histori dipertahankan.
## 10D: frontend dan laporan
- Owner: KPI tagihan/penerimaan/sisa, filter periode, daftar tagihan, aksi buat tagihan, antrean verifikasi, rekening, jenis biaya, CSV aktual (escape spreadsheet formula injection).
- Pemain: daftar tagihan pribadi dan riwayat, pilih transfer, kirim bukti fiktif, status dan alasan penolakan. Pelatih: tidak ada akses.
- Palet Owner, light/dark, responsif. Mode API tidak fallback ke localStorage. Mode demo diberi label.
- Laporan membedakan periode tagihan dengan tanggal pembayaran; agregat hanya transaksi terverifikasi, bukan bukti pending. Jangan tampilkan 0 sebagai data aktual saat gagal memuat.
## Skenario pengujian wajib
- duplikat batch, dua request bersamaan, jumlah salah/negatif, akses tagihan orang lain, coach denied, akun nonaktif dan revoked token.
- upload tipe/ukuran salah, bukti tidak dapat diakses publik, pending ganda, tolak lalu kirim ulang, verifikasi dua kali, audit rollback.
- perubahan harga tidak mengubah tagihan lama, rekening nonaktif tidak bisa dipilih, hasil CSV dan agregat konsisten.
- UAT tiga portal, mobile dan desktop. PostgreSQL fixture terisolasi; tidak reset data lokal pengguna.
## Gate sebelum mulai SQL/API
Jalankan `npm run inspect:phase-10` dari server-contoh dan periksa hasil columns/constraints/indexes/enums/triggers. Finalisasi status, PK/FK, tipe uang, periode dan storage bukti berdasarkan hasil. Tidak ada migrasi otomatis.

## Implementasi kandidat 1.10.0-dev.1
Inspeksi selesai. SQL/API memakai status dan indeks asli. Proof JPEG private bytea; legacy proof_file_path tidak dibuka otomatis. Maksimum unggah JPG/PNG 2 MiB dan 24 MP, hasil <=1 MiB, tanpa crop/metadata. Tarif positif maks Rp 1 miliar, batch maks 500 pemain. Rekening bank tidak diedit nomor/pemilik, hanya buat dan toggle aktif untuk menjaga histori. Owner verifikasi dengan tanggal pembayaran dan referensi mutasi unik; pembayaran tunai dicatat Owner tanpa upload. Tagihan tambahan memakai request UUID, tagihan bulanan deduplikasi per pemain/bulan. Data lama parsial tidak menerima pembayaran baru. Laporan periode tagihan, penerimaan menurut paid_at WIB, CSV escape formula. Belum ada pembayaran pendaftaran publik, QRIS/e-wallet atau cicilan. UAT lokal dan backup wajib; review data lama/rekonsiliasi sebelum produksi.
