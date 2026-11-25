import {apiRequest} from './otp-contract.js'
import {getToken} from '../utils/auth.js'
const base=import.meta.env.VITE_API_URL
export const academyApiEnabled=Boolean(base)
const req=(path,method='GET',body)=>apiRequest(base,'/api/v1'+path,{method,body,token:getToken()})
export const academy={
 programs:()=>req('/owner/programs'), saveProgram:(d,id)=>req('/owner/programs'+(id?'/'+id:''),id?'PUT':'POST',d), programStatus:(id,status)=>req('/owner/programs/'+id+'/status','PATCH',{status}),
 classes:()=>req('/me/classes'),options:()=>req('/owner/classes/options'),members:id=>req('/owner/classes/'+id+'/members'),saveClass:(d,id)=>req('/owner/classes'+(id?'/'+id:''),id?'PUT':'POST',d),classStatus:(id,status)=>req('/owner/classes/'+id+'/status','PATCH',{status}),addMember:(id,k,d)=>req('/owner/classes/'+id+'/'+k,'POST',d),endMember:(id,k,m,end_date)=>req('/owner/classes/'+id+'/'+k+'/'+m+'/end','PATCH',{end_date}),
 sessions:()=>req('/me/sessions'),saveSession:(d,id)=>req('/coach/sessions'+(id?'/'+id:''),id?'PUT':'POST',d),cancelSession:(id,owner=false)=>req((owner?'/owner':'/coach')+'/sessions/'+id+'/cancel','POST'),roster:id=>req('/coach/sessions/'+id+'/attendance'),saveAttendance:(id,items)=>req('/coach/sessions/'+id+'/attendance','PUT',{items}),attendance:()=>req('/me/attendance')
}
export function localDay(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day}
