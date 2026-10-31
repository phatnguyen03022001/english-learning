import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

const EXPECTED_BASELINE_HEAD = "3390c68d131c3b87325f78a09045fb99ce06da89";
const EXPECTED_STATE_SHA256 = "43fe32215c4e005198b2bda8ecd12f0094862f350348f3b16da6bb05ce1ad00e";

test("pilot-004 bilingual evidence review artifact satisfies schema and invariant gates", () => {
  const reviewPath = path.join(rootDir, "data/reviews/pilot-fanout-004-bilingual-evidence-review.json");
  assert.equal(fs.existsSync(reviewPath), true, "Review artifact must exist");

  const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
  assert.equal(review.artifactType, "pilot-004-bilingual-evidence-review");
  assert.equal(review.task, "008");
  assert.equal(review.baselineHead, EXPECTED_BASELINE_HEAD);
  assert.equal(review.canonicalStateHash, EXPECTED_STATE_SHA256);
  assert.equal(review.executionBoundaries.publicationEligibility, "NOT_READY");
  assert.equal(review.publicationRestrictions.publicationStatus, "NOT_READY");
  assert.equal(review.executionBoundaries.stateMutationsExecuted, "NONE; data/state/candidates-state.json strictly unmutated");
  assert.equal(review.executionBoundaries.atlasMutationsExecuted, "NONE");

  // Verify canonical candidate state is untouched
  const statePath = path.join(rootDir, "data/state/candidates-state.json");
  const actualStateSha = sha256(fs.readFileSync(statePath));
  assert.equal(actualStateSha, EXPECTED_STATE_SHA256, "Canonical state MUST NOT be mutated in Task 008");

  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.equal(state.records.length, 45, "Must retain exactly 45 canonical records");

  // Verify all 7 glosses are accounted for and match state
  assert.equal(review.sevenClaimAssessments.length, 7);
  const stateRecordsById = new Map(state.records.map(r => [r._id, r]));

  const candidateIdSet = new Set();
  for (const item of review.sevenClaimAssessments) {
    assert.equal(candidateIdSet.has(item.candidateId), false, `Duplicate candidateId: ${item.candidateId}`);
    candidateIdSet.add(item.candidateId);

    const canonicalRecord = stateRecordsById.get(item.canonicalId);
    assert.ok(canonicalRecord, `Canonical record ${item.canonicalId} missing from state`);
    assert.equal(canonicalRecord.glossVi, item.glossVi);
    assert.equal(canonicalRecord.alignmentMode, "gloss_only");
    assert.equal(canonicalRecord.targetSenseId, undefined);
    assert.equal(canonicalRecord.editorialStatus, "draft");

    // Source sense must also exist
    const sourceSense = stateRecordsById.get(item.sourceSenseId);
    assert.ok(sourceSense, `Source sense ${item.sourceSenseId} missing from state`);
  }

  // Verify three priority claims are explicitly evaluated
  const priorityIds = ["P004-012", "P004-033", "P004-045"];
  for (const pid of priorityIds) {
    const deepDive = review.threePriorityClaimsDeepDive[pid];
    assert.ok(deepDive, `Deep dive for priority claim ${pid} must exist`);
    assert.ok(deepDive.disposition, `Disposition missing for ${pid}`);
    assert.ok(deepDive.researchFindings, `Research findings missing for ${pid}`);
  }

  assert.equal(review.threePriorityClaimsDeepDive["P004-012"].evidenceAssessment, "CONTRADICTED");
  assert.equal(review.threePriorityClaimsDeepDive["P004-033"].evidenceAssessment, "PARTIALLY_SUPPORTED");
  assert.equal(review.threePriorityClaimsDeepDive["P004-045"].evidenceAssessment, "PARTIALLY_SUPPORTED");

  // Verify source matrix and discrepancies
  assert.ok(review.sourceToClaimEvidenceMatrix.length >= 10);
  assert.ok(review.evidenceMappingDiscrepancies.length >= 3);
  assert.ok(review.correctionProposals.length >= 4);
  assert.equal(review.bilingualReviewSummary.remainingHoldCount, 7);
});
