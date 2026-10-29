#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,renameSync,rmSync,openSync,closeSync,unlinkSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {randomBytes} from "node:crypto";
import {prepareBatch} from "../pipeline/prepare-batch.mjs";
import {reviseCandidates} from "../pipeline/revise-candidates.mjs";
import {validateDatasetV2} from "../validators/validate-dataset-v2.mjs";
const args=process.argv.slice(2),op=args[0];
const opt=name=>{const n=args.indexOf(name);return n<0?null:args[n+1];};
const dryRun=args.includes("--dry-run");
const statePath=resolve(opt("--state")??".draft/candidates-state.json");
const load=path=>JSON.parse(readFileSync(path,"utf8"));
let lockFd;
let output;
try{
 if((op==="prepare"||op==="revise")&&!dryRun){
  mkdirSync(dirname(statePath),{recursive:true});
  // Exclusive lock acquired before reading state prevents lost updates.
  // A stale lock must be reconciled manually rather than silently stolen.
  lockFd=openSync(statePath+".lock","wx",0o600);
 }
 const state=(()=>{try{return load(statePath)}catch(e){if(e.code==="ENOENT")return {};throw e;}})();
 if(op==="check"){
  const result=validateDatasetV2(state.records??[]);
  output={status:result.valid?"valid":"invalid",storageValid:result.valid,issues:result.issues,publication:result.publication};
 }else if(op==="validate"||op==="prepare"||op==="revise"){
  const input=opt("--input");
  if(!input)throw Error("--input path required");
  const batch=load(resolve(input));
  const result=op==="revise" ? reviseCandidates(state,batch,{dryRun}) : prepareBatch(batch,state,{dryRun:op==="validate"||dryRun});
  output=result.report;
  if((op==="prepare"||op==="revise")&&!dryRun&&["prepared","revised"].includes(output.status)){
   mkdirSync(dirname(statePath),{recursive:true});
   const tmp=statePath+"."+randomBytes(6).toString("hex")+".tmp";
   try{writeFileSync(tmp,JSON.stringify(result.state,null,2)+"\n",{flag:"wx",mode:0o600});renameSync(tmp,statePath);}
   finally{rmSync(tmp,{force:true});}
  }
 }else throw Error("Choose validate | prepare | revise | check");
 console.log(JSON.stringify(output,null,2));
 if(output.status==="conflict"||output.status==="invalid")process.exitCode=1;
}catch(e){console.error(JSON.stringify({status:"error",message:e.message}));process.exitCode=1;}
finally{if(lockFd!==undefined){closeSync(lockFd);unlinkSync(statePath+".lock");}}
