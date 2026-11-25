import {getToken} from '../utils/auth.js'
import {apiRequest} from './otp-contract.js'
const API_URL = import.meta.env.VITE_API_URL
export const coachApiEnabled = Boolean(API_URL)
async function request(path,method='GET',body,authenticated=false){
  return apiRequest(API_URL,path,{method,body,token:authenticated?getToken():undefined})
}
export const coachOtpRequest = email=>request('/api/v1/auth/coach/otp/request','POST',{email})
export const coachRegister = body=>request('/api/v1/auth/coach/register','POST',body)
export const coachLogin = body=>request('/api/v1/auth/coach/login','POST',body)
export const coachStatus = ()=>request('/api/v1/auth/coach/status','GET',undefined,true)
export const ownerCoaches = ()=>request('/api/v1/owner/coaches','GET',undefined,true)
export const ownerReviewCoach = (id,status,alasan='')=>request('/api/v1/owner/coaches/'+encodeURIComponent(id)+'/status','PATCH',{status,alasan},true)
