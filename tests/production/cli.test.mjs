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

import {spawnSync} from "node:child_process";
import {readdirSync,mkdirSync} from "node:fs";

const cli=new URL("../../scripts/candidates.mjs",import.meta.url).pathname;
const emptyLedger=()=>({formatVersion:1,batches:{},mappings:{},sourceMappings:{},records:[],history:[]});
const sampleBatch=()=>({batchId:"r2-initial",records:[
 {candidateId:"entry",entity:{language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"}},
 {candidateId:"sense",entity:{entryId:"candidate:entry",definition:"Synthetic meaning",lifecycleStatus:"active",editorialStatus:"draft"}}
]});
const run=(cmd,state,input)=>spawnSync(process.execPath,[cli,cmd,"--state",state,...(input?["--input",input]:[])],{encoding:"utf8"});
const output=execution=>JSON.parse(execution.stdout);
const withTmp=fn=>{
 const tmp=mkdtempSync(join(tmpdir(),"lex-r2-"));
 try{fn(tmp);}finally{rmSync(tmp,{recursive:true,force:true});}
};

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
  {...good,sourceMappings:"bad"},{...good,history:null}
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
