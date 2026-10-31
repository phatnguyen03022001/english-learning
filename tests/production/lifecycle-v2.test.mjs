import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {migrateV1Records} from "../../pipeline/migrate-v1.mjs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";
import {validateLifecycleV2} from "../../validators/lifecycle-v2.mjs";
const base=JSON.parse(readFileSync(new URL("../fixtures/graph/v1/base.json",import.meta.url),"utf8"));
const id=(p,n)=>p+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
test("consumed split cannot omit retired predecessor or incoming-edge resolution",()=>{
 const records=migrateV1Records(base.records).records;
 const sense=records.find(r=>r._id.startsWith("sns_"));
 records.push({_id:id("dec",1501),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"draft",subjectIds:[sense._id],issueType:"sense_boundary",outcome:"accepted",reviewerId:"unappointed",rationale:"synthetic only",action:"split",decisionEffect:"lifecycle_transition",previousSenseIds:[sense._id],proposedSenseIds:records.filter(r=>r._id.startsWith("sns_")).slice(1,3).map(r=>r._id),transitionAudit:{beforeRevision:1,afterRevision:2,beforeDigest:"a".repeat(64),afterDigest:"b".repeat(64),incomingEdges:[]}});
 const result=validateDatasetV2(records);
 assert.equal(result.stage,"graph");
 assert.equal(result.valid,false);
 for(const code of ["LIFECYCLE_SOURCE_NOT_RETIRED","LIFECYCLE_INCOMING_EDGE_UNRESOLVED"])assert.ok(result.issues.some(i=>i.code===code),code+": "+JSON.stringify(result.issues));
});


test("competing supersession decisions, missing links and disconnected cycles keep exact diagnostics",()=>{
 const d=(n,next)=>({_id:id("dec",n),...(next===undefined?{}:{supersedesDecisionId:id("dec",next)})});
 const records=[
  d(1601,1602),d(1602),                         // valid chain
  d(1610,1610),                                 // self-cycle
  d(1620,1621),d(1621,1622),d(1622,1621),       // multi-node cycle
  d(1623,1620),d(1624,1620),                   // competing decisions reach that cycle
  d(1630,9999),                                 // missing reference is not a cycle
  d(1640,1602),d(1641,1602)                     // independent decisions share a target
 ];
 const cycleIds=[1610,1620,1621,1622,1623,1624].map(n=>id("dec",n)).sort();
 const expected=cycleIds.map(entityId=>({code:"DECISION_SUPERSESSION_CYCLE",entityId,
  path:"supersedesDecisionId",message:"Decision supersession cycle"}));
 assert.deepEqual(validateLifecycleV2(records),expected);
});

test("long supersession chains use iterative traversal without stack overflow",()=>{
 const size=20000;
 const records=Array.from({length:size},(_,i)=>({_id:id("dec",20000+i),
  ...(i+1<size?{supersedesDecisionId:id("dec",20001+i)}:{})}));
 assert.deepEqual(validateLifecycleV2(records),[]);
});
