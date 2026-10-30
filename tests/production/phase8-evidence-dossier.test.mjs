import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const input=join(root,"data/candidates/pilot-fanout-001.json");
const dossierPath=join(root,"data/reviews/phase8-evidence-dossier.json");
const cli=join(root,"scripts/candidates.mjs");
const expectedCommit="733a4d137caf97581e83716e124804d685e315af";
const expectedDigest="788d39e878d72104560f62c3b5298bc74348a90af2f0acbbbf1bda632f8705a4";
const statuses=new Set(["SUPPORTED","CONTRADICTED","CONTESTED","INSUFFICIENT_EVIDENCE","SOURCE_UNAVAILABLE","NOT_APPLICABLE"]);
const prohibitedKeys=new Set(["_id","schemaVersion","reviewerId","subjectIds","appointmentId","appointmentReference","reviewerAppointment","decisionEffect","approvedBy","approvalId"]);
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const pointer=(value,path)=>{
  const parts=path.split("/").slice(1).map(part=>part.replaceAll("~1","/").replaceAll("~0","~"));
  return parts.reduce((current,key)=>current===undefined?undefined:current[key],value);
};
const walkKeys=(value,seen=new Set())=>{
  if(!value||typeof value!=="object"||seen.has(value)) return [];
  seen.add(value);
  return Object.entries(value).flatMap(([key,child])=>[key,...walkKeys(child,seen)]);
};

test("Phase 8 dossier traces every assessment to an existing draft candidate field",()=>{
  const batch=JSON.parse(readFileSync(input,"utf8"));
  const dossier=JSON.parse(readFileSync(dossierPath,"utf8"));
  assert.equal(dossier.batch.batchId,"pilot-fanout-001");
  assert.equal(dossier.batch.sourceCommit,expectedCommit);
  assert.equal(dossier.batch.sourceSha256,expectedDigest);
  assert.equal(batch.records.length,53);
  assert.deepEqual(dossier.batch.inventory,{lex:13,fam:1,sns:15,con:8,eqv:16});
  assert.equal(dossier.candidateReferences.length,53);
  const byId=new Map(batch.records.map((record,index)=>[record.candidateId,{record,index}]));
  for(const ref of dossier.candidateReferences){
    const found=byId.get(ref.candidateId);
    assert.ok(found,`missing candidate reference: ${ref.candidateId}`);
    assert.equal(ref.recordIndex,found.index);
    assert.deepEqual(pointer(batch,ref.recordPath),found.record);
    assert.deepEqual(pointer(batch,ref.entityPath),found.record.entity);
  }
  assert.equal(dossier.claimAssessments.length,232);
  const sourceIds=new Set(Object.keys(dossier.sources));
  for(const assessment of dossier.claimAssessments){
    assert.equal(assessment.batchId,"pilot-fanout-001");
    assert.ok(byId.has(assessment.candidateId),`unknown claim candidate: ${assessment.candidateId}`);
    assert.ok(statuses.has(assessment.status),`unknown status: ${assessment.status}`);
    assert.notEqual(pointer(batch,assessment.fieldPath),undefined,`missing field: ${assessment.fieldPath}`);
    for(const sourceId of assessment.supportingSourceRefs) assert.ok(sourceIds.has(sourceId),`unknown source: ${sourceId}`);
    assert.ok(Array.isArray(assessment.qaAxes) && assessment.qaAxes.length>0);
    assert.ok(assessment.proposedValue);
    if(assessment.status==="SUPPORTED" || assessment.status==="CONTRADICTED" || assessment.status==="CONTESTED")
      assert.ok(assessment.supportingSourceRefs.length>0,`evidence reference missing: ${assessment.fieldPath}`);
  }
  assert.deepEqual(dossier.publication.eligible,false);
  assert.equal(dossier.publication.status,"NOT_READY");
  assert.equal(dossier.publication.lerAuthorityConfirmed,false);
  assert.equal(dossier.publication.rightsCleared,false);
  assert.ok(!walkKeys(dossier).some(key=>prohibitedKeys.has(key)));
});

test("Phase 8 dossier preserves candidate immutability and fail-closed validation",()=>{
  const before=readFileSync(input);
  const batch=JSON.parse(before);
  assert.ok(batch.records.every(record=>record.entity.editorialStatus==="draft"));
  assert.ok(batch.records.every(record=>!walkKeys(record.entity).some(key=>prohibitedKeys.has(key))));
  assert.ok(batch.records.every(record=>record.type!=="rev" && record.type!=="dec"));
  assert.ok(batch.records.filter(record=>record.type==="eqv").every(record=>record.entity.alignmentMode==="gloss_only"));
  const tmp=mkdtempSync(join(tmpdir(),"phase8-dossier-"));
  try{
    const state=join(tmp,"state.json");
    const output=JSON.parse(execFileSync(process.execPath,[cli,"validate","--input",input,"--state",state],{cwd:root,encoding:"utf8"}));
    assert.equal(output.status,"dry-run");
    assert.equal(output.batchId,"pilot-fanout-001");
    assert.deepEqual(output.issues,[]);
    assert.equal(output.publicationEligible,false);
    assert.equal(existsSync(state),false);
    assert.equal(hash(readFileSync(input)),hash(before));
    assert.equal(hash(readFileSync(input)),expectedDigest);
  }finally{
    rmSync(tmp,{recursive:true,force:true});
  }
});
