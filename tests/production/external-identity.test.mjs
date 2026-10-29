import {test} from "node:test";
import assert from "node:assert/strict";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
const entity={language:"en",lemma:"candidate example",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"};
const make=(batchId,candidateId="entry",value=entity)=>({batchId,records:[{candidateId,sourceItemKey:"providerA:release1:item91",entity:value}]});
test("explicit source-item identity across new batches maps to one canonical ID without duplicate record",()=>{
 const first=prepareBatch(make("release:first"),{});
 assert.equal(first.report.status,"prepared",JSON.stringify(first.report.issues));
 const second=prepareBatch(make("release:second","renamedCandidate"),first.state);
 assert.equal(second.report.status,"prepared",JSON.stringify(second.report.issues));
 assert.equal(second.state.records.length,1);
 assert.equal(second.state.batches["release:first"].recordIds[0],second.state.batches["release:second"].recordIds[0]);
 assert.equal(second.state.mappings["release:second#renamedCandidate"].canonicalId,first.state.records[0]._id);
 const again=prepareBatch(make("release:second","renamedCandidate"),second.state);
 assert.equal(again.report.status,"replayed");assert.deepEqual(again.state,second.state);
});
test("changed source-item payload conflicts rather than mutating prior canonical assertion",()=>{
 const first=prepareBatch(make("release:first"),{});
 const conflict=prepareBatch(make("release:second","entry",{...entity,lemma:"different"}),first.state);
 assert.equal(conflict.report.status,"conflict");
 assert.ok(conflict.report.issues.some(i=>i.code==="SOURCE_ITEM_CHANGED"));
 assert.deepEqual(conflict.state,first.state);
});
test("two candidates cannot claim the same persistent source identity in one batch",()=>{
 const batch=make("release:dup");
 batch.records.push({candidateId:"other",sourceItemKey:batch.records[0].sourceItemKey,entity:{...entity,lemma:"distinct"}});
 const result=prepareBatch(batch,{});
 assert.equal(result.report.status,"conflict");
});
