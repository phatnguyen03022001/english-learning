import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateDataset } from "../../validators/validate-dataset.mjs";

const load = name => JSON.parse(readFileSync(new URL("../fixtures/pilot/v1/" + name + ".json", import.meta.url), "utf8"));
const bank = load("bank");
const lookUp = load("look-up");
const bigLarge = load("big-large");
const graphBase = JSON.parse(readFileSync(new URL("../fixtures/graph/v1/base.json", import.meta.url), "utf8"));
const clone = value => structuredClone(value);
const recordsOf = (data, prefix) => data.records.filter(item => item._id.startsWith(prefix + "_"));
const check = records => validateDataset({ records });
const assertStorageOnly = (records, description) => {
  const input = clone(records);
  const result = check(records);
  assert.equal(result.stage, "graph", description + ": " + JSON.stringify(result.issues));
  assert.equal(result.valid, true, description + ": schema/graph should not claim linguistic understanding");
  assert.equal(result.publication.eligible, false, description + ": this is NOT verified data");
  assert.deepEqual(records, input, "validator must not mutate learner candidates");
};

// These are deliberately unsafe candidate assertions, NOT accepted English/Vietnamese facts.
// Every case crosses the real schema-first validator; none is a self-scoring language gold set.
const falseEquivalence = [
  ["big / large", "big sister = large sister", "Collocational and relational meaning are not interchangeable"],
  ["borrow / lend", "borrow = cho mượn", "Direction of transfer and participant roles differ"],
  ["economic / economical", "economic policy = economical policy", "Economic domain versus cost-saving attribute"],
  ["sensible / sensitive", "sensible person = sensitive person", "Reasonable judgment versus sensitivity"],
  ["actual / current", "actual price = current price", "Reality versus temporal recency"],
  ["make / do", "make homework = do homework", "Collocational restrictions"],
  ["say / tell", "say me the news = tell me the news", "Object/complement frames differ"],
  ["remember / remind", "remember me the appointment = remind me of the appointment", "Experiencer versus causer roles"]
];
for (const [pair, unsafeGloss, diagnostic] of falseEquivalence) {
  test("bilingual semantic blind spot: " + pair, () => {
    const data = clone(bank);
    recordsOf(data, "eqv")[0].glossVi = unsafeGloss;
    recordsOf(data, "eqv")[0].context = diagnostic;
    assertStorageOnly(data.records, pair);
    // Validation success here is intentionally a demonstrated FALSE POSITIVE for
    // linguistic correctness, not a successful translation assessment.
  });
}

const grammarProbes = [
  ["look up something", "transitive phrasal-verb pattern"],
  ["look something up", "syntactic alternation"],
  ["look it up", "object pronoun placement"],
  ["look up it", "unlicensed pronoun order candidate"],
  ["depend on something", "obligatory prepositional complement"],
  ["informations", "countability / plural formation"],
  ["advise vs advice", "verb versus uncountable noun"],
  ["interested in vs interesting", "adjectival complementation"],
  ["used to do vs be used to doing", "different complement types and interpretations"],
  ["conduct research", "collocation versus lexicalized idiom"],
  ["look up to", "distinct lexicalized sequence and roles"]
];
for (const [phrase, question] of grammarProbes) {
  test("construction text is not parsed: " + phrase, () => {
    const data = clone(lookUp);
    const construction = recordsOf(data, "con")[0];
    construction.pattern = phrase;
    construction.constraints = [question];
    // Deliberately test a real validator boundary, not assert that the phrase is correct.
    assertStorageOnly(data.records, phrase);
  });
}

test("sense boundary: arbitrary splitting is structurally permitted, not linguistically adjudicated", () => {
  const data = clone(bank);
  const original = recordsOf(data, "sns")[0];
  const duplicate = { ...clone(original), _id: "sns_01940000-0000-7000-8000-000000009301" };
  data.records.push(duplicate);
  assertStorageOnly(data.records, "over-splitting");
});
test("sense boundary: arbitrary lumping survives schema/graph checks", () => {
  const data = clone(bank);
  const senses = recordsOf(data, "sns");
  // Put unrelated definitions under one entry: representation permits it.
  senses[1].entryId = senses[0].entryId;
  assertStorageOnly(data.records, "under-splitting");
});
test("near-synonym context does not prove substitution or transitivity", () => {
  const data = clone(bigLarge);
  recordsOf(data, "rel")[0].qualifiers.context = "unrestricted in every context";
  assertStorageOnly(data.records, "unrestricted near synonym claim");
});
test("evidence pointing at a claim does not prove that the attestation is true", () => {
  const data = clone(graphBase);
  const sense = recordsOf(data, "sns")[0];
  const evidence = recordsOf(data, "evd")[0];
  const source = recordsOf(data, "src")[0];
  const review = recordsOf(data, "rev")[0];
  sense.editorialStatus = "verified";
  sense.evidenceIds = [evidence._id];
  evidence.attestation = "Synthetic unrelated assertion; NOT a factual attestation.";
  source.url = "https://example.invalid/non-existent-source";
  source.license = "unverified-license-claim";
  source.permittedUse = "unverified-permission-claim";
  review.outcome = "accepted";
  review.reviewerId = "self-appointed-unverified";
  const storage = check(data.records);
  assert.equal(storage.stage, "graph");
  assert.equal(storage.valid, true, JSON.stringify(storage.issues));
  const publication = validateDataset(data, { publication: true });
  assert.equal(publication.valid, false);
  assert.equal(publication.publication.eligible, false);
  assert.ok(publication.issues.some(i => i.code === "INSUFFICIENT_EVIDENCE" && i.entityId === sense._id));
  assert.ok(!publication.issues.some(i => i.code === "PUBLICATION_EVIDENCE_MISSING" && i.entityId === sense._id));
  // URL truth, rights, independent source corroboration, and LER appointment
  // remain NOT_TESTABLE by V1, even with the accepted review string.
});
test("gloss_only cannot masquerade structurally as a Vietnamese target sense", () => {
  const data = clone(bank);
  recordsOf(data, "eqv")[0].targetSenseId = "sns_01940000-0000-7000-8000-000000000101";
  const report = check(data.records);
  assert.equal(report.stage, "schema");
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(i => i.code === "SCHEMA_INVALID"));
});
test("disputed record cannot pass publication gate", () => {
  const data = clone(bank);
  recordsOf(data, "sns")[0].editorialStatus = "disputed";
  const report = validateDataset(data, { publication: true });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(i => i.code === "PUBLICATION_STATUS_BLOCKED"));
});
test("schema/graph rejects misleading aligned-target language", () => {
  const data = clone(graphBase);
  const eqv = recordsOf(data, "eqv")[0];
  eqv.alignmentMode = "sense_aligned";
  eqv.targetSenseId = "sns_01940000-0000-7000-8000-000000000002";
  delete eqv.glossVi;
  const report = check(data.records);
  assert.equal(report.stage, "graph");
  assert.ok(report.issues.some(i => i.code === "BILINGUAL_LANGUAGE_MISMATCH"));
});

test("REGRESSION RED: monolingual semantic relation must not link English and Vietnamese senses", () => {
  const data = clone(graphBase);
  const relation = {
    _id: "rel_01940000-0000-7000-8000-000000009901",
    schemaVersion:"1.0.0", lifecycleStatus:"active",editorialStatus:"draft",
    relationType:"SYNONYM_OF",
    sourceId:"sns_01940000-0000-7000-8000-000000000001",
    targetId:"sns_01940000-0000-7000-8000-000000000003",
    qualifiers:{context:"synthetic invalid cross-language synonym"}
  };
  data.records.push(relation);
  const report = validateDataset(data);
  assert.equal(report.stage, "graph", JSON.stringify(report.issues));
  // Independent English/Vietnamese senses may only be linked by reviewed
  // bilingual equivalence, not an untyped monolingual SYNONYM_OF shortcut.
  // Currently expected to FAIL until a separately approved validator patch.
  assert.ok(report.issues.some(i => i.code === "RELATION_LANGUAGE_MISMATCH" &&
    i.entityId === relation._id),
    "P1: cross-language SYNONYM_OF is accepted as graph-valid; do not publish or waive this regression");
});
