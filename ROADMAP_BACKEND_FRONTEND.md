# Roadmap B.N.R Academy — satu branch development
Branch tunggal development: main. Riwayat branch frontend dan backend dipertahankan melalui fast-forward. GitHub Pages hanya preview frontend mode demo; deployment backend produksi tetap ditunda sampai validasi database dan browser.
Tidak ada MFA/2FA; login email/password, OTP registrasi/aktivasi/reset saja.
## Status kandidat
- v1.5.1: OTP pelatih pindah ke auth_challenges (purpose register_coach); pemain tetap activate_player. Logika bisnis keduanya tetap terpisah.
- v1.6.0-dev.1: lupa/reset password, ubah password, logout semua sesi, session_version, keamanan akun. Reset OTP dan password baru diproses atomik; tidak mengubah status atau role. UI memakai CodeSlots dan class tema lama, menu ubah password tambahan; demo tetap berfungsi, fungsi password API hanya saat VITE_API_URL terisi.
- Belum selesai: integrasi profil/foto tiga role, pemetaan registrasi/aktivasi pemain ke API dan OTP pemain Gmail lokal, status/daftar pemain Owner, browser/DB end-to-end. Jangan klaim Fase 3D final sebelum ini selesai.
## Urutan pengembangan frontend
3C: pertahankan formulir registrasi; tambahkan input undangan aktivasi pemain dan aksi undangan Owner. OTP terpusat; persetujuan pelatih tetap.
3D: Lupa Password untuk tiga login, halaman reset, Ubah Password dari sidebar, profil/biodata/foto riil, status akun, penanganan token kedaluwarsa. Email tetap read-only, tidak ada MFA. Logout membatalkan semua sesi (tanpa tabel sesi baru).
4: hubungkan daftar pemain/kelas, detail/filter, penempatan pemain dan penugasan pelatih.
5: jadwal, validasi tabrakan sesi, perubahan/pembatalan.
6: absensi dan rekap.
7: penilaian dan grafik perkembangan.
8: tagihan, bukti transfer, status dan verifikasi Owner.
9: berita/pengumuman/galeri/media.
10: dashboard statistik aktual, filter periode dan ekspor.
11: hilangkan fallback demo saat API aktif, loading/empty/error states.
12: regresi, mobile/desktop, aksesibilitas, security, UAT.
13: produksi, HTTPS, email sungguhan, backup/monitoring. Data demo dan kredensial tidak digunakan dalam produksi.
## Instalasi kandidat
Backup DB dan .env lokal. Jangan reset paksa. git status; git fetch origin; git switch main; git merge --ff-only origin/main.
Jalankan revisi server-contoh/migrations/003c-coach.sql lalu 003d-account-security.sql di DBeaver (SQL script, auto-commit aktif). Jika ada constraint gabungan atau tipe domain tak dikenal, hentikan dan periksa DDL; schema v1 penuh belum ada di repo. Jika tabel OTP lama ada, migration salin semua baris lalu drop tabel lama tanpa CASCADE di transaksi; backup wajib.
Backend npm install, npm test, npm start. Pertahankan JWT_SECRET dan MAIL_MODE=mailpit. Frontend .env VITE_API_URL=http://localhost:3001; npm install; npm run dev.
Semua JWT sebelum session_version ditambahkan menjadi tidak valid. Login ulang. Logout mengakhiri seluruh sesi, termasuk sesi terbatas pelatih. Reset password hanya email verified, tidak otomatis mengaktifkan akun. Password baru minimal 8 huruf+angka, 72 byte maksimum; password lama yang sudah ada tetap dapat dipakai.
Mailpit hanya localhost, tanpa forwarding/relay. Gunakan data fiktif. Pengiriman email produksi belum tersedia. Respons lupa password generik; waktu SMTP masih bisa berbeda (hardening produksi diperlukan).

## v1.6.0-dev.2 — integrasi OTP browser
Jalankan `npm run dev:api` di folder root; mode Vite lokal memakai http://127.0.0.1:3001 tanpa mengedit .env. Backend harus berjalan dan Mailpit lokal tanpa relay/forwarding. Frontend localhost:5173. Gmail fiktif atau .test diterima pada development. Pemain: pilih program PostgreSQL, submit pendaftaran, Owner > Pemain > Terima > Kirim undangan, salin kode undangan dari Mailpit, isi Buat Akun dan OTP, lalu login normal. Pembayaran API belum terintegrasi; jangan transfer ke rekening demo. Mode demo publik tetap sama. Pelatih: form → OTP → review Owner. Tidak ada migrasi baru/MFA. Profil/foto, kelas, status pemain penuh dan E2E browser masih perlu integrasi/uji. Jangan kirim screenshot OTP atau kredensial.

## v1.6.1-dev.1 — hotfix status pemain & persiapan Fase 4–6
Owner mode API memiliki tab Daftar pemain dan Pendaftaran & undangan. PATCH /api/v1/owner/players/:id/status mengubah status pemain dan akun terhubung secara atomik, mencabut JWT melalui session_version, menutup undangan lama ketika nonaktif, mempertahankan biodata/pendaftaran, serta audit. Calon harus diputuskan melalui pendaftaran, bukan endpoint status. Pengujian lokal diperlukan. Tidak ada migrasi baru.
Fase 4 (kelas/penugasan/penempatan), 5 (jadwal), 6 (absensi/rekap) mengikuti urutan repo. DDL lengkap tabel belum tersedia; jalankan `npm run inspect:phase-456` untuk keluaran metadata read-only sebelum mengikat API dan UI ke kolom/FK/constraint aktual. Profil/foto 3D yang tertunda tetap backlog, tidak dinyatakan selesai. Lihat PHASE_4_6_CONTRACT.md.
