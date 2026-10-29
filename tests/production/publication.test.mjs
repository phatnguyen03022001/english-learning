import {test} from "node:test";
import assert from "node:assert/strict";
import {evaluatePublication} from "../../validators/production-gates.mjs";
import {migrateV1Records} from "../../pipeline/migrate-v1.mjs";
import {readFileSync} from "node:fs";
const pilot=JSON.parse(readFileSync(new URL("../fixtures/pilot/v1/bank.json",import.meta.url)));
test("publication remains fail-closed with fake owner, rights, and review strings",()=>{
 const records=migrateV1Records(pilot.records);
 const report=evaluatePublication(records.records,{appointments:[{reviewerId:"someone",role:"LER",appointedBy:"owner"}]});
 assert.equal(report.eligible,false);
 assert.ok(report.issues.length>0);
});
test("verified label without independent evidence and authority is still blocked",()=>{
 const data=migrateV1Records(pilot.records).records;
 data.forEach(r=>r.editorialStatus="verified");
 const report=evaluatePublication(data);
 assert.equal(report.eligible,false);
 assert.ok(report.issues.some(i=>i.code==="LER_AUTHORITY_UNVERIFIED"));
 assert.ok(report.issues.some(i=>i.code==="CLAIM_EVIDENCE_INSUFFICIENT"));
});
