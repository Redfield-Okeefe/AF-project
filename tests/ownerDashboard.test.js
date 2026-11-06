import test from 'node:test'
import assert from 'node:assert/strict'
import { validasiPeriodeBulan } from '../src/utils/ownerDashboard.js'

for (const [raw, months] of [['1',1],['3',3],['6',6],['12',12],['24',24],[' 06 ',6]]) {
  test(`Periode valid: ${JSON.stringify(raw)}`, () => {
    assert.deepEqual(validasiPeriodeBulan(raw), { valid:true, jumlah:months })
  })
}
for (const raw of ['', ' ', '0', '-1', '1.5', '25', 'abc', '1e2', 'Infinity', 'NaN', '999999999999999999999999']) {
  test(`Periode ditolak: ${JSON.stringify(raw)}`, () => {
    const result = validasiPeriodeBulan(raw)
    assert.equal(result.valid, false)
    assert.match(result.pesan, /1 sampai 24/)
  })
}
