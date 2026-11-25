import { daftarAkun } from './db.js'
import { createOtpApi, validOtpEmail, validInvitation, normalizeEmail } from './otp-contract.js'
export { normalizeEmail, GMAIL_RE, validInvitation } from './otp-contract.js'

const API_URL = import.meta.env.VITE_API_URL
export const otpApiEnabled = Boolean(API_URL)
export const localOtpApi = otpApiEnabled && import.meta.env.DEV
export const isOtpEmail = email => validOtpEmail(email,localOtpApi)
const api=API_URL?createOtpApi(API_URL):null
const DEMO_KEY = 'af_demo_otp'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const OTP_LENGTH = 6
export async function requestOtp({ email, nama, peran, invitation_token }) {
  email = normalizeEmail(email)
  if (!isOtpEmail(email)) throw new Error(localOtpApi?'Gunakan Gmail atau email dummy .test.':'Gunakan alamat Gmail pribadi.')
  if(api){if(peran!=='pelatih'&&!validInvitation(invitation_token))throw new Error('Kode undangan wajib diisi (43 karakter).');return api.request({email,nama,peran,invitation_token})}

  await wait(700)
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000))
  sessionStorage.setItem(DEMO_KEY, JSON.stringify({ email, code, exp: Date.now() + 300000, tries: 0 }))
  return { ok: true, demo: true, demoCode: code, expiresIn: 300 }
}

export async function verifyOtp({ email, code, nama, password, password_confirmation, challenge_id, invitation_token, peran = 'player', lisensi = '', wa = '' }) {
  email = normalizeEmail(email)
  if (!/^\d{6}$/.test(code)) throw new Error('Masukkan 6 angka kode OTP.')
  if(api)return api.verify({email,code,nama,password,password_confirmation,challenge_id,invitation_token,peran,lisensi,wa})

  await wait(600)
  let d
  try { d = JSON.parse(sessionStorage.getItem(DEMO_KEY)) } catch { d = null }
  if (!d || d.email !== email) throw new Error('Kode belum diminta. Kirim kode terlebih dahulu.')
  if (Date.now() > d.exp) throw new Error('Kode sudah kedaluwarsa. Kirim ulang kode.')
  if (d.tries >= 5) throw new Error('Terlalu banyak percobaan salah. Kirim ulang kode baru.')
  if (d.code !== code) {
    d.tries += 1
    sessionStorage.setItem(DEMO_KEY, JSON.stringify(d))
    throw new Error(`Kode salah. Sisa percobaan: ${5 - d.tries}.`)
  }
  sessionStorage.removeItem(DEMO_KEY)
  // mode demo: akun dicatat di penyimpanan portal (pelatih berstatus "menunggu" sampai disetujui owner)
  const role = peran === 'pelatih' ? 'pelatih' : 'player'
  const u = daftarAkun({ email, nama, role, lisensi, wa })
  return { ok: true, demo: true, token: 'demo', role, user: { email, nama, status: u.status } }
}
