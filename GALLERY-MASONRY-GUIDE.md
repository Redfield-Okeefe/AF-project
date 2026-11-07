# Panduan Gallery Masonry — B.N.R Academy

Halaman `/gallery` kini memakai komponen **Masonry** dari React Bits (JavaScript + CSS), bukan CircularGallery. Foto akan otomatis mengikuti lebar layar melalui 1 kolom pada HP sangat kecil, 2 pada HP umum, 3 pada tablet, dan 4 pada desktop.

## Status foto
- Terdapat **18 foto ilustrasi olahraga** dari Pexels. Foto ini **bukan** dokumentasi kegiatan B.N.R Academy.
- Semua foto memiliki tautan menuju halaman sumbernya ketika dibuka di lightbox.
- Sebelum publikasi resmi, minta persetujuan pemilik akademi dan izin penggunaan foto siswa, lalu ganti ilustrasi dengan dokumentasi asli.

## Mengganti foto
1. Masukkan foto (JPG/WebP yang telah dikompresi) ke folder `public/foto/`.
2. Untuk foto 1–8: isi `GALLERY[index].image` di `src/data/config.js` (contoh `/foto/gallery-01.jpg`).
3. Untuk foto 9–18: isi field `image` di `src/data/galleryPhotos.js`.
4. Untuk setiap foto, cek nilai `width` dan `height` pada metadata galeri agar rasio gambar benar dan layout tidak melompat. Ubah `title` agar mencerminkan kegiatan sebenarnya.
5. Cek hasil di HP (320, 375, 390, 430 CSS px), tablet, dan desktop, termasuk dark/light mode.

Komponen aslinya tersedia pada `src/components/Masonry.jsx` dan `src/components/Masonry.css`. Paket ikon `@hugeicons/react` dan `@hugeicons/core-free-icons` sudah ada pada package.json proyek ini.
