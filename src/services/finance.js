import {apiRequest} from './otp-contract.js'
import {getToken} from '../utils/auth.js'
const req=(path,method='GET',body)=>apiRequest(import.meta.env.VITE_API_URL,'/api/v1'+path,{method,body,token:getToken()})
export const finance={
 load:month=>req('/me/finance'+(month?'?month='+encodeURIComponent(month):'')).then(r=>r.finance),
 saveFee:(b,id)=>req('/owner/finance/fees'+(id?'/'+id:''),id?'PUT':'POST',b),
 createAccount:b=>req('/owner/finance/accounts','POST',b),
 accountActive:(id,active)=>req('/owner/finance/accounts/'+id,'PATCH',{active}),
 createInvoices:b=>req('/owner/finance/invoices','POST',b),
 cancel:id=>req('/owner/finance/invoices/'+id+'/cancel','POST'),
 cash:(id,paid_on)=>req('/owner/finance/invoices/'+id+'/cash','POST',{paid_on}),
 transfer:(id,b)=>req('/me/finance/invoices/'+id+'/transfer','POST',b),
 decide:(id,b)=>req('/owner/finance/payments/'+id,'PATCH',b),
 proof:id=>req('/me/finance/payments/'+id+'/proof').then(r=>r.image)
}
export function proofData(file){return new Promise((resolve,reject)=>{if(!file||!['image/jpeg','image/png'].includes(file.type)||file.size>2097152)return reject(new Error('Pilih JPG/PNG maksimal 2 MB.'));const r=new FileReader();r.onerror=()=>reject(new Error('File gagal dibaca.'));r.onload=()=>resolve(r.result);r.readAsDataURL(file)})}
export const rupiahExact=v=>'Rp '+BigInt(v??0).toLocaleString('id-ID')
export function csvCell(v){const s=String(v??'');return '"'+(/^[\s]*[=+\-@\t\r\n]/.test(s)?"'"+s:s).replaceAll('"','""')+'"'}
export function exportFinance(d){const rows=[['Nomor tagihan','Nama tagihan','Pemain','Jenis','Periode','Jatuh tempo','Status','Total','Terverifikasi','Sisa'],...d.invoices.map(i=>[i.invoice_number,i.title||'',i.full_name,i.invoice_type,i.month,i.due_on,i.status,i.total_amount,i.verified_amount,['draft','dibatalkan'].includes(i.status)?'':String(BigInt(i.total_amount)-BigInt(i.verified_amount))]),[],['Ringkasan periode',d.period],['Total tagihan',d.summary.billed],['Terverifikasi untuk tagihan periode',d.summary.verified],['Sisa',d.summary.outstanding],['Penerimaan menurut tanggal bayar',d.summary.receipts],['Menunggu verifikasi',d.summary.pending],[],['Metode pembayaran (tanggal bayar)','Nominal terverifikasi'],...(d.receipts_by_method||[]).map(x=>[x.payment_method,x.amount])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='bnr-keuangan-'+d.period+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
