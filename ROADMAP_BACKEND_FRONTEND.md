# Roadmap B.N.R Academy — revisi 15 fase
Branch integrasi: main; branch frontend-design khusus desain. Riwayat branch frontend dan backend dipertahankan melalui fast-forward. GitHub Pages hanya preview frontend mode demo; deployment backend produksi tetap ditunda sampai validasi database dan browser.
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
8: berita/pengumuman/galeri/media.
9: dashboard statistik operasional aktual, filter periode dan ekspor.
10: keuangan, tagihan, bukti transfer, verifikasi Owner.
11: cloud staging deployment.
12: QRIS Sandbox, webhook dan dashboard keuangan.
13: penyempurnaan frontend/integrasi dan hilangkan fallback demo saat API aktif.
14: regresi, mobile/desktop, aksesibilitas, security, UAT.
15: produksi, HTTPS, email sungguhan, backup/monitoring. Data demo dan kredensial tidak digunakan dalam produksi.
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

## v1.7.0-dev.1 — paket Fase 4–6
Berdasarkan inspeksi PostgreSQL 18.6 (23 tabel, tidak ada tabel hilang), menggunakan kolom/FK/constraint yang sudah tersedia. Tidak ada migrasi SQL baru. Owner > Akademi & Kelas: program, kelas, periode pelatih utama/asisten, periode pemain, jadwal baca, rekap absensi. Owner > Pemain > Tempatkan kelas. Pelatih > Jadwal/Absensi: kelas yang ditugaskan, buat/ubah/batalkan sesi, absensi setelah waktu selesai WIB. Pemain > Jadwal/Kehadiran: data sendiri. Periode inklusif; pindah kelas setelah hari terakhir periode lama, kelas arsip setelah relasi dan jadwal ditutup. Validasi kapasitas bersifat konservatif untuk periode terbuka, jadwal bentrok kelas/pelatih/lokasi dicegah oleh lock transaksi modul. Mode demo tetap, bagian pembayaran dan profil/foto serta dashboard agregat belum terintegrasi. Jalankan tes dan UAT lokal sebelum finalisasi. Jangan reseed, jangan mengubah .env.

CI: isolated PostgreSQL 18 fixture integration test `npm run test:academy-db` hanya dijalankan di GitHub Actions (database bnr_academy_ci kosong). Tidak dijalankan pada database bnr_academy pengguna. Penonaktifan akun pemain tidak otomatis mengakhiri periode keanggotaan; Owner dapat menutup periode terpisah sehingga riwayat tidak berubah.

## v1.7.1-dev.1 — single head coach dan desain akademi
Satu pelatih utama per kelas pada satu periode. API menolak asisten; penugasan lama asisten tidak memberi akses portal kelas/jadwal/absensi. Owner bisa menutup periode lama, tidak ada penghapusan riwayat atau migrasi wajib. Kelas dapat belum memiliki pelatih. Ringkasan kelas menghitung jumlah keanggotaan berlaku dan nama pelatih utama aktif; kelas dengan asisten lama diberi peringatan. DB masih mempertahankan constraint historis yang membolehkan nilai asisten; perubahan ini diberlakukan oleh API dan UI, bukan untuk SQL manual. Frontend desain menggunakan data fiktif terisolasi.

Preview desain: `npm run dev:design`, buka /design/akademi, klik Buka dashboard desain. Tidak perlu login asli, backend, atau Mailpit; data fiktif in-memory reset saat refresh. `npm run dev:api` tetap memakai PostgreSQL dan tidak mengaktifkan rute desain. Branch `frontend-design` hanya memuat snapshot frontend dan workflow build/test frontend. Jangan merge branch snapshot langsung ke main karena file backend sengaja tidak ada; ambil perubahan src/public melalui patch/commit pilihan.

## v1.8.0-dev.1 — penyelesaian kandidat 3D-3 dan persiapan 7–9
Urutan 15 fase disetujui. Profil API GET/PATCH /api/v1/me/profile, role allowlist, nama sinkron, biodata pemain dan pelatih, foto pribadi JPEG dikompresi server dalam users.profile_photo_jpeg (migration 003d-profile-photo.sql; tetap 23 tabel). Tanggal lahir dan gender pemain read-only demi konsistensi aturan kelas, koreksi administratif masih backlog. Foto path lama tidak dimigrasikan otomatis. API tidak fallback ke profil dummy. UAT lokal masih wajib. Skema inspeksi sebelumnya tidak mencakup assessments, announcements, announcement_reads, news, public_media. Jalankan npm run inspect:phase-789 untuk metadata read-only sebelum integrasi tabel tersebut. Keuangan/QRIS/cloud ditunda.

Fase 9 awal: GET /api/v1/me/dashboard, snapshot read-only, role-scope kelas/jadwal/absensi, periode bulan, jumlah akun/kelas saat ini, rekap kehadiran, lima jadwal berikutnya dan ekspor CSV agregat Owner. Dashboard demo lama dipertahankan. Penilaian/pengumuman/keuangan belum ditampilkan sebagai data nyata. Fase 9 belum final sebelum Fase 7–8 terintegrasi dan UAT selesai.

CI Linux: runtime sharp dipasang secara eksplisit sesuai versi lockfile Windows. Backend memerlukan migrasi profil sebelum start; tidak ada auto-migration. Jalankan `npm run inspect:phase-789 > schema-phase-789.txt` dan bagikan metadata, bukan data pengguna.

## v1.8.0-dev.2 — patch 3D-3 / 4 / 9
Fix PostgreSQL 42P08 pada profil pelatih: parameter phone (varchar) dan registration_whatsapp (text) terpisah, PATCH lisensi/kontak hanya mengubah field yang dikirim. UI pergantian pelatih utama menampilkan konfirmasi tutup periode di dekat editor; penugasan baru dimulai setelah tanggal akhir inklusif. Riwayat asisten tidak menghalangi pelatih utama, tetap tersimpan tanpa akses. Dashboard tiga role menggunakan grid responsif, diagram distribusi kehadiran dan aktivitas pekanan dari API, palet Owner. Tidak perlu migrasi tambahan jika migrasi profil sudah diterapkan. Inspeksi schema-phase-789 tetap diperlukan (file phase-456 bukan skema penilaian/berita). UAT melalui VS Code lokal masih wajib.

## v1.9.0-dev.1 — Fase 7–9 kandidat
Schema PostgreSQL 18.6 phase-789: 23 tabel, tidak perlu migrasi baru. Penilaian bulanan 1–10 (teknik/fisik/taktik/disiplin), pelatih utama aktif dengan irisan periode keanggotaan, koreksi oleh penilai asli, Owner monitoring, Pemain riwayat sendiri. Pengumuman Owner global/kelas, Pelatih kelas sendiri, baca per akun; audiens orang_tua melalui portal pemain (tidak ada akun wali). Berita draft/terbit/arsip dan publik hanya terbit; sampul JPEG/HTTPS, emoji dan warna custom tetap mode demo saja. Media gallery/home mempertahankan API PostgreSQL yang sudah ada; upload UAT lokal masih diperlukan. Dashboard ringkasan penilaian dan pengumuman aktual; seluruh role memakai palet Owner. Keuangan, staging dan QRIS ditunda. UAT, audit dependensi dan optimasi paginasi tetap backlog. Tidak mengubah branch frontend-design.

## v1.9.0-dev.2 — revisi UAT Fase 8
Migrasi wajib `server-contoh/migrations/008-announcement-duration.sql` (backup dahulu), menambah expires_at dan mengganti constraint audiens. Orang tua lama dipetakan ke pemain; data dan announcement_reads tetap disimpan, fitur baca tidak dipakai API. Pengumuman baru default 7 hari, pilihan 1/3/7/14/30 hari atau tanpa batas. Pengumuman lama tanpa expiry tetap aktif. Owner dan pengirim melihat riwayat; penerima hanya aktif, sesuai kelas dan role. Jumlah penerima saat terbit bukan konfirmasi pengiriman/baca. API berita hanya terbit/belum_terbit; status draft/arsip lama dipetakan sebagai belum_terbit tanpa mengubah data lama. Tarik publikasi mengubah ke draft, bukan menghapus. Sidebar workspace memakai token background Owner yang sama. Mode demo berita memakai dua status juga; halaman pengumuman demo lama belum diselaraskan. UAT lokal tetap diperlukan.

## Fase 10A — persiapan keuangan
Inspeksi skema read-only `npm run inspect:phase-10` diperlukan untuk fee_types, invoices, invoice_items, payment_accounts, payments. Jangan menebak kolom, enum, FK atau indeks. Halaman Keuangan Owner dan Bayar Latihan Pemain dalam mode API menampilkan status belum tersedia, bukan data browser; mode demo tetap ada dengan peringatan dan rekening contoh tidak ditampilkan untuk transfer. Tidak ada migrasi DB, tagihan aktual, upload bukti, QRIS atau cloud deployment pada tahap ini. Rencana 10B–10D di PHASE_10_CONTRACT.md. Versi backend tetap 1.9.0-dev.2 sampai implementasi backend keuangan.
