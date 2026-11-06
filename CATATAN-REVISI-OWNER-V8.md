# Akademi Futsal — Revisi Portal Owner v8

Versi dasar: `futsal-akademi-owner-portal-v7.zip`.

## Ruang lingkup

Perubahan hanya pada Portal Owner dan komponen yang dipakai Owner. **Halaman publik (Beranda, Pendaftaran, Gallery, Berita, Contact) dan portal Pemain/Pelatih tetap sebagaimana pada v7.**

1. **Tema**: ikon matahari/bulan berada antara nama Owner dan foto avatar. Hanya dua aksi manual (Light/Night). Ketika preferensi belum ditentukan, tema awal otomatis mengikuti `prefers-color-scheme` perangkat. Tidak ada ikon/opsi Sistem di UI. Setelah pemilihan manual, preferensi disimpan per browser (localStorage).
2. **Navigasi Dashboard**: seluruh area kelima kartu KPI dapat diklik dan diakses dengan keyboard, bukan hanya panah. Shortcut Akses Cepat tetap berupa tautan penuh.
3. **Jam/tanggal realtime**: ditampilkan pada topbar Owner, mengikuti waktu lokal dan zona waktu perangkat; diperbarui setiap detik dan ketika tab kembali aktif. Tanggal default penulisan berita kini memakai tanggal lokal.
4. **Grafik tren pemasukan**: dapat memilih 1–24 bulan. Masukan non-bulat, di luar rentang, atau kosong ditolak tanpa mengganti grafik terakhir yang valid. Titik grafik bisa diklik/diaktifkan lewat Enter atau Spasi untuk melihat rinciannya.
5. **UI Owner**: menyelaraskan heading, panel filter, tabel/kartu data, tindakan, dan pengaturan pada menu Pelatih, Pemain, Keuangan, Berita dan Pengaturan; media query untuk tablet dan ponsel; transisi ringan, respons terhadap `prefers-reduced-motion`.

## Cara menjalankan

```bash
npm ci
npm run dev
```

Lalu buka halaman publik `/`, masuk melalui Login -> Owner -> email/password -> `/owner/dashboard`.

**Tes validasi yang tidak membutuhkan dependensi eksternal:**

```bash
npm run test:owner
```

**Verifikasi build sebelum presentasi/produksi:**

```bash
npm run build
```

## Hasil pemeriksaan saat pembuatan

- 17 uji unit validasi bulan dengan `node:test`: **lulus semua**.
- Parsing sintaks seluruh 64 sumber JS/JSX oleh TypeScript parser: **tidak ditemukan syntax error**.
- CSS `owner-v8.css`: **tidak ditemukan error parsing stylesheet level atas**.
- Impor relatif: **semua ditemukan**.
- Perbandingan sumber v7: **tidak ada file halaman publik yang diubah**.
- **Build Vite dan pengujian browser lintas perangkat belum dapat dijalankan di lingkungan ini** karena `npm ci` tidak bisa mengunduh dependensi registry (`ENOTCACHED`/`EAI_AGAIN`). Perlu pengujian nyata dengan `npm ci && npm run build` pada lingkungan yang memiliki koneksi internet.

## Catatan

Data portal masih disimpan secara lokal dalam mode demo. Login/otorisasi belum memenuhi kebutuhan produksi tanpa backend dan penyimpanan persisten yang aman.
