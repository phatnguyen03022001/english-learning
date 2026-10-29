import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {migrateV1Records} from "../../pipeline/migrate-v1.mjs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";
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
