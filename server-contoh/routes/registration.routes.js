import express from 'express';
import rateLimit from 'express-rate-limit';
import {authorize} from '../middleware/authorize.js';
import {createRegistrationRepository} from '../repositories/registration.repository.js';
import {createPlayerStatusRepository} from '../repositories/player-status.repository.js';
import {createRegistrationService} from '../services/registration.service.js';
import {registrationController} from '../controllers/registration.controller.js';
export function mountRegistration(app,authenticate,pool){
  const c=registrationController(createRegistrationService(createRegistrationRepository(pool),createPlayerStatusRepository(pool)));
  const owner=[authenticate,authorize('owner')];
  const json=express.json({limit:'16kb'});
  const limiter=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false,message:{ok:false,message:'Terlalu banyak pengajuan. Coba lagi nanti.'}});
  app.get('/api/v1/programs',c.programs);
  app.post('/api/v1/registrations',limiter,json,c.submit);
  app.get('/api/v1/owner/registrations',...owner,c.list);
  app.get('/api/v1/owner/registrations/:id',...owner,c.detail);
  app.post('/api/v1/owner/registrations/:id/approve',...owner,json,c.approve);
  app.post('/api/v1/owner/registrations/:id/reject',...owner,json,c.reject);
  app.get('/api/v1/owner/players',...owner,c.players);
  app.get('/api/v1/owner/players/:id',...owner,c.player);
  app.patch('/api/v1/owner/players/:id/status',...owner,json,c.playerStatus);
}
