import express from 'express';
import {authorize} from '../middleware/authorize.js';
import {id} from '../services/academy.validation.js';
import {ApiError} from '../services/auth.service.js';
import {createContentService} from '../services/content.service.js';
export function mountContent(app,authenticate,pool){
 const s=createContentService(pool),all=[authenticate,authorize('owner','pelatih','pemain')],writers=[authenticate,authorize('owner','pelatih')],coach=[authenticate,authorize('pelatih')],owner=[authenticate,authorize('owner')],json=express.json({limit:'64kb'}),newsJson=express.json({limit:'1500kb'});
 const h=(fn,status=200)=>(q,r,n)=>Promise.resolve().then(async()=>{r.set('Cache-Control','no-store');r.status(status).json({ok:true,...await fn(q)})}).catch(n);
 app.get('/api/v1/me/assessments',...all,h(async q=>({items:await s.assessments(q.user)})));
 app.get('/api/v1/coach/assessments/roster/:id',...coach,h(async q=>({items:await s.roster(q.user,id(q.params.id),q.query.month)})));
 app.put('/api/v1/coach/assessments',...coach,json,h(async q=>({assessment:await s.saveAssessment(q.user,q.body)})));
 app.get('/api/v1/me/announcements',...all,h(async q=>({items:await s.announcements(q.user)})));
 app.post('/api/v1/me/announcements/:id/read',...all,h(async q=>({read:await s.readAnnouncement(q.user,id(q.params.id))})));
 app.post('/api/v1/announcements',...writers,json,h(async q=>({announcement:await s.createAnnouncement(q.user,q.body)}),201));
 app.delete('/api/v1/announcements/:id',...writers,h(async q=>({announcement:await s.removeAnnouncement(q.user,id(q.params.id))})));
 app.get('/api/v1/public/news',h(async()=>({items:await s.news()})));
 app.get('/api/v1/public/news/:slug',h(async q=>{const [item]=await s.news(null,q.params.slug);if(!item)throw new ApiError(404,'Berita tidak ditemukan.');return {item}}));
 app.get('/api/v1/owner/news',...owner,h(async q=>({items:await s.news(q.user)})));
 app.post('/api/v1/owner/news',...owner,newsJson,h(async q=>({item:await s.saveNews(q.user,q.body)}),201));
 app.put('/api/v1/owner/news/:id',...owner,newsJson,h(async q=>({item:await s.saveNews(q.user,q.body,id(q.params.id))})));
 app.delete('/api/v1/owner/news/:id',...owner,h(async q=>({item:await s.archiveNews(q.user,id(q.params.id))})));
}
