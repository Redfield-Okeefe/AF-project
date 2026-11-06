# Revisi Portal Owner — v6

## Batas perubahan
- Halaman publik (Beranda, Pendaftaran, Gallery, Berita, Contact) tidak diedit.
- Portal Pemain dan Pelatih tidak diedit; PortalLayout ditambahkan cabang `ownerMode` agar perubahan khusus Owner.
- Desain dasar putih-oranye dipertahankan, dipoles spacing, ikon SVG, KPI, grafik garis pemasukan, ring kehadiran, dan tombol akses cepat.

## Mode terang / gelap
- Default **Sistem**, mengikuti `prefers-color-scheme: dark` perangkat secara langsung menggunakan listener `matchMedia`.
- Kontrol di topbar Portal Owner: **Sistem, Terang, Gelap**.
- Preferensi manual hanya disimpan di `localStorage` dengan key `af_owner_theme_preference`.
- Tema hanya membungkus elemen `.owner-portal[data-theme]`, sehingga tampilan publik/pelatih/pemain tidak ikut berubah.

## Penguatan validasi
- Simpan kelas: semua baris divalidasi sebelum ditulis, nama dan rentang usia wajib, nama kelas unik (case-insensitive), referensi pelatih harus aktif, kelas yang sudah dihapus tidak bisa diam-diam dibuat ulang.
- Setelan: iuran harus bilangan bulat non-negatif, nama bank/pemilik rekening wajib, rekening 5–30 digit angka (spasi dan strip dinormalisasi).
- Berita: tanggal dan tautan gambar divalidasi, format/ukuran unggahan gambar dibatasi.
- Keuangan: label pembuatan tagihan diselaraskan dengan periode terpilih.

## Pengujian
- Syntax/transpile setiap file JS/JSX: lulus menggunakan TypeScript transpileModule.
- Unit-test sederhana service db.js untuk validasi: lulus (lihat catatan pengujian terpisah jika ada).
- Belum dapat menjalankan `npm run build` dan browser E2E pada lingkungan ini karena instalasi package npm tidak tersedia secara offline. Jalankan `npm ci`, `npm run build`, `npm run dev` di PC sendiri.
- Autentikasi project masih mode demo/localStorage dan **tidak cukup aman untuk produksi**. Validasi server-side, password hash, sesi aman, otorisasi akses dan database perlu backend sesungguhnya.

## Cara menjalankan
```bash
npm ci
npm run build
npm run dev
```
Login owner pada mode demo: `/login/owner` dengan email `owner@demo.id` dan password demo apa saja (JANGAN gunakan demo ini untuk produksi).
