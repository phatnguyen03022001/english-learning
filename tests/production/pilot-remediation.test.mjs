import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { prepareBatch } from "../../pipeline/prepare-batch.mjs";
import { reviseCandidates } from "../../pipeline/revise-candidates.mjs";
import { validateDatasetV2 } from "../../validators/validate-dataset-v2.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliPath = path.join(rootDir, "scripts/candidates.mjs");

const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const jsonDigest = val => crypto.createHash("sha256").update(JSON.stringify(val)).digest("hex");

const EXPECTED_BATCH_SHA256 = "1ab6c23dc3f0263996424edc004f85e62a2e7a23ff6aeda861f370224f4c6928";
const EXPECTED_QUALITY_REVIEW_SHA256 = "37b3552b9ccb4882ac840852ddab96c1aaaaf109d0f1f496f34092fbd61fddd0";
const EXPECTED_ADVERSARIAL_REVIEW_SHA256 = "7a36ed55b310a69183af7bd5bc62e032379699436761ad1b568524e8211230c4";
const EXPECTED_BASELINE_HEAD = "8fbda5140ca3f0407c72838834c79d738474d880";

function resolvePointer(record, fieldPath) {
  const parts = fieldPath.replace(/^\//, "").split("/");
  let val = record;
  for (const part of parts) {
    if (val === undefined || val === null) return undefined;
    val = val[part];
  }
  return val;
}

test("historical inputs and review dossiers are byte-identical to Task 006 baseline", () => {
  const batchRaw = fs.readFileSync(path.join(rootDir, "data/candidates/pilot-fanout-004.json"));
  const qrRaw = fs.readFileSync(path.join(rootDir, "data/reviews/pilot-fanout-004-quality-review.json"));
  const arRaw = fs.readFileSync(path.join(rootDir, "data/reviews/pilot-fanout-004-adversarial-review.json"));

  assert.equal(sha256(batchRaw), EXPECTED_BATCH_SHA256, "pilot-fanout-004.json hash mutated");
  assert.equal(sha256(qrRaw), EXPECTED_QUALITY_REVIEW_SHA256, "quality review dossier hash mutated");
  assert.equal(sha256(arRaw), EXPECTED_ADVERSARIAL_REVIEW_SHA256, "adversarial review dossier hash mutated");
});

test("Task 007 closure artifact reconciles 1:1 with adversarial correction ledger", () => {
  const closurePath = path.join(rootDir, "data/reviews/pilot-fanout-004-remediation-closure.json");
  assert.equal(fs.existsSync(closurePath), true, "Closure artifact missing");

  const closure = JSON.parse(fs.readFileSync(closurePath, "utf8"));
  assert.equal(closure.artifactType, "pilot-004-remediation-closure");
  assert.equal(closure.task, "007");
  assert.equal(closure.baselineHead, EXPECTED_BASELINE_HEAD);
  assert.equal(closure.publicationDecision, "NOT_READY");
  assert.equal(closure.persistedStateStatus.revisionExecution, "PERSISTED_REVISION_BLOCKED");

  const adv = JSON.parse(fs.readFileSync(path.join(rootDir, "data/reviews/pilot-fanout-004-adversarial-review.json"), "utf8"));
  assert.equal(closure.dispositions.length, adv.correctionLedger.length, "Dispositions count mismatch");
  assert.equal(closure.dispositions.length, 18);

  const batch = JSON.parse(fs.readFileSync(path.join(rootDir, "data/candidates/pilot-fanout-004.json"), "utf8"));
  const candidateMap = new Map(batch.records.map(r => [r.candidateId, r]));

  closure.dispositions.forEach((disp, idx) => {
    const advEntry = adv.correctionLedger[idx];
    assert.equal(disp.candidateId, advEntry.candidateId);
    assert.equal(disp.fieldPath, advEntry.fieldPath);
    assert.equal(disp.currentValueSha256, advEntry.currentValueSha256);

    const targetRec = candidateMap.get(disp.candidateId);
    assert.ok(targetRec, `Candidate ${disp.candidateId} not found in batch`);
    const actualVal = resolvePointer(targetRec, disp.fieldPath);
    assert.deepEqual(actualVal, disp.currentValue);
    assert.equal(jsonDigest(actualVal), disp.currentValueSha256);

    if (disp.disposition === "PROPOSED_CORRECTION") {
      assert.ok(disp.proposedValue !== null, `Proposed value missing for item ${idx + 1}`);
      assert.equal(disp.executionBlocker, "PERSISTED_REVISION_BLOCKED");
    } else if (disp.disposition === "HOLD_DEFERRED") {
      assert.ok(["INDEPENDENT_EVIDENCE_PENDING", "CLAIM_UNVERIFIED_HOLD", "AUTHENTICATED_REVIEW_PENDING"].includes(disp.executionBlocker));
    } else if (disp.disposition === "RETAINED_NO_MUTATION") {
      assert.equal(disp.executionBlocker, "NONE_VALUE_UNCHANGED");
    }
  });

  // Verify UNVERIFIED claims remain HOLD
  const unverifiedIds = ["P004-012", "P004-033", "P004-045"];
  assert.equal(closure.unverifiedClaimsHold.length, 3);
  unverifiedIds.forEach(id => {
    const found = closure.unverifiedClaimsHold.find(c => c.claimId === id);
    assert.ok(found, `Unverified claim ${id} missing from HOLD list`);
    assert.ok(found.action.startsWith("HOLD_"));
  });
});

test("candidates CLI validate maintains dry-run pure execution on batch 004", () => {
  const run = spawnSync(process.execPath, [cliPath, "validate", "--input", "data/candidates/pilot-fanout-004.json"], {
    cwd: rootDir,
    encoding: "utf8"
  });
  assert.equal(run.status, 0);
  const result = JSON.parse(run.stdout);
  assert.equal(result.status, "dry-run");
  assert.equal(result.batchId, "pilot-fanout-004");
  assert.equal(result.issues.length, 0);
  assert.equal(result.publicationEligible, false);
});

test("candidates CLI check reports STATE_NOT_FOUND when candidate state is unpersisted", () => {
  const tmp = fs.mkdtempSync(path.join(tmpdir(), "pilot-remediation-missing-state-"));
  try {
    const nonexistentState = path.join(tmp, "nonexistent-candidates-state.json");
    const run = spawnSync(process.execPath, [cliPath, "check", "--state", nonexistentState], {
      cwd: rootDir,
      encoding: "utf8"
    });
    assert.equal(run.status, 1);
    const result = JSON.parse(run.stdout);
    assert.equal(result.status, "invalid");
    assert.equal(result.storageValid, false);
    assert.equal(result.issues[0].code, "STATE_NOT_FOUND");
    assert.equal(result.publication.eligible, false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("in-memory candidate revision lifecycle, CAS control, replay, and fail-closed publication", () => {
  const batch = JSON.parse(fs.readFileSync(path.join(rootDir, "data/candidates/pilot-fanout-004.json"), "utf8"));
  
  // Prepare batch in memory
  const prepared = prepareBatch(batch, {});
  assert.equal(prepared.report.status, "prepared");
  const state = prepared.state;
  assert.equal(state.records.length, 45);

  // Find candidate sense-effect-bring-about canonicalId via state.mappings
  const senseMapping = state.mappings["pilot-fanout-004#sense-effect-bring-about"];
  assert.ok(senseMapping && typeof senseMapping.canonicalId === "string", "Mapping for sense candidate must exist");
  const effectCanonicalId = senseMapping.canonicalId;
  assert.ok(effectCanonicalId.startsWith("sns_"), "Valid sns UUIDv7 required");

  const evdMapping = state.mappings["pilot-fanout-004#evidence-effect-bring-about"];
  assert.ok(evdMapping && typeof evdMapping.canonicalId === "string", "Mapping for evidence candidate must exist");
  const evdCanonicalId = evdMapping.canonicalId;
  assert.ok(evdCanonicalId.startsWith("evd_"), "Valid evd UUIDv7 required");

  const newDef = "Cause a change or outcome to happen.";
  const newDefDigest = jsonDigest(newDef);

  // 1. Revising definition alone fails closed with EVIDENCE_CLAIM_MISMATCH because the linked evidence claim asserts the previous digest
  const isolatedDefRevision = reviseCandidates(state, {
    revisionId: "rev-effect-isolated-001",
    changes: [
      {
        canonicalId: effectCanonicalId,
        expectedRevision: 1,
        set: { definition: newDef }
      }
    ]
  });
  assert.equal(isolatedDefRevision.report.status, "conflict");
  assert.ok(isolatedDefRevision.report.issues[0].message.includes("EVIDENCE_CLAIM_MISMATCH"));

  // 2. Atomic revision updating both sense definition and linked evidence claim digest succeeds
  const atomicRevisionPayload = {
    revisionId: "rev-effect-atomic-002",
    changes: [
      {
        canonicalId: effectCanonicalId,
        expectedRevision: 1,
        set: { definition: newDef }
      },
      {
        canonicalId: evdCanonicalId,
        expectedRevision: 1,
        set: {
          claim: {
            subjectId: effectCanonicalId,
            fieldPath: "/definition",
            valueDigest: newDefDigest,
            specificity: "contextual_support",
            description: "Contextual support for the bringing-about distinction without planned restriction."
          }
        }
      }
    ]
  };

  const revisionResult = reviseCandidates(state, atomicRevisionPayload);
  assert.equal(revisionResult.report.status, "revised", JSON.stringify(revisionResult.report.issues));
  const revisedRecord = revisionResult.state.records.find(r => r._id === effectCanonicalId);
  assert.equal(revisedRecord.definition, newDef);
  assert.equal(revisedRecord.revision, 2);
  assert.equal(revisionResult.state.history.at(-1).before[0].definition, "Cause a planned change or outcome to become a reality.");
  assert.equal(revisionResult.state.history.at(-1).after[0].definition, newDef);

  // 3. Replay idempotency
  const replayResult = reviseCandidates(revisionResult.state, atomicRevisionPayload);
  assert.equal(replayResult.report.status, "replayed");
  assert.deepEqual(replayResult.state, revisionResult.state);

  // 4. Stale CAS conflict
  const staleCasResult = reviseCandidates(revisionResult.state, {
    revisionId: "rev-effect-stale-003",
    changes: [
      {
        canonicalId: effectCanonicalId,
        expectedRevision: 1,
        set: { definition: "Another text" }
      }
    ]
  });
  assert.equal(staleCasResult.report.status, "conflict");
  assert.equal(staleCasResult.report.issues[0].code, "REVISION_CAS_CONFLICT");

  // 5. Changed revision ID with different payload
  const changedPayloadConflict = reviseCandidates(revisionResult.state, {
    revisionId: "rev-effect-atomic-002",
    changes: [
      {
        canonicalId: effectCanonicalId,
        expectedRevision: 2,
        set: { definition: "Divergent payload" }
      }
    ]
  });
  assert.equal(changedPayloadConflict.report.status, "conflict");
  assert.equal(changedPayloadConflict.report.issues[0].code, "REVISION_ID_CONFLICT");

  // 6. Forbidden fields protection
  const forbiddenAttempts = [
    { lemma: "renamed" },
    { _id: "sns_fabricated" },
    { editorialStatus: "verified" },
    { lifecycleStatus: "retired" },
    { sourceId: "candidate:fake" }
  ];
  for (const set of forbiddenAttempts) {
    const blocked = reviseCandidates(revisionResult.state, {
      revisionId: "rev-forbidden-" + Object.keys(set)[0],
      changes: [{ canonicalId: effectCanonicalId, expectedRevision: 2, set }]
    });
    assert.equal(blocked.report.status, "conflict");
    assert.equal(blocked.report.issues[0].code, "REVISION_FIELD_FORBIDDEN");
  }

  // 7. Publication evaluation fails closed
  const datasetCheck = validateDatasetV2(revisionResult.state.records);
  assert.equal(datasetCheck.valid, true, "Dataset must remain structurally valid");
  assert.equal(datasetCheck.publication.eligible, false, "Publication must fail closed");

  // 8. Verify gloss_only translations remain gloss_only and never fabricate targetSenseId
  const eqvRecords = revisionResult.state.records.filter(r => r._id.startsWith("eqv_"));
  assert.equal(eqvRecords.length, 7);
  for (const eqv of eqvRecords) {
    assert.equal(eqv.alignmentMode, "gloss_only");
    assert.equal(eqv.targetSenseId, undefined);
    assert.ok(typeof eqv.glossVi === "string" && eqv.glossVi.length > 0);
    assert.equal(eqv.editorialStatus, "draft");
  }
});
