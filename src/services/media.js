/* Media untuk Gallery dan Sorotan Beranda.
 * DEMO (tanpa VITE_API_URL): IndexedDB browser ini saja, bukan publikasi online.
 * API aktif: semua operasi lewat server PostgreSQL, dengan verifikasi Owner di server.
 */
import { getToken } from '../utils/auth.js'

const API = (import.meta.env.VITE_MEDIA_API_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const mediaMode = API ? 'server' : 'local-demo'
const DB_NAME = 'bnr-academy-media-demo-v1'
const STORE_GALLERY = 'gallery'
const STORE_HOME = 'home'
const EVENT = 'bnr-media-updated'

let conn
function openDb() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('Browser ini tidak mendukung penyimpanan foto lokal.'))
  if (!conn) conn = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_GALLERY)) req.result.createObjectStore(STORE_GALLERY, { keyPath: 'id' })
      if (!req.result.objectStoreNames.contains(STORE_HOME)) req.result.createObjectStore(STORE_HOME, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Database foto lokal tidak dapat dibuka.'))
  })
  return conn
}
async function storeAction(name, mode, action) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode)
    const request = action(tx.objectStore(name))
    let value
    request.onsuccess = () => { value = request.result }
    tx.oncomplete = () => resolve(value)
    tx.onerror = () => reject(tx.error || new Error('Gagal menyimpan media di browser.'))
    tx.onabort = () => reject(tx.error || new Error('Penyimpanan lokal dibatalkan.'))
  })
}
function updated() {
  window.dispatchEvent(new Event(EVENT))
  try { localStorage.setItem(EVENT, String(Date.now())) } catch { /* ignore */ }
}
export function subscribeMedia(callback) {
  window.addEventListener(EVENT, callback)
  const crossTab = event => { if (event.key === EVENT) callback() }
  window.addEventListener('storage', crossTab)
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener('storage', crossTab) }
}
function mediaUrl(url) {
  if (!url) return ''
  if (/^(https?:|data:)/.test(url)) return url
  return `${API}${url.startsWith('/') ? '' : '/'}${url}`
}
async function request(path, options = {}, protectedRoute = false) {
  const headers = { ...(options.headers || {}) }
  if (protectedRoute) {
    const token = getToken()
    if (!token) throw new Error('Anda harus login sebagai Owner.')
    headers.Authorization = `Bearer ${token}`
  }
  let res
  try { res = await fetch(`${API}/media${path}`, { ...options, headers }) }
  catch { throw new Error('Server media tidak dapat dihubungi. Jalankan backend atau periksa koneksinya.') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Permintaan media gagal (${res.status}).`)
  return data
}
export async function processPhoto(file) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) {
    throw new Error('Pilih foto JPG, PNG, atau WebP.')
  }
  if (file.size > 8 * 1024 * 1024) throw new Error('Ukuran foto maksimal 8 MB.')
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
      img.src = url
    })
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Foto tidak valid.')
    const ratio = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * ratio))
    const height = Math.max(1, Math.round(img.naturalHeight * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Browser tidak mendukung pemrosesan foto.')
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82))
    if (!blob) throw new Error('Gagal mengompresi foto.')
    if (blob.size > 3 * 1024 * 1024) throw new Error('Foto masih terlalu besar setelah dikompresi.')
    return { blob, width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
async function base64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Foto gagal dibaca.'))
    reader.readAsDataURL(blob)
  })
}
export async function listGalleryMedia() {
  if (API) {
    const data = await request('/gallery')
    return (data.items || []).map(item => ({ ...item, img: mediaUrl(item.img) }))
  }
  const items = await storeAction(STORE_GALLERY, 'readonly', s => s.getAll())
  return items.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}
export async function getHomeMedia() {
  if (API) {
    const data = await request('/home')
    return data.item ? { ...data.item, img: mediaUrl(data.item.img) } : null
  }
  return (await storeAction(STORE_HOME, 'readonly', s => s.get('main'))) || null
}
export async function addGalleryMedia(file, title) {
  const processed = await processPhoto(file)
  const caption = String(title || '').trim().slice(0, 100)
  if (API) {
    const form = new FormData()
    form.append('photo', processed.blob, 'gallery.jpg')
    form.append('title', caption)
    const item = (await request('/gallery', { method:'POST', body:form }, true)).item
    updated()
    return { ...item, img: mediaUrl(item.img) }
  }
  const item = {
    id: crypto.randomUUID(), title: caption || 'Kegiatan Akademi',
    img: await base64(processed.blob), width:processed.width,
    height:processed.height, description:'Dokumentasi akademi (pratinjau lokal)',
    createdAt:new Date().toISOString()
  }
  try { await storeAction(STORE_GALLERY,'readwrite',s=>s.put(item)) }
  catch { throw new Error('Ruang penyimpanan browser penuh. Coba lebih sedikit foto atau gunakan backend.') }
  updated()
  return item
}
export async function removeGalleryMedia(id) {
  if (API) await request(`/gallery/${encodeURIComponent(id)}`, {method:'DELETE'}, true)
  else await storeAction(STORE_GALLERY,'readwrite',s=>s.delete(id))
  updated()
}
export async function saveHomeMedia(file, title, description) {
  const caption=String(title||'Sorotan Akademi').trim().slice(0,100)
  const summary=String(description||'').trim().slice(0,200)
  const processed = file ? await processPhoto(file) : null
  if (API) {
    const form = new FormData()
    form.append('title',caption)
    form.append('description',summary)
    if (processed) form.append('photo',processed.blob,'home.jpg')
    const item=(await request('/home',{method:'PUT',body:form},true)).item
    updated()
    return {...item,img:mediaUrl(item.img)}
  }
  const old=await getHomeMedia()
  if (!processed && !old) throw new Error('Pilih foto sorotan terlebih dahulu.')
  const item={
    id:'main', title:caption, description:summary,
    img:processed ? await base64(processed.blob) : old.img,
    width:processed?.width || old?.width, height:processed?.height || old?.height,
    createdAt:new Date().toISOString()
  }
  try { await storeAction(STORE_HOME,'readwrite',s=>s.put(item)) }
  catch { throw new Error('Penyimpanan browser tidak cukup untuk foto ini.') }
  updated()
  return item
}
export async function removeHomeMedia() {
  if (API) await request('/home', {method:'DELETE'}, true)
  else await storeAction(STORE_HOME,'readwrite',s=>s.delete('main'))
  updated()
}
