import {test} from "node:test";
import assert from "node:assert/strict";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
import {reviseCandidates} from "../../pipeline/revise-candidates.mjs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";
const draft={lifecycleStatus:"active",editorialStatus:"draft"};
const records=[
 {candidateId:"entry",type:"lex",entity:{...draft,language:"en",lemma:"synthetic-consumer",pos:"NOUN",entryKind:"word"}},
 {candidateId:"sense",type:"sns",entity:{...draft,entryId:"candidate:entry",definition:"Initial synthetic definition"}}
];
const resolveConsumer=(state,ids)=>{
 const recordsById=new Map(state.records.map(r=>[r._id,r]));
 return ids.map(id=>{
  const item=recordsById.get(id);
  return {id,exists:!!item,active:item?.lifecycleStatus==="active",
   publishable:item?.editorialStatus==="verified"&&item?.lifecycleStatus==="active"};
 });
};
test("synthetic consumers keep canonical IDs and reject missing/draft references",()=>{
 const prepared=prepareBatch({batchId:"consumer-base",records},{});
 assert.equal(prepared.report.status,"prepared");
 const entryId=prepared.state.mappings["consumer-base#entry"].canonicalId;
 const senseId=prepared.state.mappings["consumer-base#sense"].canonicalId;
 const consumer={id:"exercise-synthetic-1",lexicalIds:[entryId,senseId]};
 const snapshot=structuredClone(consumer);
 assert.deepEqual(resolveConsumer(prepared.state,consumer.lexicalIds).map(x=>x.publishable),[false,false]);
 const revision=reviseCandidates(prepared.state,{revisionId:"consumer-revision",changes:[{
  canonicalId:senseId,expectedRevision:1,set:{definition:"Revised synthetic definition"}
 }]});
 assert.equal(revision.report.status,"revised");
 assert.deepEqual(consumer,snapshot,"Changing lexical definitions must not mutate exercise references");
 assert.equal(revision.state.records.find(x=>x._id===senseId).revision,2);
 assert.deepEqual(resolveConsumer(revision.state,consumer.lexicalIds).map(x=>x.exists),[true,true]);
 const invalid="lex_01900000-0000-7000-8000-000000999999";
 assert.deepEqual(resolveConsumer(revision.state,[invalid]).map(x=>x.exists),[false]);
 assert.equal(validateDatasetV2(revision.state.records).publication.eligible,false);
 const replay=prepareBatch({batchId:"consumer-base",records},revision.state);
 assert.equal(replay.report.status,"replayed");
 assert.equal(replay.state,revision.state);
});


test("cross-batch mixed graph additions preserve identity, provenance and audit history",()=>{
 const first={batchId:"mixed-cross-a",records:[
  {candidateId:"en",type:"lex",entity:{...draft,language:"en",lemma:"synthetic-cross-en",pos:"VERB",entryKind:"word"}},
  {candidateId:"vi",type:"lex",entity:{...draft,language:"vi",lemma:"từ-giả-cross",pos:"VERB",entryKind:"word"}},
  {candidateId:"s1",type:"sns",entity:{...draft,entryId:"candidate:en",definition:"Synthetic English sense one"}},
  {candidateId:"s2",type:"sns",entity:{...draft,entryId:"candidate:en",definition:"Synthetic English sense two"}},
  {candidateId:"sv",type:"sns",entity:{...draft,entryId:"candidate:vi",definition:"Synthetic Vietnamese sense"}},
  {candidateId:"source",type:"src",sourceItemKey:"synthetic:cross:source",entity:{...draft,title:"Synthetic source, no redistribution attestation"}}
 ]};
 const a=prepareBatch(first,{});
 assert.equal(a.report.status,"prepared");
 const id=x=>a.state.mappings["mixed-cross-a#"+x].canonicalId;
 const second={batchId:"mixed-cross-b",records:[
  {candidateId:"con",type:"con",entity:{...draft,senseId:id("s1"),constructionType:"valency",pattern:"verb + object"}},
  {candidateId:"eqv",type:"eqv",entity:{...draft,sourceSenseId:id("s1"),targetSenseId:id("sv"),
   direction:"en_to_vi",alignmentMode:"sense_aligned",equivalenceType:"approximate",
   translationEvidenceStatus:"evidence_pending",evidenceIds:[]}},
  {candidateId:"rel",type:"rel",entity:{...draft,relationType:"NEAR_SYNONYM_OF",sourceId:id("s1"),targetId:id("s2")}},
  {candidateId:"ev",type:"evd",entity:{...draft,sourceId:id("source"),assertionIds:[id("s1")]}}
 ]};
 const b=prepareBatch(second,a.state);
 assert.equal(b.report.status,"prepared",JSON.stringify(b.report.issues));
 assert.equal(b.state.records.length,10);
 assert.equal(b.state.history.length,2);
 const snapshot=JSON.stringify(b.state);
 assert.equal(prepareBatch(second,b.state).state,b.state,"Exact replay must not grow history");
 const reused=prepareBatch({batchId:"mixed-cross-source-reuse",records:[{
  candidateId:"same-source",type:"src",sourceItemKey:"synthetic:cross:source",
  entity:{...draft,title:"Synthetic source, no redistribution attestation"}
 }]},b.state);
 assert.equal(reused.report.status,"prepared");
 assert.equal(reused.report.reusedCount,1);
 assert.equal(reused.state.records.length,10);
 assert.equal(reused.state.mappings["mixed-cross-source-reuse#same-source"].canonicalId,id("source"));
 const changed=prepareBatch({batchId:"mixed-cross-source-conflict",records:[{
  candidateId:"modified-source",type:"src",sourceItemKey:"synthetic:cross:source",
  entity:{...draft,title:"Modified synthetic source"}
 }]},reused.state);
 assert.equal(changed.report.status,"conflict");
 assert.ok(changed.report.issues.some(x=>x.code==="SOURCE_ITEM_CHANGED"));
 assert.equal(changed.state,reused.state);
 const invalid=prepareBatch({batchId:"mixed-cross-language-invalid",records:[{
  candidateId:"bad-relation",type:"rel",entity:{...draft,
   relationType:"SYNONYM_OF",sourceId:id("s1"),targetId:id("sv")}
 }]},b.state);
 assert.equal(invalid.report.status,"conflict");
 assert.ok(invalid.report.issues.some(x=>x.code==="RELATION_LANGUAGE_MISMATCH"));
 assert.equal(invalid.state,b.state);
 assert.equal(JSON.stringify(b.state),snapshot,"Failed additions must not rewrite prior graph/history");
 assert.equal(validateDatasetV2(b.state.records).publication.eligible,false);
});
