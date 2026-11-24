# B.N.R Academy — Fase 3B: Aktivasi akun Pemain
Backend 1.4.0. PostgreSQL lokal bnr_academy, 23 tabel yang sama. Tidak ada migrasi, dependensi baru, perubahan frontend, atau seed akun ulang.

## Aturan
Pemain yang diterima Owner memperoleh undangan Fase 3A. OTP diverifikasi untuk email login unik. Aktivasi hanya menerima undangan dan proof yang terikat pada challenge, registrasi dan email yang sama. Proof lama ditolak bila OTP baru diterbitkan; bukti verifikasi sukses diperiksa lewat audit. Password minimal 12 karakter, maksimal 72 byte UTF-8, konfirmasi sama, bcrypt cost 12. Role/status/nama/ID ditentukan server, bukan klien. Email kontak keluarga tidak diubah. Satu akun per pemain. Akun, players.user_id, konsumsi undangan dan audit disimpan dalam transaksi yang sama. Login tetap memakai endpoint fase 1. Tidak otomatis login. Email yang sudah digunakan oleh role mana pun ditolak 409. Fase lokal tetap Mailpit dan alamat .test; email produksi belum tersedia.

## Sinkronisasi dan menjalankan
Hentikan backend lama Ctrl+C; Mailpit boleh tetap berjalan. Backup lokal .env, database dan file media secara privat. Dari root AF-project:
```powershell
git status
git fetch origin
git --no-pager log --left-right --oneline HEAD...origin/feature/ui-modern-dark-2026
```
Jika working tree bersih, gunakan git merge --ff-only origin/feature/ui-modern-dark-2026 bila tidak divergen. Jika divergen, buat backup branch unik, periksa perubahan, lalu git merge --no-ff origin/feature/ui-modern-dark-2026 --no-edit. Jangan reset paksa. Jangan push riwayat lokal sebelum audit kredensial. Pastikan .env tidak dilacak. Pertahankan DATABASE_URL, JWT_SECRET dan MAIL_MODE=mailpit sebelumnya.
```powershell
cd server-contoh
npm install
npm test
npm start
```
Mailpit port 1025 dan UI http://127.0.0.1:8025 tetap aktif. PostgreSQL aktif.
Terminal kedua di server-contoh:
```powershell
powershell -NoProfile -File .\scripts\test-player-activation.ps1
```
Masukkan password dummy Owner, kode undangan dan OTP A/B/C sesuai Mailpit. Dua pemain fiktif A/B dengan email kontak sama akan mendapat akun login berbeda; C menguji email login yang sudah dipakai oleh pemain@bnr.test dan harus ditolak. Password akun fiktif dibuat acak dalam memori, tidak dicetak atau disimpan. Data uji dan audit tetap ada. Jangan gunakan untuk data produksi. Jika mengulang terlalu cepat, rate limiter dapat menolak. Script regresi test-activation.ps1 kini mengharapkan 400 untuk aktivasi body kosong, bukan 501.

## API
POST /api/v1/auth/player/activate
```json
{
  "invitation_token": "kode-dari-email",
  "verification_token": "proof-dari-otp-verify",
  "password": "contoh-password-yang-panjang",
  "password_confirmation": "contoh-password-yang-panjang"
}
```
201: account_created true, user (tanpa hash), player (id, student_code). 400 input/password/identitas tidak valid; 401 proof invalid/expired; 409 undangan tidak valid/terpakai, proof tidak cocok, email duplikat; 429 rate limit; 503 mail mode disabled. Gunakan POST /api/v1/auth/login dengan email terverifikasi, password, role pemain. Aktivasi akun tidak mengembalikan JWT login.

## Verifikasi database
```sql
SELECT p.full_name,p.student_code,p.contact_email,p.user_id,
       u.email AS login_email,u.role,u.status AS account_status,
       u.email_verified_at IS NOT NULL AS email_verified,
       (u.password_hash LIKE '$2%') AS bcrypt_hash,
       r.status AS registration_status,
       i.used_at IS NOT NULL AS invitation_used
FROM public.players p
JOIN public.registrations r ON r.player_id=p.id
LEFT JOIN public.users u ON u.id=p.user_id
LEFT JOIN public.account_activation_tokens i ON i.registration_id=r.id
WHERE p.full_name LIKE 'Uji Fase3B %'
ORDER BY p.created_at DESC;
```
A/B: contact_email sama, login_email berbeda, user_id terisi, role pemain, status aktif, verified dan invitation_used true. C: user_id NULL, undangan belum terpakai. Tidak tampilkan hash/password/token asli.
```sql
SELECT action,entity_type,entity_id,happened_at
FROM public.audit_logs
WHERE action='activation.player.complete'
ORDER BY happened_at DESC;
```
Fase 3C: pendaftaran, verifikasi email dan persetujuan Pelatih. Belum diimplementasikan. Frontend tetap tidak diubah.
