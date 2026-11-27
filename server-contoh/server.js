import express from 'express';
import cors from 'cors';
import { authConfig, serverConfig } from './config/env.js';
import { getPool, verifyDatabase, closePool } from './config/database.js';
import { createUserRepository } from './repositories/user.repository.js';
import { createAuthService } from './services/auth.service.js';
import { authenticateWith } from './middleware/authenticate.js';
import { errorHandler } from './middleware/errorHandler.js';
import { mountAuth } from './routes/auth.routes.js';
import { setupMedia } from './media.js';
import { mountFinance } from './routes/finance.routes.js';
import { mountContent } from './routes/content.routes.js';
import { mountDashboard } from './routes/dashboard.routes.js';
import { mountProfile } from './routes/profile.routes.js';
import { mountAcademy } from './routes/academy.routes.js';
import { mountRegistration } from './routes/registration.routes.js';
import { mountActivation } from './routes/activation.routes.js';
import { mountAccountSecurity } from './routes/account-security.routes.js';
import { mountCoachRegistration } from './routes/coach-registration.routes.js';

try {
  const { port, host, origins } = serverConfig();
  const pool = getPool();
  const config = authConfig();
  await verifyDatabase(pool);
  const auth = createAuthService({ repo:createUserRepository(pool),config });
  const authenticate = authenticateWith(auth);
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({origin:origins}));
  app.get('/api/v1/health',async(req,res)=>{
    try { await verifyDatabase(pool); res.json({ok:true,database:'bnr_academy',status:'ready'}); }
    catch { res.status(503).json({ok:false,status:'database_unavailable'}); }
  });
  mountCoachRegistration(app,authenticate,pool,config,auth);
  mountAccountSecurity(app,authenticate,pool,config);
  mountAuth(app,auth,authenticate);
  mountRegistration(app,authenticate,pool);
  mountActivation(app,authenticate,pool,config);
  mountAcademy(app,authenticate,pool);
  mountProfile(app,authenticate,pool);
  mountDashboard(app,authenticate,pool);
  mountContent(app,authenticate,pool);
  mountFinance(app,authenticate,pool);
  setupMedia(app,authenticate,pool);
  app.use((req,res)=>res.status(404).json({ok:false,message:'Endpoint tidak ditemukan.'}));
  app.use(errorHandler);
  const server=app.listen(port,host,()=>console.log(`Backend BNR aktif: http://${host}:${port}\nPostgreSQL: bnr_academy\nFase 10: keuangan manual (kandidat)`));
  server.on('error',async error=>{ console.error('Server gagal:',error.code || error.name); await closePool(); process.exitCode=1; });
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.close(async()=>{await closePool();process.exit(0);}));
} catch(error) {
  console.error('Backend gagal dimulai:',error.code || error.message);
  await closePool(); process.exitCode=1;
}
