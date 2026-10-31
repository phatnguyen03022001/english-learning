#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,renameSync,rmSync,statSync,writeFileSync} from "node:fs";
import {tmpdir,totalmem,availableParallelism} from "node:os";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {performance} from "node:perf_hooks";
import Ajv2020 from "ajv/dist/2020.js";
import {prepareBatch} from "../pipeline/prepare-batch.mjs";
import {reviseCandidates} from "../pipeline/revise-candidates.mjs";
import {validateGraph} from "../validators/graph-v1.mjs";
import {evaluatePublication} from "../validators/production-gates.mjs";
import {validateDatasetV2} from "../validators/validate-dataset-v2.mjs";

const scriptPath=fileURLToPath(import.meta.url);
const schemaDirectory=resolve(dirname(scriptPath),"../schemas/v2");
const schemaNames={lex:"lexical-entry",sns:"lexical-sense",frm:"lexical-form",fam:"word-family",mrf:"morpheme",ety:"etymology",top:"topic",con:"construction",col:"collocation",eqv:"translation-equivalence",rel:"lexical-relation",evd:"evidence",src:"source",rev:"editorial-review",dec:"editorial-decision"};
const compare=(a,b)=>a<b?-1:a>b?1:0;
const idFor=(prefix,number)=>`${prefix}_01900000-0000-7000-8000-${number.toString(16).padStart(12,"0")}`;
const elapsed=fn=>{const start=performance.now(),value=fn();return {value,milliseconds:performance.now()-start};};
const round=value=>Number(value.toFixed(2));
const memory=()=>process.memoryUsage();
const peakRssMiB=()=>mib(process.resourceUsage().maxRSS*1024);
let heapCheckpointPeak=memory().heapUsed;
const checkpoint=()=>{heapCheckpointPeak=Math.max(heapCheckpointPeak,memory().heapUsed);};
const mib=bytes=>round(bytes/1048576);
const environment=()=>({node:process.version,v8:process.versions.v8,platform:process.platform,
 arch:process.arch,availableParallelism:availableParallelism(),totalMemoryMiB:mib(totalmem())});

function makeBatch(size,batchId,startIndex=0){
 return {batchId,records:Array.from({length:size},(_,offset)=>{
  const index=startIndex+offset;
  return {candidateId:`candidate-${index}`,sourceItemKey:`benchmark:scale:${index}`,entity:{
   language:"en",lemma:`synthetic-lexeme-${index}`,pos:"NOUN",entryKind:"word",
   lifecycleStatus:"active",editorialStatus:"draft"
  }};
 })};
}

function makeSchemaValidators(){
 const ajv=new Ajv2020({strict:true,strictRequired:false,strictTypes:false,allErrors:true,validateFormats:false});
 ajv.addKeyword({keyword:"version",schemaType:"string"});
 for(const name of readdirSync(schemaDirectory).filter(name=>name.endsWith(".schema.json")).sort())
  ajv.addSchema(JSON.parse(readFileSync(join(schemaDirectory,name),"utf8")));
 return new Map(Object.entries(schemaNames).map(([prefix,name])=>{
  const uri=`https://raw.githubusercontent.com/phatnguyen03022001/ielts-tradition/main/schemas/v2/${name}.schema.json`;
  const validate=ajv.getSchema(uri);
  assert.ok(validate,`V2 schema is missing for ${prefix}`);
  return [prefix,validate];
 }));
}

function validateSchemas(records,validators){
 let invalid=0;
 for(const record of records){
  const validator=validators.get(record?._id?.split("_",1)[0]);
  if(!validator||!validator(record))invalid++;
 }
 return invalid;
}

function persistSnapshot(path,state){
 const serialization=elapsed(()=>JSON.stringify(state,null,2)+"\n");
 const temp=`${path}.benchmark.tmp`;
 const persistence=elapsed(()=>{
  writeFileSync(temp,serialization.value,{flag:"wx",mode:0o600});
  renameSync(temp,path);
 });
 return {bytes:statSync(path).size,mode:(statSync(path).mode&0o777).toString(8),
  serializationMs:round(serialization.milliseconds),writeRenameMs:round(persistence.milliseconds)};
}

function stageMetrics(records,state,validators){
 checkpoint();
 const schema=elapsed(()=>validateSchemas(records,validators));
 assert.equal(schema.value,0,"Synthetic records must pass their V2 JSON contracts");
 checkpoint();
 const graph=elapsed(()=>validateGraph(records));
 assert.equal(graph.value.valid,true,JSON.stringify(graph.value.issues.slice(0,3)));
 checkpoint();
 const publication=elapsed(()=>evaluatePublication(records));
 assert.equal(publication.value.eligible,false,"Draft-only synthetic data must remain fail-closed");
 checkpoint();
 const full=elapsed(()=>validateDatasetV2(records));
 assert.equal(full.value.valid,true,JSON.stringify(full.value.issues.slice(0,3)));
 assert.equal(full.value.publication.eligible,false);
 checkpoint();
 return {schemaValidationMs:round(schema.milliseconds),graphValidationMs:round(graph.milliseconds),
  publicationGateMs:round(publication.milliseconds),fullV2ValidationMs:round(full.milliseconds),
  publicationIssueCount:publication.value.issues.length};
}

function prepareAndPersist(batch,state,path){
 const preparation=elapsed(()=>prepareBatch(batch,state));
 assert.equal(preparation.value.report.status,"prepared",JSON.stringify(preparation.value.report.issues.slice(0,5)));
 checkpoint();
 const serialization=elapsed(()=>JSON.stringify(preparation.value.state,null,2)+"\n");
 checkpoint();
 const temp=`${path}.tmp`;
 const persistence=elapsed(()=>{
  writeFileSync(temp,serialization.value,{flag:"wx",mode:0o600});
  renameSync(temp,path);
 });
 const snapshotBytes=statSync(path).size;
 checkpoint();
 return {state:preparation.value.state,preparationMs:round(preparation.milliseconds),
  serializationMs:round(serialization.milliseconds),writeRenameMs:round(persistence.milliseconds),snapshotBytes,
  peakRssAfterPersistenceMiB:peakRssMiB(),heapAfterPersistenceMiB:mib(memory().heapUsed)};
}

function assertReplay(batch,state){
 const historyLength=state.history.length,recordCount=state.records.length;
 const replay=elapsed(()=>prepareBatch(batch,state));
 assert.equal(replay.value.report.status,"replayed");
 assert.equal(replay.value.state,state,"Replay must return the existing state without mutation");
 assert.equal(state.history.length,historyLength);
 assert.equal(state.records.length,recordCount);
 return round(replay.milliseconds);
}

function memoryReport(start){
 const usage=process.resourceUsage();
 // Node reports resourceUsage.maxRSS in KiB on supported POSIX hosts.
 const peakRssBytes=usage.maxRSS*1024;
 return {peakRssMiB:mib(peakRssBytes),heapStartMiB:mib(start.heapUsed),
  heapEndMiB:mib(memory().heapUsed),heapCheckpointHighWaterMiB:mib(heapCheckpointPeak)};
}

function singleScenario(size,tempRoot){
 const start=memory(),validators=makeSchemaValidators();
 const batch=makeBatch(size,`benchmark-single-${size}`);
 const inputBytes=Buffer.byteLength(JSON.stringify(batch));
 const statePath=join(tempRoot,"state.json");
 const result=prepareAndPersist(batch,{},statePath);
 assert.equal(result.state.records.length,size);
 assert.equal(new Set(result.state.records.map(record=>record._id)).size,size);
 assert.equal(result.state.history.length,1);
 assert.equal(result.state.mappings&&Object.keys(result.state.mappings).length,size);
 assert.equal(result.state.sourceMappings&&Object.keys(result.state.sourceMappings).length,size);
 const stages=stageMetrics(result.state.records,result.state,validators);
 const replayMs=assertReplay(batch,result.state);
 const changedBatch=structuredClone(batch);
 changedBatch.records[0].entity.lemma+="-changed";
 const changed=prepareBatch(changedBatch,result.state);
 assert.equal(changed.report.issues[0]?.code,"CHANGED_BATCH_CONFLICT");
 assert.equal(changed.state,result.state);
 const sourceConflict=prepareBatch({batchId:`source-conflict-${size}`,records:[{
  candidateId:"collision",sourceItemKey:batch.records[0].sourceItemKey,
  entity:{...batch.records[0].entity,lemma:"changed-source-content"}
 }]},result.state);
 assert.equal(sourceConflict.report.issues[0]?.code,"SOURCE_ITEM_CHANGED");
 assert.equal(sourceConflict.state,result.state);
 checkpoint();
 return {status:"pass",scenario:"single",generator:"synthetic-v1",recordShape:"English draft LexicalEntry; unique lemma and sourceItemKey; no edges",
  candidateCount:size,inputBytes,environment:environment(),
  preparationMs:result.preparationMs,...stages,serializationMs:result.serializationMs,
  writeRenameMs:result.writeRenameMs,ledgerBytes:statSync(statePath).size,
  preparePeakRssMiB:result.peakRssAfterPersistenceMiB,heapAfterPreparationMiB:result.heapAfterPersistenceMiB,
  batchCount:Object.keys(result.state.batches).length,mappingCount:Object.keys(result.state.mappings).length,
  sourceMappingCount:Object.keys(result.state.sourceMappings).length,historyCount:result.state.history.length,
  replayMs,changedBatchConflict:"pass",sourceContentConflict:"pass",...memoryReport(start)};
}

function cumulativeScenario(batchSize,batchCount,tempRoot){
 const start=memory(),validators=makeSchemaValidators(),statePath=join(tempRoot,"state.json");
 let state={},nextIndex=0,totalCandidates=0,totalInputBytes=0,totalPreparationMs=0,totalSerializationMs=0,totalWriteRenameMs=0;
 const batches=[],batchResults=[];
 for(let batchNumber=1;batchNumber<=batchCount;batchNumber++){
  const batch=makeBatch(batchSize,`benchmark-cumulative-${batchNumber}`,nextIndex);
  const inputBytes=Buffer.byteLength(JSON.stringify(batch));
  const result=prepareAndPersist(batch,state,statePath);
  state=result.state;nextIndex+=batchSize;totalCandidates+=batchSize;totalInputBytes+=inputBytes;
  totalPreparationMs+=result.preparationMs;totalSerializationMs+=result.serializationMs;totalWriteRenameMs+=result.writeRenameMs;
  batches.push(batch);
  batchResults.push({batchNumber,batchCandidates:batchSize,inputBytes,totalRecords:state.records.length,
   preparationMs:result.preparationMs,serializationMs:result.serializationMs,
   writeRenameMs:result.writeRenameMs,ledgerBytes:result.snapshotBytes,
   peakRssAfterPersistenceMiB:result.peakRssAfterPersistenceMiB,heapAfterPersistenceMiB:result.heapAfterPersistenceMiB});
  checkpoint();
 }
 const baseRecordCount=state.records.length;
 const reusedSource=makeBatch(1,"benchmark-source-reuse",0);
 reusedSource.records[0].candidateId="reused-candidate";
 const reused=prepareBatch(reusedSource,state);
 assert.equal(reused.report.status,"prepared");
 assert.equal(reused.report.reusedCount,1);
 assert.equal(reused.state.records.length,baseRecordCount);
 assert.equal(reused.state.mappings["benchmark-source-reuse#reused-candidate"].canonicalId,
  state.mappings[`${batches[0].batchId}#candidate-0`].canonicalId);
 state=reused.state;
 const reusePersist=persistSnapshot(statePath,state);
 totalSerializationMs+=reusePersist.serializationMs;totalWriteRenameMs+=reusePersist.writeRenameMs;

 const duplicateLemma={batchId:"benchmark-duplicate-hint",records:[{candidateId:"same-lemma-new-source",
  sourceItemKey:"benchmark:scale:duplicate-lemma",entity:{...batches[0].records[0].entity}}]};
 const duplicate=prepareBatch(duplicateLemma,state);
 assert.equal(duplicate.report.status,"prepared");
 assert.equal(duplicate.report.duplicates.length,1,"Cross-batch same-lemma candidate must be surfaced as a hint");
 assert.notEqual(duplicate.state.mappings["benchmark-duplicate-hint#same-lemma-new-source"].canonicalId,
  state.mappings[`${batches[0].batchId}#candidate-0`].canonicalId);
 state=duplicate.state;
 const duplicatePersist=persistSnapshot(statePath,state);
 totalSerializationMs+=duplicatePersist.serializationMs;totalWriteRenameMs+=duplicatePersist.writeRenameMs;

 const revisionBatch={batchId:"benchmark-revision-target",records:[
  {candidateId:"revision-entry",entity:{language:"en",lemma:"synthetic-revision-target",pos:"NOUN",entryKind:"word",lifecycleStatus:"active",editorialStatus:"draft"}},
  {candidateId:"revision-sense",type:"sns",entity:{entryId:"candidate:revision-entry",definition:"Synthetic original definition",lifecycleStatus:"active",editorialStatus:"draft"}}
 ]};
 const revisionPrepared=prepareBatch(revisionBatch,state);
 assert.equal(revisionPrepared.report.status,"prepared");
 state=revisionPrepared.state;
 const senseId=state.mappings["benchmark-revision-target#revision-sense"].canonicalId;
 const firstRevision={revisionId:"benchmark-revision-accepted",changes:[{canonicalId:senseId,expectedRevision:1,set:{definition:"Synthetic revised definition"}}]};
 const revised=reviseCandidates(state,firstRevision);
 assert.equal(revised.report.status,"revised");
 const stale=reviseCandidates(revised.state,{revisionId:"benchmark-revision-stale",changes:[{canonicalId:senseId,expectedRevision:1,set:{definition:"Stale definition"}}]});
 assert.equal(stale.report.status,"conflict");
 assert.ok(stale.report.issues.some(issue=>issue.code==="REVISION_CAS_CONFLICT"));
 assert.equal(stale.state,revised.state);
 state=revised.state;
 const finalPersist=persistSnapshot(statePath,state);
 totalSerializationMs+=finalPersist.serializationMs;totalWriteRenameMs+=finalPersist.writeRenameMs;
 const invalidState=structuredClone(state);
 const invalidBatch={batchId:"benchmark-invalid-reference",records:[{candidateId:"bad-reference",entity:{
  language:"en",lemma:"synthetic-invalid-reference",pos:"NOUN",entryKind:"word",familyIds:[idFor("fam",900001)],
  lifecycleStatus:"active",editorialStatus:"draft"
 }}]};
 const invalid=prepareBatch(invalidBatch,state);
 assert.equal(invalid.report.status,"conflict");
 assert.ok(invalid.report.issues.some(issue=>issue.code==="REFERENCE_NOT_FOUND"&&issue.path==="familyIds/0"),
  JSON.stringify(invalid.report.issues.slice(0,5)));
 assert.deepEqual(state,invalidState,"Failed graph validation must not mutate the existing ledger");

 const replayMs=assertReplay(batches.at(-1),state);
 const serializedBytes=Buffer.byteLength(JSON.stringify(state,null,2)+"\n");
 const snapshotBytes=statSync(statePath).size;
 assert.equal(snapshotBytes,serializedBytes);
 const stages=stageMetrics(state.records,state,validators);
 checkpoint();
 return {status:"pass",scenario:"cumulative",generator:"synthetic-v1",
  recordShape:"English draft LexicalEntry; unique lemma and sourceItemKey; no edges",
  batchSize,batchCount,totalCandidates,totalInputBytes,environment:environment(),
  totalRecords:state.records.length,batchResults,preparationMs:round(totalPreparationMs),
  serializationMs:round(totalSerializationMs),writeRenameMs:round(totalWriteRenameMs),
  finalSerializationBytes:serializedBytes,ledgerBytes:snapshotBytes,sourceReuse:"pass",
  sourceReuseSnapshotBytes:reusePersist.bytes,crossBatchDuplicateHint:"pass",staleCas:"pass",
  invalidReferenceNoMutation:"pass",replayMs,...stages,batchHistoryCount:Object.keys(state.batches).length,
  mappingCount:Object.keys(state.mappings).length,sourceMappingCount:Object.keys(state.sourceMappings).length,
  historyCount:state.history.length,...memoryReport(start)};
}

function negativeGraphScenario(size,tempRoot){
 const start=memory();
 // Generate a valid scale base; extra records isolate graph integrity attacks.
 const baseBatch=makeBatch(size,`benchmark-negative-base-${size}`);
 const basePrepared=prepareBatch(baseBatch,{});
 assert.equal(basePrepared.report.status,"prepared");
 const records=[...basePrepared.state.records];
 const duplicate=structuredClone(records[0]);
 records.push(duplicate);
 const badReference=structuredClone(records[1]);
 badReference._id=idFor("lex",900000);
 badReference.lemma="synthetic-invalid-reference";
 badReference.familyIds=[idFor("fam",900001)];
 records.push(badReference);
 const topicStart=910000;
 const topicIds=Array.from({length:1000},(_,index)=>idFor("top",topicStart+index));
 for(let index=0;index<topicIds.length;index++)records.push({
  _id:topicIds[index],schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",
  label:`Synthetic topic ${index}`,parentTopicId:topicIds[(index+1)%topicIds.length]
 });
 const englishEntry=idFor("lex",920001),vietnameseEntry=idFor("lex",920002);
 const englishSense=idFor("sns",920003),vietnameseSense=idFor("sns",920004);
 records.push(
  {_id:englishEntry,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",language:"en",lemma:"synthetic-en",pos:"NOUN",entryKind:"word"},
  {_id:vietnameseEntry,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",language:"vi",lemma:"từ-mẫu",pos:"NOUN",entryKind:"word"},
  {_id:englishSense,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",entryId:englishEntry,definition:"Synthetic English sense"},
  {_id:vietnameseSense,schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",entryId:vietnameseEntry,definition:"Synthetic Vietnamese sense"},
  {_id:idFor("rel",920005),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",relationType:"SYNONYM_OF",sourceId:englishSense,targetId:vietnameseSense}
 );
 const validators=makeSchemaValidators();
 const schema=elapsed(()=>validateSchemas(records,validators));
 assert.equal(schema.value,0,"Invalid graph workloads must remain schema-valid");
 const graph=elapsed(()=>validateGraph(records));
 const full=elapsed(()=>validateDatasetV2(records));
 const codes=new Set(graph.value.issues.map(issue=>issue.code));
 for(const code of ["DUPLICATE_ID","REFERENCE_NOT_FOUND","CYCLE_DETECTED","RELATION_LANGUAGE_MISMATCH"])
  assert.ok(codes.has(code),`Expected graph issue ${code}; got ${[...codes].join(",")}`);
 assert.equal(full.value.valid,false);
 const issues=graph.value.issues;
 assert.ok(issues.some(issue=>issue.code==="REFERENCE_NOT_FOUND"&&issue.entityId===badReference._id&&issue.path==="familyIds/0"));
 assert.ok(issues.some(issue=>issue.code==="RELATION_LANGUAGE_MISMATCH"&&issue.entityId===idFor("rel",920005)&&issue.path==="targetId"));
 checkpoint();
 return {status:"pass",scenario:"negative-graph",generator:"synthetic-v1",
  recordShape:"draft LexicalEntry base plus duplicate ID, orphan family reference, 1000-node topic cycle and cross-language synonym edge",
  validBaseRecords:size,recordsValidated:records.length,environment:environment(),
  schemaValidationMs:round(schema.milliseconds),graphValidationMs:round(graph.milliseconds),
  fullV2ValidationMs:round(full.milliseconds),issueCount:issues.length,
  requiredDiagnostics:["DUPLICATE_ID","REFERENCE_NOT_FOUND","CYCLE_DETECTED","RELATION_LANGUAGE_MISMATCH"],
  exactOffenderPaths:"pass",...memoryReport(start)};
}

function parseOption(name,fallback){
 const value=process.argv.find(arg=>arg.startsWith(`${name}=`));
 return value?value.slice(name.length+1):fallback;
}

async function runParent(){
 const sizes=parseOption("--sizes","1000,5000,10000").split(",").map(Number);
 const cumulativeSize=Number(parseOption("--cumulative-size","5000"));
 const cumulativeBatches=Number(parseOption("--cumulative-batches","3"));
 const negativeSize=Number(parseOption("--negative-size","10000"));
 const timeoutMs=Number(parseOption("--timeout-ms","300000"));
 const maxHeapMiB=Number(parseOption("--max-heap-mib","1024"));
 assert.ok(sizes.length>0&&sizes.every(size=>Number.isInteger(size)&&size>0&&size<=10000),"Sizes must be 1..10000");
 assert.ok(cumulativeSize>0&&cumulativeSize<=10000&&cumulativeBatches>=2,"Cumulative batches must each be 1..10000 and include at least two batches");
 assert.ok(timeoutMs>=10000&&maxHeapMiB>=256&&maxHeapMiB<=4096,"Timeout or heap limit is outside the supported range");
 const tempRoot=mkdtempSync(join(tmpdir(),"english-learning-scale-"));
 const scenarios=[...sizes.map(size=>({kind:"single",size,label:`single-${size}`})),
  {kind:"cumulative",size:cumulativeSize,count:cumulativeBatches,label:`cumulative-${cumulativeSize}x${cumulativeBatches}`},
  {kind:"negative",size:negativeSize,label:`negative-graph-${negativeSize}`}];
 let failed=false;
 try{
  for(const scenario of scenarios){
   const scenarioRoot=join(tempRoot,scenario.label);mkdirSync(scenarioRoot,{recursive:true});
   const args=[`--max-old-space-size=${maxHeapMiB}`,scriptPath,"--worker",`--kind=${scenario.kind}`,
    `--size=${scenario.size}`,`--temp-root=${scenarioRoot}`];
   if(scenario.count)args.push(`--count=${scenario.count}`);
   const result=await runBoundedChild(args,timeoutMs);
   if(result.status!=="pass")failed=true;
   process.stdout.write(`${JSON.stringify({...result,scenario:scenario.label,limits:{timeoutMs,maxHeapMiB}})}\n`);
  }
 }finally{rmSync(tempRoot,{recursive:true,force:true});}
 if(failed)process.exitCode=1;
}

function runBoundedChild(args,timeoutMs){
 return new Promise(resolvePromise=>{
  const child=spawn(process.execPath,args,{stdio:["ignore","pipe","pipe"]});
  let stdout="",stderr="",timedOut=false,finished=false;
  child.stdout.setEncoding("utf8");child.stderr.setEncoding("utf8");
  child.stdout.on("data",chunk=>stdout+=chunk);child.stderr.on("data",chunk=>stderr+=chunk);
  const stop=()=>{
   if(finished)return;
   timedOut=true;
   child.kill("SIGTERM");
   setTimeout(()=>{if(!finished)child.kill("SIGKILL");},2000).unref();
  };
  const deadline=setTimeout(()=>stop("timeout"),timeoutMs);
  child.on("error",error=>{
   if(finished)return;finished=true;clearTimeout(deadline);
   resolvePromise({status:"error",error:error.message,stderr});
  });
  child.on("close",(code,signal)=>{
   if(finished)return;finished=true;clearTimeout(deadline);
   if(timedOut){resolvePromise({status:"timeout",timeoutMs,signal,stderr:stderr.slice(-4000)});return;}
   if(code!==0){
    const exhausted=/heap out of memory|allocation failed|out of memory/i.test(stderr);
    resolvePromise({status:exhausted?"resource-exhausted":"failed",exitCode:code,signal,stderr:stderr.slice(-4000)});return;
   }
   try{resolvePromise(JSON.parse(stdout.trim()));}
   catch(error){resolvePromise({status:"invalid-output",error:error.message,stdout:stdout.slice(-1000),stderr:stderr.slice(-2000)});}
  });
 });
}

function runWorker(){
 const kind=parseOption("--kind","single"),size=Number(parseOption("--size","1000"));
 const tempRoot=resolve(parseOption("--temp-root",tmpdir()));
 let result;
 if(kind==="single")result=singleScenario(size,tempRoot);
 else if(kind==="cumulative")result=cumulativeScenario(size,Number(parseOption("--count","3")),tempRoot);
 else if(kind==="negative")result=negativeGraphScenario(size,tempRoot);
 else throw new Error(`Unknown benchmark scenario: ${kind}`);
 process.stdout.write(JSON.stringify(result));
}

if(process.argv.includes("--worker"))runWorker();
else await runParent();
