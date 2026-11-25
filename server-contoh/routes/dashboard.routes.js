import {authorize} from '../middleware/authorize.js';
import {createDashboardService} from '../services/dashboard.service.js';
export function mountDashboard(app,authenticate,pool){
 const svc=createDashboardService(pool);
 app.get('/api/v1/me/dashboard',authenticate,authorize('owner','pelatih','pemain'),(req,res,next)=>Promise.resolve().then(async()=>{res.set('Cache-Control','no-store');res.json({ok:true,dashboard:await svc.read(req.user,req.query.month)});}).catch(next));
}
