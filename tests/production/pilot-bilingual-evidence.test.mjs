import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const EXPECTED_BASELINE_HEAD = "0aebc4850b8b7c5d94cd72337726c8baab48167b";
const EXPECTED_STATE_SHA256 = "43fe32215c4e005198b2bda8ecd12f0094862f350348f3b16da6bb05ce1ad00e";
const EXPECTED_PILOT_MAPPINGS_SHA256 = "3d91cce99a23f0f43f939f302754f2cf91165d57612e31874d7d4199a02aa075";
const EXPECTED_PILOT_SOURCE_MAPPINGS_SHA256 = "d0a20fc3a62ab48b3ed6baadb64e0b59b7ee80aba70ab71b278d2aa6a6763168";
const PILOT_BATCH_ID = "pilot-fanout-004";
const sha256 = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const sortedEntries = entries => entries.sort(([left], [right]) => left.localeCompare(right));

test("pilot-004 bilingual evidence review artifact satisfies schema and invariant gates", () => {
  const reviewPath = path.join(rootDir, "data/reviews/pilot-fanout-004-bilingual-evidence-review.json");
  assert.equal(fs.existsSync(reviewPath), true, "Review artifact must exist");

  const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
  assert.equal(review.artifactType, "pilot-004-bilingual-evidence-review");
  assert.equal(review.task, "008R");
  assert.equal(review.baselineHead, EXPECTED_BASELINE_HEAD);
  assert.equal(review.canonicalStateHash, EXPECTED_STATE_SHA256);
  assert.equal(review.executionBoundaries.publicationEligibility, "NOT_READY");
  assert.equal(review.publicationRestrictions.publicationStatus, "NOT_READY");
  assert.equal(review.executionBoundaries.stateMutationsExecuted, "NONE; data/state/candidates-state.json strictly unmutated");
  assert.equal(review.executionBoundaries.atlasMutationsExecuted, "NONE");

  // The artifact records the historical pilot snapshot hash. The live ledger may
  // grow, so protect the immutable pilot subset rather than pinning its whole hash.
  const statePath = path.join(rootDir, "data/state/candidates-state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.equal(review.canonicalStateHash, EXPECTED_STATE_SHA256, "Historical Pilot 004 snapshot hash must remain recorded");
  assert.ok(state.records.length >= 45, "Current canonical state must retain the Pilot 004 records");
  assert.ok(state.batches[PILOT_BATCH_ID], "Original Pilot 004 batch must remain addressable");
  const pilotRecordIds = state.batches[PILOT_BATCH_ID].recordIds;
  assert.equal(pilotRecordIds.length, 45, "Original Pilot 004 membership must remain immutable");
  assert.equal(new Set(state.records.map(record => record._id)).size, state.records.length, "Current canonical IDs must be unique");
  const pilotMappings = sortedEntries(Object.entries(state.mappings).filter(([key]) => key.startsWith(`${PILOT_BATCH_ID}#`)));
  assert.equal(sha256(pilotMappings), EXPECTED_PILOT_MAPPINGS_SHA256, "Original candidate-to-canonical-ID mappings must remain unchanged");
  const pilotSourceMappings = sortedEntries(Object.entries(state.sourceMappings).filter(([, mapping]) => mapping.firstBatchId === PILOT_BATCH_ID));
  assert.equal(pilotSourceMappings.length, 45);
  assert.equal(sha256(pilotSourceMappings), EXPECTED_PILOT_SOURCE_MAPPINGS_SHA256, "Original source-item mappings must remain unchanged");
  for (const [candidateId, mapping] of pilotMappings) {
    assert.ok(pilotRecordIds.includes(mapping.canonicalId), `Pilot mapping ${candidateId} must target an original Pilot 004 record`);
    assert.ok(state.records.some(record => record._id === mapping.canonicalId), `Mapped canonical record ${mapping.canonicalId} must remain addressable`);
  }
  assert.equal(Object.keys(state.mappings).filter(key => key.startsWith(`${PILOT_BATCH_ID}#`)).length, 45);

  // 1 & 2. Seven unique canonical equivalences and valid candidate-to-canonical mappings
  assert.equal(review.sevenClaimAssessments.length, 7);
  const stateRecordsById = new Map(state.records.map(r => [r._id, r]));

  const candidateIdSet = new Set();
  const canonicalIdSet = new Set();
  for (const item of review.sevenClaimAssessments) {
    assert.equal(candidateIdSet.has(item.candidateId), false, `Duplicate candidateId: ${item.candidateId}`);
    candidateIdSet.add(item.candidateId);

    assert.equal(canonicalIdSet.has(item.canonicalId), false, `Duplicate canonicalId: ${item.canonicalId}`);
    canonicalIdSet.add(item.canonicalId);

    const canonicalRecord = stateRecordsById.get(item.canonicalId);
    assert.ok(canonicalRecord, `Canonical record ${item.canonicalId} missing from state`);
    assert.equal(canonicalRecord.glossVi, item.glossVi);

    // 9. Seven glosses still gloss_only
    assert.equal(canonicalRecord.alignmentMode, "gloss_only");
    assert.equal(canonicalRecord.targetSenseId, undefined);

    // 10. All records remain draft
    assert.equal(canonicalRecord.editorialStatus, "draft");

    // Source sense must also exist in state
    const sourceSense = stateRecordsById.get(item.sourceSenseId);
    assert.ok(sourceSense, `Source sense ${item.sourceSenseId} missing from state`);
    assert.equal(sourceSense.editorialStatus, "draft");
  }

  // 3. Evidence and disposition consistency
  const assessmentCounts = review.bilingualReviewSummary.assessmentCounts;
  const dispositionCounts = review.bilingualReviewSummary.dispositionCounts;

  const actualAssessments = { SUPPORTED: 0, PARTIALLY_SUPPORTED: 0, CONTRADICTED: 0, UNVERIFIED: 0 };
  const actualDispositions = {
    EVIDENCE_READY_FOR_HUMAN_REVIEW: 0,
    CORRECTION_PROPOSED: 0,
    HOLD_INSUFFICIENT_EVIDENCE: 0,
    CONTRADICTED_REQUIRES_REMEDIATION: 0
  };

  for (const item of review.sevenClaimAssessments) {
    assert.ok(item.evidenceAssessment in actualAssessments, `Unknown assessment: ${item.evidenceAssessment}`);
    actualAssessments[item.evidenceAssessment]++;

    assert.ok(item.disposition in actualDispositions, `Unknown disposition: ${item.disposition}`);
    actualDispositions[item.disposition]++;
  }

  assert.deepEqual(actualAssessments, assessmentCounts, "Assessment counts mismatch summary");
  assert.deepEqual(actualDispositions, dispositionCounts, "Disposition counts mismatch summary");
  assert.equal(review.bilingualReviewSummary.remainingHoldCount, 7);

  // 4. Corrected P004-012 classification and rationale
  const p004_012 = review.threePriorityClaimsDeepDive["P004-012"];
  assert.ok(p004_012, "Deep dive for P004-012 must exist");
  assert.notEqual(p004_012.evidenceAssessment, "CONTRADICTED", "P004-012 must NOT be assessed as CONTRADICTED");
  assert.equal(p004_012.evidenceAssessment, "PARTIALLY_SUPPORTED");
  assert.equal(p004_012.disposition, "HOLD_INSUFFICIENT_EVIDENCE");
  assert.ok(p004_012.researchFindings.outcomeVersusImpact, "Outcome vs impact rationale required");
  assert.ok(p004_012.researchFindings.absenceIsNotContradiction, "Absence is not contradiction rationale required");
  assert.ok(p004_012.researchFindings.multiGlossReplacementRejection, "Multi-gloss merging rejection rationale required");

  // Also check P004-033 and P004-045 deep dives exist
  assert.equal(review.threePriorityClaimsDeepDive["P004-033"].evidenceAssessment, "PARTIALLY_SUPPORTED");
  assert.equal(review.threePriorityClaimsDeepDive["P004-045"].evidenceAssessment, "PARTIALLY_SUPPORTED");

  // 5. Valid source/evidence references
  for (const s of review.sourceToClaimEvidenceMatrix) {
    if (s.canonicalId !== "PENDING_REGISTRATION") {
      assert.ok(stateRecordsById.has(s.canonicalId), `Source ${s.canonicalId} missing from canonical state`);
      assert.equal(s.rightsStatus, "reference_only");
    }
  }

  // 6. No sourceMappings identity-rewrite proposal in correctionProposals
  for (const prop of review.correctionProposals) {
    assert.notEqual(prop.fieldPath, "sourceMappings", `CAS proposal ${prop.proposalId} must NOT propose mutating sourceMappings`);
  }

  // 7. Source registration proposals preserve existing identities
  const prop004 = review.correctionProposals.find(p => p.proposalId === "CAS-PROP-004");
  assert.ok(prop004, "CAS-PROP-004 must exist");
  assert.equal(prop004.action, "FUTURE_SOURCE_REGISTRATION_AND_EVIDENCE_BINDING");
  assert.equal(prop004.fieldPath, "evidenceIds");
  assert.ok(prop004.newSourceSpecification, "Must specify new source registration without mutating sourceMappings");

  // Reconciliation note must be present
  assert.ok(review.reconciliationNote, "Reconciliation note required");
  assert.equal(review.reconciliationNote.correctedIssues.length, 2);

  // 11. Publication remains NOT_READY
  assert.equal(review.publicationRestrictions.publicationStatus, "NOT_READY");
  assert.equal(review.executionBoundaries.publicationEligibility, "NOT_READY");
});
