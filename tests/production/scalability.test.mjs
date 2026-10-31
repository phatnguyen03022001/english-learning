import {test} from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
import {reviseCandidates} from "../../pipeline/revise-candidates.mjs";
import {evaluatePublication} from "../../validators/production-gates.mjs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";

const makeBatch=(batchId,start,count)=>({batchId,records:Array.from({length:count},(_,offset)=>{
 const index=start+offset;
 return {candidateId:`candidate-${index}`,sourceItemKey:`smoke:scale:${index}`,entity:{
  language:"en",lemma:`smoke-lexeme-${index}`,pos:"NOUN",entryKind:"word",
  lifecycleStatus:"active",editorialStatus:"draft"
 }};
})});

test("1K cumulative ingestion preserves IDs, source reuse, conflicts, replay and CAS",()=>{
 const firstBatch=makeBatch("smoke-scale-1",0,1000);
 const firstStart=performance.now(),first=prepareBatch(firstBatch,{}),firstMs=performance.now()-firstStart;
 assert.equal(first.report.status,"prepared",JSON.stringify(first.report.issues.slice(0,4)));
 assert.equal(first.state.records.length,1000);
 assert.equal(first.state.history.length,1);
 assert.equal(new Set(first.state.records.map(record=>record._id)).size,1000);
 assert.ok(first.state.records.every(record=>{
  const uuid=record._id.split("_")[1];
  return /^lex_[0-9a-f-]{36}$/.test(record._id)&&uuid[14]==="7"&&"89ab".includes(uuid[19]);
 }));

 const secondBatch=makeBatch("smoke-scale-2",1000,1000);
 const secondStart=performance.now(),second=prepareBatch(secondBatch,first.state),secondMs=performance.now()-secondStart;
 assert.equal(second.report.status,"prepared",JSON.stringify(second.report.issues.slice(0,4)));
 assert.equal(second.state.records.length,2000);
 assert.equal(new Set(second.state.records.map(record=>record._id)).size,2000);
 assert.equal(second.state.history.length,2);

 const replay=prepareBatch(secondBatch,second.state);
 assert.equal(replay.report.status,"replayed");
 assert.equal(replay.state,second.state);
 assert.equal(replay.state.history.length,2);
 const changedBatch=structuredClone(secondBatch);
 changedBatch.records[0].entity.lemma+="-changed";
 const batchConflict=prepareBatch(changedBatch,second.state);
 assert.equal(batchConflict.report.issues[0]?.code,"CHANGED_BATCH_CONFLICT");
 assert.equal(batchConflict.state,second.state);

 const sourceReuse={batchId:"smoke-source-reuse",records:[{
  candidateId:"renamed-candidate",sourceItemKey:firstBatch.records[0].sourceItemKey,
  entity:{...firstBatch.records[0].entity}
 }]};
 const reused=prepareBatch(sourceReuse,second.state);
 assert.equal(reused.report.status,"prepared");
 assert.equal(reused.report.reusedCount,1);
 assert.equal(reused.state.records.length,2000);
 assert.equal(reused.state.mappings["smoke-source-reuse#renamed-candidate"].canonicalId,
  first.state.mappings["smoke-scale-1#candidate-0"].canonicalId);

 const sourceConflict=prepareBatch({batchId:"smoke-source-conflict",records:[{
  candidateId:"changed-source",sourceItemKey:firstBatch.records[0].sourceItemKey,
  entity:{...firstBatch.records[0].entity,lemma:"different-content"}
 }]},reused.state);
 assert.ok(sourceConflict.report.issues.some(issue=>issue.code==="SOURCE_ITEM_CHANGED"));
 assert.equal(sourceConflict.state,reused.state);

 const repeatedLemma=prepareBatch({batchId:"smoke-duplicate-hint",records:[{
  candidateId:"same-spelling-different-source",sourceItemKey:"smoke:scale:new-source",
  entity:{...firstBatch.records[0].entity}
 }]},reused.state);
 assert.equal(repeatedLemma.report.status,"prepared");
 assert.equal(repeatedLemma.report.duplicates.length,1);
 assert.notEqual(repeatedLemma.report.duplicates[0].existingId,repeatedLemma.report.duplicates[0].candidateId);

 const beforeInvalid=structuredClone(repeatedLemma.state);
 const invalid=prepareBatch({batchId:"smoke-invalid-reference",records:[{candidateId:"missing-family",entity:{
  language:"en",lemma:"smoke-invalid",pos:"NOUN",entryKind:"word",familyIds:["fam_01900000-0000-7000-8000-000000000001"],
  lifecycleStatus:"active",editorialStatus:"draft"
 }}]},repeatedLemma.state);
 assert.equal(invalid.report.status,"conflict");
 assert.ok(invalid.report.issues.some(issue=>issue.code==="REFERENCE_NOT_FOUND"&&issue.path==="familyIds/0"));
 assert.deepEqual(repeatedLemma.state,beforeInvalid);

 const revisionBatch={batchId:"smoke-revision-target",records:[
  {candidateId:"entry",entity:{language:"en",lemma:"smoke-revision",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"}},
  {candidateId:"sense",type:"sns",entity:{entryId:"candidate:entry",definition:"Synthetic original definition",lifecycleStatus:"active",editorialStatus:"draft"}}
 ]};
 const target=prepareBatch(revisionBatch,repeatedLemma.state);
 assert.equal(target.report.status,"prepared");
 const senseId=target.state.mappings["smoke-revision-target#sense"].canonicalId;
 const accepted=reviseCandidates(target.state,{revisionId:"smoke-revision-1",changes:[{
  canonicalId:senseId,expectedRevision:1,set:{definition:"Synthetic revised definition"}
 }]});
 assert.equal(accepted.report.status,"revised");
 const stale=reviseCandidates(accepted.state,{revisionId:"smoke-revision-stale",changes:[{
  canonicalId:senseId,expectedRevision:1,set:{definition:"Stale definition"}
 }]});
 assert.ok(stale.report.issues.some(issue=>issue.code==="REVISION_CAS_CONFLICT"));
 assert.equal(stale.state,accepted.state);
 assert.equal(accepted.state.history.at(-1).action,"draft_revision");
 console.log(`cumulative smoke candidates=2000 first_prepare_ms=${firstMs.toFixed(1)} second_prepare_ms=${secondMs.toFixed(1)} records=${target.state.records.length}`);
});

test("bounded publication diagnostics preserve the complete fail-closed decision",()=>{
 const batch=makeBatch("publication-diagnostics",0,25);
 const prepared=prepareBatch(batch,{});
 assert.equal(prepared.report.status,"prepared");
 const full=validateDatasetV2(prepared.state.records);
 const bounded=validateDatasetV2(prepared.state.records,{publicationIssueLimit:0});
 assert.equal(full.valid,true);
 assert.equal(bounded.valid,true,"Draft storage remains valid when only publication diagnostics are elided");
 assert.equal(bounded.publication.eligible,false);
 assert.deepEqual(bounded.issues,full.issues);
 assert.equal(bounded.publication.issueCount,full.publication.issues.length);
 assert.equal(bounded.publication.omittedIssueCount,full.publication.issues.length);
 assert.deepEqual(bounded.publication.issues,[]);

 const required=validateDatasetV2(prepared.state.records,{publication:true,publicationIssueLimit:0});
 assert.equal(required.valid,false,"A diagnostic limit must not turn a blocked publication into a pass");
 assert.ok(required.issues.some(issue=>issue.code==="PUBLICATION_DIAGNOSTICS_TRUNCATED"));
 assert.equal(required.publication.eligible,false);
 const invalidLimit=validateDatasetV2(prepared.state.records,{publicationIssueLimit:-1});
 assert.equal(invalidLimit.valid,false);
 assert.equal(invalidLimit.issues[0].code,"OPTION_INVALID");
 assert.throws(()=>evaluatePublication(prepared.state.records,{}, {valid:true,issues:[]}),RangeError,
  "Untrusted graph reports must not bypass publication integrity validation");
});
