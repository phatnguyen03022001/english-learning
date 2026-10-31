import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");
const valueDigest = (val) => crypto.createHash("sha256").update(JSON.stringify(val)).digest("hex");

function readRaw(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), "utf8");
}

function readJson(relPath) {
  return JSON.parse(readRaw(relPath));
}

function valueAtPointer(obj, pointer) {
  const parts = pointer.split("/").slice(1);
  let cur = obj;
  for (const rawPart of parts) {
    const part = rawPart.replace(/~1/g, "/").replace(/~0/g, "~");
    assert.notEqual(cur, undefined, `Missing path segment ${part} for pointer ${pointer}`);
    assert.notEqual(cur, null, `Null path segment ${part} for pointer ${pointer}`);
    cur = Array.isArray(cur) ? cur[Number(part)] : cur[part];
  }
  return cur;
}

test("Phase 11 closure deliverables: valid JSON, 1:1 reconciliation, snapshot fidelity, and regression invariants", () => {
  const snapshotRaw = readRaw("data/candidates/pilot-fanout-002.json");
  const phase8Raw = readRaw("data/reviews/phase8-evidence-dossier.json");
  const phase9Raw = readRaw("data/reviews/phase9-correction-ledger.json");
  const phase10Raw = readRaw("data/reviews/phase10-editorial-review-queue.json");
  const closureMd = readRaw("docs/phase11-closure.md");

  const snapshotSha = sha256(snapshotRaw);
  const phase8Sha = sha256(phase8Raw);
  const phase9Sha = sha256(phase9Raw);
  const phase10Sha = sha256(phase10Raw);

  const snapshot = JSON.parse(snapshotRaw);
  const phase10Queue = JSON.parse(phase10Raw);
  const commonV2 = readJson("schemas/v2/common.schema.json");
  const validEquivalenceTypes = new Set(commonV2.$defs.equivalenceType.enum);

  // 7. Parse all 5 Phase 11 JSON files and ensure valid JSON & zero duplicate IDs
  const dossier = readJson("data/reviews/phase11/research-dossier.json");
  const ledger = readJson("data/reviews/phase11/correction-ledger.json");
  const coverage = readJson("data/reviews/phase11/semantic-coverage.json");
  const staged = readJson("data/reviews/phase11/staged-lexical-candidates.json");
  const handoff = readJson("data/reviews/phase11/phase12-handoff.json");

  const candidateById = new Map();
  for (const record of snapshot.records) {
    assert.equal(candidateById.has(record.candidateId), false, `Duplicate candidateId ${record.candidateId}`);
    candidateById.set(record.candidateId, record);
  }
  assert.equal(candidateById.size, 54);

  // 1. 376 review items match 1:1 with Phase 10 queue
  assert.equal(phase10Queue.reviewItems.length, 376);
  assert.equal(dossier.items.length, 376);
  assert.equal(ledger.entries.length, 376);

  const p10ByKey = new Map(phase10Queue.reviewItems.map((item) => [item.reviewItemKey, item]));
  assert.equal(p10ByKey.size, 376);

  const dossierKeys = new Set();
  const ledgerKeys = new Set();
  const ledgerEntryIds = new Set();

  for (let i = 0; i < 376; i++) {
    const qItem = phase10Queue.reviewItems[i];
    const dItem = dossier.items[i];
    const lEntry = ledger.entries[i];

    assert.equal(dItem.reviewItemKey, qItem.reviewItemKey, `Dossier key mismatch at index ${i}`);
    assert.equal(lEntry.reviewItemKey, qItem.reviewItemKey, `Ledger key mismatch at index ${i}`);
    assert.equal(dossierKeys.has(dItem.reviewItemKey), false, `Duplicate dossier reviewItemKey ${dItem.reviewItemKey}`);
    assert.equal(ledgerKeys.has(lEntry.reviewItemKey), false, `Duplicate ledger reviewItemKey ${lEntry.reviewItemKey}`);
    assert.equal(ledgerEntryIds.has(lEntry.ledgerEntryId), false, `Duplicate ledgerEntryId ${lEntry.ledgerEntryId}`);

    dossierKeys.add(dItem.reviewItemKey);
    ledgerKeys.add(lEntry.reviewItemKey);
    ledgerEntryIds.add(lEntry.ledgerEntryId);

    // 2. Every currentValue and beforeValue matches pilot-fanout-002.json and Phase 10 queue
    assert.deepEqual(dItem.currentValue, qItem.currentValue, `currentValue mismatch on ${dItem.reviewItemKey}`);
    assert.deepEqual(lEntry.beforeValue, qItem.currentValue, `beforeValue mismatch on ${lEntry.reviewItemKey}`);

    if (!dItem.reviewItemKey.startsWith("P10-ISSUE-")) {
      const candidate = candidateById.get(dItem.candidateId);
      assert.ok(candidate, `Unknown candidateId ${dItem.candidateId} for ${dItem.reviewItemKey}`);
      const actualValue = valueAtPointer(candidate, dItem.fieldPath);
      assert.deepEqual(dItem.currentValue, actualValue, `Snapshot value mismatch on ${dItem.reviewItemKey}`);
      assert.deepEqual(lEntry.beforeValue, actualValue, `Ledger beforeValue snapshot mismatch on ${lEntry.reviewItemKey}`);
      assert.equal(dItem.currentValueDigest, valueDigest(actualValue), `Digest mismatch on ${dItem.reviewItemKey}`);
      assert.equal(qItem.sourceBatchSha256, snapshotSha, `Phase 10 sourceBatchSha256 mismatch on ${dItem.reviewItemKey}`);
    }
  }

  // 3. Every definitionInSnapshot in semantic-coverage.json matches the original LexicalSense in pilot-fanout-002.json
  const snapshotSenses = snapshot.records.filter((r) => r.type === "sns");
  assert.equal(snapshotSenses.length, 15);
  assert.equal(coverage.englishSenseCoverage.length, 15);

  const seenSenseIds = new Set();
  for (const senseCov of coverage.englishSenseCoverage) {
    assert.equal(seenSenseIds.has(senseCov.senseCandidateId), false, `Duplicate senseCandidateId ${senseCov.senseCandidateId}`);
    seenSenseIds.add(senseCov.senseCandidateId);
    const snapSense = candidateById.get(senseCov.senseCandidateId);
    assert.ok(snapSense && snapSense.type === "sns", `Missing snapshot sense ${senseCov.senseCandidateId}`);
    assert.equal(
      senseCov.definitionInSnapshot,
      snapSense.entity.definition,
      `Stale definitionInSnapshot for ${senseCov.senseCandidateId}`
    );
  }

  // 4. Every equivalenceType and glossVi in semantic-coverage.json matches pilot-fanout-002.json and Schema V2
  const snapshotEqvs = snapshot.records.filter((r) => r.type === "eqv");
  assert.equal(snapshotEqvs.length, 16);
  assert.equal(coverage.translationEquivalenceCoverage.length, 16);

  const seenEqvIds = new Set();
  for (const eqvCov of coverage.translationEquivalenceCoverage) {
    assert.equal(seenEqvIds.has(eqvCov.candidateId), false, `Duplicate eqv candidateId ${eqvCov.candidateId}`);
    seenEqvIds.add(eqvCov.candidateId);
    const snapEqv = candidateById.get(eqvCov.candidateId);
    assert.ok(snapEqv && snapEqv.type === "eqv", `Missing snapshot eqv ${eqvCov.candidateId}`);
    assert.equal(
      validEquivalenceTypes.has(eqvCov.equivalenceType),
      true,
      `Invalid Schema V2 equivalenceType '${eqvCov.equivalenceType}' on ${eqvCov.candidateId}`
    );
    assert.equal(
      eqvCov.equivalenceType,
      snapEqv.entity.equivalenceType,
      `equivalenceType mismatch with snapshot on ${eqvCov.candidateId}`
    );
    assert.equal(
      eqvCov.glossVi,
      snapEqv.entity.glossVi,
      `glossVi mismatch with snapshot on ${eqvCov.candidateId}`
    );
  }

  // 5. exampleType and SHA-256 digests in all Phase 11 artifacts and docs/phase11-closure.md match real files
  for (const sense of snapshotSenses) {
    assert.equal(sense.entity.examples[0].exampleType, "editorial_original");
  }
  const exampleTypeItems = dossier.items.filter((it) => it.fieldPath === "/entity/examples/0/exampleType");
  assert.equal(exampleTypeItems.length, 15);
  for (const item of exampleTypeItems) {
    assert.equal(item.currentValue, "editorial_original");
    assert.equal(item.assessment, "INSUFFICIENT_EVIDENCE");
    assert.equal(item.ledgerClassification, "INSUFFICIENT_EVIDENCE");
  }

  assert.equal(dossier.repositoryBaseline.sourceSnapshotSha256, snapshotSha);
  assert.equal(dossier.repositoryBaseline.phase8DossierSha256, phase8Sha);
  assert.equal(dossier.repositoryBaseline.phase9LedgerSha256, phase9Sha);
  assert.equal(dossier.repositoryBaseline.phase10QueueSha256, phase10Sha);
  assert.equal(ledger.targetSnapshot.sha256, snapshotSha);
  assert.equal(coverage.targetSnapshot.sha256, snapshotSha);
  assert.equal(staged.targetSnapshotDependency.baseSnapshotSha256, snapshotSha);
  assert.equal(handoff.baseline.sourceSnapshotSha256, snapshotSha);

  assert.equal(closureMd.includes(snapshotSha), true, "docs/phase11-closure.md missing exact snapshot SHA-256");
  assert.equal(closureMd.includes(phase8Sha), true, "docs/phase11-closure.md missing exact Phase 8 SHA-256");
  assert.equal(closureMd.includes(phase9Sha), true, "docs/phase11-closure.md missing exact Phase 9 SHA-256");
  assert.equal(closureMd.includes(phase10Sha), true, "docs/phase11-closure.md missing exact Phase 10 SHA-256");

  // Ensure no false "corpus_like" assertion remains in any Phase 11 deliverable
  for (const relFile of [
    "data/reviews/phase11/research-dossier.json",
    "data/reviews/phase11/correction-ledger.json",
    "data/reviews/phase11/semantic-coverage.json",
    "data/reviews/phase11/staged-lexical-candidates.json",
    "data/reviews/phase11/phase12-handoff.json",
    "docs/phase11-closure.md"
  ]) {
    const content = readRaw(relFile);
    assert.equal(/corpus_like/.test(content), false, `False exampleType 'corpus_like' reference found in ${relFile}`);
  }

  // 6. Staged candidates in staged-lexical-candidates.json have consistent identifiers and references
  const allStaged = [
    ...staged.pilotCompatibleStagedCandidates,
    ...staged.stagedVietnameseLexicalGraphCandidates
  ];
  assert.equal(allStaged.length, 21);
  assert.equal(staged.summary.totalStagedCandidates, 21);

  const stagedIds = new Set();
  for (const sc of allStaged) {
    assert.equal(stagedIds.has(sc.candidateId), false, `Duplicate staged candidateId ${sc.candidateId}`);
    assert.equal(candidateById.has(sc.candidateId), false, `Staged candidateId ${sc.candidateId} collides with existing snapshot`);
    stagedIds.add(sc.candidateId);
  }

  const validCandidateTargets = new Set([...candidateById.keys(), ...stagedIds]);
  for (const sc of allStaged) {
    for (const dep of sc.dependencies ?? []) {
      assert.equal(dep.startsWith("candidate:"), true, `Invalid dependency prefix ${dep} on ${sc.candidateId}`);
      const targetId = dep.slice("candidate:".length);
      assert.equal(validCandidateTargets.has(targetId), true, `Dangling dependency ${dep} on ${sc.candidateId}`);
    }
    for (const [k, v] of Object.entries(sc.entity)) {
      if (typeof v === "string" && v.startsWith("candidate:")) {
        const refId = v.slice("candidate:".length);
        assert.equal(validCandidateTargets.has(refId), true, `Dangling entity reference ${k}=${v} on ${sc.candidateId}`);
      }
    }
  }

  // 8. Assessment counts remain 322 SUPPORTED, 35 CORRECTION_NEEDED, 3 DISPUTED, 16 INSUFFICIENT_EVIDENCE
  const counts = { SUPPORTED: 0, CORRECTION_NEEDED: 0, DISPUTED: 0, INSUFFICIENT_EVIDENCE: 0 };
  const ledgerCounts = {
    REQUIRED_CORRECTION: 0,
    RECOMMENDED_IMPROVEMENT: 0,
    DISPUTED: 0,
    INSUFFICIENT_EVIDENCE: 0,
    NO_CHANGE: 0
  };
  for (const item of dossier.items) {
    counts[item.assessment] = (counts[item.assessment] || 0) + 1;
  }
  for (const entry of ledger.entries) {
    ledgerCounts[entry.status] = (ledgerCounts[entry.status] || 0) + 1;
  }

  assert.deepEqual(counts, {
    SUPPORTED: 322,
    CORRECTION_NEEDED: 35,
    DISPUTED: 3,
    INSUFFICIENT_EVIDENCE: 16
  });
  assert.deepEqual(ledgerCounts, {
    REQUIRED_CORRECTION: 35,
    RECOMMENDED_IMPROVEMENT: 14,
    DISPUTED: 3,
    INSUFFICIENT_EVIDENCE: 16,
    NO_CHANGE: 308
  });
  assert.equal(handoff.requiredDataCorrections.length, 35);
  assert.equal(handoff.optionalImprovements.length, 14);
  assert.equal(handoff.unresolvedDisputes.length, 3);
  assert.equal(handoff.evidenceAndProvenanceGaps.length, 16);
});
