# B.N.R Academy — Fase 3A: Undangan aktivasi dan OTP lokal

Backend 1.3.0, schema PostgreSQL v1 (23 tabel), Node.js 22+. Fase 1–2 dipertahankan. Tidak perlu migrasi SQL, perubahan frontend, atau seed akun dummy ulang.

## 1. Instal Mailpit (Windows)

Unduh binary Windows amd64 dari https://github.com/axllent/mailpit/releases/latest (pilih mailpit-windows-amd64.zip).
Ekstrak mailpit.exe di folder privat di luar AF-project, misalnya Downloads\\mailpit. Buka terminal di folder itu:
```powershell
.\mailpit.exe --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025
```
Biarkan terminal ini berjalan. Buka http://127.0.0.1:8025. Jangan gunakan SMTP relay/forwarding, jangan membuka port Mailpit ke LAN/internet. Mailpit menyimpan email uji (termasuk kode asli) pada inbox lokal; hapus pesan setelah pengujian. Gunakan data fiktif saja.
Dokumentasi: https://mailpit.axllent.org/docs/install/ dan https://mailpit.axllent.org/docs/configuration/runtime-options/.

## 2. Sinkronisasi project
Hentikan backend lama (Ctrl+C), backup folder lokal/DB/.env secara privat.
Dari root AF-project:
```powershell
git status
git branch --show-current
git fetch origin
git log --left-right --oneline HEAD...origin/feature/ui-modern-dark-2026
git merge --ff-only origin/feature/ui-modern-dark-2026
```
Jika branch divergen, jangan reset/force push. Buat backup branch dan review diff terlebih dahulu; minta bantuan jika konflik. Jangan kirim .env atau password.
```powershell
cd server-contoh
npm install
npm test
```
Tidak ada dependency baru; Nodemailer sudah terpasang sejak fase 1. Pastikan test fase 1, 2 dan 3A lulus.

## 3. Konfigurasi
Pertahankan .env yang sudah bekerja. Tambahkan atau ubah hanya baris:
```dotenv
MAIL_MODE=mailpit
```
Default disabled: API undangan/OTP memberi 503 tanpa mengganggu login/pendaftaran. Mode mailpit hanya untuk development, alamat .test, server SMTP tetap 127.0.0.1:1025. Tidak memerlukan Gmail, App Password, akun SMTP atau API key tambahan. Jangan mengubah JWT_SECRET saat ada OTP/proof aktif karena hash HMAC dan bukti verifikasi akan menjadi tidak valid.
```powershell
npm start
```
Cek http://127.0.0.1:3001/api/v1/health.

## 4. Uji dari terminal kedua
Pastikan program dummy Fase 2 tersedia (jika belum: npm run seed:programs).
```powershell
powershell -NoProfile -File .\scripts\test-activation.ps1
```
Masukkan password dummy Owner, Pelatih, Pemain. Script membuat tiga pendaftaran fiktif: A/B diterima, C ditolak. A/B menggunakan satu email kontak keluarga. Owner membuat dua undangan berbeda. Salin hanya kode undangan yang cocok dengan nomor registrasi yang diminta dari inbox Mailpit, lalu OTP untuk alamat login A dan B yang ditunjukkan. Input disembunyikan, jangan bagikan kode/token. OTP A salah sekali lalu benar, ditolak saat replay, proof tidak dapat dipakai sebagai JWT login. OTP B salah lima kali lalu kode benar tetap ditolak. Script sengaja tidak menciptakan akun dan mempertahankan data uji/audit. Jalankan sekali dahulu; rate limiter dapat menolak jika pengujian diulang terlalu cepat.
Jika server SMTP tidak berjalan, undangan/OTP mengembalikan 503 dan transaksi rollback. Setelah Mailpit aktif, ulangi uji dengan data dummy baru.
Uji regresi: test-local.ps1 (Fase 1) dan test-registration.ps1 (Fase 2) pada kesempatan terpisah agar tidak terkena rate limit.

## 5. API
| Method | Endpoint | Body / otoritas |
|---|---|---|
| POST | /api/v1/owner/registrations/:id/invite | JWT Owner; tidak perlu body |
| POST | /api/v1/auth/otp/request | purpose, invitation_token, email |
| POST | /api/v1/auth/otp/verify | purpose, invitation_token, email, challenge_id, code |

purpose selalu activate_player. Invitation_token adalah 43 karakter yang dikirim ke contact_email pendaftar; tidak terdapat pada JSON hasil invite. Request OTP menggunakan email login yang dipilih (.test). Verify menggunakan challenge_id dari respons request dan code sebagai string 6 digit (termasuk nol awal). Jangan menaruh token/OTP di URL. Respons sukses verifikasi berisi verification_token dengan masa berlaku 10 menit (bukan JWT login), account_created false. Aktivasi akun, registrasi Pelatih, OTP reset password, OTP legacy, logout dan integrasi frontend belum dibuat pada 3A; endpoint tertunda tetap 501.

## 6. Verifikasi DBeaver (tidak menampilkan hash/kode)
```sql
SELECT p.full_name,r.registration_number,r.status,
       i.target_email,i.created_at,i.expires_at,i.used_at IS NOT NULL AS invalidated
FROM public.account_activation_tokens i
JOIN public.registrations r ON r.id=i.registration_id
JOIN public.players p ON p.id=r.player_id
WHERE p.full_name LIKE 'Uji Fase3A %'
ORDER BY i.created_at DESC;

SELECT target_email,purpose,attempts,created_at,expires_at,
       consumed_at IS NOT NULL AS consumed
FROM public.auth_challenges
WHERE target_email LIKE 'login-%@bnr.test'
ORDER BY created_at DESC;

SELECT action,entity_type,entity_id,happened_at
FROM public.audit_logs WHERE action LIKE 'activation.%'
ORDER BY happened_at DESC;
```
A/B tetap tidak memiliki user_id. Kedua undangan yang baru diterbitkan belum used_at; OTP A consumed setelah berhasil; OTP B consumed setelah lima kegagalan. Audit activation.invite, activation.otp.request, activation.otp.verify. Jangan menjalankan SELECT * pada tabel token atau challenge saat mengambil screenshot.

## 7. Batas dan keputusan desain
- Undangan 32 byte acak, SHA-256 disimpan, berlaku 24 jam, hanya untuk registrasi diterima/pemain aktif tanpa akun. Penerbitan ulang membatalkan undangan sebelumnya (used_at juga menandakan pencabutan) dan memerlukan jeda 60 detik.
- OTP 6 digit, berlaku maksimal 5 menit dan tidak melebihi expiry undangan. HMAC dengan key terpisah secara domain dari JWT_SECRET, terikat pada challenge ID, invitation ID, purpose, email dan kode. Prefix versi+invitation ID dalam code_hash digunakan sebagai scope tanpa kolom baru. Hash dibandingkan secara timing-safe. Jeda 60 detik, maksimal 5 request/jam dalam cakupan email atau undangan dan 5 percobaan/challenge. Salah OTP tetap menaikkan attempts dengan commit; challenge terkunci setelah berhasil/limit atau digantikan challenge baru.
- OTP dikirim ke email login yang dipilih, bukan otomatis email kontak keluarga. Tidak memverifikasi keunikan email login sampai Fase 3B; uniqueness tetap ditegakkan oleh index users. Email kontak bisa sama antar-pemain.
- Bukti verifikasi memakai key dan audience terpisah; tidak memberikan hak akses login. Undangan belum dikonsumsi oleh verifikasi; 3B harus memeriksa ulang eligibility, invitation/proof/challenge/email, mengonsumsi undangan dan membuat akun + players.user_id dalam satu transaksi. Harus menolak email login duplikat.
- SMTP lokal dilakukan dalam transaksi agar kegagalan kirim rollback. Jika commit DB gagal sesudah email diterima, pesan bisa tidak berlaku; lakukan penerbitan ulang. SMTP timeout dibatasi; sebelum produksi perlu outbox/queue, kontrol penyalahgunaan/retensi, perlindungan anak, dan layanan email sungguhan.
- Hanya .test selama dev. Jangan mengubah batasan ini untuk mengirim email nyata tanpa peninjauan keamanan. Tidak ada perubahan skema/database pada repo; runtime PostgreSQL, Mailpit dan PowerShell harus diuji pada laptop.
- Next: 3B aktivasi akun Pemain; 3C registrasi & persetujuan Pelatih.
