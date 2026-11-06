import { useRef, useState } from 'react'
import { OTP_LENGTH } from '../services/otp.js'

// Kotak OTP 6 angka: otomatis pindah kotak, mendukung backspace dan tempel (paste).
// Untuk mengosongkan dari luar, ganti prop `key`.
export default function OtpInput({ onChange, disabled, autoFocus = true }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''))
  const refs = useRef([])

  const update = (arr) => {
    setDigits(arr)
    onChange(arr.join(''))
  }

  const isi = (start, teks) => {
    const angka = teks.replace(/\D/g, '').slice(0, OTP_LENGTH - start)
    if (!angka) return
    const arr = [...digits]
    for (let i = 0; i < angka.length; i++) arr[start + i] = angka[i]
    update(arr)
    refs.current[Math.min(start + angka.length, OTP_LENGTH - 1)]?.focus()
  }

  const ketik = (i, e) => {
    const v = e.target.value
    if (!v) {
      const arr = [...digits]
      arr[i] = ''
      update(arr)
      return
    }
    isi(i, v)
  }

  const tombol = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const arr = [...digits]
      arr[i - 1] = ''
      update(arr)
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus()
  }

  return (
    <div className="otp" role="group" aria-label="Kode OTP 6 angka">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && i === 0}
          maxLength={OTP_LENGTH}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => ketik(i, e)}
          onKeyDown={(e) => tombol(i, e)}
          onPaste={(e) => {
            e.preventDefault()
            isi(0, e.clipboardData.getData('text'))
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  )
}
