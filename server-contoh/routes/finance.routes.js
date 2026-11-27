import express from 'express';
import {authorize} from '../middleware/authorize.js';
import {id} from '../services/academy.validation.js';
import {createFinanceService} from '../services/finance.service.js';
export function mountFinance(app,authenticate,pool){
 const s=createFinanceService(pool),both=[authenticate,authorize('owner','pemain')],owner=[authenticate,authorize('owner')],player=[authenticate,authorize('pemain')],json=express.json({limit:'64kb'}),proof=express.json({limit:'3mb'});
 const h=(fn,status=200)=>(q,r,n)=>Promise.resolve().then(async()=>{r.set('Cache-Control','no-store');r.status(status).json({ok:true,...await fn(q)})}).catch(n);
 const root='/api/v1';
 app.get(root+'/me/finance',...both,h(async q=>({finance:await s.overview(q.user,q.query.month)})));
 app.post(root+'/owner/finance/fees',...owner,json,h(async q=>({item:await s.saveFee(q.user,q.body)}),201));
 app.put(root+'/owner/finance/fees/:id',...owner,json,h(async q=>({item:await s.saveFee(q.user,q.body,id(q.params.id))})));
 app.post(root+'/owner/finance/accounts',...owner,json,h(async q=>({item:await s.createAccount(q.user,q.body)}),201));
 app.patch(root+'/owner/finance/accounts/:id',...owner,json,h(async q=>({item:await s.accountActive(q.user,id(q.params.id),q.body)})));
 app.post(root+'/owner/finance/invoices',...owner,json,h(async q=>({result:await s.createInvoices(q.user,q.body)}),201));
 app.post(root+'/owner/finance/invoices/:id/cancel',...owner,h(async q=>({item:await s.cancel(q.user,id(q.params.id))})));
 app.post(root+'/owner/finance/invoices/:id/cash',...owner,json,h(async q=>({item:await s.cash(q.user,id(q.params.id),q.body)}),201));
 app.post(root+'/me/finance/invoices/:id/transfer',...player,proof,h(async q=>({item:await s.submit(q.user,id(q.params.id),q.body)}),201));
 app.patch(root+'/owner/finance/payments/:id',...owner,json,h(async q=>({item:await s.decide(q.user,id(q.params.id),q.body)})));
 app.get(root+'/me/finance/payments/:id/proof',...both,h(async q=>await s.proof(q.user,id(q.params.id))));
}
