import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {test} from "node:test";
import assert from "node:assert/strict";

const statePath = new URL("../../data/state/candidates-state.json", import.meta.url);
const cliPath = fileURLToPath(new URL("../../scripts/candidates.mjs", import.meta.url));
const draft = {lifecycleStatus:"active", editorialStatus:"draft"};

test("new multi-sense batch grows the canonical ledger in isolation and preserves Pilot 004 history", () => {
  const canonicalBytes = readFileSync(statePath);
  const original = JSON.parse(canonicalBytes.toString("utf8"));
  const originalIds = original.records.map(record => record._id).sort();
  const originalHistory = structuredClone(original.history);
  const pilotMappings = structuredClone(Object.fromEntries(Object.entries(original.mappings)
    .filter(([key]) => key.startsWith("pilot-fanout-004#"))));
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "lex-multi-batch-growth-"));
  const temporaryStatePath = join(temporaryDirectory, "candidates-state.json");
  const batchPath = join(temporaryDirectory, "batch.json");
  const revisionPath = join(temporaryDirectory, "revision.json");
  const invalidBindingPath = join(temporaryDirectory, "invalid-binding.json");
  const runCli = (operation, inputPath) => spawnSync(process.execPath,
    [cliPath, operation, "--state", temporaryStatePath, ...(inputPath ? ["--input", inputPath] : [])],
    {encoding:"utf8"});
  const cliReport = (result, expectedExitCode=0) => {
    assert.equal(result.status, expectedExitCode, result.stderr);
    return JSON.parse(result.stdout);
  };
  const batch = {batchId:"synthetic-growth-regression-001", records:[
    {candidateId:"entry", sourceItemKey:"synthetic-test:growth:entry:v1", type:"lex",
      entity:{...draft, language:"en", lemma:"synthetic-growth-word", pos:"NOUN", entryKind:"word"}},
    {candidateId:"sense-a", type:"sns",
      entity:{...draft, entryId:"candidate:entry", definition:"Synthetic sense A for regression testing."}},
    {candidateId:"sense-b", type:"sns",
      entity:{...draft, entryId:"candidate:entry", definition:"Synthetic sense B for regression testing."}},
    {candidateId:"gloss", type:"eqv",
      entity:{...draft, sourceSenseId:"candidate:sense-a", glossVi:"nghĩa thử nghiệm", direction:"en_to_vi",
        alignmentMode:"gloss_only", equivalenceType:"approximate", translationEvidenceStatus:"evidence_pending", evidenceIds:[]}}
  ]};

  try {
    writeFileSync(temporaryStatePath, canonicalBytes, {mode:0o600});
    writeFileSync(batchPath, JSON.stringify(batch));
    assert.equal(cliReport(runCli("prepare", batchPath)).status, "prepared");
    const grown = JSON.parse(readFileSync(temporaryStatePath, "utf8"));
    assert.equal(grown.records.length, original.records.length + batch.records.length);
    assert.deepEqual(grown.records.filter(record => originalIds.includes(record._id)).map(record => record._id).sort(), originalIds);
    assert.deepEqual(grown.history.slice(0, originalHistory.length), originalHistory);
    assert.deepEqual(Object.fromEntries(Object.entries(grown.mappings)
      .filter(([key]) => key.startsWith("pilot-fanout-004#"))), pilotMappings);

    const mappedId = candidateId => grown.mappings[`synthetic-growth-regression-001#${candidateId}`].canonicalId;
    const newIds = batch.records.map(record => mappedId(record.candidateId));
    assert.equal(new Set(newIds).size, newIds.length);
    for (const id of newIds) assert.match(id, /^[a-z]{3}_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const equivalence = grown.records.find(record => record._id === mappedId("gloss"));
    assert.equal(equivalence.sourceSenseId, mappedId("sense-a"));
    assert.equal(equivalence.alignmentMode, "gloss_only");
    assert.equal(equivalence.targetSenseId, undefined);

    const beforeReplayBytes = readFileSync(temporaryStatePath);
    assert.equal(cliReport(runCli("prepare", batchPath)).status, "replayed");
    assert.deepEqual(readFileSync(temporaryStatePath), beforeReplayBytes);
    const changed = structuredClone(batch);
    changed.records[1].entity.definition = "Divergent payload under the same immutable batch ID.";
    writeFileSync(batchPath, JSON.stringify(changed));
    assert.equal(cliReport(runCli("prepare", batchPath), 1).issues[0]?.code, "CHANGED_BATCH_CONFLICT");
    assert.deepEqual(readFileSync(temporaryStatePath), beforeReplayBytes);

    const revision = {revisionId:"synthetic-growth-revision-001", changes:[{
      canonicalId:mappedId("sense-a"), expectedRevision:1,
      set:{definition:"Revised synthetic sense A for regression testing."}
    }]};
    writeFileSync(revisionPath, JSON.stringify(revision));
    assert.equal(cliReport(runCli("revise", revisionPath)).status, "revised");
    const revisedState = JSON.parse(readFileSync(temporaryStatePath, "utf8"));
    const revisedSense = revisedState.records.find(record => record._id === mappedId("sense-a"));
    assert.equal(revisedSense.revision, 2);
    assert.equal(revisedState.history.at(-1).before[0].definition, "Synthetic sense A for regression testing.");
    assert.equal(revisedState.history.at(-1).after[0].definition, revisedSense.definition);
    const beforeRevisionReplay = readFileSync(temporaryStatePath);
    assert.equal(cliReport(runCli("revise", revisionPath)).status, "replayed");
    assert.deepEqual(readFileSync(temporaryStatePath), beforeRevisionReplay);

    const invalidBinding = {bindingId:"synthetic-invalid-binding-001", subjectId:mappedId("gloss"), expectedRevision:1,
      evidenceIds:["evd_01900000-0000-7000-8000-000000000001"]};
    writeFileSync(invalidBindingPath, JSON.stringify(invalidBinding));
    assert.equal(cliReport(runCli("bind-evidence", invalidBindingPath), 1).issues[0]?.code, "EVIDENCE_BINDING_TARGET_INVALID");
    assert.deepEqual(readFileSync(temporaryStatePath), beforeRevisionReplay);
    const checked = cliReport(runCli("check"));
    assert.equal(checked.status, "valid");
    assert.equal(checked.publication.eligible, false);

    const recovered = JSON.parse(readFileSync(temporaryStatePath, "utf8"));
    writeFileSync(batchPath, JSON.stringify(batch));
    const recoveredReplay = cliReport(runCli("prepare", batchPath));
    assert.equal(recoveredReplay.status, "replayed");
    for (const item of batch.records) {
      const key = `synthetic-growth-regression-001#${item.candidateId}`;
      assert.equal(recovered.mappings[key].canonicalId, grown.mappings[key].canonicalId);
    }
    assert.deepEqual(readFileSync(statePath), canonicalBytes, "Smoke test must never mutate canonical state");
  } finally {
    rmSync(temporaryDirectory, {recursive:true, force:true});
  }
});
