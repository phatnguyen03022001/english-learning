import {test} from "node:test";
import assert from "node:assert/strict";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
const entry = lemma => ({language:"en",lemma,pos:"NOUN",entryKind:"word",editorialStatus:"draft",lifecycleStatus:"active"});
const batch = {batchId:"pilot:a",records:[{candidateId:"entry",entity:entry("bank")},{candidateId:"sense",entity:{entryId:"candidate:entry",definition:"Synthetic meaning",editorialStatus:"draft",lifecycleStatus:"active"}}]};
test("stable UUIDv7 identities, reference resolution and exact replay",()=>{
  const a=prepareBatch(batch,{});
  assert.equal(a.report.status,"prepared",JSON.stringify(a.report.issues));
  const ids=a.state.records.map(r=>r._id);
  assert.equal(ids.length,2);
  for(const id of ids) assert.match(id,/^(lex|sns)_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(a.state.records.find(r=>r._id.startsWith("sns_")).entryId,ids[0]);
  const b=prepareBatch(batch,a.state);
  assert.equal(b.report.status,"replayed");
  assert.deepEqual(b.state,a.state);
});
test("changed payload rejects overwrite and keeps previous ledger",()=>{
  const a=prepareBatch(batch,{});
  const changed=structuredClone(batch);changed.records[0].entity.lemma="banking";
  const b=prepareBatch(changed,a.state);
  assert.equal(b.report.status,"conflict");assert.deepEqual(b.state,a.state);
});
test("different candidates sharing lemma never auto-merge; duplicate candidate ID is rejected",()=>{
  const a=prepareBatch(batch,{});
  const b=prepareBatch({batchId:"pilot:b",records:[{candidateId:"another",entity:entry("bank")}]},a.state);
  assert.equal(b.report.status,"prepared",JSON.stringify(b.report.issues));
  assert.equal(new Set(b.state.records.map(r=>r._id)).size,3);
  assert.ok(b.report.duplicates.length);
  const dup=prepareBatch({batchId:"dup",records:[{candidateId:"a",entity:entry("x")},{candidateId:"a",entity:entry("y")}]},a.state);
  assert.equal(dup.report.status,"conflict");assert.deepEqual(dup.state,a.state);
});
test("dry-run never mints identities or modifies state",()=>{
  const input={};const result=prepareBatch(batch,input,{dryRun:true});
  assert.equal(result.report.status,"dry-run");assert.deepEqual(result.state,input);
});
