#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,renameSync,rmSync,openSync,closeSync,unlinkSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {randomBytes} from "node:crypto";
import {prepareBatch} from "../pipeline/prepare-batch.mjs";
import {bindEvidence} from "../pipeline/bind-evidence.mjs";
import {reviseCandidates} from "../pipeline/revise-candidates.mjs";
import {promoteCandidates} from "../pipeline/promote-candidates.mjs";
import {validateDatasetV2} from "../validators/validate-dataset-v2.mjs";
const args=process.argv.slice(2),op=args[0];
const opt=name=>{const n=args.indexOf(name);return n<0?null:args[n+1];};
const dryRun=args.includes("--dry-run");
const fullPublicationDiagnostics=args.includes("--full-publication-diagnostics");
const publicationDiagnosticLimit=1000;
const statePath=resolve(opt("--state")??".draft/candidates-state.json");
const load=path=>JSON.parse(readFileSync(path,"utf8"));
let lockFd;
let output;
try{
 if((op==="prepare"||op==="bind-evidence"||op==="revise"||op==="promote")&&!dryRun){
  mkdirSync(dirname(statePath),{recursive:true});
  // Exclusive lock acquired before reading state prevents lost updates.
  // A stale lock must be reconciled manually rather than silently stolen.
  lockFd=openSync(statePath+".lock","wx",0o600);
 }
 const state=(()=>{try{return load(statePath)}catch(e){if(e.code==="ENOENT")return op==="check"?undefined:{};throw e;}})();
 if(op==="check"){
  const object=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
  const validState=object(state)&&state.formatVersion===1&&Array.isArray(state.records)&&
   Array.isArray(state.history)&&["batches","mappings","sourceMappings"].every(k=>object(state[k]))&&
   (state.evidenceBindings===undefined||object(state.evidenceBindings));
  if(!validState){
   const missing=state===undefined;
   output={status:"invalid",storageValid:false,issues:[{
    code:missing?"STATE_NOT_FOUND":"STATE_INVALID",
    message:missing?"Persisted candidate ledger does not exist":"Malformed candidate ledger structure"
   }],publication:{eligible:false,issues:[]}};
  }else{
   const result=validateDatasetV2(state.records,fullPublicationDiagnostics?{}:{publicationIssueLimit:publicationDiagnosticLimit});
   output={status:result.valid?"valid":"invalid",storageValid:result.valid,issues:result.issues,publication:result.publication};
  }
 }else if(op==="validate"||op==="prepare"||op==="bind-evidence"||op==="revise"||op==="promote"){
  const input=opt("--input");
  if(!input)throw Error("--input path required");
  const batch=load(resolve(input));
  const result=op==="bind-evidence" ? bindEvidence(state,batch,{dryRun}) :
    op==="revise" ? reviseCandidates(state,batch,{dryRun}) :
    op==="promote" ? promoteCandidates(state,batch,{dryRun}) :
    prepareBatch(batch,state,{dryRun:op==="validate"||dryRun});
  output=result.report;
  if((op==="prepare"||op==="bind-evidence"||op==="revise"||op==="promote")&&!dryRun&&["prepared","bound","revised","promoted"].includes(output.status)){
   mkdirSync(dirname(statePath),{recursive:true});
   const tmp=statePath+"."+randomBytes(6).toString("hex")+".tmp";
   try{writeFileSync(tmp,JSON.stringify(result.state,null,2)+"\n",{flag:"wx",mode:0o600});renameSync(tmp,statePath);}
   finally{rmSync(tmp,{force:true});}
  }
 }else throw Error("Choose validate | prepare | bind-evidence | revise | promote | check");
 console.log(JSON.stringify(output,null,2));
 if(["conflict","invalid","blocked"].includes(output.status))process.exitCode=1;
}catch(e){
 console.error(JSON.stringify(op==="check"&&e instanceof SyntaxError
  ?{status:"error",code:"STATE_PARSE_ERROR",message:e.message}
  :{status:"error",message:e.message}));
 process.exitCode=1;
}
finally{if(lockFd!==undefined){closeSync(lockFd);unlinkSync(statePath+".lock");}}
