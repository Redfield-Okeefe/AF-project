# Checklist Uji Responsif B.N.R Futsal Academy — Mobile (7 November 2026)

## Tujuan
Memeriksa konsistensi website publik pada **empat perangkat HP asli** setelah perbaikan responsif. Pengujian di HP berbeda adalah **UAT yang belum dilaksanakan** dan harus diisi oleh anggota tim masing-masing. GitHub Pages menampilkan prototype, bukan backend produksi.

**Live preview:** https://redfield-okeefe.github.io/AF-project/

## Pengaturan pengujian
- Gunakan empat HP dengan ukuran layar berbeda jika tersedia: kecil (sekitar 320–360 CSS px), sedang (360–390 CSS px), besar (390–430 CSS px), dan sangat besar/foldable (>430 CSS px). Tidak harus persis, catat model/OS/browser dan lebar viewport yang sebenarnya.
- Uji browser Chrome (Android) atau Safari (iOS) sesuai perangkat, mode potret dan lanskap, dark dan light theme.
- Buka link publik, tekan refresh (atau buka tab privat) setelah deployment untuk menghindari cache.
- Jangan gunakan data pribadi sebenarnya saat menguji form, karena aplikasi masih prototype dengan data simulasi.

## Halaman dan kriteria
| Halaman | Yang diperiksa | Lulus bila |
| --- | --- | --- |
| Beranda | Navbar, tombol menu, logo, toggle tema, hero, dua CTA, statistik | Tidak ada horizontal scroll; judul dan tombol terlihat utuh; HeroWall/ilustrasi tidak menumpuk teks |
| Beranda | Keunggulan, Program Latihan, Perjalanan di Akademi, banner daftar | Semua kartu terbaca dalam kolom yang sesuai; teks tidak bertabrakan dan angka 01–03 jelas |
| Pendaftaran | Form data pemain, orang tua, alamat, program, input tanggal | Seluruh input dapat diketik tanpa zoom otomatis; grid tidak terpotong; tombol lanjut dapat dijangkau |
| Pembayaran | Ringkasan, pilihan metode, nomor pembayaran, file | Kartu dan tombol tidak keluar layar; gunakan data dummy saja, jangan transaksi nyata |
| Gallery | Foto grid mobile, teks caption, scrolling | Foto terlihat jelas, tidak perlu geser layar ke samping; halaman tidak tersendat |
| Berita | Kategori, pencarian, berita utama, berita lainnya | Filter membungkus ke baris lain dengan rapi; pencarian dan kartu tampil utuh |
| Detail berita | Gambar, judul panjang, paragraf, tombol WhatsApp, artikel terkait | Judul tidak keluar layar, tidak ada scroll horizontal |
| Contact | Kartu WhatsApp dan Instagram | Kedua kartu bisa ditekan dan teksnya tidak terpotong |
| Pemilihan portal | Kartu Pemain/Owner/Pelatih | Kartu dan ikon pas lebar layar; navigasi menuju login sesuai |
| Login peran | Input email/password, tampilkan sandi, tombol masuk | Input tidak sempit/tertutup; tidak menampilkan kredensial demo pada UI |

## Lembar hasil uji (isi oleh tim)
| Perangkat | Model / OS / Browser | CSS viewport | Orientasi | Tema | Halaman lulus | Temuan & screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| HP 1 | - | - | Potret/Lanskap | Gelap/Terang | - | - |
| HP 2 | - | - | Potret/Lanskap | Gelap/Terang | - | - |
| HP 3 | - | - | Potret/Lanskap | Gelap/Terang | - | - |
| HP 4 | - | - | Potret/Lanskap | Gelap/Terang | - | - |

## Jika ada bug
Sertakan **URL lengkap, model HP, browser, orientasi, mode tema, screenshot**, dan langkah untuk mengulang bug. Catat apakah halaman digeser ke kanan/kiri atau tombol tidak dapat ditekan.

## Catatan developer
- Pada layar <=760px: HeroWall dimatikan agar tidak membebani GPU dan tidak membuat ilustrasi tertumpuk; Galeri menggunakan grid HTML yang lebih ringan.
- Pada layar <=540px: tombol login dipindahkan ke menu hamburger agar navbar tidak penuh; login tetap bisa diakses.
- Pada layar 761–960px: menu responsif digunakan agar navigasi tidak meluber.
- Perbaikan disimpan di `src/styles/mobile-responsive-2026.css`, dengan penyempurnaan `Navbar.jsx`, `HeroWall.jsx`, dan `Gallery.jsx`.
- Responsive CSS tidak membuat database/backend; periksa validasi dan hak akses secara terpisah sebelum rilis produksi.
