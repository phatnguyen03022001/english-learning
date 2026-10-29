import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateDataset } from "../../validators/validate-dataset.mjs";
import registry from "../../schemas/v1/vocabularies.json" with { type: "json" };

const base = JSON.parse(readFileSync(new URL("../fixtures/graph/v1/base.json", import.meta.url), "utf8"));
const negativeCases = JSON.parse(readFileSync(new URL("../fixtures/graph/v1/negative/cases.json", import.meta.url), "utf8"));
const clone = value => structuredClone(value);
const id = (kind, suffix) => kind + "_01940000-0000-7000-8000-" + suffix.toString(16).padStart(12, "0");
const enA = id("sns", 1), enB = id("sns", 2), viB = id("sns", 3);
const viA = id("sns", 0), viEntry = id("lex", 901);
const missingSense = id("sns", 991), missingEntry = id("lex", 991);
const relationId = id("rel", 991);

function dataset() {
  const data = clone(base);
  data.records.push({
    _id: viEntry, schemaVersion: "1.0.0",
    lifecycleStatus: "active", editorialStatus: "draft",
    language: "vi", lemma: "mẫu đối kháng", pos: "NOUN", entryKind: "word"
  }, {
    _id: viA, schemaVersion: "1.0.0",
    lifecycleStatus: "active", editorialStatus: "draft",
    entryId: viEntry, definition: "Vietnamese synthetic sense, not an attestation"
  });
  return data;
}
function addRelation(data, relationType, sourceId, targetId) {
  const relation = {
    _id: relationId, schemaVersion: "1.0.0",
    lifecycleStatus: "active", editorialStatus: "draft",
    relationType, sourceId, targetId,
    qualifiers: { context: "synthetic structural test only" }
  };
  data.records.push(relation);
  return relation;
}
function diagnostic(result, code, entityId, path) {
  return result.issues.find(issue =>
    issue.code === code && issue.entityId === entityId && issue.path === path);
}
function assertDeterministic(data, expected) {
  const snapshot = clone(data);
  assert.deepEqual(validateDataset(data), expected, "second validation must be deterministic");
  assert.deepEqual(validateDataset({records:[...data.records].reverse()}), expected,
    "graph diagnostics must not depend on input record order");
  assert.deepEqual(data, snapshot, "validation must not mutate input");
}

const senseRelations = registry.relationTypes.filter(rule =>
  rule.sourceType === "LexicalSense" && rule.targetType === "LexicalSense");
assert.deepEqual(senseRelations.map(rule => rule.type),
  ["SYNONYM_OF","NEAR_SYNONYM_OF","ANTONYM_OF","HYPERNYM_OF","PART_OF"],
  "test inventory must track the V1 registry, not a second vocabulary");

for (const rule of senseRelations) {
  for (const [language, from, to] of [["EN",enA,enB],["VI",viA,viB]]) {
    test("same-language "+language+" "+rule.type+" remains storage-valid", () => {
      const data = dataset();
      addRelation(data,rule.type,from,to);
      const result = validateDataset(data);
      assert.equal(result.stage,"graph");
      assert.equal(result.valid,true,JSON.stringify(result.issues));
      assert.equal(result.publication.eligible,false,"synthetic claims cannot publish");
      assertDeterministic(data,result);
    });
  }
  test("cross-language "+rule.type+" rejects exact targetId endpoint", () => {
    const data=dataset(),rel=addRelation(data,rule.type,enA,viB);
    const result=validateDataset(data);
    assert.equal(result.stage,"graph");
    assert.equal(result.valid,false);
    assert.ok(diagnostic(result,"RELATION_LANGUAGE_MISMATCH",rel._id,"targetId"),
      JSON.stringify(result.issues));
    assert.equal(result.publication.eligible,false);
    assertDeterministic(data,result);
  });
}
test("reverse VI-to-EN symmetric antonym (canonical ASCII order) rejects language mismatch", () => {
  const data=dataset();
  const rel=addRelation(data,"ANTONYM_OF",viA,enA); // viA ID is smaller than enA
  const result=validateDataset(data);
  assert.ok(diagnostic(result,"RELATION_LANGUAGE_MISMATCH",rel._id,"targetId"),
    JSON.stringify(result.issues));
  assert.ok(!result.issues.some(issue=>issue.code==="RELATION_NOT_CANONICAL"));
});
test("language variants sharing primary subtag do not trigger false positives", () => {
  const data=dataset();
  data.records.find(x=>x._id===id("lex",1)).language="en-GB";
  data.records.find(x=>x._id===id("lex",2)).language="en-US";
  addRelation(data,"SYNONYM_OF",enA,enB);
  const result=validateDataset(data);
  assert.equal(result.valid,true,JSON.stringify(result.issues));
});
test("English-to-Vietnamese sense_aligned TranslationEquivalence remains valid", () => {
  const data=dataset();
  data.records.push({
    _id:id("eqv",991),schemaVersion:"1.0.0",
    lifecycleStatus:"active",editorialStatus:"draft",
    sourceSenseId:enA,targetSenseId:viA,
    direction:"en_to_vi",alignmentMode:"sense_aligned",
    equivalenceType:"approximate",evidenceIds:[],
    context:"synthetic alignment, not independent evidence"
  });
  const result=validateDataset(data);
  assert.equal(result.stage,"graph");
  assert.equal(result.valid,true,JSON.stringify(result.issues));
  assert.equal(result.publication.eligible,false);
});
for(const endpoint of ["sourceId","targetId"]){
  test("missing "+endpoint+" reports reference error, not speculative language mismatch",()=>{
    const data=dataset(),rel=addRelation(data,"SYNONYM_OF",enA,viB);
    rel[endpoint]=missingSense;
    const result=validateDataset(data);
    assert.ok(diagnostic(result,"REFERENCE_NOT_FOUND",rel._id,endpoint),
      JSON.stringify(result.issues));
    assert.ok(!result.issues.some(i=>i.code==="RELATION_LANGUAGE_MISMATCH"));
    assertDeterministic(data,result);
  });
  test("missing parent of "+endpoint+" does not crash or report language mismatch",()=>{
    const data=dataset(),rel=addRelation(data,"SYNONYM_OF",enA,viB);
    const sense=data.records.find(x=>x._id===rel[endpoint]);
    sense.entryId=missingEntry;
    const result=validateDataset(data);
    assert.equal(result.stage,"graph");
    assert.ok(diagnostic(result,"REFERENCE_NOT_FOUND",sense._id,"entryId"),
      JSON.stringify(result.issues));
    assert.ok(!result.issues.some(i=>i.code==="RELATION_LANGUAGE_MISMATCH"));
    assertDeterministic(data,result);
  });
}
test("retired relation target retains lifecycle error without speculative mismatch",()=>{
  const fixture=negativeCases.find(x=>x.name==="retired-live-relation");
  assert.ok(fixture,"Phase 3 retirement fixture missing");
  const data=clone(base);
  data.records.push(...clone(fixture.add));
  const relation=fixture.add.find(r=>r._id.startsWith("rel_"));
  const result=validateDataset(data);
  assert.ok(diagnostic(result,"RETIRED_LIVE_REFERENCE",relation._id,"targetId"),
    JSON.stringify(result.issues));
  assert.ok(!result.issues.some(i=>i.code==="RELATION_LANGUAGE_MISMATCH"));
});
test("schema-first rejects malformed relation before graph language evaluation",()=>{
  const data=dataset();
  const rel=addRelation(data,"SYNONYM_OF",enA,viB);
  rel.targetId="sns_not-a-uuid";
  const result=validateDataset(data);
  assert.equal(result.stage,"schema");
  assert.equal(result.valid,false);
  assert.equal(result.publication.eligible,false);
  assert.ok(result.issues.some(i=>i.code==="SCHEMA_INVALID" && i.entityId===rel._id));
});
test("publication fails closed on a cross-language graph violation",()=>{
  const data=dataset(),rel=addRelation(data,"HYPERNYM_OF",enA,viB);
  const result=validateDataset(data,{publication:true});
  assert.equal(result.stage,"graph");
  assert.equal(result.valid,false);
  assert.equal(result.publication.eligible,false);
  assert.ok(diagnostic(result,"RELATION_LANGUAGE_MISMATCH",rel._id,"targetId"));
  assert.ok(result.issues.some(i=>i.code==="PUBLICATION_NOT_VERIFIED"));
});
test("DERIVED_FROM is entry-scoped; avoid inventing an unapproved cross-language rule",()=>{
  const data=dataset();
  const rel=addRelation(data,"DERIVED_FROM",id("lex",1),viEntry);
  const result=validateDataset(data);
  assert.equal(result.stage,"graph");
  assert.ok(!result.issues.some(i=>i.code==="RELATION_LANGUAGE_MISMATCH"),
    JSON.stringify(result.issues));
  assert.equal(result.publication.eligible,false,"synthetic morphology is not verified");
});
