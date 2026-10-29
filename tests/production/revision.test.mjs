import {test} from "node:test";
import assert from "node:assert/strict";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
import {reviseCandidates} from "../../pipeline/revise-candidates.mjs";
const batch={batchId:"revision-batch",records:[{candidateId:"entry",entity:{language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"}},{candidateId:"sense",entity:{entryId:"candidate:entry",definition:"Draft meaning",lifecycleStatus:"active",editorialStatus:"draft"}}]};
const prepared=()=>prepareBatch(batch,{}).state;
const revision=(id,word="Revised synthetic definition")=>({revisionId:"r1",changes:[{canonicalId:id,expectedRevision:1,set:{definition:word}}]});
test("draft revision preserves sense identity, records previous snapshot and exact replay",()=>{
 const before=prepared(),sense=before.records.find(r=>r._id.startsWith("sns_"));
 const first=reviseCandidates(before,revision(sense._id));
 assert.equal(first.report.status,"revised",JSON.stringify(first.report.issues));
 const updated=first.state.records.find(r=>r._id===sense._id);
 assert.equal(updated.revision,2);assert.equal(updated.definition,"Revised synthetic definition");
 assert.equal(first.state.history.at(-1).before[0].definition,"Draft meaning");
 assert.equal(first.state.history.at(-1).after[0]._id,sense._id);
 const replay=reviseCandidates(first.state,revision(sense._id));
 assert.equal(replay.report.status,"replayed");assert.deepEqual(replay.state,first.state);
});
test("changed revision ID or stale CAS fails without partial state overwrite",()=>{
 const before=prepared(),sense=before.records.find(r=>r._id.startsWith("sns_"));
 const a=reviseCandidates(before,revision(sense._id));
 const changed=reviseCandidates(a.state,revision(sense._id,"Changed again"));
 assert.equal(changed.report.status,"conflict");assert.deepEqual(changed.state,a.state);
 const stale=reviseCandidates(a.state,{revisionId:"r2",changes:[{canonicalId:sense._id,expectedRevision:1,set:{definition:"lost update"}}]});
 assert.equal(stale.report.status,"conflict");assert.deepEqual(stale.state,a.state);
});
test("immutable identity, synthetic verification and invalid graph edits cannot slip through",()=>{
 const state=prepared(),lex=state.records.find(r=>r._id.startsWith("lex_"));
 for(const set of [{lemma:"renamed"},{_id:"lex_other"},{editorialStatus:"verified"},{pos:"VERB"}]){
  const attempt=reviseCandidates(state,{revisionId:"unsafe",changes:[{canonicalId:lex._id,expectedRevision:1,set}]});
  assert.equal(attempt.report.status,"conflict",JSON.stringify(attempt.report.issues));
  assert.deepEqual(attempt.state,state);
 }
 const preview=reviseCandidates(state,{revisionId:"dry",changes:[{canonicalId:lex._id,expectedRevision:1,set:{familyIds:[]}}]},{dryRun:true});
 assert.equal(preview.report.status,"dry-run");assert.deepEqual(preview.state,state);
});
