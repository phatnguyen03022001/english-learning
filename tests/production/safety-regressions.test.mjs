import {test} from "node:test";
import assert from "node:assert/strict";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";
import {evaluatePublication,digest} from "../../validators/production-gates.mjs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";
import {migrateV1Records} from "../../pipeline/migrate-v1.mjs";
import {readFileSync} from "node:fs";
const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8"));
const id=(p,n)=>p+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
const draft=(extra)=>({lifecycleStatus:"active",editorialStatus:"draft",...extra});
const payload=(lemma,batchId="accent-batch")=>({batchId,records:[{candidateId:"e",entity:draft({language:"vi",lemma,pos:"NOUN",entryKind:"word"})}]});
test("canonical NFC for Vietnamese lemma retains accents and idempotent composed/decomposed replay",()=>{
 const a=prepareBatch(payload("tie\u0301ng"),{});
 assert.equal(a.report.status,"prepared",JSON.stringify(a.report.issues));
 assert.equal(a.state.records[0].lemma,"tiếng");
 const b=prepareBatch(payload("tiếng"),a.state);
 assert.equal(b.report.status,"replayed",JSON.stringify(b.report.issues));
 assert.deepEqual(b.state,a.state);
});
test("dry-run validates actual schema and does not persist or invent canonical IDs",()=>{
 const malformed=payload("nghĩa");malformed.records[0].entity.pos="NOT_A_POS";
 const state={};
 const invalid=prepareBatch(malformed,state,{dryRun:true});
 assert.equal(invalid.report.status,"conflict");
 assert.ok(invalid.report.issues.some(i=>i.code==="VALIDATION_FAILED"));
 assert.deepEqual(invalid.state,state);
});
test("forged accepted review on wrong claim path is not applicable, even with injected trust callbacks",()=>{
 const lex=draft({_id:id("lex",1201),schemaVersion:"2.0.0",language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word",editorialStatus:"verified",evidenceIds:[id("evd",1201)]});
 const source=draft({_id:id("src",1201),schemaVersion:"2.0.0",title:"synthetic not a real source",rights:{status:"redistributable",scopes:["dictionary_publication"],reviewerId:"rights",permissionReference:"UNTRUSTED"}});
 const evidence=draft({_id:id("evd",1201),schemaVersion:"2.0.0",sourceId:source._id,assertionIds:[lex._id],claim:{subjectId:lex._id,fieldPath:"/lemma",valueDigest:digest("synthetic"),specificity:"exact_value"},reviewStatus:"accepted",independence:"independent_reviewed"});
 const review=draft({_id:id("rev",1201),schemaVersion:"2.0.0",reviewerId:"self",subjectIds:[lex._id],outcome:"accepted",role:"lead_editorial",appointmentReference:"UNTRUSTED",claims:[{subjectId:lex._id,fieldPath:"/pos"}]});
 const report=evaluatePublication([lex,source,evidence,review],{isAuthorized:()=>true,verifyRights:()=>true});
 assert.equal(report.eligible,false);
 assert.ok(report.issues.some(i=>i.code==="REVIEW_SCOPE_MISSING"),JSON.stringify(report.issues));
});
test("V2 explicit lifecycle transition cannot masquerade as a non-transition retain",()=>{
 const records=migrateV1Records(load("../fixtures/graph/v1/base.json").records).records;
 const source=records.find(r=>r._id.startsWith("sns_"));
 records.push(draft({_id:id("dec",1202),schemaVersion:"2.0.0",subjectIds:[source._id],issueType:"sense_boundary",outcome:"accepted",reviewerId:"unappointed",rationale:"synthetic test only",action:"split",decisionEffect:"non_transition",previousSenseIds:[source._id]}));
 const bad=validateDatasetV2(records);
 assert.equal(bad.valid,false);
 assert.ok(bad.issues.some(i=>i.code==="DECISION_EFFECT_MISMATCH"),JSON.stringify(bad.issues));
 records.at(-1).action="retain";
 const retain=validateDatasetV2(records);
 assert.equal(retain.valid,true,JSON.stringify(retain.issues));
});
