import {test} from "node:test";
import assert from "node:assert/strict";
import {verifyReviewerAppointment} from "../../validators/authority-v2.mjs";
import {evaluatePublication,digest} from "../../validators/production-gates.mjs";
const id=(p,n)=>p+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
const scopeId=id("sns",2201);
const appointment={
 appointmentKey:"owner-2026-gram-001",reviewerId:"reviewer-account",appointedByOwnerId:"actual-owner-id",
 role:"grammar",scope:{subjectIds:[scopeId],fieldPaths:["/grammar/countability"]},
 effectiveFrom:"2026-01-01T00:00:00Z",revokedAt:null,ownerAttestationRef:"external-proof-opaque"
};
const validArgs={appointments:[appointment],ownerId:"actual-owner-id",effectiveAt:"2026-10-30T00:00:00Z",verifyOwnerAttestation:()=>true};
test("self-asserted appointment or missing external verification cannot convey authority",()=>{
 for(const options of [{...validArgs,verifyOwnerAttestation:undefined},{...validArgs,verifyOwnerAttestation:()=>false},{...validArgs,ownerId:"not-owner"}]){
  assert.equal(verifyReviewerAppointment(options,{reviewerId:"reviewer-account",role:"grammar",subjectId:scopeId,fieldPath:"/grammar/countability",appointmentReference:appointment.appointmentKey}),false);
 }
});
test("verified owner attestation is still constrained by subject, field, date and revocation",()=>{
 const subject={reviewerId:"reviewer-account",role:"grammar",subjectId:scopeId,fieldPath:"/grammar/countability",appointmentReference:appointment.appointmentKey};
 assert.equal(verifyReviewerAppointment(validArgs,subject),true,"test-only trust simulation, never real owner evidence");
 for(const changes of [
  {subjectId:id("sns",2202)},{role:"lead_editorial"},{fieldPath:"/definition"},{reviewerId:"wrong-reviewer"},
  {appointmentReference:"other-reference"}
 ])assert.equal(verifyReviewerAppointment(validArgs,{...subject,...changes}),false);
 assert.equal(verifyReviewerAppointment({...validArgs,appointments:[{...appointment,revokedAt:"2026-05-01T00:00:00Z"}]},subject),false);
 assert.equal(verifyReviewerAppointment({...validArgs,effectiveAt:"2025-12-31T00:00:00Z"},subject),false);
 assert.equal(verifyReviewerAppointment({...validArgs,appointments:[{...appointment,appointedByOwnerId:"reviewer-account"}]},subject),false,"reviewer cannot appoint self");
});
test("self-reported independent evidence is not a verified attestation",()=>{
 const lex={_id:id("lex",2203),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"verified",language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word",evidenceIds:[id("evd",2203)]};
 const evidence={_id:id("evd",2203),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",sourceId:id("src",2203),assertionIds:[lex._id],claim:{subjectId:lex._id,fieldPath:"/lemma",specificity:"exact_value",valueDigest:digest("synthetic")},reviewStatus:"accepted",independence:"independent_reviewed"};
 const source={_id:id("src",2203),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",title:"synthetic source",rights:{status:"redistributable",scopes:["dictionary_publication"],reviewerId:"reviewer-account",permissionReference:"external-proof-opaque"}};
 const result=evaluatePublication([lex,evidence,source],{...validArgs,isAuthorized:()=>true,verifyRights:()=>true});
 assert.equal(result.eligible,false);
 assert.ok(result.issues.some(i=>i.code==="CLAIM_EVIDENCE_INSUFFICIENT"),JSON.stringify(result.issues));
});
