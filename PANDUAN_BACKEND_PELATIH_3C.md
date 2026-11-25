# Fase 3C — registrasi dan persetujuan Pelatih (v1.5.1)

## Lokal dahulu
Backup database dan .env secara privat; jangan reset/seed ulang. Hentikan backend.
Di DBeaver, buka database bnr_academy dan jalankan seluruh server-contoh/migrations/003c-coach.sql (transaksi, tanpa penghapusan data).
Migrasi revisi menambah 4 kolom profil, memperluas purpose auth_challenges tanpa tabel OTP baru. Jika tabel coach_registration_otp v1.5.0 sudah ada, semua baris disalin ke auth_challenges lalu tabel lama dihapus dalam transaksi; backup dahulu. Target tetap 23 tabel. Jalankan sebagai SQL script (auto-commit aktif untuk dua transaksi), jika constraint gabungan tidak dikenal hentikan dan periksa DDL.
Karena skema CREATE TABLE v1 lengkap tidak tersimpan di repository, verifikasi migrasi/kolom dan uji runtime PostgreSQL sebelum penggunaan. Pending/rejected menggunakan users.status=nonaktif dan registration_review_status=menunggu/ditolak pada profil untuk menjaga kompatibilitas autentikasi awal.
MAIL_MODE=mailpit tetap; SMTP lokal 127.0.0.1:1025, inbox 127.0.0.1:8025. Jangan aktifkan relay/forwarding, jangan gunakan alamat atau data asli. Gmail format didukung untuk UI lokal (pesan ditangkap Mailpit, bukan dikirim ke Gmail); API lokal juga menerima .test. OTP pemain tetap .test. Tidak ada layanan email produksi.
Di server-contoh jalankan npm install, npm test, npm start. Di root frontend set VITE_API_URL=http://localhost:3001 pada .env lokal, npm install, npm run dev. Jangan overwrite .env. 
## API
- POST /api/v1/auth/coach/otp/request {email} -> challenge_id, expiresIn:300, resend_after_seconds:60.
- POST /api/v1/auth/coach/register {challenge_id,email,code,nama,wa,lisensi,password,password_confirmation,peran:"pelatih"} -> akun terverifikasi menunggu, token terbatas.
- POST /api/v1/auth/coach/login {email,password} -> token normal atau terbatas setelah kredensial valid.
- GET /api/v1/auth/coach/status (Bearer) -> user/status/alasan; token terbatas dapat ditukar menjadi token normal setelah aktif.
- GET /api/v1/owner/coaches (Bearer Owner) -> coaches.
- PATCH /api/v1/owner/coaches/:id/status (Bearer Owner) {status,alasan} -> user; alasan wajib jika ditolak.
OTP 6 angka, 5 menit, 60 detik resend, maksimal 5 request/jam/email dan 5 salah/challenge. OTP HMAC; bcrypt cost 12; password 8 karakter huruf+angka, maksimal 72 byte UTF-8 (juga aktivasi pemain). Tidak ada OTP/password/hash di respons. Pembuatan akun, profil, konsumsi OTP dan audit satu transaksi. Token terbatas memakai audience dan kunci terpisah; tidak diterima oleh API normal.
## Uji manual
1. Daftar pelatih dengan Gmail fiktif, nama, WA fiktif, password 8 karakter huruf+angka dan konfirmasi, lisensi kosong.
2. Buka Mailpit, masukkan OTP. Pelatih melihat halaman menunggu; GET /api/v1/auth/me dengan token terbatas harus 401.
3. Login Owner dummy dari browser/profile terpisah. Buka Owner > Pelatih. Setujui; pelatih mendapatkan status aktif setelah polling, token normal.
4. Ulangi dengan akun fiktif lain; tolak dengan alasan. Pelatih melihat alasan, tidak memperoleh akses operasional. Setujui kembali bila diperlukan. Nonaktifkan akun aktif; API normal menolak token lama.
5. Uji OTP salah 5 kali, resend sebelum 60 detik, replay, email duplikat, password/WA invalid, akses Owner tanpa otoritas, dan regresi Fase 1–3B.
6. API mode halaman registrasi Pelatih, login Pelatih, status Pelatih dan daftar/review Owner sudah dihubungkan. Modul kelas/jadwal/absensi, halaman lain dan registrasi Pemain frontend masih prototype atau belum terintegrasi. Mode demo tetap terpisah.
## Pemeriksaan tanpa hash
SELECT u.email,u.role,u.status,c.registration_review_status,c.registration_whatsapp IS NOT NULL AS has_wa,u.email_verified_at IS NOT NULL AS verified
FROM public.users u JOIN public.coach_profiles c ON c.user_id=u.id WHERE u.role='pelatih';
SELECT target_email,attempts,consumed_at IS NOT NULL AS consumed FROM public.auth_challenges WHERE purpose='register_coach' ORDER BY created_at DESC;
Jangan tampilkan OTP, password, token atau hash pada screenshot. Sebelum produksi perlu review kebijakan retensi OTP, mail delivery/outbox, rate limit terdistribusi dan integrasi seluruh portal.

## Script pemeriksaan API lokal
Dari terminal kedua server-contoh setelah migrasi dan npm start:
```powershell
powershell -NoProfile -File .\scripts\test-coach-registration.ps1
```
Masukkan password Owner dummy dan OTP dari Mailpit. Script menggunakan .test, menguji cooldown, konfirmasi password, pendaftaran, token terbatas, replay, penolakan/persetujuan, penonaktifan/aktivasi dan otorisasi. Tidak mencetak kredensial. Akun uji dan audit tetap tersimpan.
