import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,statSync,symlinkSync,mkdirSync,readdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
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

import {spawnSync} from "node:child_process";
import {spawn} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";

const cli=new URL("../../scripts/candidates.mjs",import.meta.url).pathname;
const emptyLedger=()=>({formatVersion:1,batches:{},mappings:{},sourceMappings:{},records:[],history:[]});
const sampleBatch=()=>({batchId:"r2-initial",records:[
 {candidateId:"entry",entity:{language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"}},
 {candidateId:"sense",entity:{entryId:"candidate:entry",definition:"Synthetic meaning",lifecycleStatus:"active",editorialStatus:"draft"}}
]});
const run=(cmd,state,input,cwd)=>spawnSync(process.execPath,[cli,cmd,...(state?["--state",state]:[]),...(input?["--input",input]:[])],{encoding:"utf8",...(cwd?{cwd}:{})});
const output=execution=>JSON.parse(execution.stdout);
const withTmp=fn=>{
 const tmp=mkdtempSync(join(tmpdir(),"lex-r2-"));
 try{fn(tmp);}finally{rmSync(tmp,{recursive:true,force:true});}
};
const withTmpAsync=async fn=>{
 const tmp=mkdtempSync(join(tmpdir(),"lex-r2-"));
 try{await fn(tmp);}finally{rmSync(tmp,{recursive:true,force:true});}
};
const start= (args,options={})=>{
 const child=spawn(process.execPath,args,{env:{...process.env,...options.env},stdio:["ignore","pipe","pipe"]});
 let stdout="",stderr="";
 child.stdout.setEncoding("utf8");child.stderr.setEncoding("utf8");
 child.stdout.on("data",chunk=>stdout+=chunk);child.stderr.on("data",chunk=>stderr+=chunk);
 const done=new Promise(resolve=>child.on("close",(code,signal)=>resolve({code,signal,stdout,stderr})));
 return {child,done};
};

test("state path contract accepts default and explicit temp paths and rejects relative escape",()=>withTmp(tmp=>{
 const workspace=join(tmp,"workspace"),outside=join(tmp,"outside"),input=join(workspace,"batch.json");
 mkdirSync(workspace);mkdirSync(outside);
 writeFileSync(input,JSON.stringify(sampleBatch()));
 const defaultWrite=run("prepare",null,input,workspace);
 assert.equal(defaultWrite.status,0,defaultWrite.stderr);
 assert.equal(JSON.parse(defaultWrite.stdout).status,"prepared");
 const defaultState=join(workspace,".draft","candidates-state.json");
 assert.equal(existsSync(defaultState),true);
 assert.equal(existsSync(defaultState+".lock"),false);
 const explicit=join(tmp,"authorized-temp-state.json");
 assert.equal(run("prepare",explicit,input,workspace).status,0);
 assert.equal(existsSync(explicit),true);
 const escaped=run("prepare","../outside/state.json",input,workspace);
 assert.equal(escaped.status,1);
 assert.match(JSON.parse(escaped.stderr).message,/relative.*within/i);
 assert.deepEqual(readdirSync(outside),[]);
}));

test("final, ancestor and broken state symlinks are rejected without touching targets",()=>withTmp(tmp=>{
 const workspace=join(tmp,"workspace"),outside=join(tmp,"outside"),input=join(tmp,"batch.json");
 mkdirSync(workspace);mkdirSync(outside);
 writeFileSync(input,JSON.stringify(sampleBatch()));
 const sentinel=join(outside,"sentinel.json"),sentinelBytes="authorized test fixture";
 writeFileSync(sentinel,sentinelBytes);
 const finalLink=join(workspace,"final-state.json");
 symlinkSync(sentinel,finalLink);
 const finalResult=run("prepare",finalLink,input,workspace);
 assert.equal(finalResult.status,1);
 assert.match(JSON.parse(finalResult.stderr).message,/symbolic link/i);
 assert.equal(readFileSync(sentinel,"utf8"),sentinelBytes);
 assert.equal(existsSync(finalLink+".lock"),false);

 const draft=join(workspace,".draft");mkdirSync(draft);
 const ancestorLink=join(draft,"state-dir");symlinkSync(outside,ancestorLink);
 const ancestorResult=run("prepare",join(ancestorLink,"state.json"),input,workspace);
 assert.equal(ancestorResult.status,1);
 assert.match(JSON.parse(ancestorResult.stderr).message,/symbolic link/i);
 assert.equal(readFileSync(sentinel,"utf8"),sentinelBytes);
 assert.deepEqual(readdirSync(outside).sort(),["sentinel.json"]);

 const broken=join(workspace,"broken-state.json"),missingTarget=join(outside,"not-created.json");
 symlinkSync(missingTarget,broken);
 const brokenResult=run("prepare",broken,input,workspace);
 assert.equal(brokenResult.status,1);
 assert.match(JSON.parse(brokenResult.stderr).message,/symbolic link/i);
 assert.equal(existsSync(missingTarget),false);
 assert.deepEqual(readdirSync(outside).sort(),["sentinel.json"]);
}));

test("R2 missing ledger is STATE_NOT_FOUND, nonzero and does not create a directory or lock",()=>withTmp(tmp=>{
 const state=join(tmp,"uncreated","state.json");
 const before=readdirSync(tmp);
 const r=run("check",state);
 assert.equal(r.status,1,r.stderr);
 assert.equal(r.stderr,"");
 assert.equal(output(r).status,"invalid");
 assert.equal(output(r).storageValid,false);
 assert.equal(output(r).issues[0].code,"STATE_NOT_FOUND");
 assert.equal(output(r).publication.eligible,false);
 assert.deepEqual(readdirSync(tmp),before);
 assert.equal(existsSync(state),false);
 assert.equal(existsSync(state+".lock"),false);
}));

test("R2 corrupted JSON produces explicit parse diagnostic, nonzero and no mutation",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),bytes="{broken JSON";
 writeFileSync(state,bytes);
 const before=readdirSync(tmp);
 const r=run("check",state);
 assert.equal(r.status,1);
 assert.equal(r.stdout,"");
 const diagnostic=JSON.parse(r.stderr);
 assert.equal(diagnostic.status,"error");
 assert.equal(diagnostic.code,"STATE_PARSE_ERROR");
 assert.match(diagnostic.message,/JSON|property|token|position|parse/i);
 assert.equal(readFileSync(state,"utf8"),bytes);
 assert.deepEqual(readdirSync(tmp),before);
}));

test("R2 malformed ledger shapes fail STATE_INVALID instead of validating an empty dataset",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),good=emptyLedger();
 const invalid=[
  {},null,[],{records:[]},{...good,formatVersion:2},
  {...good,records:null},{...good,records:{}},
  {...good,batches:null},{...good,mappings:[]},
  {...good,sourceMappings:"bad"},{...good,history:null},{...good,evidenceBindings:"bad"}
 ];
 for(const value of invalid){
  const bytes=JSON.stringify(value);
  writeFileSync(state,bytes);
  const r=run("check",state);
  assert.equal(r.status,1,JSON.stringify(value)+r.stderr);
  assert.equal(r.stderr,"");
  const result=output(r);
  assert.equal(result.status,"invalid",JSON.stringify(value));
  assert.equal(result.storageValid,false);
  assert.equal(result.issues[0].code,"STATE_INVALID");
  assert.equal(result.publication.eligible,false);
  assert.equal(readFileSync(state,"utf8"),bytes);
  assert.deepEqual(readdirSync(tmp),["state.json"]);
 }
}));

test("R2 initialized empty ledger passes storage but not publication; check remains read-only",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),bytes=JSON.stringify(emptyLedger(),null,2)+"\n";
 writeFileSync(state,bytes);
 const before=readdirSync(tmp);
 const r=run("check",state);
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.stderr,"");
 assert.equal(output(r).status,"valid");
 assert.equal(output(r).storageValid,true);
 assert.deepEqual(output(r).issues,[]);
 assert.equal(output(r).publication.eligible,false);
 assert.equal(readFileSync(state,"utf8"),bytes);
 assert.deepEqual(readdirSync(tmp),before);
}));

test("R2 populated persisted ledger passes check with original bytes and history intact",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),input=join(tmp,"batch.json");
 writeFileSync(input,JSON.stringify(sampleBatch()));
 const prepared=run("prepare",state,input);
 assert.equal(prepared.status,0,prepared.stderr);
 assert.equal(output(prepared).status,"prepared");
 const before=readFileSync(state,"utf8"),history=JSON.parse(before).history;
 const names=readdirSync(tmp);
 const r=run("check",state);
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.stderr,"");
 assert.equal(output(r).status,"valid");
 assert.equal(output(r).storageValid,true);
 assert.equal(output(r).publication.eligible,false);
 assert.equal(readFileSync(state,"utf8"),before);
 assert.deepEqual(JSON.parse(readFileSync(state,"utf8")).history,history);
 assert.deepEqual(readdirSync(tmp),names);
}));

test("candidate check bounds publication output and supports a full diagnostic opt-in",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),input=join(tmp,"batch.json");
 const records=Array.from({length:120},(_,index)=>({candidateId:`draft-${index}`,entity:{
  language:"en",lemma:`synthetic-draft-${index}`,pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"
 }}));
 writeFileSync(input,JSON.stringify({batchId:"bounded-publication-output",records}));
 assert.equal(run("prepare",state,input).status,0);
 const bytes=readFileSync(state,"utf8");
 const bounded=run("check",state);
 assert.equal(bounded.status,0,bounded.stderr);
 const report=output(bounded);
 assert.equal(report.storageValid,true);
 assert.equal(report.publication.eligible,false);
 assert.equal(report.publication.issues.length,1000);
 assert.ok(report.publication.issueCount>report.publication.issues.length);
 assert.equal(report.publication.omittedIssueCount,report.publication.issueCount-report.publication.issues.length);

 const full=spawnSync(process.execPath,[cli,"check","--state",state,"--full-publication-diagnostics"],{encoding:"utf8"});
 assert.equal(full.status,0,full.stderr);
 const fullReport=JSON.parse(full.stdout);
 assert.equal(fullReport.publication.eligible,false);
 assert.equal(fullReport.publication.issues.length,fullReport.publication.issueCount??1200);
 assert.equal(readFileSync(state,"utf8"),bytes,"Both check modes must be read-only");
}));

test("R2 persisted schema and graph violations fail with original diagnostics and no writes",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),input=join(tmp,"batch.json");
 writeFileSync(input,JSON.stringify(sampleBatch()));
 assert.equal(run("prepare",state,input).status,0);
 const valid=JSON.parse(readFileSync(state,"utf8"));
 const cases=[
  {change:rows=>{rows.find(x=>x._id.startsWith("lex_")).pos="NOT_A_POS";},code:"SCHEMA_INVALID"},
  {change:rows=>{rows.find(x=>x._id.startsWith("sns_")).entryId="lex_01940000-0000-7000-8000-000000009999";},code:"REFERENCE_NOT_FOUND"}
 ];
 for(const {change,code} of cases){
  const altered=structuredClone(valid);
  change(altered.records);
  const bytes=JSON.stringify(altered,null,2)+"\n";
  writeFileSync(state,bytes);
  const before=readdirSync(tmp);
  const r=run("check",state);
  assert.equal(r.status,1,r.stderr);
  assert.equal(r.stderr,"");
  assert.equal(output(r).status,"invalid");
  assert.equal(output(r).storageValid,false);
  assert.ok(output(r).issues.some(i=>i.code===code),JSON.stringify(output(r).issues));
  assert.equal(readFileSync(state,"utf8"),bytes);
  assert.deepEqual(readdirSync(tmp),before);
 }
}));

test("R2 first prepare, validate and dry-run still initialize safely without existing state",()=>withTmp(tmp=>{
 const state=join(tmp,"subdir","state.json"),input=join(tmp,"batch.json");
 writeFileSync(input,JSON.stringify(sampleBatch()));
 const first=run("validate",state,input);
 assert.equal(first.status,0,first.stderr);
 assert.equal(first.stderr,"");
 assert.equal(output(first).status,"dry-run");
 assert.equal(existsSync(join(tmp,"subdir")),false);
 const preview=spawnSync(process.execPath,[cli,"prepare","--input",input,"--state",state,"--dry-run"],{encoding:"utf8"});
 assert.equal(preview.status,0,preview.stderr);
 assert.equal(output(preview).status,"dry-run");
 assert.equal(existsSync(join(tmp,"subdir")),false);
 const prepared=run("prepare",state,input);
 assert.equal(prepared.status,0,prepared.stderr);
 assert.equal(output(prepared).status,"prepared");
 const data=JSON.parse(readFileSync(state,"utf8"));
 assert.equal(data.formatVersion,1);
 assert.equal(data.records.length,2);
 assert.equal(data.history.length,1);
 assert.equal(existsSync(state+".lock"),false);
}));

test("stale exclusive lock is preserved and blocks a writer without touching the ledger",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),input=join(tmp,"batch.json"),lock=state+".lock";
 writeFileSync(input,JSON.stringify(sampleBatch()));
 const ownerMarker="unknown lock owner; manual reconciliation required";
 writeFileSync(lock,ownerMarker,{mode:0o600});
 const result=run("prepare",state,input);
 assert.equal(result.status,1);
 assert.match(JSON.parse(result.stderr).message,/exist|EEXIST/i);
 assert.equal(readFileSync(lock,"utf8"),ownerMarker);
 assert.equal(existsSync(state),false);
 assert.deepEqual(readdirSync(tmp).sort(),["batch.json","state.json.lock"]);
}));

test("competing writers serialize through the exclusive lock and cannot lose an update",async()=>withTmpAsync(async tmp=>{
 const state=join(tmp,"state.json"),firstInput=join(tmp,"first.json"),secondInput=join(tmp,"second.json");
 const preload=join(tmp,"hold-lock.mjs"),lock=state+".lock";
 writeFileSync(firstInput,JSON.stringify(sampleBatch()));
 writeFileSync(secondInput,JSON.stringify({batchId:"concurrent-writer",records:[{candidateId:"entry-2",entity:{
  language:"en",lemma:"synthetic-second",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"
 }}]}));
 writeFileSync(preload,[
  'import fs from "node:fs";',
  'import {syncBuiltinESMExports} from "node:module";',
  'const original=fs.openSync;',
  'fs.openSync=function(path,flags,...args){const fd=original.call(this,path,flags,...args);if(String(path)===process.env.CANDIDATE_LOCK_TEST_PATH&&String(flags).includes("x")){const ms=Number(process.env.CANDIDATE_LOCK_TEST_HOLD_MS||0);if(ms>0)Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);}return fd;};',
  'syncBuiltinESMExports();'
 ].join("\n"));
 const first=start(["--import",preload,cli,"prepare","--state",state,"--input",firstInput],{
  env:{CANDIDATE_LOCK_TEST_PATH:lock,CANDIDATE_LOCK_TEST_HOLD_MS:"700"}
 });
 let found=false;
 for(let attempt=0;attempt<100;attempt++){
  if(existsSync(lock)){found=true;break;}
  await delay(10);
 }
 assert.equal(found,true,"first writer should hold the lock before the competing attempt");
 const second=run("prepare",state,secondInput);
 assert.equal(second.status,1);
 assert.match(JSON.parse(second.stderr).message,/exist|EEXIST/i);
 const firstResult=await first.done;
 assert.equal(firstResult.code,0,firstResult.stderr);
 assert.equal(JSON.parse(firstResult.stdout).status,"prepared");
 assert.equal(existsSync(lock),false);
 const ledger=JSON.parse(readFileSync(state,"utf8"));
 assert.equal(ledger.records.length,2);
 assert.equal(ledger.history.length,1);
 assert.equal(statSync(state).mode&0o777,0o600);
 if(typeof process.getuid==="function")assert.equal(statSync(state).uid,process.getuid());
}));

test("failed atomic replacement preserves the prior snapshot and permits safe retry",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),initial=join(tmp,"initial.json"),next=join(tmp,"next.json");
 const preload=join(tmp,"fail-rename.mjs");
 writeFileSync(initial,JSON.stringify(sampleBatch()));
 writeFileSync(next,JSON.stringify({batchId:"recover-after-rename-failure",records:[{candidateId:"recovery-entry",entity:{
  language:"en",lemma:"synthetic-recovery",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"
 }}]}));
 assert.equal(run("prepare",state,initial).status,0);
 const previous=readFileSync(state,"utf8");
 writeFileSync(preload,[
  'import fs from "node:fs";',
  'import {syncBuiltinESMExports} from "node:module";',
  'const original=fs.renameSync;',
  'fs.renameSync=function(from,to,...args){if(String(to)===process.env.CANDIDATE_FAIL_RENAME_TARGET)throw new Error("injected atomic replacement failure");return original.call(this,from,to,...args);};',
  'syncBuiltinESMExports();'
 ].join("\n"));
 const failed=spawnSync(process.execPath,["--import",preload,cli,"prepare","--state",state,"--input",next],{
  encoding:"utf8",env:{...process.env,CANDIDATE_FAIL_RENAME_TARGET:state}
 });
 assert.equal(failed.status,1);
 assert.match(JSON.parse(failed.stderr).message,/injected atomic replacement failure/);
 assert.equal(readFileSync(state,"utf8"),previous);
 assert.equal(existsSync(state+".lock"),false);
 assert.deepEqual(readdirSync(tmp).sort(),["fail-rename.mjs","initial.json","next.json","state.json"]);

 const recovered=run("prepare",state,next);
 assert.equal(recovered.status,0,recovered.stderr);
 assert.equal(output(recovered).status,"prepared");
 const restored=JSON.parse(readFileSync(state,"utf8"));
 assert.equal(restored.records.length,3);
 assert.equal(restored.history.length,2);
 assert.equal(statSync(state).mode&0o777,0o600);
 if(typeof process.getuid==="function")assert.equal(statSync(state).uid,process.getuid());
}));

test("interrupted temp-file write leaves the old state intact and removes lock/temp files",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),initial=join(tmp,"initial.json"),next=join(tmp,"next.json"),preload=join(tmp,"interrupt-write.mjs");
 writeFileSync(initial,JSON.stringify(sampleBatch()));
 writeFileSync(next,JSON.stringify({batchId:"interrupted-write",records:[{candidateId:"entry",entity:{
  language:"en",lemma:"interrupted-write",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"
 }}]}));
 assert.equal(run("prepare",state,initial).status,0);
 const before=readFileSync(state,"utf8");
 writeFileSync(preload,[
  'import fs from "node:fs";',
  'import {syncBuiltinESMExports} from "node:module";',
  'const original=fs.writeFileSync;',
  'fs.writeFileSync=function(target,data,...args){if(typeof target==="number"&&process.env.CANDIDATE_INTERRUPT_ATOMIC_WRITE==="1"){original.call(this,target,String(data).slice(0,32));throw new Error("injected interrupted atomic write");}return original.call(this,target,data,...args);};',
  'syncBuiltinESMExports();'
 ].join("\n"));
 const interrupted=spawnSync(process.execPath,["--import",preload,cli,"prepare","--state",state,"--input",next],{
  encoding:"utf8",env:{...process.env,CANDIDATE_INTERRUPT_ATOMIC_WRITE:"1"}
 });
 assert.equal(interrupted.status,1);
 assert.match(JSON.parse(interrupted.stderr).message,/interrupted atomic write/);
 assert.equal(readFileSync(state,"utf8"),before);
 assert.deepEqual(readdirSync(tmp).sort(),["initial.json","interrupt-write.mjs","next.json","state.json"]);
}));

test("evidence binding CLI persists a draft-only CAS update and exact replay",()=>withTmp(tmp=>{
 const state=join(tmp,"state.json"),initial=join(tmp,"initial.json"),evidenceBatchPath=join(tmp,"evidence.json"),bindingPath=join(tmp,"binding.json");
 writeFileSync(initial,JSON.stringify({batchId:"bind-cli-initial",records:[
  {candidateId:"entry",type:"lex",entity:{language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"}},
  {candidateId:"sense",type:"sns",entity:{entryId:"candidate:entry",definition:"Synthetic definition",lifecycleStatus:"active",editorialStatus:"draft"}},
  {candidateId:"source",type:"src",entity:{title:"Synthetic source",rights:{status:"reference_only"},lifecycleStatus:"active",editorialStatus:"draft"}}
 ]}));
 assert.equal(run("prepare",state,initial).status,0);
 const prepared=JSON.parse(readFileSync(state,"utf8")),senseId=prepared.mappings["bind-cli-initial#sense"].canonicalId,sourceId=prepared.mappings["bind-cli-initial#source"].canonicalId;
 const valueDigest=createHash("sha256").update(JSON.stringify("Synthetic definition")).digest("hex");
 writeFileSync(evidenceBatchPath,JSON.stringify({batchId:"bind-cli-evidence",records:[{candidateId:"definition-proof",type:"evd",entity:{sourceId,assertionIds:[senseId],claim:{subjectId:senseId,fieldPath:"/definition",valueDigest,specificity:"exact_value"},lifecycleStatus:"active",editorialStatus:"draft"}}]}));
 assert.equal(run("prepare",state,evidenceBatchPath).status,0);
 const afterEvidence=JSON.parse(readFileSync(state,"utf8")),evidenceId=afterEvidence.mappings["bind-cli-evidence#definition-proof"].canonicalId;
 writeFileSync(bindingPath,JSON.stringify({bindingId:"bind-cli-proof",subjectId:senseId,expectedRevision:1,evidenceIds:[evidenceId]}));
 const beforeDry=readFileSync(state,"utf8");
 const dry=spawnSync(process.execPath,[cli,"bind-evidence","--state",state,"--input",bindingPath,"--dry-run"],{encoding:"utf8"});
 assert.equal(dry.status,0,dry.stderr);assert.equal(output(dry).status,"dry-run");
 assert.equal(readFileSync(state,"utf8"),beforeDry);
 const first=run("bind-evidence",state,bindingPath);
 assert.equal(first.status,0,first.stderr);assert.equal(output(first).status,"bound");
 const updated=JSON.parse(readFileSync(state,"utf8")),subject=updated.records.find(record=>record._id===senseId);
 assert.deepEqual(subject.evidenceIds,[evidenceId]);assert.equal(subject.revision,2);
 assert.equal(updated.history.at(-1).action,"evidence_binding");
 const replay=run("bind-evidence",state,bindingPath);
 assert.equal(replay.status,0,replay.stderr);assert.equal(output(replay).status,"replayed");
 assert.equal(JSON.parse(readFileSync(state,"utf8")).records.find(record=>record._id===senseId).revision,2);
}));
