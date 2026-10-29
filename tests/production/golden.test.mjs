import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";
import {migrateV1Records} from "../../pipeline/migrate-v1.mjs";
const dataset=JSON.parse(readFileSync(new URL("../../tests/fixtures/production/golden-candidates.json",import.meta.url)));
test("golden review queue is explicitly not independently reviewed or publishable",()=>{
 assert.equal(dataset.families.length,6);
 for(const f of dataset.families){
  assert.equal(f.reviewStatus,"pending_independent_review");
  assert.equal(f.publicationEligible,false);
  assert.ok(f.learnerRisks.length);
  const pilot=JSON.parse(readFileSync(new URL("../fixtures/pilot/v1/"+f.pilotFile,import.meta.url)));
  const report=validateDatasetV2(migrateV1Records(pilot.records));
  assert.equal(report.valid,true,JSON.stringify(report.issues));
  assert.equal(report.publication.eligible,false);
 }
});
