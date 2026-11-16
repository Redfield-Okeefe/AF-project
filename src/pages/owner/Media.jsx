import { useEffect, useState } from 'react'
import OwnerPageHeading from '../../components/OwnerPageHeading.jsx'
import OwnerIcon from '../../components/OwnerIcon.jsx'
import {
  mediaMode, listGalleryMedia, addGalleryMedia, removeGalleryMedia,
  getHomeMedia, saveHomeMedia, removeHomeMedia
} from '../../services/media.js'
import './Media.css'

const fileTitle = file => file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g,' ').trim().slice(0,100) || 'Kegiatan Akademi'

export default function OwnerMedia() {
  const [tab,setTab]=useState('gallery')
  const [gallery,setGallery]=useState([])
  const [home,setHome]=useState(null)
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [galleryFiles,setGalleryFiles]=useState([])
  const [galleryTitle,setGalleryTitle]=useState('')
  const [homeFile,setHomeFile]=useState(null)
  const [homeTitle,setHomeTitle]=useState('')
  const [homeDescription,setHomeDescription]=useState('')
  const [imagePreview,setImagePreview]=useState('')

  async function reload() {
    const [photos,featured]=await Promise.all([listGalleryMedia(),getHomeMedia()])
    setGallery(photos)
    setHome(featured)
    return featured
  }
  useEffect(()=>{
    let active=true
    Promise.all([listGalleryMedia(),getHomeMedia()])
      .then(([photos,featured])=>{
        if(!active)return
        setGallery(photos);setHome(featured)
        setHomeTitle(featured?.title||'Sorotan Akademi')
        setHomeDescription(featured?.description||'')
      })
      .catch(e=>active&&setError(e.message))
      .finally(()=>active&&setLoading(false))
    return()=>{active=false}
  },[])
  useEffect(()=>{
    if(!homeFile){setImagePreview('');return}
    const url=URL.createObjectURL(homeFile)
    setImagePreview(url)
    return()=>URL.revokeObjectURL(url)
  },[homeFile])

  async function uploadGallery(e) {
    e.preventDefault()
    if(!galleryFiles.length){setError('Pilih foto Gallery terlebih dahulu.');return}
    if(galleryFiles.length>20){setError('Unggah maksimal 20 foto dalam satu proses.');return}
    const formElement=e.currentTarget
    setBusy(true);setError('');setNotice('')
    let count=0
    try{
      for(const file of galleryFiles){
        await addGalleryMedia(file,galleryFiles.length===1&&galleryTitle.trim()?galleryTitle:fileTitle(file))
        count++
      }
      await reload()
      setGalleryFiles([]);setGalleryTitle('')
      formElement.reset()
      setNotice(`${count} foto berhasil disimpan ${mediaMode==='local-demo'?'di browser ini':'ke server'}.`)
    }catch(err){
      setError(`${count} foto berhasil disimpan. Proses berhenti: ${err.message}`)
      await reload().catch(()=>{})
    }finally{setBusy(false)}
  }
  async function deleteGallery(id,title) {
    if(!window.confirm(`Hapus foto "${title}" dari Gallery?`))return
    setBusy(true);setError('');setNotice('')
    try{
      await removeGalleryMedia(id)
      await reload()
      setNotice('Foto berhasil dihapus.')
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  }
  async function updateHome(e) {
    e.preventDefault()
    setBusy(true);setError('');setNotice('')
    try{
      const item=await saveHomeMedia(homeFile,homeTitle,homeDescription)
      setHome(item)
      setHomeFile(null)
      setNotice(`Foto Sorotan Beranda berhasil ${mediaMode==='local-demo'?'disimpan sebagai pratinjau lokal':'dipublikasikan'}.`)
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  }
  async function deleteHome() {
    if(!window.confirm('Hapus foto Sorotan Beranda?'))return
    setBusy(true);setError('');setNotice('')
    try{
      await removeHomeMedia()
      setHome(null);setHomeFile(null);setHomeTitle('Sorotan Akademi');setHomeDescription('')
      setNotice('Foto Sorotan Beranda dihapus.')
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  }
  return <div className="view active adm owner-admin-page owner-media-admin">
    <OwnerPageHeading icon="camera" title="Media & Foto" description="Kelola Gallery dan Sorotan Beranda secara terpisah. Perubahan tidak memengaruhi berita."/>
    <div className="owner-media-mode" role="status">
      {mediaMode==='local-demo'
        ? <><strong>Mode pratinjau lokal:</strong> foto tersimpan pada browser ini saja. Pengunjung di HP lain belum melihat perubahan. Untuk publikasi bersama, jalankan backend media dan hubungkan database PostgreSQL.</>
        : <><strong>Mode server:</strong> foto tersimpan pada backend. Perubahan dapat dilihat pengunjung yang mengakses server yang sama.</>}
    </div>
    <div className="owner-media-tabs" role="tablist" aria-label="Pengelolaan foto">
      <button type="button" role="tab" aria-selected={tab==='gallery'} className={tab==='gallery'?'active':''} onClick={()=>setTab('gallery')}>Gallery</button>
      <button type="button" role="tab" aria-selected={tab==='home'} className={tab==='home'?'active':''} onClick={()=>setTab('home')}>Beranda</button>
    </div>
    {error&&<p className="owner-media-error" role="alert">{error}</p>}
    {notice&&<p className="owner-media-success" role="status">{notice}</p>}
    {loading?<div className="card"><p className="mut">Memuat media…</p></div>:tab==='gallery'?<>
      <section className="card owner-media-card" aria-label="Unggah foto Gallery">
        <h3><OwnerIcon name="camera" size={19}/> Tambah foto Gallery</h3>
        <p className="mut">Foto yang Anda unggah akan menggantikan foto ilustrasi Pexels dalam Gallery. Anda bisa memilih beberapa foto sekaligus.</p>
        <form onSubmit={uploadGallery} className="owner-media-form">
          <label>Foto (JPG, PNG, WebP; maksimal 8 MB per foto)
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>setGalleryFiles(Array.from(e.target.files||[]))}/>
          </label>
          <label>Judul foto (opsional, jika memilih satu foto)
            <input type="text" maxLength={100} placeholder="Contoh: Latihan Futsal Junior" value={galleryTitle} onChange={e=>setGalleryTitle(e.target.value)} disabled={busy}/>
          </label>
          {galleryFiles.length>0&&<p className="mut">{galleryFiles.length} foto dipilih. Jika lebih dari satu, judul mengikuti nama file.</p>}
          <button type="submit" className="abtn" disabled={busy||!galleryFiles.length}>{busy?'Memproses…':'Unggah ke Gallery'}</button>
        </form>
      </section>
      <section className="owner-media-list" aria-label="Foto Gallery tersimpan">
        <h3>Foto Gallery tersimpan</h3>
        {gallery.length===0?<div className="card"><p className="mut">Belum ada foto Owner. Gallery publik masih menggunakan foto ilustrasi.</p></div>:<div className="owner-media-grid">
          {gallery.map(item=><article key={item.id} className="card owner-media-thumb">
            <img src={item.img} alt={item.title||'Foto Academy'} loading="lazy"/>
            <div className="owner-media-thumb-footer">
              <span title={item.title}>{item.title||'Foto Akademi'}</span>
              <button type="button" className="abtn danger" disabled={busy} onClick={()=>deleteGallery(item.id,item.title||'foto')}>Hapus</button>
            </div>
          </article>)}
        </div>}
      </section>
    </>:<>
      <section className="card owner-media-card" aria-label="Sorotan foto Beranda">
        <h3><OwnerIcon name="camera" size={19}/> Foto Sorotan Beranda</h3>
        <p className="mut">Foto Beranda dikelola sendiri, tidak tercampur dengan Gallery. Saat dipublikasikan, foto tampil di bagian Sorotan Akademi setelah hero Beranda; DriftWall dan logo B.N.R tetap ada.</p>
        <form onSubmit={updateHome} className="owner-media-form">
          <label>Pilih foto unggulan (JPG, PNG, WebP; maksimal 8 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setHomeFile(e.target.files?.[0]||null)} disabled={busy}/>
          </label>
          <label>Judul sorotan
            <input type="text" maxLength={100} required value={homeTitle} onChange={e=>setHomeTitle(e.target.value)} disabled={busy}/>
          </label>
          <label>Keterangan singkat (opsional)
            <textarea rows={3} maxLength={200} value={homeDescription} onChange={e=>setHomeDescription(e.target.value)} disabled={busy}/>
          </label>
          {(imagePreview||home?.img)&&<figure className="owner-media-home-preview">
            <img src={imagePreview||home.img} alt="Pratinjau Sorotan Beranda"/>
            <figcaption>{imagePreview?'Foto baru belum disimpan':'Foto unggulan saat ini'}</figcaption>
          </figure>}
          <div className="owner-media-buttons">
            <button type="submit" className="abtn" disabled={busy||(!home&&!homeFile)}>{busy?'Menyimpan…':'Simpan Sorotan Beranda'}</button>
            {home&&<button type="button" className="abtn danger" disabled={busy} onClick={deleteHome}>Hapus Foto Beranda</button>}
          </div>
        </form>
      </section>
    </>}
  </div>
}
