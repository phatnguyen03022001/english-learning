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
const originalPath=join(root,"data/candidates/pilot-fanout-001.json");
const correctedPath=join(root,"data/candidates/pilot-fanout-002.json");
const dossierPath=join(root,"data/reviews/phase8-evidence-dossier.json");
const ledgerPath=join(root,"data/reviews/phase9-correction-ledger.json");
const cli=join(root,"scripts/candidates.mjs");
const originalDigest="788d39e878d72104560f62c3b5298bc74348a90af2f0acbbbf1bda632f8705a4";
const expectedIds=[
 "entry-bank-financial","entry-bank-river","entry-run","entry-analyse","entry-analysis","entry-analytical",
 "entry-big","entry-large","entry-depend","entry-look-up","entry-borrow","entry-lend","entry-advice","family-analysis",
 "sense-bank-financial","sense-bank-river","sense-run-movement","sense-run-machine","sense-run-management",
 "sense-analyse","sense-analysis","sense-analytical","sense-big-size","sense-large-size","sense-depend-contingent",
 "sense-look-up-reference","sense-borrow-temporary-use","sense-lend-temporary-use","sense-advice-guidance",
 "construction-run-machine","construction-run-management","construction-analyse-object","construction-depend-on",
 "construction-look-up-separable","construction-borrow-from","construction-lend-double-object","construction-lend-to",
 "equiv-bank-financial","equiv-bank-river","equiv-run-movement","equiv-run-machine-operate",
 "equiv-run-machine-operate-alternative","equiv-run-management","equiv-analyse","equiv-analysis","equiv-analytical",
 "equiv-big","equiv-large","equiv-depend","equiv-look-up","equiv-borrow","equiv-lend","equiv-advice"
];
const expectedQueue=[
 "sense-analysis","construction-borrow-from","sense-run-machine","construction-run-machine",
 "sense-analyse","sense-analytical","entry-bank-financial","equiv-run-machine-operate","equiv-large","family-analysis"
];
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const parse=path=>JSON.parse(readFileSync(path,"utf8"));
const byId=batch=>new Map(batch.records.map((record,index)=>[record.candidateId,{record,index}]));
const pointer=(value,path)=>{
 const parts=path.split("/").slice(1).map(part=>part.replaceAll("~1","/").replaceAll("~0","~"));
 return parts.reduce((current,key)=>current===undefined?undefined:current[key],value);
};
const walk=(value,visit)=>{
 if(value&&typeof value==="object")for(const [key,child] of Object.entries(value)){visit(key,child);walk(child,visit);}
};
const candidateRefs=value=>{
 const refs=[];
 walk(value,(_key,child)=>{if(typeof child==="string"&&child.startsWith("candidate:"))refs.push(child);});
 return refs.sort();
};
const typeCounts=batch=>Object.fromEntries(["lex","fam","sns","con","eqv"].map(type=>[
 type,batch.records.filter(record=>record.type===type).length
]));
const forbiddenKeys=new Set(["_id","schemaVersion","revision","sourceItemKey","reviewerId","subjectIds","appointmentId","appointmentReference","reviewerAppointment","decisionEffect","approvedBy","approvalId"]);

test("Phase 7 snapshot and Phase 8 dossier remain tied to the original immutable batch",()=>{
 const originalBytes=readFileSync(originalPath);
 const original=parse(originalPath);
 const dossier=parse(dossierPath);
 assert.equal(hash(originalBytes),originalDigest);
 assert.equal(dossier.batch.batchId,"pilot-fanout-001");
 assert.equal(dossier.batch.sourceSha256,originalDigest);
 assert.equal(original.batchId,"pilot-fanout-001");
 assert.equal(original.records.length,53);
 assert.equal(dossier.claimAssessments.length,232);
 assert.equal(dossier.candidateReferences.length,53);
 assert.ok(dossier.candidateReferences.every(reference=>reference.candidateId in Object.fromEntries(original.records.map(r=>[r.candidateId,true]))));
 assert.ok(dossier.claimAssessments.every(claim=>claim.batchId==="pilot-fanout-001"));
});

test("Phase 9 replacement retains all candidate identities and adds only the scoped run construction",()=>{
 const original=parse(originalPath);
 const corrected=parse(correctedPath);
 assert.equal(corrected.batchId,"pilot-fanout-002");
 assert.equal(corrected.records.length,54);
 assert.deepEqual(corrected.records.slice(0,53).map(r=>r.candidateId),expectedIds);
 assert.deepEqual(typeCounts(original),{lex:13,fam:1,sns:15,con:8,eqv:16});
 assert.deepEqual(typeCounts(corrected),{lex:13,fam:1,sns:15,con:9,eqv:16});
 assert.deepEqual(corrected.records.slice(0,53).map(r=>r.type),original.records.map(r=>r.type));
 const ids=corrected.records.map(r=>r.candidateId);
 assert.equal(new Set(ids).size,54);
 assert.deepEqual(ids.filter(id=>!expectedIds.includes(id)),["construction-run-machine-transitive"]);
 for(const old of original.records){
  const next=corrected.records.find(r=>r.candidateId===old.candidateId);
  assert.ok(next,old.candidateId);
  assert.equal(next.type,old.type);
  assert.deepEqual(candidateRefs(next.entity),candidateRefs(old.entity),old.candidateId);
 }
 assert.ok(corrected.records.every(record=>record.entity.editorialStatus==="draft"));
 assert.ok(corrected.records.every(record=>record.entity.lifecycleStatus==="active"));
 assert.ok(corrected.records.filter(record=>record.type==="eqv").every(record=>
  record.entity.alignmentMode==="gloss_only" &&
  record.entity.equivalenceType==="approximate" &&
  record.entity.translationEvidenceStatus==="evidence_pending" &&
  Array.isArray(record.entity.evidenceIds) && record.entity.evidenceIds.length===0
 ));
 for(const record of corrected.records)walk(record,(key,value)=>{
  assert.ok(!forbiddenKeys.has(key),`forbidden key ${key} in ${record.candidateId}`);
  if(typeof value==="string")assert.ok(!/^(?:evd|rev|dec)_[0-9a-f-]+$/.test(value),`fabricated ID ${value}`);
 });
});

test("analysis countability is corrected without splitting process and result into new senses",()=>{
 const original=parse(originalPath),corrected=parse(correctedPath);
 const old=byId(original).get("sense-analysis").record.entity;
 const next=byId(corrected).get("sense-analysis").record.entity;
 assert.equal(next.grammar.countability,"both");
 assert.match(next.usageNote,/countable and uncountable uses are attested/i);
 assert.match(next.usageNote,/process\/result distinction/i);
 assert.match(next.usageNote,/bilingual review/i);
 assert.doesNotMatch(next.usageNote,/countability remains unresolved/i);
 assert.equal(corrected.records.filter(r=>r.type==="sns").length,15);
 assert.equal(JSON.stringify(next.examples),JSON.stringify(old.examples));
 assert.equal(next.editorialStatus,"draft");
});

test("borrow keeps the object and optional from-source roles consistent",()=>{
 const con=byId(parse(correctedPath)).get("construction-borrow-from").record.entity;
 assert.deepEqual(con.grammar.requiredPrepositions,[]);
 assert.deepEqual(con.prepositions,["from"]);
 assert.equal(con.pattern,"borrow + NP (+ from + NP)");
 assert.equal(con.complements[0],"direct object: thing or resource");
 assert.equal(con.complements[1],"optional source complement introduced by from");
 assert.equal(con.grammar.transitivity,"transitive");
 assert.ok(!con.pattern.includes("recipient + thing"));
});

test("run preserves both evidenced frames and scopes subject restrictions",()=>{
 const original=parse(originalPath),corrected=parse(correctedPath);
 const sense=byId(corrected).get("sense-run-machine").record.entity;
 const intransitive=byId(corrected).get("construction-run-machine").record.entity;
 const transitive=byId(corrected).get("construction-run-machine-transitive").record;
 assert.equal(sense.grammar.transitivity,"ambitransitive");
 assert.match(sense.usageNote,/sense boundary.*pending LER/i);
 assert.match(sense.usageRestrictions[0].description,/intransitive functioning frame/i);
 assert.match(sense.usageRestrictions[0].description,/machine or system/i);
 assert.doesNotMatch(sense.usageRestrictions[0].description,/process/i);
 assert.equal(intransitive.grammar.transitivity,"intransitive");
 assert.ok(intransitive.constraints.every(c=>!/(?:^|\W)process(?:$|\W)/i.test(c)));
 assert.equal(intransitive.pattern,"run (of a machine or system)");
 assert.equal(transitive.type,"con");
 assert.equal(transitive.entity.senseId,"candidate:sense-run-machine");
 assert.equal(transitive.entity.pattern,"run + NP (machine or program)");
 assert.equal(transitive.entity.grammar.transitivity,"transitive");
 assert.deepEqual(transitive.entity.grammar.complementTypes,["noun_phrase"]);
 assert.match(transitive.entity.constraints[0],/direct object.*machine or program/i);
 assert.equal(corrected.records.filter(r=>r.type==="sns").length,original.records.filter(r=>r.type==="sns").length);
});

test("analyse and analytical definitions are broadened without adding senses",()=>{
 const original=parse(originalPath),corrected=parse(correctedPath);
 const oldAnalyse=byId(original).get("sense-analyse").record.entity;
 const analyse=byId(corrected).get("sense-analyse").record.entity;
 const analytical=byId(corrected).get("sense-analytical").record.entity;
 assert.match(analyse.definition,/carefully and in detail/i);
 assert.match(analyse.definition,/sometimes by considering its parts or aspects/i);
 assert.equal(analyse.grammar.transitivity,"transitive");
 assert.equal(analyse.examples[0].translationEvidenceStatus,"unreviewed");
 assert.match(analytical.definition,/systematic examination/i);
 assert.match(analytical.definition,/logical reasoning/i);
 assert.match(analytical.definition,/information or data/i);
 assert.match(analytical.definition,/scientific work/i);
 assert.equal(corrected.records.filter(r=>r.type==="sns").length,original.records.filter(r=>r.type==="sns").length);
});

test("contested equivalence, homograph, and family decisions stay pending",()=>{
 const original=parse(originalPath),corrected=parse(correctedPath),ledger=parse(ledgerPath);
 const old=byId(original),next=byId(corrected);
 assert.deepEqual(next.get("entry-bank-financial").record,old.get("entry-bank-financial").record);
 assert.deepEqual(next.get("equiv-large").record,old.get("equiv-large").record);
 assert.deepEqual(next.get("family-analysis").record,old.get("family-analysis").record);
 const run=next.get("equiv-run-machine-operate").record.entity;
 const runAlt=next.get("equiv-run-machine-operate-alternative").record.entity;
 assert.equal(run.glossVi,"hoạt động");
 assert.equal(runAlt.glossVi,"vận hành");
 for(const eq of [run,runAlt]){
  assert.equal(eq.alignmentMode,"gloss_only");
  assert.equal(eq.equivalenceType,"approximate");
  assert.equal(eq.translationEvidenceStatus,"evidence_pending");
  assert.ok(eq.restrictions.some(text=>/pending independent bilingual review/i.test(text)));
 }
 assert.doesNotMatch(run.restrictions.join(" ")+runAlt.restrictions.join(" "),/selected as (?:the )?default/i);
 assert.ok(["COR-007","COR-008","COR-009","COR-010"].every(id=>
  ledger.corrections.find(c=>c.correctionId===id).decisionStatus.startsWith("pending")
 ));
 assert.equal(ledger.publication.eligible,false);
});

test("correction ledger records the exact ten Phase 8 items and before/after values",()=>{
 const original=parse(originalPath),corrected=parse(correctedPath),dossier=parse(dossierPath),ledger=parse(ledgerPath);
 assert.equal(ledger.corrections.length,10);
 assert.deepEqual(ledger.corrections.map(c=>c.candidateId),expectedQueue);
 assert.deepEqual(ledger.corrections.map(c=>c.correctionId),Array.from({length:10},(_,i)=>`COR-${String(i+1).padStart(3,"0")}`));
 assert.deepEqual(ledger.corrections.map(c=>c.phase8FieldPath),dossier.correctionQueue.map(c=>c.fieldPath));
 for(const correction of ledger.corrections){
  assert.ok(correction.changes.length>0,correction.correctionId);
  assert.equal(correction.independentHumanReviewRequired,true);
  assert.ok(correction.supportingSourceIds.length>0,correction.correctionId);
  for(const change of correction.changes){
   assert.ok(change.candidateId);
   assert.ok(change.fieldPath.startsWith("/records/"));
   assert.ok("previousValue" in change && "proposedNewValue" in change);
   assert.ok(change.phase8Assessments.length>0);
   for(const assessment of change.phase8Assessments){
    assert.equal(assessment.batchId,"pilot-fanout-001");
    assert.ok(dossier.claimAssessments.some(a=>
     a.batchId===assessment.batchId && a.candidateId===assessment.candidateId &&
     a.fieldPath===assessment.fieldPath && a.status===assessment.status &&
     JSON.stringify(a.supportingSourceRefs)===JSON.stringify(assessment.supportingSourceIds)
    ));
   }
   const before=pointer(original,change.fieldPath);
   const after=pointer(corrected,change.fieldPath);
   if(change.mutationApplied){
    if(change.fieldExisted)assert.deepEqual(before,change.previousValue,change.fieldPath);
    else assert.equal(before,undefined,change.fieldPath);
    assert.deepEqual(after,change.proposedNewValue,change.fieldPath);
   }else{
    assert.deepEqual(before,change.previousValue,change.fieldPath);
    assert.deepEqual(change.proposedNewValue,change.previousValue);
    assert.deepEqual(after,change.previousValue,change.fieldPath);
    assert.equal(change.result,"DEFERRED");
   }
  }
 }
 walk(ledger,(key,value)=>{
  assert.ok(!forbiddenKeys.has(key),`forbidden key ${key} in correction ledger`);
  if(typeof value==="string")assert.ok(!/^(?:evd|rev|dec)_[0-9a-f-]+$/.test(value),`fabricated approval/evidence ID ${value}`);
 });
 assert.equal(ledger.sourceSnapshot.batchId,"pilot-fanout-001");
 assert.equal(ledger.correctedSnapshot.batchId,corrected.batchId);
 assert.equal(ledger.claimAssessmentHandling.dossierBatchId,"pilot-fanout-001");
 assert.equal(ledger.claimAssessmentHandling.dossierModified,false);
 assert.equal(ledger.identityAndRevision.sourceItemKeyAdded,false);
 assert.equal(ledger.identityAndRevision.canonicalIdsAdded,false);
 assert.equal(ledger.identityAndRevision.canonicalRevisionChanged,false);
});

test("corrected batch digest, V2 schema/graph, and isolated candidate dry-runs pass",()=>{
 const originalBefore=readFileSync(originalPath),correctedBefore=readFileSync(correctedPath);
 const ledger=parse(ledgerPath);
 assert.equal(hash(originalBefore),originalDigest);
 assert.equal(hash(correctedBefore),ledger.correctedSnapshot.sha256);
 assert.equal(hash(correctedBefore),ledger.correctedSnapshot.sha256);

 const tmp=mkdtempSync(join(tmpdir(),"phase9-candidate-"));
 try{
  for(const [input,batchId,label] of [[originalPath,"pilot-fanout-001","phase7"],[correctedPath,"pilot-fanout-002","phase9"]]){
   const state=join(tmp,label+"-state.json");
   const before=readFileSync(input);
   const output=JSON.parse(execFileSync(process.execPath,[cli,"validate","--input",input,"--state",state],{cwd:root,encoding:"utf8"}));
   assert.equal(output.status,"dry-run",batchId);
   assert.equal(output.batchId,batchId);
   assert.deepEqual(output.issues,[]);
   assert.equal(output.publicationEligible,false);
   assert.equal(existsSync(state),false);
   assert.equal(hash(readFileSync(input)),hash(before));
  }

  const state={};
  const batch=parse(correctedPath);
  const before=JSON.stringify(batch);
  const preview=prepareBatch(batch,state,{dryRun:true});
  assert.equal(preview.report.status,"dry-run");
  assert.deepEqual(preview.report.issues,[]);
  assert.equal(preview.report.publicationEligible,false);
  assert.deepEqual(preview.state,state);
  assert.equal(JSON.stringify(batch),before);
  assert.equal(hash(readFileSync(originalPath)),hash(originalBefore));
  assert.equal(hash(readFileSync(correctedPath)),hash(correctedBefore));
 }finally{
  rmSync(tmp,{recursive:true,force:true});
 }
});
