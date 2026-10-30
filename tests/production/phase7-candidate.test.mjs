import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const input=join(root,"data/candidates/pilot-fanout-001.json");
const cli=join(root,"scripts/candidates.mjs");
const inventory={lex:13,fam:1,sns:15,con:8,eqv:16};
const prohibitedKeys=new Set([
 "_id","schemaVersion","reviewerId","subjectIds","appointmentId",
 "appointmentReference","reviewerAppointment","decisionEffect"
]);
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const walkKeys=(value,seen=new Set())=>{
 if(!value||typeof value!=="object"||seen.has(value))return [];
 seen.add(value);
 return Object.entries(value).flatMap(([key,child])=>[key,...walkKeys(child,seen)]);
};

test("Phase 7 candidate batch is a draft-only, read-only valid dry-run",()=>{
 const tmp=mkdtempSync(join(tmpdir(),"phase7-candidate-"));
 try{
  const state=join(tmp,"state.json");
  const before=readFileSync(input);
  const batch=JSON.parse(before);
  assert.equal(batch.batchId,"pilot-fanout-001");
  assert.equal(batch.records.length,53);

  const counts=Object.fromEntries(Object.keys(inventory).map(type=>[
   type,batch.records.filter(record=>record.type===type).length
  ]));
  assert.deepEqual(counts,inventory);
  assert.deepEqual([...new Set(batch.records.map(record=>record.type))].sort(),Object.keys(inventory).sort());
  assert.ok(batch.records.every(record=>record.entity.editorialStatus==="draft"));
  assert.ok(batch.records.every(record=>!walkKeys(record.entity).some(key=>prohibitedKeys.has(key))));
  assert.ok(batch.records.every(record=>!new Set(["rev","dec"]).has(record.type)));
  assert.ok(batch.records.filter(record=>record.type==="eqv").every(record=>
   record.entity.alignmentMode==="gloss_only" && record.entity.editorialStatus==="draft"
  ));

  const output=JSON.parse(execFileSync(process.execPath,[cli,"validate","--input",input,"--state",state],{cwd:root,encoding:"utf8"}));
  assert.equal(output.status,"dry-run");
  assert.equal(output.batchId,"pilot-fanout-001");
  assert.deepEqual(output.issues,[]);
  assert.equal(output.publicationEligible,false);
  assert.equal(existsSync(state),false);
  assert.equal(hash(readFileSync(input)),hash(before));

  const preview=prepareBatch(batch,{}, {dryRun:true});
  assert.equal(preview.report.status,"dry-run");
  assert.deepEqual(preview.report.issues,[]);
  assert.equal(preview.report.publicationEligible,false);
 }finally{
  rmSync(tmp,{recursive:true,force:true});
 }
});
