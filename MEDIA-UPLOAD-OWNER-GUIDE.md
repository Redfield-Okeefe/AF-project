# Upload Foto oleh Owner — B.N.R Futsal Academy

## Fitur yang ditambahkan
- **Owner > Media & Foto > Gallery**: unggah 1–20 foto JPG/PNG/WebP sekaligus, tampilkan pratinjau, dan hapus foto.
- **Owner > Media & Foto > Beranda**: unggah atau ganti satu **Foto Sorotan Beranda**, judul, dan keterangan. Foto tampil di blok sorotan terpisah **setelah hero**. ReactBits DriftWall, logo B.N.R, dan dua kartu melayang tidak diubah.
- Di **/gallery**: selama belum ada foto dari Owner, 18 ilustrasi Pexels lama tetap ditampilkan. Ketika sudah ada foto Owner, galeri menampilkan foto Owner tersebut. Kontrol **Hitam Putih / Warna Asli**, zoom, dan Masonry responsif tetap berfungsi.
- Menu ini hanya muncul pada portal Owner, bukan Pemain/Pelatih.

## Penting: batasan GitHub Pages / mode DEMO
GitHub Pages hanya menyajikan file statis, bukan server untuk menerima upload atau database. **Tanpa pengaturan API**, foto Owner tersimpan di **IndexedDB browser tempat Owner mengunggahnya**. Foto dapat dilihat di Gallery atau Beranda **hanya pada browser/profil yang sama**, termasuk setelah refresh. HP/laptop lain TIDAK ikut berubah. Banner pada halaman Owner menjelaskan hal ini.

**Jangan menganggap upload mode DEMO sudah dipublikasikan ke semua pengunjung.** Hak akses role di mode DEMO hanya untuk tampilan UI (localStorage dapat dimanipulasi), bukan keamanan produksi.

## Mengaktifkan penyimpanan bersama (backend lokal + PostgreSQL)
1. Instal PostgreSQL lokal, buat database `bnr_academy` dengan DBeaver (database awal boleh kosong). Siapkan Node.js yang sesuai dependensi Sharp (Node 20+ direkomendasikan).
2. Buka terminal di `server-contoh`, jalankan `npm install`.
3. Salin `server-contoh/.env.example` menjadi `server-contoh/.env`. Isi dengan password database **Anda sendiri**:
   - `DATABASE_URL=postgresql://postgres:<password-encoded>@127.0.0.1:5432/bnr_academy`
   - `JWT_SECRET`: secret panjang dan acak.
   - `GMAIL_USER`, `GMAIL_APP_PASSWORD`: credential email OTP untuk pengujian.
   - `ADMIN_EMAILS`: email Owner yang Anda kendalikan.
   - `FRONTEND_URL`: `http://localhost:5173` (dan origin lain yang memang diizinkan).
4. Jalankan `npm start` dari `server-contoh`. Server membuat tabel `public_media` otomatis; SQL acuannya ada di `schema-media.sql`. Foto disimpan pada `server-contoh/media-uploads/` dan metadata pada PostgreSQL.
5. Di root frontend, buat `.env.local` berisi:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_MEDIA_API_URL=http://localhost:3001
   ```
6. Jalankan `npm install` dan `npm run dev` di root. **Restart Vite** setiap kali mengubah `.env.local`.
7. Buat akun menggunakan email yang tercantum di `ADMIN_EMAILS`, verifikasi melalui OTP pada frontend lokal (mode API), lalu masuk melalui **Login Owner** menggunakan password yang didaftarkan. Role `admin` dari backend dipetakan menjadi `owner` pada frontend. **Token demo GitHub Pages tidak diterima backend**.
8. Masuk **Owner > Media & Foto**, unggah foto, kemudian cek `/gallery` dan `/` pada browser lokal lain yang juga tersambung ke backend yang sama. Upload API mewajibkan JWT role Owner/admin.

### API media
| Method | Endpoint | Izin |
|---|---|---|
| GET | `/media/gallery` | Publik |
| GET | `/media/home` | Publik |
| GET | `/media/files/<uuid>.jpg` | Publik |
| POST | `/media/gallery` | Owner; multipart `photo`, `title` |
| DELETE | `/media/gallery/:id` | Owner |
| PUT | `/media/home` | Owner; multipart `photo` (opsional jika sudah ada), `title`, `description` |
| DELETE | `/media/home` | Owner |

### Pengujian wajib
- Owner dapat upload dan hapus; Pemain/Pelatih tidak melihat menu pengelolaan.
- Coba POST/DELETE API tanpa token atau dengan token non-Owner: harus mendapatkan 401/403.
- Coba JPG/PNG/WebP yang valid, file bukan gambar, dan file >8 MB.
- Periksa responsivitas dan mode warna Gallery pada HP.
- Uji penyegaran browser, dua tab, dan browser lain yang menggunakan backend sama.
- Gunakan hanya foto yang punya izin, terutama untuk foto anak; hindari data sensitif.

## Untuk akses antar-HP melalui situs GitHub Pages
**Backend lokal di laptop tidak otomatis dapat diakses melalui GitHub Pages**. Agar semua pengunjung melihat perubahan, host backend dan storage foto di server HTTPS yang aktif dengan koneksi database yang aman dan permanen. **Jangan** memasukkan URL localhost ke build GitHub Pages (perangkat pengunjung tidak dapat mengakses localhost laptop Owner). Infrastruktur saat ini menggunakan file upload pada disk server, sehingga untuk hosting yang disk-nya sementara perlu mengganti file store menjadi persistent volume atau object storage.

Setelah API publik HTTPS tersedia, atur `VITE_MEDIA_API_URL=https://api-domain-anda` dalam konfigurasi **build GitHub Actions**, kemudian build/deploy ulang. Selalu batasi origin CORS yang diperlukan dan jaga JWT/DB password hanya di server; jangan tambahkan secret ke `VITE_*`.

## Status
- ✅ UI dan pratinjau lokal dapat dicoba pada branch saat ini.
- ✅ Endpoint backend dengan pembatasan Owner tersedia sebagai source code untuk dijalankan.
- ⏳ PostgreSQL, konfigurasi OTP, backend HTTPS, dan pengujian sinkronisasi lintas perangkat perlu disiapkan sebelum fitur upload dapat dipakai publik.
