import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
import {reviseCandidates} from "../../pipeline/revise-candidates.mjs";
import {bindEvidence} from "../../pipeline/bind-evidence.mjs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";
import {publicationClaimPaths,digest,evaluatePublication} from "../../validators/production-gates.mjs";

const readRaw=path=>readFileSync(new URL("../../"+path,import.meta.url));
const readJson=path=>JSON.parse(readRaw(path));
const sha=value=>createHash("sha256").update(value).digest("hex");
const pointer=(root,path)=>path.split("/").slice(1).reduce((value,part)=>value?.[part.replaceAll("~1","/").replaceAll("~0","~")],root);
const setPointer=(root,path,value)=>{
 const parts=path.split("/").slice(1).map(part=>part.replaceAll("~1","/").replaceAll("~0","~"));
 const key=parts.pop(),parent=parts.reduce((current,part)=>current[part],root);parent[key]=value;
};
const resolveRefs=(value,mappings)=>{
 if(typeof value==="string"&&value.startsWith("candidate:"))return mappings.get(value.slice("candidate:".length));
 if(Array.isArray(value))return value.map(item=>resolveRefs(item,mappings));
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,resolveRefs(item,mappings)]));
 return value;
};
const draft=extra=>({lifecycleStatus:"active",editorialStatus:"draft",...extra});

test("Phase 13 batch preserves Phase 12 corrections and removes unsupported example authorship claims",()=>{
 const sourceBytes=readRaw("data/candidates/pilot-fanout-002.json"),source=JSON.parse(sourceBytes);
 const ledger=readJson("data/reviews/phase11/correction-ledger.json"),staged=readJson("data/reviews/phase11/staged-lexical-candidates.json");
 const batch=readJson("data/candidates/pilot-fanout-003.json");
 const sourcePath="data/candidates/pilot-fanout-002.json",ledgerPath="data/reviews/phase11/correction-ledger.json",stagedPath="data/reviews/phase11/staged-lexical-candidates.json";
 assert.equal(sha(sourceBytes),"d203048c769d6e033f219dc58531d3db9c87c59a00ec8482f9748a3005cab805");
 assert.deepEqual(batch.sourceDigests,{
  sourceSnapshot:{path:sourcePath,sha256:sha(sourceBytes)},
  correctionLedger:{path:ledgerPath,sha256:sha(readRaw(ledgerPath))},
  stagedCandidateBundle:{path:stagedPath,sha256:sha(readRaw(stagedPath))}
 });
 assert.equal(batch.supersedesBatchId,"pilot-fanout-002");
 const corrections=ledger.entries.filter(item=>item.status==="REQUIRED_CORRECTION"&&item.itemKind==="PUBLICATION_CLAIM");
 const scoped=ledger.entries.filter(item=>item.status==="REQUIRED_CORRECTION"&&item.itemKind==="SCOPED_ISSUE");
 assert.equal(corrections.length,33);
 assert.equal(scoped.length,2);
 const expected=structuredClone(source.records),byCandidate=new Map(expected.map(record=>[record.candidateId,record]));
 for(const correction of corrections){
  const record=byCandidate.get(correction.candidateId);
  assert.ok(record,correction.candidateId);
  assert.deepEqual(pointer(record,correction.fieldPath),correction.beforeValue,correction.reviewItemKey+" before");
  setPointer(record,correction.fieldPath,correction.afterValue);
 }
 const requestedStagedIds=["entry-small","sense-small-size","equiv-small","rel-big-large-near-synonym","rel-big-small-antonym","rel-large-small-antonym","equiv-borrow-money","equiv-lend-money"];
 const stagedById=new Map(staged.pilotCompatibleStagedCandidates.map(item=>[item.candidateId,item]));
 for(const record of expected)record.sourceItemKey=`phase11:pilot-fanout-002:${record.candidateId}`;
 for(const candidateId of requestedStagedIds){
  const candidate=stagedById.get(candidateId);assert.ok(candidate,candidateId);
  expected.push({candidateId,type:candidate.type,sourceItemKey:`phase11:staged-lexical-candidates:v1:${candidateId}`,entity:structuredClone(candidate.entity)});
 }
 const phase12Expected=structuredClone(expected);
 assert.equal(phase12Expected.filter(record=>record.type==="sns"&&record.entity.examples?.[0]?.exampleType==="editorial_original").length,16);
 for(const record of expected.filter(record=>record.type==="sns"))
  for(const example of record.entity.examples??[])
   if(example.exampleType==="editorial_original")example.exampleType="unverified_candidate";
 assert.deepEqual(batch.records,expected);
 assert.equal(batch.records.length,62);
 assert.equal(new Set(batch.records.map(record=>record.candidateId)).size,62);
 assert.deepEqual(scoped.map(item=>item.reviewItemKey),["P10-ISSUE-run-boundary","P10-ISSUE-analysis-family"]);
 const correctedKeys=new Set(corrections.map(item=>item.reviewItemKey));
 for(const issue of scoped){
  assert.ok(issue.impactedClaims.length>0);
  assert.ok(issue.impactedClaims.every(key=>correctedKeys.has(key)||key.endsWith("familyBasis")||key.endsWith("familyIds")));
 }
 const forbidden=/\b(?:candidate|LER)\b|pending\s+(?:review|LER|independent)|draft\s+record|exhaustive\s+inventory|not\s+modeled\s+here/i;
 for(const record of batch.records){
  const paths=publicationClaimPaths({_id:record.type+"_candidate",...record.entity});
  for(const path of paths){
   const value=pointer(record.entity,path);
   if(typeof value==="string"&&!value.startsWith("candidate:"))assert.doesNotMatch(value,forbidden,`${record.candidateId}${path}`);
   if(Array.isArray(value))for(const item of value)if(typeof item==="string"&&!item.startsWith("candidate:"))assert.doesNotMatch(item,forbidden,`${record.candidateId}${path}`);
  }
  assert.equal(record.entity.editorialStatus,"draft");
 }
 assert.equal(batch.records.filter(record=>record.type==="sns").length,16);
 const senses=batch.records.filter(record=>record.type==="sns");
 assert.equal(senses.filter(record=>record.candidateId!=="sense-small-size").length,15);
 assert.equal(senses.filter(record=>record.entity.examples?.[0]?.exampleType==="unverified_candidate").length,16);
 assert.ok(senses.every(record=>record.entity.examples?.[0]?.exampleType==="unverified_candidate"));
 const byId=new Map(batch.records.map(record=>[record.candidateId,record.entity]));
 assert.equal(byId.get("sense-big-size").contrastiveNotes[0].language,"en");
 assert.equal(byId.get("sense-large-size").contrastiveNotes[0].language,"en");
 assert.match(byId.get("sense-run-machine").definition,/Function or operate.*or cause a machine.*to function/);
 assert.equal(byId.get("equiv-advice").glossVi,"lời khuyên");
 assert.equal(byId.get("equiv-analysis").glossVi,"phân tích");
 assert.equal(byId.get("equiv-big").glossVi,"lớn");
 assert.equal(byId.get("family-analysis").label,"analyse / analysis / analytical word family");
 assert.equal(byId.get("family-analysis").familyBasis,"editorially_related");
 assert.equal(byId.get("sense-borrow-temporary-use").definition,"Temporarily take and use something from another person with an intention to return it.");
 assert.equal(byId.get("sense-lend-temporary-use").definition,"Temporarily give something to another person with an intention that it will be returned.");
 assert.equal(staged.stagedVietnameseLexicalGraphCandidates.length,13);
 assert.ok(staged.stagedVietnameseLexicalGraphCandidates.every(record=>!byId.has(record.candidateId)));
});

test("pilot-fanout-003 integrates eight staged records over reviewed revisions without minting duplicate IDs",()=>{
 const original=readJson("data/candidates/pilot-fanout-002.json"),batch=readJson("data/candidates/pilot-fanout-003.json");
 const initial=prepareBatch(original,{});
 assert.equal(initial.report.status,"prepared",JSON.stringify(initial.report.issues));
 const before=initial.state;
 const mappingConflict=structuredClone(before),runCandidate=batch.records.find(record=>record.candidateId==="entry-run");
 mappingConflict.sourceMappings[runCandidate.sourceItemKey]={canonicalId:before.mappings[original.batchId+"#entry-bank-financial"].canonicalId,contentDigest:digest(runCandidate.entity),firstBatchId:original.batchId};
 const conflictingIdentity=prepareBatch(batch,mappingConflict);
 assert.equal(conflictingIdentity.report.status,"conflict");
 assert.ok(conflictingIdentity.report.issues.some(issue=>issue.code==="IDENTITY_MAPPING_CONFLICT"));
 assert.deepEqual(conflictingIdentity.state,mappingConflict);
 const uncorrected=prepareBatch(batch,before);
 assert.equal(uncorrected.report.status,"conflict");
 assert.ok(uncorrected.report.issues.some(issue=>issue.code==="BATCH_REVISION_REQUIRED"));
 assert.deepEqual(uncorrected.state,before);
 const map=new Map(original.records.map(record=>[record.candidateId,before.mappings[original.batchId+"#"+record.candidateId].canonicalId]));
 const desired=new Map(batch.records.map(record=>[record.candidateId,resolveRefs(record.entity,map)]));
 const changes=[];
 for(const candidate of original.records){
  const canonicalId=map.get(candidate.candidateId),current=before.records.find(record=>record._id===canonicalId),next=desired.get(candidate.candidateId),set={};
  for(const key of new Set([...Object.keys(current),...Object.keys(next)])){
   if(["_id","schemaVersion","revision","createdAt","updatedAt"].includes(key))continue;
   if(JSON.stringify(current[key])!==JSON.stringify(next[key])){
    assert.notEqual(next[key],undefined,"revision workflow does not silently delete fields");set[key]=next[key];
   }
  }
  if(Object.keys(set).length)changes.push({canonicalId,expectedRevision:current.revision??1,set});
 }
 assert.ok(changes.length>0);
 const revision=reviseCandidates(before,{revisionId:"phase12-corrections",changes});
 assert.equal(revision.report.status,"revised",JSON.stringify(revision.report.issues));
 assert.equal(revision.state.history.at(-1).action,"draft_revision");
 assert.ok(revision.state.history.at(-1).before.every(record=>record._id.startsWith("sns_")||record._id.startsWith("con_")||record._id.startsWith("eqv_")||record._id.startsWith("fam_")));
 for(const candidate of original.records){
  const id=map.get(candidate.candidateId);
  assert.equal(revision.state.records.find(record=>record._id===id)._id,id,"canonical identity stays stable");
 }
 const integrated=prepareBatch(batch,revision.state);
 assert.equal(integrated.report.status,"prepared",JSON.stringify(integrated.report.issues));
 assert.equal(integrated.report.reusedCount,54);
 assert.equal(integrated.state.records.length,62);
 assert.equal(new Set(integrated.state.records.map(record=>record._id)).size,62);
 for(const candidate of original.records)
  assert.equal(integrated.state.mappings[batch.batchId+"#"+candidate.candidateId].canonicalId,map.get(candidate.candidateId));
 const all=validateDatasetV2(integrated.state.records);
 assert.equal(all.valid,true,JSON.stringify(all.issues));
 assert.equal(all.publication.eligible,false);
 const forbidden=/\b(?:candidate|LER)\b|pending\s+(?:review|LER|independent)|draft\s+record|exhaustive\s+inventory|not\s+modeled\s+here/i;
 for(const record of integrated.state.records){
  if(["src","evd","rev","dec"].includes(record._id.split("_")[0]))continue;
  for(const path of publicationClaimPaths(record)){
   const value=pointer(record,path);
   if(typeof value==="string"&&!/^(?:lex|sns|frm|fam|mrf|ety|top|mwe|con|col|eqv|rel|evd|src|rev|dec)_[0-9a-f-]+$/.test(value))
    assert.doesNotMatch(value,forbidden,`${record._id}${path}`);
  }
 }
 const relations=integrated.state.records.filter(record=>record._id.startsWith("rel_"));
 assert.equal(relations.length,3);
 assert.deepEqual(relations.map(record=>record.relationType).sort(),["ANTONYM_OF","ANTONYM_OF","NEAR_SYNONYM_OF"]);
 assert.ok(relations.every(record=>record.sourceId<record.targetId));
 assert.ok(relations.every(record=>record.sourceId!==record.targetId));
 const relationKeys=relations.map(record=>[record.relationType,[record.sourceId,record.targetId].sort().join("|")].join("#"));
 assert.equal(new Set(relationKeys).size,3);
 const candidateMap=new Map(integrated.state.records.map(record=>[record._id,record]));
 const candidateRecord=id=>candidateMap.get(integrated.state.mappings[batch.batchId+"#"+id].canonicalId);
 for(const [id,type] of [["rel-big-large-near-synonym","NEAR_SYNONYM_OF"],["rel-big-small-antonym","ANTONYM_OF"],["rel-large-small-antonym","ANTONYM_OF"]]){
  const canonicalId=integrated.state.mappings[batch.batchId+"#"+id].canonicalId,record=candidateMap.get(canonicalId);
  assert.equal(record.relationType,type);
  assert.equal(record.editorialStatus,"draft");
  assert.ok(record.qualifiers.context.length>20);
 }
 assert.match(candidateRecord("rel-big-large-near-synonym").qualifiers.context,/concrete physical size/i);
 assert.match(candidateRecord("rel-big-small-antonym").qualifiers.context,/physical size/i);
 assert.match(candidateRecord("rel-large-small-antonym").qualifiers.context,/quantity/i);
 const smallEntry=candidateRecord("entry-small"),smallSense=candidateRecord("sense-small-size"),smallEquiv=candidateRecord("equiv-small");
 assert.equal(smallEntry.language,"en");assert.equal(smallEntry.pos,"ADJ");
 assert.equal(smallSense.entryId,smallEntry._id);assert.equal(smallEquiv.sourceSenseId,smallSense._id);
 assert.equal(smallEquiv.glossVi,"nhỏ");assert.equal(smallEquiv.alignmentMode,"gloss_only");assert.equal("targetSenseId" in smallEquiv,false);
 for(const [left,right,leftGloss,rightGloss] of [["equiv-borrow","equiv-borrow-money","mượn","vay"],["equiv-lend","equiv-lend-money","cho mượn","cho vay"]]){
  const first=candidateRecord(left),second=candidateRecord(right);
  assert.equal(first.sourceSenseId,second.sourceSenseId);
  assert.equal(first.glossVi,leftGloss);assert.equal(second.glossVi,rightGloss);
  assert.equal(first.alignmentMode,"gloss_only");assert.equal(second.alignmentMode,"gloss_only");
  assert.equal("targetSenseId" in first,false);assert.equal("targetSenseId" in second,false);
  assert.notEqual(first.context,second.context);
  assert.equal(first.editorialStatus,"draft");assert.equal(second.editorialStatus,"draft");
  assert.match(first.context,/non-money|physical|item/i);
  assert.match(second.context,/money|financial|capital/i);
 }
 const replay=prepareBatch(batch,integrated.state);
 assert.equal(replay.report.status,"replayed");assert.deepEqual(replay.state,integrated.state);
 const conflictBatch=structuredClone(batch);conflictBatch.records.find(record=>record.candidateId==="equiv-small").entity.glossVi="bé";
 const conflict=prepareBatch(conflictBatch,integrated.state);
 assert.equal(conflict.report.status,"conflict");
 assert.ok(conflict.report.issues.some(issue=>issue.code==="CHANGED_BATCH_CONFLICT"));
 assert.deepEqual(conflict.state,integrated.state);
});

test("reference evidence digest is checked before resolution and recomputed after scalar and array references resolve",()=>{
 const topicA={candidateId:"topic-a",type:"top",entity:draft({label:"Synthetic topic A",parentTopicId:null})};
 const topicB={candidateId:"topic-b",type:"top",entity:draft({label:"Synthetic topic B",parentTopicId:null})};
 const entry={candidateId:"entry",type:"lex",entity:draft({language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word"})};
 const sense={candidateId:"sense",type:"sns",entity:draft({entryId:"candidate:entry",definition:"Synthetic meaning",topicIds:["candidate:topic-a","candidate:topic-b"]})};
 const source={candidateId:"source",type:"src",entity:draft({title:"Synthetic test source"})};
 const arrayClaim={subjectId:"candidate:sense",fieldPath:"/topicIds",valueDigest:digest(["candidate:topic-a","candidate:topic-b"]),specificity:"exact_value"};
 const scalarClaim={subjectId:"candidate:sense",fieldPath:"/entryId",valueDigest:digest("candidate:entry"),specificity:"exact_value"};
 const evidence=(candidateId,claim)=>({candidateId,type:"evd",entity:draft({sourceId:"candidate:source",assertionIds:["candidate:sense"],claim})});
 const batch={batchId:"reference-evidence",records:[topicA,topicB,entry,sense,source,evidence("evd-array",arrayClaim),evidence("evd-scalar",scalarClaim)]};
 const previewA=prepareBatch(batch,{}, {dryRun:true}),previewB=prepareBatch(batch,{}, {dryRun:true});
 assert.equal(previewA.report.status,"dry-run",JSON.stringify(previewA.report.issues));
 assert.deepEqual(previewA.report,previewB.report);
 const prepared=prepareBatch(batch,{});
 assert.equal(prepared.report.status,"prepared",JSON.stringify(prepared.report.issues));
 const recordById=new Map(prepared.state.records.map(record=>[record._id,record]));
 const senseId=prepared.state.mappings["reference-evidence#sense"].canonicalId;
 const finalSense=recordById.get(senseId);
 for(const candidateId of ["evd-array","evd-scalar"]){
  const id=prepared.state.mappings["reference-evidence#"+candidateId].canonicalId,evidenceRecord=recordById.get(id);
  assert.equal(evidenceRecord.claim.subjectId,senseId);
  assert.ok(evidenceRecord.assertionIds.includes(senseId));
  assert.equal(evidenceRecord.claim.valueDigest,digest(pointer(finalSense,evidenceRecord.claim.fieldPath)));
 }
 assert.deepEqual(finalSense.topicIds,[prepared.state.mappings["reference-evidence#topic-a"].canonicalId,prepared.state.mappings["reference-evidence#topic-b"].canonicalId]);
 assert.equal(validateDatasetV2(prepared.state.records).valid,true);
 const replay=prepareBatch(batch,prepared.state);assert.equal(replay.report.status,"replayed");assert.deepEqual(replay.state,prepared.state);
 const stale=structuredClone(batch);stale.records.find(record=>record.candidateId==="evd-array").entity.claim.valueDigest=digest(["candidate:topic-b"]);
 const staleResult=prepareBatch(stale,{}, {dryRun:true});
 assert.equal(staleResult.report.status,"conflict");
 assert.ok(staleResult.report.issues.some(issue=>issue.code==="EVIDENCE_SOURCE_DIGEST_MISMATCH"));
 const wrongSubject=structuredClone(batch);wrongSubject.records.find(record=>record.candidateId==="evd-scalar").entity.assertionIds=["candidate:entry"];
 const subjectResult=prepareBatch(wrongSubject,{}, {dryRun:true});
 assert.equal(subjectResult.report.status,"conflict");
 assert.ok(subjectResult.report.issues.some(issue=>issue.code==="EVIDENCE_SUBJECT_MISMATCH"));
 const wrongPath=structuredClone(batch);wrongPath.records.find(record=>record.candidateId==="evd-scalar").entity.claim.fieldPath="/missing";
 const pathResult=prepareBatch(wrongPath,{}, {dryRun:true});
 assert.equal(pathResult.report.status,"conflict");
 assert.ok(pathResult.report.issues.some(issue=>issue.code==="EVIDENCE_PATH_MISMATCH"));
});

test("review approval is value-bound and fresh evidence cannot reactivate a stale decision",()=>{
 const batch={batchId:"review-value-binding",records:[
  {candidateId:"entry",type:"lex",entity:draft({language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word"})},
  {candidateId:"sense",type:"sns",entity:draft({entryId:"candidate:entry",definition:"First definition"})},
  {candidateId:"source",type:"src",entity:draft({title:"Synthetic test-only source",rights:{status:"redistributable",scopes:["dictionary_publication"],reviewerId:"rights-reviewer",permissionReference:"test-only"}})},
  {candidateId:"review",type:"rev",entity:draft({reviewerId:"test-reviewer",subjectIds:["candidate:sense"],outcome:"accepted",role:"lead_editorial",appointmentReference:"test-only",claims:[{subjectId:"candidate:sense",fieldPath:"/definition",valueDigest:digest("First definition")}]})}
 ]};
 const prepared=prepareBatch(batch,{});
 assert.equal(prepared.report.status,"prepared",JSON.stringify(prepared.report.issues));
 const senseId=prepared.state.mappings["review-value-binding#sense"].canonicalId;
 const changed=reviseCandidates(prepared.state,{revisionId:"change-reviewed-definition",changes:[{canonicalId:senseId,expectedRevision:1,set:{definition:"Second definition"}}]});
 assert.equal(changed.report.status,"revised",JSON.stringify(changed.report.issues));
 assert.equal(changed.state.records.find(record=>record._id===senseId).definition,"Second definition");
 assert.equal(changed.state.records.find(record=>record._id.startsWith("rev_")).claims[0].valueDigest,digest("First definition"));
 const sourceId=changed.state.records.find(record=>record._id.startsWith("src_"))._id;
 const entryId=changed.state.records.find(record=>record._id.startsWith("lex_"))._id;
 const evidenceBatch={batchId:"fresh-evidence-after-review-change",records:[
  {candidateId:"new-evidence",type:"evd",sourceItemKey:"test:evidence:new-definition",entity:draft({sourceId,assertionIds:[senseId],claim:{subjectId:senseId,fieldPath:"/definition",valueDigest:digest("Second definition"),specificity:"exact_value"},reviewStatus:"accepted",independence:"independent_reviewed"})},
  {candidateId:"other-subject-evidence",type:"evd",entity:draft({sourceId,assertionIds:[entryId],claim:{subjectId:entryId,fieldPath:"/lemma",valueDigest:digest("synthetic"),specificity:"exact_value"},reviewStatus:"accepted",independence:"independent_reviewed"})}
 ]};
 const evidencePrepared=prepareBatch(evidenceBatch,changed.state);
 assert.equal(evidencePrepared.report.status,"prepared",JSON.stringify(evidencePrepared.report.issues));
 const evidenceId=evidencePrepared.state.mappings[evidenceBatch.batchId+"#new-evidence"].canonicalId;
 const otherEvidenceId=evidencePrepared.state.mappings[evidenceBatch.batchId+"#other-subject-evidence"].canonicalId;
 const input={bindingId:"bind-new-definition-proof",subjectId:senseId,expectedRevision:2,evidenceIds:[evidenceId]};
 const dry=bindEvidence(evidencePrepared.state,{...input,bindingId:"dry-binding"},{dryRun:true});
 assert.equal(dry.report.status,"dry-run");assert.deepEqual(dry.state,evidencePrepared.state);
 const staleCas=bindEvidence(evidencePrepared.state,{...input,bindingId:"stale-cas",expectedRevision:1});
 assert.equal(staleCas.report.status,"conflict");assert.deepEqual(staleCas.state,evidencePrepared.state);
 const atomicFailure=bindEvidence(evidencePrepared.state,{...input,bindingId:"atomic-failure",evidenceIds:[evidenceId,otherEvidenceId]});
 assert.equal(atomicFailure.report.status,"conflict");assert.deepEqual(atomicFailure.state,evidencePrepared.state);
 const binding=bindEvidence(evidencePrepared.state,input);
 assert.equal(binding.report.status,"bound",JSON.stringify(binding.report.issues));
 assert.equal(binding.state.history.at(-1).action,"evidence_binding");
 assert.equal(binding.state.records.find(record=>record._id===senseId).revision,3);
 const replay=bindEvidence(binding.state,input);assert.equal(replay.report.status,"replayed");assert.deepEqual(replay.state,binding.state);
 const conflict=bindEvidence(binding.state,{...input,evidenceIds:[otherEvidenceId]});assert.equal(conflict.report.status,"conflict");assert.deepEqual(conflict.state,binding.state);
 const review=binding.state.records.find(record=>record._id.startsWith("rev_"));
 assert.equal(review.claims[0].valueDigest,digest("First definition"));
 const report=evaluatePublication(binding.state.records,{subjectIds:[senseId],ownerId:"test-owner",effectiveAt:"2026-10-31T00:00:00Z",verifyOwnerAttestation:()=>true,verifyEvidence:()=>true,verifyRights:()=>true,appointments:[
  {appointmentKey:"test-ler",reviewerId:"test-reviewer",appointedByOwnerId:"test-owner",role:"lead_editorial",scope:{subjectIds:[senseId],fieldPaths:["/definition"]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"},
  {appointmentKey:"test-rights",reviewerId:"rights-reviewer",appointedByOwnerId:"test-owner",role:"rights",scope:{subjectIds:[sourceId]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"}
 ]});
 assert.ok(report.issues.some(issue=>issue.code==="CLAIM_PATH_UNVERIFIED"&&issue.entityId===senseId&&issue.path==="/definition"),JSON.stringify(report.issues));
 assert.equal(validateDatasetV2(binding.state.records).valid,true,JSON.stringify(validateDatasetV2(binding.state.records).issues));
 const wrongPath=structuredClone(binding.state.records);
 const wrongReview=wrongPath.find(record=>record._id.startsWith("rev_"));wrongReview.claims[0].fieldPath="/unknown";
 assert.ok(validateDatasetV2(wrongPath).issues.some(issue=>issue.code==="EDITORIAL_CLAIM_MISMATCH"));
 const wrongSubject=structuredClone(binding.state.records);
 const wrongSubjectReview=wrongSubject.find(record=>record._id.startsWith("rev_"));wrongSubjectReview.claims[0].subjectId=wrongSubject.find(record=>record._id.startsWith("lex_"))._id;
 assert.ok(validateDatasetV2(wrongSubject).issues.some(issue=>issue.code==="EDITORIAL_CLAIM_MISMATCH"));
 const legacyReview=structuredClone(binding.state.records),legacy=legacyReview.find(record=>record._id.startsWith("rev_"));
 delete legacy.claims[0].valueDigest;
 assert.equal(validateDatasetV2(legacyReview).valid,true,"legacy V2 review storage remains backward compatible");
 const legacyReport=evaluatePublication(legacyReview,{subjectIds:[senseId],ownerId:"test-owner",effectiveAt:"2026-10-31T00:00:00Z",verifyOwnerAttestation:()=>true,verifyEvidence:()=>true,verifyRights:()=>true,appointments:[
  {appointmentKey:"test-ler",reviewerId:"test-reviewer",appointedByOwnerId:"test-owner",role:"lead_editorial",scope:{subjectIds:[senseId],fieldPaths:["/definition"]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"},
  {appointmentKey:"test-rights",reviewerId:"rights-reviewer",appointedByOwnerId:"test-owner",role:"rights",scope:{subjectIds:[sourceId]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"}
 ]});
 assert.ok(legacyReport.issues.some(issue=>issue.code==="CLAIM_PATH_UNVERIFIED"&&issue.entityId===senseId&&issue.path==="/definition"));
});

test("reference-only source rights stay blocked even when test trust callbacks return true",()=>{
 const lexId="lex_01940000-0000-7000-8000-000000000901",sourceId="src_01940000-0000-7000-8000-000000000901",evidenceId="evd_01940000-0000-7000-8000-000000000901";
 const lex={_id:lexId,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"verified",language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word",evidenceIds:[evidenceId]};
 const source={_id:sourceId,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",title:"Synthetic reference-only source",rights:{status:"reference_only",scopes:["dictionary_publication"],reviewerId:"rights-reviewer",permissionReference:"test-only"}};
 const evidence={_id:evidenceId,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",sourceId,assertionIds:[lexId],claim:{subjectId:lexId,fieldPath:"/lemma",valueDigest:digest("synthetic"),specificity:"exact_value"},reviewStatus:"accepted",independence:"independent_reviewed"};
 const report=evaluatePublication([lex,source,evidence],{subjectIds:[lexId],ownerId:"test-owner",effectiveAt:"2026-10-31T00:00:00Z",verifyOwnerAttestation:()=>true,verifyEvidence:()=>true,verifyRights:()=>true,appointments:[{appointmentKey:"rights",reviewerId:"rights-reviewer",appointedByOwnerId:"test-owner",role:"rights",scope:{subjectIds:[sourceId]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"}]});
 assert.ok(report.issues.some(issue=>issue.code==="SOURCE_RIGHTS_UNVERIFIED"&&issue.entityId===lexId),JSON.stringify(report.issues));
});

