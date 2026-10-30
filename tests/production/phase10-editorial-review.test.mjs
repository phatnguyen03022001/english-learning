import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {publicationClaimPaths} from "../../validators/production-gates.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=path=>readFileSync(join(root,path),"utf8");
const parse=path=>JSON.parse(read(path));
const hash=text=>createHash("sha256").update(text).digest("hex");
const snapshotPath="data/candidates/pilot-fanout-002.json";
const originalPath="data/candidates/pilot-fanout-001.json";
const dossierPath="data/reviews/phase8-evidence-dossier.json";
const ledgerPath="data/reviews/phase9-correction-ledger.json";
const queuePath="data/reviews/phase10-editorial-review-queue.json";
const snapshot=parse(snapshotPath);
const original=parse(originalPath);
const dossier=parse(dossierPath);
const ledger=parse(ledgerPath);
const queue=parse(queuePath);
const byId=batch=>new Map(batch.records.map(r=>[r.candidateId,r]));
const pointer=(value,path)=>path.split("/").slice(1).map(p=>p.replaceAll("~1","/").replaceAll("~0","~")).reduce((v,k)=>v==null?undefined:v[k],value);
const counts=records=>Object.fromEntries(["lex","fam","sns","con","eqv"].map(type=>[type,records.filter(r=>r.type===type).length]));

test("Phase 10 queue covers publication claims using stable candidate-relative identity",()=>{
 assert.equal(snapshot.batchId,"pilot-fanout-002");
 assert.equal(hash(read(snapshotPath)),queue.sourceSnapshot.sha256);
 assert.deepEqual(queue.sourceSnapshot.inventory,counts(snapshot.records));
 assert.equal(snapshot.records.length,54);
 const current=byId(snapshot), previous=byId(original);
 const expected=[];
 for(const record of snapshot.records){
  const canonical={_id:`${record.type}_candidate`,...record.entity};
  for(const path of publicationClaimPaths(canonical))expected.push([record.candidateId,`/entity${path}`]);
 }
 const claims=queue.reviewItems.filter(item=>item.candidateId&&item.fieldPath);
 const keys=queue.reviewItems.map(item=>item.reviewItemKey);
 assert.equal(new Set(keys).size,keys.length,"review item keys must be unique");
 assert.equal(claims.length,expected.length);
 assert.equal(claims.length,queue.claimEnumeration.claimCount);
 const expectedSet=new Set(expected.map(([id,path])=>id+path));
 const actualSet=new Set(claims.map(item=>item.candidateId+item.fieldPath));
 assert.deepEqual(actualSet,expectedSet);
 assert.equal(expected.length,372);
 for(const item of claims){
  assert.equal(item.sourceBatchId,"pilot-fanout-002");
  assert.equal(item.sourceBatchSha256,queue.sourceSnapshot.sha256);
  assert.ok(current.has(item.candidateId),`orphan candidate ${item.candidateId}`);
  assert.notEqual(pointer(current.get(item.candidateId),item.fieldPath),undefined,`missing path ${item.candidateId}${item.fieldPath}`);
  const old=previous.get(item.candidateId);
  const oldValue=old?pointer(old,item.fieldPath):undefined;
  if(item.reconciliation==="NEW")assert.equal(oldValue,undefined);
  else assert.notEqual(oldValue,undefined,`historical claim missing: ${item.candidateId}${item.fieldPath}`);
  if(item.phase7ValuePresent)assert.deepEqual(item.phase7Value,oldValue);
  if(item.reconciliation==="MODIFIED")assert.notDeepEqual(oldValue,item.currentValue);
  if(item.reconciliation==="UNCHANGED")assert.deepEqual(oldValue,item.currentValue);
 }
 assert.deepEqual(queue.claimReconciliation,{UNCHANGED:301,MODIFIED:12,NEW:9,REMOVED:0,REQUIRES_REASSESSMENT:50});
 assert.equal(queue.claimEnumeration.classificationExclusive,true);
 assert.match(queue.claimEnumeration.identityKey,/candidateId.*candidate-relative/);
});

test("Phase 10 assigns all candidate types, senses, constructions, equivalences, examples and translations",()=>{
 const covered=new Set(queue.reviewItems.flatMap(i=>[i.candidateId,...(i.candidateIds||[])].filter(Boolean)));
 assert.deepEqual(covered,new Set(snapshot.records.map(r=>r.candidateId)));
 assert.equal(snapshot.records.filter(r=>r.type==="sns").length,15);
 assert.equal(snapshot.records.filter(r=>r.type==="con").length,9);
 assert.equal(snapshot.records.filter(r=>r.type==="eqv").length,16);
 const senseIds=new Set(snapshot.records.filter(r=>r.type==="sns").map(r=>r.candidateId));
 const conIds=new Set(snapshot.records.filter(r=>r.type==="con").map(r=>r.candidateId));
 const eqvIds=new Set(snapshot.records.filter(r=>r.type==="eqv").map(r=>r.candidateId));
 for(const id of senseIds)assert.ok(queue.reviewItems.some(i=>i.candidateId===id&&i.recordType==="sns"));
 for(const id of conIds)assert.ok(queue.reviewItems.some(i=>i.candidateId===id&&i.recordType==="con"));
 for(const id of eqvIds)assert.ok(queue.reviewItems.some(i=>i.candidateId===id&&i.recordType==="eqv"));
 const english=queue.reviewItems.filter(i=>i.fieldPath?.match(/^\/entity\/examples\/\d+\/english$/));
 const vietnamese=queue.reviewItems.filter(i=>i.fieldPath?.match(/^\/entity\/examples\/\d+\/vi$/));
 assert.equal(english.length,15);
 assert.equal(vietnamese.length,15);
 assert.ok(english.every(i=>i.additionalReviewerRoles?.includes("grammar")));
 assert.ok(vietnamese.every(i=>i.additionalReviewerRoles?.includes("bilingual")));
 assert.equal(queue.reviewPackages.length,4);
 for(const pkg of queue.reviewPackages)for(const key of pkg.reviewItemKeys)assert.ok(queue.reviewItems.some(i=>i.reviewItemKey===key));
 for(const item of queue.reviewItems){
  assert.ok(item.question,"every item needs a resolvable question");
  assert.ok(Array.isArray(item.decisionOptions)&&item.decisionOptions.includes("DEFER"));
  assert.equal(item.state,"PENDING_HUMAN_REVIEW");
 }
});

test("Modified/new claims do not inherit approval; no appointments, rights clearance or publication approval are fabricated",()=>{
 const allowedSourceIds=new Set(Object.keys(dossier.sources));
 for(const item of queue.reviewItems){
  assert.equal(item.humanDecision,null);
  assert.equal(item.authenticated,false);
  assert.equal(item.authorityStatus,"NO_REVIEWER_APPOINTED");
  for(const sourceId of item.evidenceReferences||[])assert.ok(allowedSourceIds.has(sourceId),`unknown source ${sourceId}`);
  assert.equal(item.appointmentReference,null);
  assert.equal(item.reviewedAt,null);
  for(const assessment of item.phase8Assessments||[]){
   assert.equal(assessment.batchId,"pilot-fanout-001");
   for(const sourceId of assessment.sourceIds||[])assert.ok(allowedSourceIds.has(sourceId),`unknown historical source ${sourceId}`);
   assert.ok(["SUPPORTED","CONTRADICTED","CONTESTED","INSUFFICIENT_EVIDENCE","NOT_APPLICABLE"].includes(assessment.status));
  }
  if(["MODIFIED","NEW"].includes(item.reconciliation))assert.equal(item.state,"PENDING_HUMAN_REVIEW");
 }
 assert.equal(queue.authority.reviewerAppointmentsCreated,false);
 assert.equal(queue.authority.independentEvidenceRecordsCreated,false);
 assert.equal(queue.authority.rightsClearancesCreated,false);
 assert.equal(queue.authority.humanDecisionsRecorded,false);
 assert.equal(queue.authority.reviewerAuthorityInferredFromCommitAuthor,false);
 assert.equal(queue.publicationEligible,false);
 assert.equal(queue.publicationStatus,"NOT_READY");
 assert.equal(queue.coverage.reviewExecuted,false);
 assert.equal(queue.coverage.reviewAuthenticated,false);
 assert.equal(queue.coverage.publicationApproved,false);
 assert.equal(dossier.batch.batchId,"pilot-fanout-001");
 assert.equal(dossier.claimAssessments.length,232);
 assert.equal(ledger.correctionQueue.length,10);
 assert.equal(queue.historicalSources.phase8.batchId,"pilot-fanout-001");
 assert.equal(queue.historicalSources.phase9.corrections,10);
 assert.equal(original.batchId,"pilot-fanout-001");
 assert.equal(hash(read(originalPath)),"788d39e878d72104560f62c3b5298bc74348a90af2f0acbbbf1bda632f8705a4");
});
