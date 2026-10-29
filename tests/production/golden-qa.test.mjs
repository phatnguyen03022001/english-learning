import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessGoldenQA,QUALITY_DIMENSIONS} from "../../validators/golden-qa.mjs";
const benchmark=JSON.parse(readFileSync(new URL("../fixtures/production/golden-candidates.json",import.meta.url),"utf8"));
const claim={
 caseId:"bank",reviewerId:"test-only-not-appointed",authorityReference:"test-only",
 evidenceReferences:["synthetic-placeholder-not-an-attestation"],
 dimensions:Object.fromEntries(["sense_boundary_accuracy","translation_fidelity","grammar_accuracy","idiomaticity","collocation_validity","learner_usefulness","evidence_sufficiency","license_compliance"].map(key=>[key,"pass"]))
};
test("golden candidate benchmark cannot be promoted to human-reviewed with metadata alone",()=>{
 const review=assessGoldenQA(benchmark,[claim]);
 assert.equal(review.qualityAcceptedCount,0);
 assert.equal(review.pendingCount,6);
 assert.equal(review.publicationApprovedCount,0);
});
test("all eight human QA axes are separate, fail cannot be averaged into pass",()=>{
 assert.equal(QUALITY_DIMENSIONS.length,8);
 const spoof={...claim,dimensions:{...claim.dimensions,grammar_accuracy:"fail"}};
 const check=assessGoldenQA(benchmark,[spoof],{verifyIndependentReview:()=>true,verifyRights:()=>true});
 assert.equal(check.qualityAcceptedCount,0);
 assert.ok(check.issues.some(i=>i.code==="GOLDEN_QA_REJECTED"));
 assert.equal(check.publicationApprovedCount,0);
});
test("external review simulation can complete QA only, never self-authorize publication",()=>{
 // Synthetic *test* callbacks, not real linguistic / license approvals.
 const review=assessGoldenQA(benchmark,[claim],{verifyIndependentReview:()=>true,verifyRights:()=>true});
 assert.equal(review.qualityAcceptedCount,1);
 assert.equal(review.pendingCount,5);
 assert.equal(review.publicationApprovedCount,0);
});
