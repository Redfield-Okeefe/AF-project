import {validateRegistration,validateReview,validateList,requireId} from '../validators/registration.validator.js';
export function createRegistrationService(repo){
  return {
    listPrograms:()=>repo.listPrograms(),
    submit:body=>repo.create(validateRegistration(body)),
    listRegistrations:query=>repo.listRegistrations(validateList(query,['menunggu','diterima','ditolak','dibatalkan'])),
    registrationDetail:id=>repo.registrationDetail(requireId(id)),
    listPlayers:query=>repo.listPlayers(validateList(query,['calon','aktif','nonaktif'])),
    playerDetail:id=>repo.playerDetail(requireId(id)),
    review:(id,decision,body,actor)=>repo.review(requireId(id),decision,validateReview(body,decision),actor)
  };
}
