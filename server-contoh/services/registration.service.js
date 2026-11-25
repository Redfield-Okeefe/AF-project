import {RegistrationError,validateRegistration,validateReview,validateList,requireId} from '../validators/registration.validator.js';
export function createRegistrationService(repo,statusRepo){
  return {
    listPrograms:()=>repo.listPrograms(),
    submit:body=>repo.create(validateRegistration(body)),
    listRegistrations:query=>repo.listRegistrations(validateList(query,['menunggu','diterima','ditolak','dibatalkan'])),
    registrationDetail:id=>repo.registrationDetail(requireId(id)),
    listPlayers:query=>repo.listPlayers(validateList(query,['calon','aktif','nonaktif'])),
    playerDetail:id=>repo.playerDetail(requireId(id)),
    changePlayerStatus(id,body,actor){
      const playerId=requireId(id);
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='status')||!['aktif','nonaktif'].includes(body.status))throw new RegistrationError(400,'Status harus aktif atau nonaktif.');
      if(actor?.role!=='owner'||!Number.isInteger(actor.session_version)||actor.session_version<0)throw new RegistrationError(403,'Hanya Owner dapat mengubah status pemain.');
      return statusRepo.change(playerId,body.status,actor);
    },
    review:(id,decision,body,actor)=>repo.review(requireId(id),decision,validateReview(body,decision),actor)
  };
}
