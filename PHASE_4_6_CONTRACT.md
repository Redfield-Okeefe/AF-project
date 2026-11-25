# Paket kerja Fase 4–6 (kontrak kandidat; belum seluruhnya terimplementasi)
Urutan mengikuti ROADMAP_BACKEND_FRONTEND.md. Satu branch main; 23 tabel tetap; tanpa MFA. Profil/foto nyata (3D) masih backlog.
## Fase 4 — kelas dan keanggotaan
Owner membuat/ubah/arsip kelas, pilih program aktif, menugaskan pelatih aktif, menempatkan pemain aktif yang sudah diterima. Pelatih hanya melihat kelas yang ditugaskan; pemain hanya melihat kelasnya. Backend validasi kapasitas dan rentang usia sesuai kebijakan program, tidak ada duplikasi keanggotaan aktif, relasi dan riwayat dipertahankan. Kebijakan kandidat: Owner mengelola kelas dan penugasan, Pelatih mengatur jadwal/absensi kelasnya.
API kandidat: GET/POST /api/v1/owner/classes; PATCH /api/v1/owner/classes/:id; POST /api/v1/owner/classes/:id/coaches; POST /api/v1/owner/classes/:id/players; GET /api/v1/me/classes. Bentuk payload dan strategi penutupan relasi mengikuti DDL aktual.
UI: Owner > Pengaturan (kelas), Owner > Pemain (penempatan), Pelatih > Jadwal/Absensi (kelas miliknya), Pemain > Jadwal. Fitur status pemain hotfix tersedia; kelas belum dihubungkan.
## Fase 5 — jadwal
Pelatih dapat membuat, mengubah, membatalkan sesi hanya untuk kelas yang ditugaskan. Owner dapat membaca semua dan melakukan kontrol administratif. Pemain hanya membaca jadwal kelas sendiri. Validasi tanggal/waktu Jakarta, mulai sebelum selesai, kelas dan pelatih aktif, konflik interval kelas/pelatih (sesi yang bersinggungan tepat di batas boleh), perubahan/pembatalan diaudit. Sesi dengan absensi tidak boleh dihapus fisik.
API kandidat: GET /api/v1/me/sessions; POST /api/v1/coach/sessions; PATCH /api/v1/coach/sessions/:id; POST /api/v1/coach/sessions/:id/cancel; GET /api/v1/owner/sessions.
## Fase 6 — absensi dan rekap
Pelatih hanya mencatat untuk sesi kelas yang ditugaskan dan peserta sah pada tanggal sesi. Empat status UI Hadir/Izin/Sakit/Alpa; mapping nilai DB setelah inspeksi. Simpan batch atomik, unik sesi+pemain, idempotensi pembaruan, tidak mencatat sesi dibatalkan/masa depan, audit perubahan. Owner melihat rekap semua, pemain hanya rekap sendiri. Rekap persentase hadir = hadir / jumlah sesi yang benar-benar tercatat, tampilkan belum dicatat terpisah.
API kandidat: GET /api/v1/coach/sessions/:id/attendance; PUT /api/v1/coach/sessions/:id/attendance; GET /api/v1/me/attendance; GET /api/v1/owner/attendance.
## Gerbang database
Sebelum implementasi repository/mutasi: jalankan npm run inspect:phase-456 dari server-contoh. Cocokkan nama kolom, tipe, FK, unique/check, enum, indeks, trigger dan aturan waktu. Script hanya membaca katalog, tidak membaca baris bisnis atau kredensial. Jangan menjalankan DDL spekulatif atau membuat tabel duplikat.
## Acceptance test lintas fase
- Owner aktif/nonaktif, token lama gagal setelah aktif ulang, calon tidak dapat diaktifkan paksa, pelatih/pemain dilarang mengubah status.
- Owner membuat kelas, menugaskan pelatih, menempatkan pemain; tolak program tidak aktif, usia/kapasitas tidak cocok, assignment duplikat/akun nonaktif.
- Pelatih A tidak bisa membaca/mengubah kelas/sesi Pelatih B; pemain hanya jadwal kelas sendiri.
- Jadwal valid disimpan; tabrakan kelas/pelatih ditolak secara atomik, sesi berabsensi tidak dihapus.
- Absensi H/I/S/A, peserta asing ditolak, sesi dibatalkan/masa depan ditolak, tidak ada duplikasi, perubahan diaudit, rekap benar.
- Mode demo Pages tetap berfungsi; UI API tidak boleh menyimpan ke localStorage seolah-olah sudah tersimpan ke DB.
- Regression npm test, npm run test:otp, build; uji PostgreSQL nyata dan browser. Tidak klaim fase selesai sebelum lulus.

## Implementasi kandidat v1.7.0-dev.1
Skema aktual telah diterima. API memakai GET /api/v1/me/classes, /me/sessions, /me/attendance untuk ketiga role; owner endpoints /owner/programs, /owner/classes, /owner/classes/:id/members, /coaches, /players dan PATCH /:member/end; PUT kelas/program/sesi untuk perubahan penuh, PATCH status untuk arsip. Absensi PUT /coach/sessions/:id/attendance. Tanggal akhir inklusif; relasi baru mulai setelah tanggal akhir relasi lama. Sesi tidak dihapus. Kelas arsip diblokir jika relasi/jadwal masih terbuka. Absensi disimpan setelah jam selesai, satu batch lengkap. Pengujian PostgreSQL lokal dan browser masih wajib.

## Revisi kebijakan v1.7.1-dev.1
Penugasan baru hanya `utama` (satu pelatih per kelas per periode), tidak ada asisten. Penugasan asisten historis dipertahankan namun tidak memberi akses. Owner menutup periode lama sebelum penugasan baru. Kelas boleh belum memiliki pelatih. Tidak ada perubahan tabel/migrasi wajib.
