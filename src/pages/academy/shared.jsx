import {useEffect,useState,useRef} from 'react'
import './operations.css'
export const STATUS=['hadir','izin','sakit','alpa']
export const label=s=>s?s[0].toUpperCase()+s.slice(1):'–'
export const number=v=>v===''||v==null?null:Number(v)
export const pick=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o[k]??'']))
export function useLoad(loader,deps=[],keepData=false){
 const [state,setState]=useState({data:null,loading:true,error:''}),[rev,setRev]=useState(0)
 useEffect(()=>{let live=true;setState(prev=>({data:keepData?prev.data:null,loading:true,error:''}));Promise.resolve().then(loader).then(data=>{if(live)setState({data,loading:false,error:''})}).catch(e=>{if(live)setState({data:null,loading:false,error:e.message})});return()=>{live=false}},[...deps,rev])
 return {...state,reload:()=>setRev(r=>r+1)}
}
export function useAction(done){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState(''),lock=useRef(false)
 async function run(fn,msg){if(lock.current)return false;lock.current=true;setBusy(true);setError('');setInfo('');try{await fn();setInfo(msg);done?.();return true}catch(e){setError(e.message);return false}finally{lock.current=false;setBusy(false)}}
 return {busy,error,info,run}
}
export function Notice({state}){return <>{state.loading&&<p className="mut" role="status">Memuat data...</p>}{state.error&&<div className="alert err" role="alert">{state.error}</div>}{state.info&&<div className="alert ok" role="status">{state.info}</div>}</>}
export function Input({title,k,data,set,type='text',required=false,min,max,maxLength}){return <label>{title}<input type={type} value={data[k]??''} onChange={e=>set(d=>({...d,[k]:e.target.value}))} required={required} min={min} max={max} maxLength={maxLength}/></label>}
export function Select({title,k,data,set,children}){return <label>{title}<select required value={data[k]??''} onChange={e=>set(d=>({...d,[k]:e.target.value}))}>{children}</select></label>}
export function Buttons({busy,close}){return <div className="adm-actions"><button type="submit" className="abtn" disabled={busy}>{busy?'Menyimpan...':'Simpan'}</button><button type="button" className="abtn ghost" onClick={close} disabled={busy}>Batal</button></div>}
export function State({value}){return <span className={'pill '+(['aktif','selesai','hadir'].includes(value)?'ok':value==='terjadwal'?'warn':'mut')}>{label(value)}</span>}
export function Empty({when,children}){return when?<div className="card"><p className="mut">{children}</p></div>:null}
