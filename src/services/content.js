import {apiRequest} from './otp-contract.js'
import {getToken} from '../utils/auth.js'
const req=(path,method='GET',body)=>apiRequest(import.meta.env.VITE_API_URL,'/api/v1'+path,{method,body,token:getToken()})
export const content={assessments:()=>req('/me/assessments'),roster:(id,month)=>req('/coach/assessments/roster/'+id+'?month='+encodeURIComponent(month)),saveAssessment:b=>req('/coach/assessments','PUT',b),announcements:()=>req('/me/announcements'),createAnnouncement:b=>req('/announcements','POST',b),deleteAnnouncement:id=>req('/announcements/'+id,'DELETE')}
