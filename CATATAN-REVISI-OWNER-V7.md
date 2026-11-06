# Revisi Portal Owner v7 — Akademi Futsal

Revisi ini berbasis ZIP **futsal-akademi-owner-portal-v6.zip**. Website publik, portal pemain, dan portal pelatih tidak didesain ulang. Perubahan pada navbar publik terbatas pada perilaku tombol login agar mengikuti alur yang diminta.

## Perubahan

- Kontrol tema Owner kini hanya tombol ikon di topbar dekat identitas Owner. Klik berurutan: Sistem (mengikuti `prefers-color-scheme` perangkat) → Terang → Gelap → Sistem. Preferensi tetap disimpan di localStorage browser.
- Profil Owner di topbar memperlihatkan nama "Muhammad Naufal Gonzales" dan jabatan Owner. Avatar berbentuk lingkaran. Klik avatar membuka popover dengan nama/jabatan tersebut, serta opsi unggah foto pribadi (file JPG/PNG/WebP hingga 4 MB, otomatis diperkecil). Karena foto asli tidak disertakan, awalnya avatar menggunakan ilustrasi placeholder, bukan foto orang lain.
- Rute utama aplikasi tetap `/` (website publik). Tombol Login pada navbar mengarah ke `/login` (pilih peran), dilanjutkan `/login/owner` (email/password), dan hasil login Owner menuju `/owner/dashboard`.
- Jika Owner membuka halaman Owner tanpa sesi, aplikasi kembali ke `/` untuk mengikuti alur publik. Portal Pemain/Pelatih tetap mengarahkan pengguna tidak login ke `/login` seperti versi lama.
- Menu "Ringkasan" diganti menjadi "Dashboard". `/owner/ringkasan` dialihkan ke `/owner/dashboard` untuk kompatibilitas tautan lama. Konten statistik/grafik utama tetap dipertahankan.
- Border panel disederhanakan, hierarki teks serta spacing diperbaiki, interaksi tema/profil dan hover diberi animasi halus dengan dukungan `prefers-reduced-motion`.
- Breakpoint responsif di 1100, 900, 610, 480, dan 350 px untuk tablet dan ponsel; sidebar dapat ditutup dengan tombol tutup dan tombol Escape.

## Verifikasi

- Parse/transpilasi sintaks semua 60 file JS/JSX menggunakan TypeScript: **lulus**.
- Pemeriksaan statis routing, preferensi OS, kontrol tema, label Owner, pembatasan CSS, responsivitas, dan aksesibilitas animasi: **lulus**.
- Lima file halaman publik Beranda, Pendaftaran, Gallery, Berita, Contact dan portal Pemain/Pelatih: **tidak diubah**.
- Build Vite/browser end-to-end: **belum berhasil diverifikasi** karena proses `npm ci` terhambat di lingkungan ini (dependensi belum terinstal). Harap jalankan `npm ci && npm run build && npm run dev` dan uji alur login serta tampilan di perangkat fisik sebelum dipublikasikan.

## Catatan keamanan

Autentikasi tanpa `VITE_API_URL` masih berupa **demo** (localStorage, kredensial contoh). RoleRoute di frontend bukan pengganti validasi backend. Gunakan autentikasi server-side dan sesi aman sebelum produksi.
