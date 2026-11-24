# B.N.R Futsal Academy — Backend autentikasi fase 1

Backend v1.1 menggunakan schema PostgreSQL v1 (23 tabel) yang sudah diimpor ke `bnr_academy` dan Node.js 22+. Frontend `src/` tidak berubah. Fase ini untuk development lokal, bukan produksi.

## 1. Pemasangan di Windows / VS Code

Jika sudah memiliki project, hentikan server (Ctrl+C), backup folder `server-contoh` secara privat di luar repository, dan periksa `git status`. Jika ada perubahan lokal, amankan terlebih dahulu; jangan paksa reset atau menimpa file rahasia. Pada branch `feature/ui-modern-dark-2026` dengan working tree bersih, jalankan dari root AF-project:

```powershell
git pull --ff-only origin feature/ui-modern-dark-2026
cd server-contoh
node -v
npm install
```

Jika memakai paket ZIP, merge folder server-contoh dengan folder yang sudah ada. Jangan hapus .env, cek-db.mjs, media-uploads, atau file SQL. Jangan unggah backup, file rahasia, atau data pemain.

Server.js baru menggantikan autentikasi berbasis Map. Media.js mempertahankan kontrak API, tabel, format dan lokasi foto lama, memakai shared pool serta middleware role baru. Endpoint OTP/profil lama belum dimigrasikan. Node.js 22+ diperlukan. Periksa npm audit secara terpisah; jangan menjalankan npm audit fix --force tanpa review.

## 2. Konfigurasi .env yang sudah ada

Jangan salin ulang .env.example menimpa konfigurasi yang berhasil. Contoh berikut hanya template:

```dotenv
PORT=3001
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://GANTI_USER:GANTI_PASSWORD@127.0.0.1:5432/bnr_academy
JWT_SECRET=GANTI_DENGAN_SECRET_ACAK
```

Pertahankan DATABASE_URL yang sudah berhasil pada cek-db.mjs. URL-encode password jika perlu. Buat JWT secret baru dengan:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Tempel hasil acak secara lokal pada JWT_SECRET. Gmail App Password dan ADMIN_EMAILS tidak digunakan pada fase ini. Server hanya listen di 127.0.0.1; jangan expose ke internet. Dari root repository, periksa `git ls-files server-contoh/.env` (harus kosong) dan `git check-ignore -v server-contoh/.env` (harus menunjukkan aturan ignore). Jangan commit kredensial, node_modules, foto, atau data asli.

## 3. Buat tiga dummy (sekali saja)

Pastikan database merupakan database development. Seed menolak host nonlokal, NODE_ENV=production, dan nama database selain bnr_academy.

```powershell
npm run seed:dummy
```

Script membuat owner@bnr.test, pelatih@bnr.test, pemain@bnr.test dengan password acak berbeda, hash bcrypt cost 12, status aktif dan email_verified_at. Pelatih memiliki coach_profiles; Pemain memiliki players, program dummy berstatus arsip dan registrations diterima dengan Owner dummy sebagai reviewer. Tidak ada email/OTP yang dikirim. Simpan password yang dicetak sekali secara privat. Jangan screenshot atau commit password. Seed berjalan dalam satu transaksi. Jika salah satu email sudah ada, script berhenti tanpa menimpa akun.

Verifikasi di DBeaver:

```sql
SELECT full_name,email,role,status,email_verified_at IS NOT NULL AS verified
FROM public.users WHERE email IN ('owner@bnr.test','pelatih@bnr.test','pemain@bnr.test') ORDER BY role;
SELECT p.student_code,p.full_name,p.guardian_name,p.status,r.status AS registration_status
FROM public.players p JOIN public.registrations r ON r.player_id=p.id
WHERE p.student_code='DEMO-AUTH-001';
```

## 4. Jalankan backend

```powershell
npm start
```

Buka http://127.0.0.1:3001/api/v1/health. Target: `{"ok":true,"database":"bnr_academy","status":"ready"}`. Jika port dipakai, hentikan server lama atau ubah PORT dan URL uji. Jika JWT_SECRET ditolak, buat secret acak baru. Jika DB gagal, periksa koneksi PostgreSQL.

## 5. Pengujian

Terminal kedua di server-contoh:

```powershell
npm test
```

Unit test menggunakan repository tiruan, tidak menyentuh database. Untuk uji API nyata setelah server berjalan dan seed berhasil:

```powershell
powershell -NoProfile -File .\scripts\test-local.ps1
```

Script meminta password dummy secara tersembunyi dan menguji login, role, endpoint media publik, penolakan upload non-Owner serta request upload Owner tanpa foto (400). Script tidak mengunggah/menghapus foto. Login mencatat audit_logs dan last_login_at. Jangan bagikan JWT/password. Jika kebijakan PowerShell memblokir script, periksa script lalu jalankan pengujian manual dengan Postman. POST /api/v1/auth/login menggunakan email, password, role; GET /api/v1/auth/me memakai Authorization: Bearer <token>. Uji akses Owner dengan token Pemain (403). Restart backend lalu login ulang untuk memeriksa persistensi akun.

## 6. Endpoint tersedia

| Method | Endpoint | Aturan |
|---|---|---|
| GET | /api/v1/health | Pemeriksaan database lokal |
| POST | /api/v1/auth/login | email, password, role dicocokkan dengan database |
| POST | /login | Adapter frontend lama: player -> pemain; response player |
| GET | /api/v1/auth/me | JWT valid dan akun aktif |
| GET | /api/v1/auth/check/owner, /pelatih, /pemain (prefix sama) | Role yang sesuai |
| GET | /media/gallery, /media/home, /media/files/:filename | Publik, lokal |
| POST | /media/gallery | Owner, multipart photo + title |
| DELETE | /media/gallery/:id | Owner |
| PUT | /media/home | Owner, multipart photo/title/description |
| DELETE | /media/home | Owner |

JWT HS256 berlaku 30 menit; issuer/audience diverifikasi; token tidak berisi password. Token demo lama ditolak. Status dan role diperiksa ulang di database. Belum ada pencabutan token per sesi atau refresh token. Logout server, OTP, registrasi, aktivasi riil, pembayaran, dan profil belum selesai (501/404). **Jangan aktifkan VITE_API_URL untuk seluruh frontend sekarang.** Login lama kompatibel hanya pada format request/response. Sebelum produksi, siapkan DB role terbatas, HTTPS, lifecycle sesi, perlindungan data anak dan backup database beserta file media.

## 7. Batas pengujian

Pemeriksaan sintaks JavaScript telah dilakukan pada paket sumber. Pengujian npm, seed, API runtime, dan upload aktual harus dijalankan dengan database lokal setelah instalasi dependensi. Commit GitHub bukan bukti backend sudah berjalan atau siap produksi. GitHub Pages tetap hanya frontend.
