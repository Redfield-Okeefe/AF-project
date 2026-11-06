/** Validasi jumlah bulan grafik untuk Portal Owner. */
export function validasiPeriodeBulan(input) {
  const raw = String(input).trim()
  const jumlah = Number(raw)
  return /^\d+$/.test(raw) && Number.isSafeInteger(jumlah) && jumlah >= 1 && jumlah <= 24
    ? { valid: true, jumlah }
    : { valid: false, pesan: 'Masukkan bilangan bulat dari 1 sampai 24 bulan.' }
}

