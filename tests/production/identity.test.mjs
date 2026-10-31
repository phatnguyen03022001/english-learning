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
test("symmetric relation endpoints canonicalize after resolution in dry-run and real prepare",()=>{
 const make=(reverse)=>({batchId:"symmetric:"+reverse,records:[
  {candidateId:"a",entity:entry("alpha")},
  {candidateId:"sa",entity:{entryId:"candidate:a",definition:"Alpha",editorialStatus:"draft",lifecycleStatus:"active"}},
  {candidateId:"b",entity:entry("beta")},
  {candidateId:"sb",entity:{entryId:"candidate:b",definition:"Beta",editorialStatus:"draft",lifecycleStatus:"active"}},
  {candidateId:"edge",entity:{relationType:"NEAR_SYNONYM_OF",sourceId:"candidate:"+(reverse?"sb":"sa"),targetId:"candidate:"+(reverse?"sa":"sb"),qualifiers:{context:"test context"},editorialStatus:"draft",lifecycleStatus:"active"}}
 ]});
 for(const reverse of [false,true]){
  const batch=make(reverse),dry=prepareBatch(batch,{}, {dryRun:true});
  assert.equal(dry.report.status,"dry-run",JSON.stringify(dry.report.issues));
  const prepared=prepareBatch(batch,{});
  assert.equal(prepared.report.status,"prepared",JSON.stringify(prepared.report.issues));
  const rel=prepared.state.records.find(r=>r._id.startsWith("rel_"));
  assert.ok(rel.sourceId<rel.targetId);assert.deepEqual(rel.qualifiers,{context:"test context"});
  assert.equal(prepareBatch(batch,prepared.state).report.status,"replayed");
 }
});
