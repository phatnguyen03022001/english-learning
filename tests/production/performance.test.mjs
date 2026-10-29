import {test} from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {validateGraph} from "../../validators/graph-v1.mjs";
const id=(p,n)=>p+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
test("indexed publication review lookup preserves exact diagnostics at bounded scale",()=>{
 const records=[];
 for(let i=1;i<=300;i++){
  records.push({_id:id("lex",5000+i),schemaVersion:"1.0.0",lifecycleStatus:"active",editorialStatus:"verified",language:"en",lemma:"synthetic"+i,pos:"NOUN",entryKind:"word"});
  records.push({_id:id("rev",5000+i),schemaVersion:"1.0.0",lifecycleStatus:"active",editorialStatus:"draft",reviewerId:"unappointed",subjectIds:[id("lex",5000+i)],outcome:"accepted"});
 }
 const start=performance.now(),report=validateGraph(records),elapsed=performance.now()-start;
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 assert.equal(report.publication.eligible,false);
 assert.equal(report.publication.issues.filter(i=>i.code==="PUBLICATION_REVIEW_MISSING").length,0);
 assert.equal(report.publication.issues.filter(i=>i.code==="INSUFFICIENT_EVIDENCE").length,300);
 assert.deepEqual(validateGraph([...records].reverse()),report);
 console.log("bounded 600 records elapsed_ms="+elapsed.toFixed(1)+" rss_mib="+(process.memoryUsage().rss/1048576).toFixed(1));
});
