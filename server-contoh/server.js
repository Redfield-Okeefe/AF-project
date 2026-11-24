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
import { mountRegistration } from './routes/registration.routes.js';

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
  mountAuth(app,auth,authenticate);
  mountRegistration(app,authenticate,pool);
  setupMedia(app,authenticate,pool);
  app.use((req,res)=>res.status(404).json({ok:false,message:'Endpoint tidak ditemukan.'}));
  app.use(errorHandler);
  const server=app.listen(port,host,()=>console.log(`Backend BNR aktif: http://${host}:${port}\nPostgreSQL: bnr_academy\nFase 2: login, me, role, media, pendaftaran`));
  server.on('error',async error=>{ console.error('Server gagal:',error.code || error.name); await closePool(); process.exitCode=1; });
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.close(async()=>{await closePool();process.exit(0);}));
} catch(error) {
  console.error('Backend gagal dimulai:',error.code || error.message);
  await closePool(); process.exitCode=1;
}
