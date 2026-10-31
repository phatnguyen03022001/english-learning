import {test} from "node:test";
import assert from "node:assert/strict";
import {evaluatePublication,graphResultForPublication,digest} from "../../validators/production-gates.mjs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";

const id=(prefix,n)=>prefix+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
const active=(prefix,n,extra={})=>({_id:id(prefix,n),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",...extra});
const draftLexicals=count=>Array.from({length:count},(_,i)=>active("lex",50000+i,{
 language:"en",lemma:"synthetic-"+i,pos:"NOUN",entryKind:"word"
}));

function approvedLexicalFixture(){
 const paths=["/language","/lemma","/pos","/entryKind"];
 const lex=active("lex",49001,{editorialStatus:"verified",language:"en",lemma:"synthetic-approved",pos:"NOUN",entryKind:"word"});
 const source=active("src",49001,{title:"Synthetic test source",rights:{status:"redistributable",scopes:["dictionary_publication"],reviewerId:"rights-reviewer",permissionReference:"rights-test"}});
 const evidence=paths.map((path,index)=>active("evd",49100+index,{sourceId:source._id,assertionIds:[lex._id],
  claim:{subjectId:lex._id,fieldPath:path,valueDigest:digest(lex[path.slice(1)]),specificity:"exact_value"},
  independence:"independent_reviewed",reviewStatus:"accepted"}));
 lex.evidenceIds=evidence.map(item=>item._id);
 const review=active("rev",49200,{reviewerId:"ler-reviewer",role:"lead_editorial",appointmentReference:"ler-test",
  outcome:"accepted",subjectIds:[lex._id],claims:paths.map(path=>({subjectId:lex._id,fieldPath:path,valueDigest:digest(lex[path.slice(1)])}))});
 const appointments=[
  {appointmentKey:"ler-test",reviewerId:"ler-reviewer",appointedByOwnerId:"test-owner",role:"lead_editorial",
   scope:{subjectIds:[lex._id],fieldPaths:paths},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"},
  {appointmentKey:"rights-test",reviewerId:"rights-reviewer",appointedByOwnerId:"test-owner",role:"rights",
   scope:{subjectIds:[source._id]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"}
 ];
 return {records:[lex,source,...evidence,review],options:{appointments,ownerId:"test-owner",effectiveAt:"2026-10-31T00:00:00Z",
  verifyOwnerAttestation:()=>true,verifyEvidence:()=>true,verifyRights:()=>true}};
}

test("publication diagnostics retain zero, under-cap, exact-cap and explicit full results",()=>{
 const good=approvedLexicalFixture();
 const zero=evaluatePublication(good.records,good.options);
 assert.equal(zero.eligible,true);
 assert.equal(zero.issueCount,0);
 assert.equal(zero.omittedIssueCount,0);
 assert.deepEqual(zero.issues,[]);

 for(const count of [1,100,101]){
  const records=draftLexicals(count);
  const bounded=evaluatePublication(records);
  const full=evaluatePublication(records,{},null);
  const permuted=evaluatePublication([...records].reverse());
  assert.deepEqual(permuted.issues,bounded.issues,"retained diagnostics stay deterministic across input order");
  assert.equal(permuted.issueCount,bounded.issueCount);
  assert.equal(permuted.eligible,bounded.eligible);
  assert.equal(bounded.eligible,false);
  assert.equal(bounded.issueCount,full.issueCount);
  assert.equal(full.omittedIssueCount,0);
  assert.deepEqual(bounded.issues,full.issues.slice(0,1000));
  assert.equal(bounded.omittedIssueCount,Math.max(0,bounded.issueCount-1000));
  if(count===1)assert.equal(bounded.issueCount<1000,true);
  if(count===100)assert.equal(bounded.issueCount,1000);
  if(count===101){assert.equal(bounded.issueCount,1010);assert.equal(bounded.omittedIssueCount,10);}
 }
});

test("zero diagnostic retention cannot bypass missing evidence, rights, authority or graph failures",()=>{
 const en=active("lex",49301,{language:"en",lemma:"synthetic-en",pos:"NOUN",entryKind:"word"});
 const enSense=active("sns",49301,{entryId:en._id,definition:"Synthetic English sense"});
 const vi=active("lex",49302,{language:"vi",lemma:"từ-giả",pos:"NOUN",entryKind:"word"});
 const viSense=active("sns",49302,{entryId:vi._id,definition:"Synthetic Vietnamese sense"});
 const crossLanguage=active("rel",49301,{relationType:"SYNONYM_OF",sourceId:enSense._id,targetId:viSense._id});
 const fakeReview=active("rev",49301,{reviewerId:"fake",role:"lead_editorial",appointmentReference:"fake",
  outcome:"accepted",subjectIds:[en._id],claims:[{subjectId:en._id,fieldPath:"/lemma",valueDigest:digest(en.lemma)}]});
 const records=[en,enSense,vi,viSense,crossLanguage,fakeReview];
 const full=evaluatePublication(records,{},null);
 for(const code of ["CLAIM_EVIDENCE_INSUFFICIENT","SOURCE_RIGHTS_UNVERIFIED","REVIEW_SCOPE_MISSING","RELATION_LANGUAGE_MISMATCH"])
  assert.ok(full.issues.some(issue=>issue.code===code),"missing expected fail-closed issue "+code);
 const report=evaluatePublication(records,{},0);
 assert.equal(report.issues.length,0);
 assert.equal(report.issueCount,full.issues.length);
 assert.equal(report.omittedIssueCount,report.issueCount);
 assert.equal(report.eligible,false);
});

test("publication cap bounds nested graph diagnostics while storage validation stays complete",()=>{
 const records=Array.from({length:1200},()=>active("lex",49400,{
  language:"en",lemma:"synthetic-duplicate",pos:"NOUN",entryKind:"word"
 }));
 const report=evaluatePublication(records);
 const graph=graphResultForPublication(report);
 assert.equal(report.eligible,false);
 assert.equal(report.issues.length,1000);
 assert.equal(graph.issueCount,1199);
 assert.equal(graph.issues.length,1000);
 assert.equal(graph.omittedIssueCount,199);
 assert.equal(graph.publication.issues.length,0,"V1 publication diagnostics are unused by the V2 gate");
 assert.equal(graph.publication.issueCount,1);
 assert.equal(graph.publication.omittedIssueCount,1);

 const storage=validateDatasetV2(records,{publicationIssueLimit:0});
 assert.equal(storage.valid,false);
 assert.equal(storage.issues.length,1199,"storage validation retains every duplicate-ID graph diagnostic");
 assert.equal(storage.publication.eligible,false);
 assert.equal(storage.publication.issues.length,0);
 assert.ok(storage.publication.issueCount>0);
});

test("30K synthetic sparse workload reports exact issue count and bounded API memory output",()=>{
 const records=draftLexicals(30000);
 const result=evaluatePublication(records);
 assert.equal(result.eligible,false);
 assert.equal(result.issueCount,300000);
 assert.equal(result.issues.length,1000);
 assert.equal(result.omittedIssueCount,299000);
});
