import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateDataset } from "../validators/validate-dataset.mjs";
import { validateGraph, qualifierKey } from "../validators/graph-v1.mjs";

const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const base = load("./fixtures/graph/v1/base.json");
const positives = load("./fixtures/graph/v1/positive/cases.json");
const negatives = load("./fixtures/graph/v1/negative/cases.json");

function apply(fixture) {
  const data = structuredClone(base);
  const gone = new Set(fixture.removeIds ?? []);
  data.records = data.records.filter(x => !gone.has(x._id));
  data.records.push(...structuredClone(fixture.add ?? []));
  for (const item of fixture.patches ?? []) {
    const target = data.records.find(x => x._id === item.id);
    assert.ok(target, "Fixture patch target not found: " + item.id);
    Object.assign(target, structuredClone(item.set ?? {}));
    for (const key of item.unset ?? []) delete target[key];
  }
  return data;
}
test("fixture inventory, no mutation, canonical qualifier representation", () => {
  assert.ok(positives.length >= 10 && negatives.length >= 35);
  assert.equal(qualifierKey({context:"cafe\u0301"}), qualifierKey({context:"café"}));
  assert.notEqual(qualifierKey({context:"context A"}), qualifierKey({context:"context B"}));
  assert.notEqual(qualifierKey({context:"cá"}), qualifierKey({context:"ca"}));
  assert.notEqual(qualifierKey({context:"x",register:"formal"}), qualifierKey({context:"x"}));
  const data=apply(positives[0]), original=structuredClone(data);
  validateDataset(data);
  assert.deepEqual(data,original,"validator must never mutate input");
});
for (const fixture of positives) {
  test("graph positive: " + fixture.name, () => {
    const data = apply(fixture), result = validateDataset(data);
    assert.equal(result.stage, "graph", JSON.stringify(result.issues));
    assert.equal(result.valid, true, JSON.stringify(result.issues));
    assert.deepEqual(result.issues, []);
    if (fixture.name === "verified-gloss-remains-gloss") {
      assert.equal(result.publication.eligible,false);
      assert.ok(result.publication.issues.some(i=>i.code==="INSUFFICIENT_EVIDENCE"));
      assert.equal(data.records.find(x=>x._id.startsWith("eqv_")).alignmentMode,"gloss_only");
    }
  });
}
for (const fixture of negatives) {
  test("graph negative: " + fixture.name + " [" + fixture.expectedCode + "]", () => {
    const data = apply(fixture);
    const result = validateDataset(data,{publication:fixture.publication===true});
    assert.equal(result.stage, fixture.stage ?? "graph", JSON.stringify(result.issues));
    assert.equal(result.valid,false,"Expected semantic/schema validation failure");
    assert.ok(result.issues.some(i => i.code===fixture.expectedCode &&
      (!fixture.targetId || i.entityId===fixture.targetId)),
      JSON.stringify(result.issues));
  });
}
test("diagnostics are stable across repeated runs and permuted record order", () => {
  for (const fixture of [...positives,...negatives]) {
    const data = apply(fixture);
    const opts = {publication:fixture.publication===true};
    const first = validateDataset(data,opts);
    assert.deepEqual(validateDataset(data,opts),first,fixture.name+" repeat");
    // Phase 2 schema diagnostics include record indices; only graph issues
    // are independent of array order by design.
    if (first.stage === "graph") {
      assert.deepEqual(validateDataset({records:[...data.records].reverse()},opts),first,
        fixture.name+" permutation");
    }
  }
});
test("schema failure prevents semantic graph acceptance", () => {
  const data=apply(negatives.find(f=>f.stage==="schema"));
  const result=validateDataset(data);
  assert.equal(result.stage,"schema");
  assert.equal(result.publication.eligible,false);
});
test("raw graph interface is pure and does not authorize publication", () => {
  const data=apply(positives[0]);
  const report=validateGraph(data);
  assert.equal(report.valid,true);
  assert.equal(report.publication.eligible,false);
});
