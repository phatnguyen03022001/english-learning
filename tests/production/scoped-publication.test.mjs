import {test} from "node:test";
import assert from "node:assert/strict";
import {evaluatePublication} from "../../validators/production-gates.mjs";
const id=(n)=>"lex_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
const record=(n,status)=>({_id:id(n),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:status,language:"en",lemma:"synthetic"+n,pos:"NOUN",entryKind:"word"});
test("unrelated disputed candidate does not block independent scoped publication evaluation",()=>{
 const a=record(1901,"verified"),b=record(1902,"disputed");
 const result=evaluatePublication([a,b],{subjectIds:[a._id]});
 assert.equal(result.eligible,false,"missing evidence and LER still fail closed");
 assert.ok(result.issues.some(i=>i.entityId===a._id));
 assert.ok(result.issues.every(i=>i.entityId!==b._id),JSON.stringify(result.issues));
});
test("unknown subject and empty publication scope never yield eligibility",()=>{
 const a=record(1901,"draft");
 const result=evaluatePublication([a],{subjectIds:["lex_01940000-0000-7000-8000-000000009999"]});
 assert.equal(result.eligible,false);
 assert.ok(result.issues.some(i=>i.code==="PUBLICATION_SUBJECT_NOT_FOUND"));
});
test("sense publication scope follows inbound constructions owned by Construction.senseId",()=>{
 const entry={_id:"lex_01940000-0000-7000-8000-000000000201",schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",language:"en",lemma:"synthetic",pos:"VERB",entryKind:"word"};
 const sense={_id:"sns_01940000-0000-7000-8000-000000000202",schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",entryId:entry._id,definition:"Synthetic meaning"};
 const construction={_id:"con_01940000-0000-7000-8000-000000000203",schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",senseId:sense._id,constructionType:"verb_pattern",pattern:"synthetic + NP"};
 const unrelated=record(204,"disputed");
 const result=evaluatePublication([entry,sense,construction,unrelated],{subjectIds:[sense._id]});
 assert.equal(result.eligible,false);
 assert.ok(result.issues.some(issue=>issue.entityId===construction._id&&issue.code==="PUBLICATION_NOT_VERIFIED"),JSON.stringify(result.issues));
 assert.ok(result.issues.some(issue=>issue.entityId===construction._id&&issue.code==="CLAIM_EVIDENCE_INSUFFICIENT"),JSON.stringify(result.issues));
 assert.ok(result.issues.every(issue=>issue.entityId!==unrelated._id),JSON.stringify(result.issues));
});
test("gloss-only and sense-aligned translations both require reviewed status and valid endpoints",()=>{
 const entry={_id:"lex_01940000-0000-7000-8000-000000000101",schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"verified",language:"en",lemma:"test",pos:"NOUN",entryKind:"word"};
 const sense={_id:"sns_01940000-0000-7000-8000-000000000102",schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"verified",entryId:entry._id,definition:"test meaning"};
 const eq=(n,mode,status,extra={})=>({_id:`eqv_01940000-0000-7000-8000-${String(n).padStart(12,"0")}`,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",sourceSenseId:sense._id,alignmentMode:mode,translationEvidenceStatus:status,glossVi:"nghĩa thử",direction:"en_to_vi",equivalenceType:"approximate",...extra});
 for(const mode of ["gloss_only","sense_aligned"]){
  const r=eq(mode==="gloss_only"?103:104,mode,"unreviewed",mode==="sense_aligned"?{targetSenseId:"sns_01940000-0000-7000-8000-000000000105"}:{});
  const result=evaluatePublication([entry,sense,r],{subjectIds:[r._id]});
  assert.ok(result.issues.some(i=>i.code==="TRANSLATION_UNREVIEWED"),JSON.stringify(result.issues));
  assert.ok(result.issues.some(i=>i.code==="CLAIM_EVIDENCE_INSUFFICIENT"));
 }
 const missingSource=eq(106,"gloss_only","independently_reviewed",{sourceSenseId:"sns_01940000-0000-7000-8000-000000000107"});
 const result=evaluatePublication([entry,missingSource],{subjectIds:[missingSource._id]});
 assert.ok(result.issues.some(i=>i.code==="BILINGUAL_ENDPOINT_UNVERIFIED"));
 const unverified={...sense,editorialStatus:"draft"},bad=eq(108,"gloss_only","independently_reviewed");
 assert.ok(evaluatePublication([entry,unverified,bad],{subjectIds:[bad._id]}).issues.some(i=>i.code==="BILINGUAL_ENDPOINT_UNVERIFIED"));
});
