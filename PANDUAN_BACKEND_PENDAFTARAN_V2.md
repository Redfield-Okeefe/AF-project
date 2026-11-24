# B.N.R Academy — Backend Fase 2 (Pendaftaran Pemain)

Backend 1.2.0, Node.js 22+, PostgreSQL lokal bnr_academy, schema v1.0 (23 tabel).
Fase 1 (JWT, bcrypt, tiga role, Gallery/Beranda) dipertahankan.
Tidak mengubah React, database schema, atau .env. Jangan aktifkan VITE_API_URL sekarang.

## Cakupan
- Program aktif, pendaftaran publik, daftar/detail pendaftar dan pemain khusus Owner.
- Submit: players (calon) + registrations (menunggu) + audit dalam satu transaksi.
- Approve: registrasi diterima, pemain aktif, student_code terisi, user_id tetap NULL.
- Reject: registrasi ditolak, alasan tersimpan, biodata calon dipertahankan.
- Tidak membuat akun, undangan, OTP, kelas, pembayaran atau tagihan. Endpoint legacy /pendaftaran masih 501. Aktivasi login dan pendaftaran Pelatih dikerjakan Fase 3.

## Ambil update
Hentikan npm start lama (Ctrl+C). Backup perubahan lokal, .env, media dan database development secara privat.
Dari root AF-project, pastikan branch benar dan working tree bersih:
```powershell
git status
git branch --show-current
git pull --ff-only origin feature/ui-modern-dark-2026
cd server-contoh
npm install
npm test
```
Jika pull ditolak, jangan reset paksa. Tidak ada dependency baru; jangan timpa .env atau impor ulang schema.
Jangan jalankan seed:dummy lagi jika tiga akun sudah ada.

## Jalankan program demo dan server
```powershell
npm run seed:programs
npm start
```
Seed program hanya untuk database development lokal. Membuat satu program FIKTIF usia 6–17 tanpa tarif; tidak menimpa data lama. Bisa diulang jika program demo tetap sesuai.
Cek http://127.0.0.1:3001/api/v1/health dan http://127.0.0.1:3001/api/v1/programs.

Terminal kedua di server-contoh:
```powershell
powershell -NoProfile -File .\scripts\test-registration.ps1
```
Masukkan password dummy Owner, Pelatih dan Pemain sebelumnya. Password tersembunyi dan token tidak dicetak. Untuk port lain tambahkan -Port 3002 (contoh).
Setiap run membuat dua calon fiktif baru: satu diterima, satu ditolak. Data dan audit sengaja dipertahankan untuk pemeriksaan DBeaver. Jangan jalankan di produksi.
Script memeriksa input, duplikasi, kontak keluarga sama untuk pemain berbeda, hak akses, keputusan, pengulangan keputusan, status akun, serta endpoint media dan auth lama.
Uji regresi lengkap Fase 1: test-local.ps1. Bila terkena rate limit login 429, tunggu jendelanya selesai.

## Verifikasi di DBeaver
```sql
SELECT r.registration_number,p.full_name,r.status AS registration_status,
       p.status AS player_status,p.student_code,p.user_id,r.review_note
FROM public.registrations r JOIN public.players p ON p.id=r.player_id
WHERE p.full_name LIKE 'Uji Fase2 %'
ORDER BY r.submitted_at DESC;

SELECT a.action,a.actor_user_id,a.entity_id,a.happened_at
FROM public.audit_logs a
JOIN public.registrations r ON a.entity_type='registrations' AND a.entity_id=r.id
JOIN public.players p ON p.id=r.player_id
WHERE p.full_name LIKE 'Uji Fase2 %'
ORDER BY a.happened_at DESC;
```
Target: diterima -> aktif, student_code terisi, user_id NULL; ditolak -> calon, user_id NULL, alasan ada. Audit submit (actor NULL), approve/reject (actor Owner).
Restart backend lalu login Owner dan baca daftar pendaftar kembali untuk uji persistensi.

## Kontrak API
| Method | Endpoint | Otoritas |
|---|---|---|
| GET | /api/v1/programs | Publik |
| POST | /api/v1/registrations | Publik |
| GET | /api/v1/owner/registrations | Owner |
| GET | /api/v1/owner/registrations/:id | Owner |
| POST | /api/v1/owner/registrations/:id/approve | Owner |
| POST | /api/v1/owner/registrations/:id/reject | Owner |
| GET | /api/v1/owner/players | Owner |
| GET | /api/v1/owner/players/:id | Owner |

Body JSON pendaftaran (ganti program_id dengan UUID program aktif):
```json
{
  "full_name": "Murid Uji Fiktif",
  "gender": "Laki-laki",
  "birth_date": "2016-01-01",
  "birth_place": "Kota Demo",
  "school_name": "Sekolah Fiktif",
  "guardian_name": "Wali Demo",
  "contact_email": "murid@example.test",
  "contact_phone": "081234567890",
  "address": "Alamat fiktif",
  "jersey_size": "M",
  "program_id": "GANTI_DENGAN_UUID_PROGRAM",
  "notes": ""
}
```
201 mengembalikan receipt (id, registration_number, status, submitted_at), bukan biodata. Tidak ada public GET status; nomor pendaftaran bukan token.
API Owner memakai Authorization: Bearer JWT valid. List mendukung limit 1–100, default 25; offset default 0; status registration menunggu/diterima/ditolak/dibatalkan, status pemain calon/aktif/nonaktif. Approve boleh body {}; reject wajib review_note 3–1000 karakter.
HTTP 400 input invalid, 401 belum login, 403 role salah, 404 tidak ditemukan, 409 konflik/duplikasi, 429 rate limiting.

## Keputusan desain dan batasan
- Usia dihitung dari tanggal lahir di Asia/Jakarta; rentang usia mengikuti program. WhatsApp format Indonesia (08 atau 62/+62).
- Nama wali satu kolom players. Email kontak boleh sama untuk keluarga; email akun unik.
- Dugaan duplikat: nama normalisasi + tanggal lahir, diserialisasi advisory lock. Tidak otomatis menggabungkan/mengubah biodata lama. Nama sama/tanggal lahir sama termasuk pengajuan ditolak memerlukan tinjauan manual; ejaan berbeda dapat lolos. Pengajuan ulang belum tersedia.
- Review transaksi mengunci pendaftar/pemain, memeriksa Owner aktif, status menunggu, program aktif ketika menerima, dan audit. Tidak mengirim email. Persetujuan bukan bukti pelunasan.
- Data pribadi hanya untuk Owner, tidak ditampilkan di receipt publik. Sebelum produksi perlu verifikasi identitas, persetujuan wali, retensi dan pengamanan data anak.
- 21 skenario logika diperiksa dalam JavaScript dengan database mock; npm test asli, PostgreSQL, HTTP dan PowerShell belum dijalankan di lingkungan laptop. Belum siap produksi.
