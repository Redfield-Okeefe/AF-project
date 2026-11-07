import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal.jsx'
import HeroWall from '../components/HeroWall.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import OwnerIcon from '../components/OwnerIcon.jsx'
import { STATS, FEATURES, PROGRAMS } from '../data/config.js'

const dirs = ['left', 'up', 'right']
const featureIcons = ['award', 'trend', 'stadium']
const programIcons = ['sprout', 'target', 'zap']

export default function Home() {
  return (
    <>
      <div className="hero">
        <HeroWall />
        <div className="hero-in">
          <Reveal anim="left" className="hero-text">
            <span className="tag"><i className="dot" /> Pendaftaran Dibuka</span>
            <h1>Wujudkan Bakat <span>Futsal</span> Anak Anda</h1>
            <p className="lead">Akademi futsal dengan pelatih berlisensi, kurikulum terstruktur, dan suasana latihan yang seru untuk semua usia.</p>
            <div className="cta">
              <Link className="btn lg" to="/pendaftaran">Daftar Sekarang →</Link>
              <Link className="btn lg o" to="/contact">Hubungi Kami</Link>
            </div>
            <div className="stats">
              {STATS.map((s) => (
                <div key={s.label}><b>{s.value}</b><small>{s.label}</small></div>
              ))}
            </div>
          </Reveal>

          <Reveal anim="right" delay={150} className="hero-visual">
            <div className="ball-card"><BrandLogo className="ball-logo" /></div>
            <div className="float f1"><em><OwnerIcon name="award" size={21}/></em><div><b>Juara Turnamen</b><small>50+ trofi diraih</small></div></div>
            <div className="float f2"><em><OwnerIcon name="sparkles" size={21}/></em><div><b>Pelatih Berlisensi</b><small>12 pelatih</small></div></div>
          </Reveal>
        </div>
      </div>

      <div className="w">
        <span className="section-eyebrow">KEUNGGULAN KAMI</span>
        <Reveal as="h2" anim="down">Mengapa Memilih Kami?</Reveal>
        <Reveal as="p" anim="down" delay={100} className="sub">Tiga alasan orang tua mempercayakan putranya kepada kami.</Reveal>
        <div className="grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} anim={dirs[i % 3]} delay={i * 120} className="card">
              <div className="ic"><OwnerIcon name={featureIcons[i]} size={27}/></div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="alt">
        <div className="w">
          <span className="section-eyebrow">PILIH KELASMU</span>
          <Reveal as="h2" anim="down">Program Latihan</Reveal>
          <Reveal as="p" anim="down" delay={100} className="sub">Pilih program sesuai usia dan tujuan.</Reveal>
          <div className="grid">
            {PROGRAMS.map((p, i) => (
              <Reveal key={p.title} anim="zoom" delay={i * 120} className="card">
                <div className="ic"><OwnerIcon name={programIcons[i]} size={27}/></div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
                <span className="price">{p.freq}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <section className="journey-section">
        <div className="w">
          <Reveal as="div" anim="up" className="section-heading">
            <span className="section-eyebrow">PERJALANAN DI AKADEMI</span>
            <h2>Mulai perjalanan futsalmu di sini</h2>
            <p className="sub">Proses yang jelas dari pendaftaran hingga mengikuti latihan bersama tim.</p>
          </Reveal>
          <div className="journey-grid">
            {[
              { n: '01', icon: 'file-check', title: 'Daftar Online', text: 'Isi formulir pendaftaran dan lengkapi informasi calon pemain.' },
              { n: '02', icon: 'check-circle', title: 'Konfirmasi', text: 'Ikuti tahapan konfirmasi dan pembayaran sesuai informasi akademi.' },
              { n: '03', icon: 'ball', title: 'Mulai Berlatih', text: 'Akses portal pemain untuk melihat jadwal dan pengumuman.' },
            ].map((step, i) => (
              <Reveal key={step.n} anim="up" delay={i * 100} className="journey-card">
                <span className="journey-number">{step.n}</span>
                <span className="journey-icon" aria-hidden="true"><OwnerIcon name={step.icon} size={30}/></span>
                <h3>{step.title}</h3><p>{step.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="w academy-cta">
        <div className="academy-cta-inner">
          <div><span className="section-eyebrow">BERGABUNG BERSAMA KAMI</span><h2>Siap menjadi bagian dari tim?</h2><p>Temukan program latihan yang sesuai dan mulai mengembangkan potensimu di lapangan.</p></div>
          <div className="academy-cta-actions"><Link className="btn lg" to="/pendaftaran">Mulai Pendaftaran →</Link><Link className="btn lg o" to="/login">Masuk Portal</Link></div>
        </div>
      </section>
    </>
  )
}
