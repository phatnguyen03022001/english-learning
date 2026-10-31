import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
import {digest,evaluatePublication,publicationClaimPaths,valueAt} from "../../validators/production-gates.mjs";

const batch=JSON.parse(readFileSync(new URL("../../data/candidates/phase13-source-audit-001.json",import.meta.url),"utf8"));
const assessment=JSON.parse(readFileSync(new URL("../../data/reviews/phase13/readiness-assessment.json",import.meta.url),"utf8"));
const statusCounts=Object.fromEntries(["reference_only","permission_required","unknown","redistributable"].map(status=>[
 status,batch.records.filter(record=>record.entity.rights.status===status).length
]));

test("Phase 13 source register is a valid draft-only V2 candidate batch with explicit rights limits",()=>{
 const result=prepareBatch(batch,{}, {dryRun:true});
 assert.equal(result.report.status,"dry-run");
 assert.deepEqual(result.report.issues,[]);
 assert.equal(result.report.publicationEligible,false);
 assert.equal(batch.records.length,11);
 assert.equal(new Set(batch.records.map(record=>record.candidateId)).size,11);
 assert.deepEqual(statusCounts,{reference_only:4,permission_required:1,unknown:4,redistributable:2});
 assert.equal(assessment.sourceRightsAudit.draftSourceCandidateBatch.candidateCount,batch.records.length);
 assert.equal(assessment.sourceRightsAudit.sourceMetadataCandidates,batch.records.length);
 const candidateSourceIds=new Set(batch.records.map(record=>record.entity.sourceIdentifier));
 const auditedCandidateSources=assessment.sourceRightsAudit.sources.filter(source=>candidateSourceIds.has(source.sourceId));
 assert.equal(auditedCandidateSources.length,batch.records.length);
 const auditedStatusCounts=Object.fromEntries(["reference_only","permission_required","unknown","redistributable"].map(status=>[
  status,auditedCandidateSources.filter(source=>source.rightsStatus===status).length
 ]));
 assert.deepEqual(statusCounts,auditedStatusCounts);
 assert.ok(batch.records.every(record=>record.type==="src"&&record.entity.editorialStatus==="draft"&&!record.entity._id));
 assert.ok(batch.records.every(record=>record.entity.evidenceIds.length===0));
 assert.ok(batch.records.every(record=>!record.entity.rights.reviewerId&&!record.entity.rights.permissionReference&&!record.entity.rights.decisionId));
 assert.ok(batch.records.every(record=>!record.entity.evidenceIds.length));
 const licensed=batch.records.filter(record=>record.entity.rights.status==="redistributable");
 assert.deepEqual(licensed.map(record=>record.entity.sourceIdentifier).sort(),["SRC-OEWN","SRC-PRINCETON-WN"]);
 assert.ok(licensed.every(record=>record.entity.rights.scopes.includes("dictionary_publication")&&record.entity.rights.licenseIdentifier));
});

test("Phase 13 readiness inventory binds every V003 claim path to its exact current value",()=>{
 const v003=JSON.parse(readFileSync(new URL("../../data/candidates/pilot-fanout-003.json",import.meta.url),"utf8"));
 const v003Bytes=readFileSync(new URL("../../data/candidates/pilot-fanout-003.json",import.meta.url));
 const preview=prepareBatch(v003,{}, {dryRun:true});
 assert.equal(preview.report.digest,assessment.dataset.candidateBatchDigest);
 assert.equal(createHash("sha256").update(v003Bytes).digest("hex"),assessment.dataset.rawFileSha256);
 const ids=new Map(v003.records.map(item=>{
  const h=createHash("sha256").update(preview.report.digest+"#"+item.candidateId).digest("hex");
  return [item.candidateId,item.type+"_"+h.slice(0,8)+"-"+h.slice(8,12)+"-7"+h.slice(12,15)+"-8"+h.slice(15,18)+"-"+h.slice(18,30)];
 }));
 const resolve=value=>{
  if(typeof value==="string"&&value.startsWith("candidate:"))return ids.get(value.slice(10));
  if(Array.isArray(value))return value.map(resolve);
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,resolve(child)]));
  return value;
 };
 const expected=[];
 for(const item of v003.records){
  const record={...resolve(item.entity),_id:ids.get(item.candidateId),schemaVersion:"2.0.0"};
  if(record.relationType&&["SYNONYM_OF","NEAR_SYNONYM_OF","ANTONYM_OF"].includes(record.relationType)&&record.sourceId>record.targetId)
   [record.sourceId,record.targetId]=[record.targetId,record.sourceId];
  for(const fieldPath of publicationClaimPaths(record)){
   const disputed=["entry-bank-financial","entry-bank-river"].includes(item.candidateId)&&fieldPath==="/homographNumber";
   const glossOnly=item.type==="eqv"&&fieldPath==="/alignmentMode"&&valueAt(record,fieldPath)==="gloss_only";
   const example=item.type==="sns"&&fieldPath.startsWith("/examples/");
   const flags=(disputed?1:0)|(glossOnly?2:0)|(example?4:0);
   expected.push([item.candidateId,item.type,record._id,fieldPath,digest(valueAt(record,fieldPath)),flags]);
  }
 }
 expected.sort((a,b)=>a[0].localeCompare(b[0])||a[3].localeCompare(b[3]));
 const actual=assessment.claimCoverage.claimInventoryEncoding.rows;
 assert.equal(actual.length,430);
 assert.deepEqual(actual,expected);
 assert.equal(assessment.goldenQa.researchAssessments.length,6);
 assert.ok(assessment.goldenQa.researchAssessments.every(family=>Object.keys(family.dimensions).length===8&&family.reviewStatus==="pending_independent_review"));
 assert.equal(assessment.goldenQa.publicationApprovedCount,0);
 assert.equal(assessment.sourceRightsAudit.draftSourceCandidateBatch.candidateBatchDigest,prepareBatch(batch,{}, {dryRun:true}).report.digest);
 assert.equal(assessment.sourceRightsAudit.draftSourceCandidateBatch.rawFileSha256,createHash("sha256").update(readFileSync(new URL("../../data/candidates/phase13-source-audit-001.json",import.meta.url))).digest("hex"));
});

test("Phase 13 publication readiness matches the actual fail-closed gate",()=>{
 const v003=JSON.parse(readFileSync(new URL("../../data/candidates/pilot-fanout-003.json",import.meta.url),"utf8"));
 const prepared=prepareBatch(v003,{});
 assert.equal(prepared.report.status,"prepared");
 const gate=evaluatePublication(prepared.state.records);
 const actualIssueCounts=gate.issues.reduce((counts,issue)=>{
  counts[issue.code]=(counts[issue.code]??0)+1;
  return counts;
 },{});
 const recorded=assessment.productionGateDryRun;
 const recordedIssueTotal=Object.values(recorded.issueCounts).reduce((total,count)=>total+count,0);

 assert.equal(assessment.status.dictionaryPublication,"NOT_READY");
 assert.equal(assessment.dataset.publicationEligible,false);
 assert.equal(gate.eligible,false);
 assert.equal(recorded.eligible,false);
 assert.equal(recordedIssueTotal,recorded.issueCount);
 assert.equal(gate.issues.length,recorded.issueCount);
 assert.deepEqual(actualIssueCounts,recorded.issueCounts);
 assert.equal(prepared.state.records.length,recorded.recordsEvaluated);
 assert.equal(recorded.persistedStateWritten,false);
 assert.equal(recorded.partialPublicationWrites,0);

 // blockingIssueCodes is a policy-risk catalog; the gate report records only
 // codes actually produced for this dataset, so the catalog may be broader.
 assert.ok(Object.keys(actualIssueCounts).every(code=>assessment.blockingIssueCodes.includes(code)));

 const injectedTrust=evaluatePublication(prepared.state.records,{
  ownerId:"test-owner",
  effectiveAt:"2026-10-31T00:00:00Z",
  appointments:[{
   appointmentKey:"synthetic-test-appointment",
   reviewerId:"synthetic-test-reviewer",
   appointedByOwnerId:"test-owner",
   role:"lead_editorial",
   scope:{subjectIds:prepared.state.records.map(record=>record._id),fieldPaths:["*"]},
   effectiveFrom:"2026-10-31T00:00:00Z",
   ownerAttestationRef:"synthetic-test-attestation"
  }],
  verifyOwnerAttestation:()=>true,
  verifyEvidence:()=>true,
  verifyRights:()=>true
 });
 assert.equal(injectedTrust.eligible,false,"test callbacks cannot create missing evidence, reviews or rights records");
});
