// Fail closed. Appointments stored in JSON are claims, not authority.
// A caller must supply independently authenticated owner-approval verification.
export function verifyReviewerAppointment(options={},query={}){
 const {appointments,ownerId,effectiveAt,verifyOwnerAttestation}=options;
 if(!Array.isArray(appointments)||!ownerId||!effectiveAt||typeof verifyOwnerAttestation!=="function")
  return false;
 const now=Date.parse(effectiveAt);
 if(!Number.isFinite(now)||typeof query.reviewerId!=="string"||!query.reviewerId||!query.appointmentReference)return false;
 for(const appointment of appointments){
  if(!appointment||appointment.appointmentKey!==query.appointmentReference||
     appointment.reviewerId!==query.reviewerId||appointment.role!==query.role||
     appointment.appointedByOwnerId!==ownerId||appointment.appointedByOwnerId===appointment.reviewerId||
     !appointment.ownerAttestationRef||!appointment.scope||!Array.isArray(appointment.scope.subjectIds)||
     !appointment.scope.subjectIds.includes(query.subjectId))continue;
  if(appointment.scope.fieldPaths!==undefined&&
     (!query.fieldPath||!Array.isArray(appointment.scope.fieldPaths)||!appointment.scope.fieldPaths.includes(query.fieldPath)))continue;
  const from=Date.parse(appointment.effectiveFrom);
  if(!Number.isFinite(from)||now<from)continue;
  if(appointment.effectiveUntil!==undefined){
   const until=Date.parse(appointment.effectiveUntil);
   if(!Number.isFinite(until)||now>until)continue;
  }
  if(appointment.revokedAt){
   const revoked=Date.parse(appointment.revokedAt);
   if(!Number.isFinite(revoked)||now>=revoked)continue;
  }
  try{
   if(verifyOwnerAttestation({appointment,ownerId,subjectId:query.subjectId,fieldPath:query.fieldPath,role:query.role})===true)
    return true;
  }catch{/* Authentication errors are denial. */}
 }
 return false;
}
