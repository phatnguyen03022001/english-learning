import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
test("CLI prepare/replay/check uses persisted state; validate is read-only",()=>{
 const tmp=mkdtempSync(join(tmpdir(),"lex-candidates-"));
 try{
  const input=join(tmp,"batch.json"),state=join(tmp,"state.json");
  writeFileSync(input,JSON.stringify({batchId:"cli:v1",records:[{candidateId:"headword",entity:{language:"en",lemma:"test",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"}}]}));
  const call=cmd=>JSON.parse(execFileSync(process.execPath,[new URL("../../scripts/candidates.mjs",import.meta.url).pathname,cmd,"--input",input,"--state",state],{encoding:"utf8"}));
  assert.equal(call("validate").status,"dry-run");assert.equal(existsSync(state),false);
  assert.equal(call("prepare").status,"prepared");const first=readFileSync(state,"utf8");
  assert.equal(call("prepare").status,"replayed");assert.equal(readFileSync(state,"utf8"),first);
  const check=call("check");assert.equal(check.status,"valid");assert.equal(check.publication.eligible,false);
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
