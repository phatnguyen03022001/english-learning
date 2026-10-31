import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {prepareBatch} from "../../pipeline/prepare-batch.mjs";

const batch=JSON.parse(readFileSync(new URL("../../data/candidates/phase13-source-audit-001.json",import.meta.url),"utf8"));
const statusCounts=Object.fromEntries(["reference_only","permission_required","unknown","redistributable"].map(status=>[
 status,batch.records.filter(record=>record.entity.rights.status===status).length
]));

test("Phase 13 source register is a valid draft-only V2 candidate batch with explicit rights limits",()=>{
 const result=prepareBatch(batch,{}, {dryRun:true});
 assert.equal(result.report.status,"dry-run");
 assert.deepEqual(result.report.issues,[]);
 assert.equal(result.report.publicationEligible,false);
 assert.equal(batch.records.length,11);
 assert.equal(new Set(batch.records.map(record=>record.candidateId)).size,11);
 assert.deepEqual(statusCounts,{reference_only:4,permission_required:1,unknown:4,redistributable:2});
 assert.ok(batch.records.every(record=>record.type==="src"&&record.entity.editorialStatus==="draft"&&!record.entity._id));
 assert.ok(batch.records.every(record=>record.entity.evidenceIds.length===0));
 assert.ok(batch.records.every(record=>!record.entity.rights.reviewerId&&!record.entity.rights.permissionReference&&!record.entity.rights.decisionId));
 assert.ok(batch.records.every(record=>!record.entity.evidenceIds.length));
 const licensed=batch.records.filter(record=>record.entity.rights.status==="redistributable");
 assert.deepEqual(licensed.map(record=>record.entity.sourceIdentifier).sort(),["SRC-OEWN","SRC-PRINCETON-WN"]);
 assert.ok(licensed.every(record=>record.entity.rights.scopes.includes("dictionary_publication")&&record.entity.rights.licenseIdentifier));
});
