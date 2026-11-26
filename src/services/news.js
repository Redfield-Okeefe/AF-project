import {apiRequest} from './otp-contract.js'
import { BERITA } from '../data/config.js'
import { getToken } from '../utils/auth.js'

/* Layanan berita.
   - VITE_API_URL kosong  -> mode DEMO, data disimpan di localStorage browser ini.
   - VITE_API_URL terisi  -> memakai REST API:
       GET    /berita            -> daftar berita
       GET    /berita/:slug      -> satu berita
       POST   /berita            -> tambah   (butuh token admin)
       PUT    /berita/:id        -> ubah     (butuh token admin)
       DELETE /berita/:id        -> hapus    (butuh token admin)
   Bentuk data: { id, slug, judul, kategori, tanggal, ringkas, isi, emoji, warna, gambar } */

const API_URL = import.meta.env.VITE_API_URL
const KEY = 'af_berita'
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))

export const slugify = (t) =>
  String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'berita'

// "isi" disimpan sebagai teks; satu baris = satu paragraf
export const paragraf = (isi) =>
  (Array.isArray(isi) ? isi : String(isi || '').split('\n')).map((p) => p.trim()).filter(Boolean)

const byTanggal = (a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || b.id - a.id

/* ---------- Mode DEMO (localStorage) ---------- */
function seed() {
  return BERITA.map((b) => ({ ...b, slug: slugify(b.judul), isi: paragraf(b.isi).join('\n') }))
}

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* data rusak -> pakai data awal */ }
  const data = seed()
  writeLocal(data)
  return data
}

function writeLocal(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    throw new Error('Penyimpanan browser penuh. Gunakan gambar yang lebih kecil atau tautan gambar.')
  }
}

/* ---------- Mode API ---------- */
async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Terjadi kesalahan, coba lagi.')
  }
  return res.status === 204 ? null : res.json()
}

/* ---------- Fungsi publik ---------- */
const remote=(path,method='GET',body)=>apiRequest(API_URL,'/api/v1'+path,{method,body,token:getToken()})
export const newsApiEnabled=Boolean(API_URL)
const mapNews=b=>({id:b.id,slug:b.slug,judul:b.title,kategori:b.category,tanggal:b.date,ringkas:b.summary||'',isi:b.content,gambar:b.cover_path||'',status:b.status,emoji:'📰',warna:'#e86b29,#7c3f17'})
export async function listNews(owner=false) {
  if (API_URL) return (await remote(owner?'/owner/news':'/public/news')).items.map(mapNews)
  await wait()
  return readLocal().slice().sort(byTanggal)
}

export async function getNews(slug) {
  if (API_URL) {
    try { return mapNews((await remote('/public/news/'+encodeURIComponent(slug))).item) } catch(e) { if(e.status===404)return null;throw e }
  }
  await wait(150)
  return readLocal().find((b) => b.slug === slug) || null
}

export async function saveNews(item) {
  if (API_URL) {
    const b={title:item.judul,category:item.kategori,summary:item.ringkas,content:paragraf(item.isi).join('\n'),cover_path:item.gambar||'',date:item.tanggal,status:item.status||'terbit'}
    return remote('/owner/news'+(item.id?'/'+item.id:''),item.id?'PUT':'POST',b)
  }
  await wait(300)
  const data = readLocal()
  const base = slugify(item.judul)
  let slug = base
  for (let n = 2; data.some((b) => b.slug === slug && b.id !== item.id); n++) slug = `${base}-${n}`

  if (item.id) {
    const i = data.findIndex((b) => b.id === item.id)
    if (i < 0) throw new Error('Berita tidak ditemukan.')
    data[i] = { ...data[i], ...item, slug }
    writeLocal(data)
    return data[i]
  }
  const baru = { ...item, id: Date.now(), slug }
  writeLocal([baru, ...data])
  return baru
}

export async function deleteNews(id) {
  if (API_URL) return remote('/owner/news/'+id,'DELETE')
  await wait(200)
  writeLocal(readLocal().filter((b) => b.id !== id))
}
