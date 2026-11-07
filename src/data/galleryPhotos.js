// Foto ilustrasi dari Pexels, bukan dokumentasi asli B.N.R Academy.
// Untuk foto asli, isi field `image` dengan path seperti '/foto/gallery-01.jpg'
// dan taruh berkas di public/foto. Foto contoh tetap menjadi fallback selama image kosong.
const illustrations = [
  {
    "id": "gallery-01",
    "title": "Latihan koordinasi junior",
    "pexelsId": 8858970,
    "width": 3704,
    "height": 2469,
    "image": ""
  },
  {
    "id": "gallery-02",
    "title": "Latihan teknik dan gerak",
    "pexelsId": 6203910,
    "width": 3648,
    "height": 5472,
    "image": ""
  },
  {
    "id": "gallery-03",
    "title": "Pemain muda berlatih",
    "pexelsId": 40755408,
    "width": 2845,
    "height": 4267,
    "image": ""
  },
  {
    "id": "gallery-04",
    "title": "Kerja sama dalam tim",
    "pexelsId": 8813512,
    "width": 5798,
    "height": 3871,
    "image": ""
  },
  {
    "id": "gallery-05",
    "title": "Pertandingan antarpemain",
    "pexelsId": 29661123,
    "width": 6000,
    "height": 4000,
    "image": ""
  },
  {
    "id": "gallery-06",
    "title": "Bola di lapangan futsal",
    "pexelsId": 3846652,
    "width": 4000,
    "height": 6000,
    "image": ""
  },
  {
    "id": "gallery-07",
    "title": "Semangat bermain bola",
    "pexelsId": 8813535,
    "width": 6016,
    "height": 4016,
    "image": ""
  },
  {
    "id": "gallery-08",
    "title": "Persiapan memasuki lapangan",
    "pexelsId": 8941573,
    "width": 5450,
    "height": 3634,
    "image": ""
  },
  {
    "id": "gallery-09",
    "title": "Momen latihan dan disiplin",
    "pexelsId": 6196284,
    "width": 3648,
    "height": 5472,
    "image": ""
  },
  {
    "id": "gallery-10",
    "title": "Latihan tendangan",
    "pexelsId": 30584996,
    "width": 5568,
    "height": 3712,
    "image": ""
  },
  {
    "id": "gallery-11",
    "title": "Sesi latihan penjaga gawang",
    "pexelsId": 37391231,
    "width": 3376,
    "height": 6000,
    "image": ""
  },
  {
    "id": "gallery-12",
    "title": "Kebersamaan di lapangan",
    "pexelsId": 18066973,
    "width": 5184,
    "height": 3888,
    "image": ""
  },
  {
    "id": "gallery-13",
    "title": "Aksi pertandingan junior",
    "pexelsId": 34721545,
    "width": 5888,
    "height": 3312,
    "image": ""
  },
  {
    "id": "gallery-14",
    "title": "Latihan pemain muda",
    "pexelsId": 40755411,
    "width": 4164,
    "height": 2776,
    "image": ""
  },
  {
    "id": "gallery-15",
    "title": "Selebrasi setelah pertandingan",
    "pexelsId": 38092765,
    "width": 6000,
    "height": 3376,
    "image": ""
  },
  {
    "id": "gallery-16",
    "title": "Sesi permainan kelompok",
    "pexelsId": 36871444,
    "width": 6240,
    "height": 4160,
    "image": ""
  },
  {
    "id": "gallery-17",
    "title": "Keterampilan mengolah bola",
    "pexelsId": 3886235,
    "width": 3180,
    "height": 2271,
    "image": ""
  },
  {
    "id": "gallery-18",
    "title": "Latihan dari sudut lapangan",
    "pexelsId": 31636112,
    "width": 4928,
    "height": 3264,
    "image": ""
  }
];

export const GALLERY_PHOTOS = illustrations.map(photo => ({
  ...photo,
  img: `https://images.pexels.com/photos/${photo.pexelsId}/pexels-photo-${photo.pexelsId}.jpeg?auto=compress&cs=tinysrgb&w=1050`,
  url: `https://www.pexels.com/photo/${photo.pexelsId}/`,
  alt: `Foto ilustrasi olahraga: ${photo.title}`,
  description: 'Foto ilustrasi · Pexels'
}));
