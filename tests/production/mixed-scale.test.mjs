import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const benchmark=new URL("../../scripts/benchmark-scale.mjs",import.meta.url);
test("1K mixed-entity CI smoke enforces schema, graph, replay, isolation and fail-closed publication",{timeout:30000},()=>{
 const temp=mkdtempSync(join(tmpdir(),"english-mixed-ci-"));
 try{
  const result=spawnSync(process.execPath,["--max-old-space-size=1024",benchmark.pathname,
   "--worker","--kind=mixed","--size=1000","--temp-root="+temp],
   {encoding:"utf8",timeout:25000,maxBuffer:1048576});
  assert.equal(result.status,0,result.stderr||result.error?.message);
  const report=JSON.parse(result.stdout);
  assert.equal(report.status,"pass");
  assert.equal(report.candidateCount,1000);
  assert.equal(report.graphEdges,1000,"Ten tested references per ten-record mixed group");
  assert.deepEqual(report.shapeCounts,{lex:200,sns:300,con:100,eqv:100,rel:100,src:100,evd:100});
  assert.ok(report.publicationIssueCount>0,"Synthetic records never attest editorial authority");
  assert.equal(report.changedBatchConflict,"pass");
  assert.equal(report.invalidReferenceNoMutation,"pass");
  assert.ok(report.replayMs>=0);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
