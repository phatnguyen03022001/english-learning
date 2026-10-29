import {test} from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
test("bounded synthetic batch creates 400 stable identities; replay is exact and does not grow history",()=>{
 const records=Array.from({length:400},(_,i)=>({candidateId:"entry-"+i,entity:{
  language:"en",lemma:"synthetic-item-"+i,pos:"NOUN",entryKind:"word",
  lifecycleStatus:"active",editorialStatus:"draft"
 }}));
 const batch={batchId:"stress-400",records};
 const before=performance.now(),first=prepareBatch(batch,{});
 const elapsed=performance.now()-before;
 assert.equal(first.report.status,"prepared",JSON.stringify(first.report.issues).slice(0,900));
 assert.equal(first.state.records.length,400);
 assert.equal(new Set(first.state.records.map(x=>x._id)).size,400);
 assert.equal(first.state.history.length,1);
 const repeat=prepareBatch(batch,first.state);
 assert.equal(repeat.report.status,"replayed");
 assert.deepEqual(repeat.state,first.state);
 console.log("synthetic candidates=400 prepare_ms="+elapsed.toFixed(1)+" rss_mib="+(process.memoryUsage().rss/1048576).toFixed(1));
});
