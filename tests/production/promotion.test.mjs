import {test} from "node:test";
import assert from "node:assert/strict";
import {promoteCandidates} from "../../pipeline/promote-candidates.mjs";
import {digest} from "../../validators/production-gates.mjs";
const id=(p,n)=>p+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
const refs={lex:id("lex",2601),src:id("src",2601),ev1:id("evd",2601),ev2:id("evd",2602),ev3:id("evd",2603),ev4:id("evd",2604),rev:id("rev",2601)};
const base=()=>{
 const lex={_id:refs.lex,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",language:"en",lemma:"synthetic only",pos:"NOUN",entryKind:"word",evidenceIds:[refs.ev1,refs.ev2,refs.ev3,refs.ev4]};
 const source={_id:refs.src,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",title:"synthetic owner/rights fixture only",rights:{status:"redistributable",scopes:["dictionary_publication"],reviewerId:"rights-reviewer",permissionReference:"test-only"}};
 const ev=(id,field,value)=>({_id:id,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",sourceId:refs.src,assertionIds:[refs.lex],claim:{subjectId:refs.lex,fieldPath:field,valueDigest:digest(value),specificity:"exact_value"},independence:"independent_reviewed",reviewStatus:"accepted"});
 const review={_id:refs.rev,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",subjectIds:[refs.lex],reviewerId:"linguistic-reviewer",outcome:"accepted",role:"lead_editorial",appointmentReference:"test-only",claims:["/language","/lemma","/pos","/entryKind"].map(fieldPath=>({subjectId:refs.lex,fieldPath,valueDigest:digest(lex[fieldPath.slice(1)])}))};
 return {formatVersion:1,batches:{},mappings:{},records:[lex,source,ev(refs.ev1,"/lemma","synthetic only"),ev(refs.ev2,"/pos","NOUN"),ev(refs.ev3,"/language","en"),ev(refs.ev4,"/entryKind","word"),review],history:[]};
};
const promotion={promotionId:"test-promotion-1",subjects:[{canonicalId:refs.lex,expectedRevision:1}]};
const trust={
 ownerId:"owner",effectiveAt:"2026-10-30T00:00:00Z",verifyOwnerAttestation:()=>true,
 verifyEvidence:()=>true,verifyRights:()=>true,appointments:[
  {appointmentKey:"test-only",reviewerId:"linguistic-reviewer",appointedByOwnerId:"owner",role:"lead_editorial",scope:{subjectIds:[refs.lex],fieldPaths:["/language","/lemma","/pos","/entryKind"]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"},
  {appointmentKey:"test-only",reviewerId:"rights-reviewer",appointedByOwnerId:"owner",role:"rights",scope:{subjectIds:[refs.src]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"}
 ]};
test("production CLI without independent appointment/evidence/rights verification cannot promote",()=>{
 const state=base(),attempt=promoteCandidates(state,promotion);
 assert.equal(attempt.report.status,"blocked");
 assert.deepEqual(attempt.state,state);
 assert.ok(attempt.report.issues.some(i=>i.code==="LER_AUTHORITY_UNVERIFIED"));
});
test("test-only verified authority simulation illustrates atomic promotion, history and replay",()=>{
 // Trust callbacks are mocked; not real lexicographic authority or approval.
 const state=base();
 const preview=promoteCandidates(state,promotion,{...trust,dryRun:true});
 assert.equal(preview.report.status,"dry-run",JSON.stringify(preview.report.issues));
 assert.deepEqual(preview.state,state);
 const first=promoteCandidates(state,promotion,trust);
 assert.equal(first.report.status,"promoted",JSON.stringify(first.report.issues));
 assert.equal(first.state.records[0].editorialStatus,"verified");
 assert.equal(first.state.records[0].revision,2);
 assert.equal(first.state.history.at(-1).before[0].editorialStatus,"draft");
 assert.equal(first.state.history.at(-1).after[0].editorialStatus,"verified");
 const again=promoteCandidates(first.state,promotion,trust);
 assert.equal(again.report.status,"replayed");assert.deepEqual(again.state,first.state);
 const changed=promoteCandidates(first.state,{...promotion,subjects:[{canonicalId:refs.lex,expectedRevision:2}]},trust);
 assert.equal(changed.report.status,"conflict");
});
test("stale CAS or disputed status does not partially promote",()=>{
 const state=base(),stale=promoteCandidates(state,{...promotion,subjects:[{canonicalId:refs.lex,expectedRevision:10}]},trust);
 assert.equal(stale.report.status,"conflict");assert.deepEqual(stale.state,state);
 state.records[0].editorialStatus="disputed";
 const disputed=promoteCandidates(state,promotion,trust);
 assert.equal(disputed.report.status,"blocked");assert.deepEqual(disputed.state,state);
});
