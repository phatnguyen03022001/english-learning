import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";
import {migrateV1Records} from "../../pipeline/migrate-v1.mjs";
const load = path=>JSON.parse(readFileSync(new URL(path,import.meta.url)));
const bank=load("../fixtures/pilot/v1/bank.json");
test("V1 pilot explicitly migrates without regenerating identities or inventing reviews",()=>{
 const migrated=migrateV1Records(bank.records);
 assert.deepEqual(migrated.records.map(r=>r._id),bank.records.map(r=>r._id));
 assert.ok(migrated.records.every(r=>r.schemaVersion==="2.0.0"&&r.editorialStatus==="draft"));
 const check=validateDatasetV2({records:migrated.records});
 assert.equal(check.valid,true,JSON.stringify(check.issues));
 assert.equal(check.publication.eligible,false);
});
test("learner grammar, example and claim evidence contracts reject invalid typed values",()=>{
 const migrated=migrateV1Records(bank.records).records;
 const sense=migrated.find(r=>r._id.startsWith("sns_"));
 sense.examples=[{english:"Synthetic only.",exampleType:"synthetic_test",editorialStatus:"draft",translationEvidenceStatus:"unreviewed"}];
 assert.equal(validateDatasetV2({records:migrated}).valid,true);
 sense.examples[0].exampleType="commercial_licensed"; // not in vocabulary
 assert.equal(validateDatasetV2({records:migrated}).stage,"schema");
 sense.examples[0].exampleType="synthetic_test";
 sense.grammar={countability:"any-value"};
 assert.equal(validateDatasetV2({records:migrated}).stage,"schema");
});
test("schema-first V2 detects wrong sense-linked example evidence without auto-certifying",()=>{
 const records=migrateV1Records(bank.records).records;
 const sense=records.find(r=>r._id.startsWith("sns_"));
 sense.examples=[{english:"Unreviewed.",exampleType:"editorial_original",editorialStatus:"verified",translationEvidenceStatus:"independently_reviewed",evidenceIds:[]}];
 const report=validateDatasetV2({records});
 assert.equal(report.publication.eligible,false);
 assert.ok(report.publication.issues.some(i=>i.code==="EXAMPLE_EVIDENCE_MISSING"||i.code==="PUBLICATION_NOT_VERIFIED"));
});
