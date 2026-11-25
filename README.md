# B.N.R Academy — Frontend design workspace

Branch `frontend-design` hanya berisi React/Vite frontend, aset publik dan test frontend. Backend tetap di main. Gunakan Node.js 22.

```bash
npm ci
npm run dev
```
Buka http://localhost:5173/design/akademi lalu klik Buka dashboard desain. Mode ini tidak memerlukan login asli, PostgreSQL, Mailpit, atau .env; data Akademi & Kelas fiktif tersimpan di memori dan reset saat refresh. Untuk halaman portal lain, demo frontend lama tetap tersedia. Jangan gunakan data/kredensial asli.

File utama desain: src/pages/academy/Operations.jsx, Classes.jsx, Sessions.jsx, shared.jsx, operations.css; src/services/academy-preview.js adalah adapter desain. Pertahankan kontrak API di src/services/academy.js. `npm run build`, `npm run test:design`, `npm run test:otp` untuk verifikasi.

**Jangan merge branch snapshot ini langsung ke main:** backend sengaja tidak ada. Buat commit khusus perubahan src/public, lalu pengembang mengambil perubahan terpilih menggunakan cherry-pick commit desain atau patch. Jangan cherry-pick commit snapshot awal. Riwayat Git bersama masih mengandung commit backend; branch ini bukan pembatas izin akses repository.
