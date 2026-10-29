import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { validateDataset } from "../validators/validate-dataset.mjs";

const directory = new URL("./fixtures/pilot/v1/", import.meta.url);
const files = readdirSync(directory).filter(name => name.endsWith(".json")).sort();
const expectedIds = ["analyse-family", "bank", "big-large", "depend-on", "look-up", "run"];
const pilots = files.map(name => JSON.parse(readFileSync(new URL(name, directory), "utf8")));
const recordsOf = (f, prefix) => f.records.filter(record => record._id.startsWith(prefix + "_"));

function applyNegative(pilot, mutation) {
  const input = structuredClone({records:pilot.records});
  const removed = new Set(mutation.removeIds ?? []);
  input.records.push(...structuredClone(mutation.add ?? []));
  input.records = input.records.filter(item => !removed.has(item._id));
  for (const patch of mutation.patches ?? []) {
    const target = input.records.find(item => item._id === patch.id);
    assert.ok(target, "Unknown pilot mutation target: " + patch.id);
    Object.assign(target, structuredClone(patch.set ?? {}));
    for (const key of patch.unset ?? []) delete target[key];
  }
  return input;
}

test("pilot inventory is exactly the six agreed lexical modeling families", () => {
  assert.deepEqual(files, expectedIds.map(id => id + ".json"));
  assert.deepEqual(pilots.map(p => p.caseId).sort(), expectedIds);
  const allIds = pilots.flatMap(p => p.records.map(r => r._id));
  assert.equal(new Set(allIds).size, allIds.length, "no ID reused across pilot families");
});

for (const pilot of pilots) {
  test("pilot graph and modeling boundary: " + pilot.caseId, () => {
    const original = structuredClone(pilot);
    assert.equal(pilot.editorialStatus, "synthetic_unreviewed");
    assert.ok(typeof pilot.focus === "string" && pilot.focus.length > 20);
    assert.ok(Array.isArray(pilot.contrastiveExamples) && pilot.contrastiveExamples.length >= 2);
    for (const example of pilot.contrastiveExamples) {
      assert.ok(example.en && example.vi);
      assert.ok(example.status.startsWith("editor-created"), "examples cannot assert an external source");
    }
    assert.ok(pilot.records.every(r => r.editorialStatus === "draft" && r.lifecycleStatus === "active"));
    assert.ok(pilot.records.every(r => !r.evidenceIds || r.evidenceIds.length === 0));
    assert.equal(recordsOf(pilot,"src").length,0,"no fictitious source metadata");
    assert.equal(recordsOf(pilot,"evd").length,0,"no manufactured attestations");
    assert.equal(recordsOf(pilot,"rev").length,0,"no fictitious reviewer");
    assert.equal(recordsOf(pilot,"dec").length,0,"no fictitious editorial approval");
    assert.equal(recordsOf(pilot,"mwe").length,0,"mwe_ inactive");
    const report = validateDataset({records:pilot.records}, {publication:true});
    assert.equal(report.stage, "graph",JSON.stringify(report.issues));
    assert.deepEqual(report.issues.filter(i => i.code !== "PUBLICATION_NOT_VERIFIED"), [],
      "only the expected draft publication gate may block the pilot");
    assert.equal(report.publication.eligible,false,"synthetic pilots must not publish");
    assert.equal(report.valid,false,"publication request must fail closed");
    const storage = validateDataset({records:pilot.records});
    assert.equal(storage.stage,"graph");
    assert.equal(storage.valid,true,JSON.stringify(storage.issues));
    assert.deepEqual(storage.issues,[]);
    assert.equal(storage.publication.eligible,false);
    assert.deepEqual(validateDataset({records:[...pilot.records].reverse()}),storage,"graph diagnostics deterministic");
    assert.deepEqual(pilot,original,"validation does not mutate pilot source");
    const e=pilot.modelExpectations;
    assert.equal(recordsOf(pilot,"lex").length,e.entryCount);
    assert.equal(recordsOf(pilot,"sns").length,e.senseCount);
    assert.deepEqual(recordsOf(pilot,"lex").map(x=>x.homographNumber).filter(Boolean).sort(),e.homographNumbers ?? []);
    assert.deepEqual(recordsOf(pilot,"eqv").map(x=>x.alignmentMode).sort(),[...e.equivalenceModes].sort());
    if(e.familyCount!==undefined) assert.equal(recordsOf(pilot,"fam").length,e.familyCount);
    if(e.constructionCount!==undefined) assert.equal(recordsOf(pilot,"con").length,e.constructionCount);
    if(e.multiwordCount!==undefined) assert.equal(recordsOf(pilot,"lex").filter(x=>x.entryKind==="multiword").length,e.multiwordCount);
    if(e.relationTypes!==undefined) assert.deepEqual(recordsOf(pilot,"rel").map(x=>x.relationType).sort(),e.relationTypes);
    for(const lemma of e.forbiddenEntryLemmas) {
      assert.ok(!recordsOf(pilot,"lex").some(x=>x.lemma===lemma),"unwanted LexicalEntry identity "+lemma);
    }

    // These are structural expectations, NOT machine proof of linguistic correctness.
    if(pilot.caseId==="bank"){
      const entries=recordsOf(pilot,"lex"),senses=recordsOf(pilot,"sns");
      assert.ok(entries.every(x=>x.lemma==="bank" && x.pos==="NOUN"));
      assert.equal(new Set(senses.map(s=>s.entryId)).size,2);
      assert.ok(recordsOf(pilot,"eqv").every(x=>x.alignmentMode==="gloss_only" && !("targetSenseId" in x)));
    }
    if(pilot.caseId==="run"){
      const senses=recordsOf(pilot,"sns");
      assert.equal(new Set(senses.map(x=>x.entryId)).size,1);
      assert.equal(new Set(senses.map(x=>x.definition)).size,3);
    }
    if(pilot.caseId==="analyse-family"){
      const family=recordsOf(pilot,"fam")[0];
      assert.ok(recordsOf(pilot,"lex").every(x=>x.familyIds?.includes(family._id)));
      assert.equal(recordsOf(pilot,"rel").length,0,"family membership must not fabricate derivation edges");
    }
    if(pilot.caseId==="big-large"){
      const relation=recordsOf(pilot,"rel")[0];
      assert.equal(relation.relationType,"NEAR_SYNONYM_OF");
      assert.ok(relation.sourceId < relation.targetId);
      assert.ok(relation.qualifiers.context,"no global unrestricted synonym claim");
    }
    if(pilot.caseId==="depend-on"){
      assert.equal(recordsOf(pilot,"lex")[0].lemma,"depend");
      const construction=recordsOf(pilot,"con")[0];
      assert.deepEqual(construction.prepositions,["on"]);
      assert.equal(construction.senseId,recordsOf(pilot,"sns")[0]._id);
    }
    if(pilot.caseId==="look-up"){
      assert.equal(recordsOf(pilot,"lex")[0].entryKind,"multiword");
      const construction=recordsOf(pilot,"con")[0];
      assert.equal(construction.separable,true);
      assert.ok(construction.constraints.some(x=>x.includes("look it up")));
      assert.ok(construction.constraints.some(x=>x.includes("look up it")));
      assert.equal(construction.senseId,recordsOf(pilot,"sns")[0]._id);
    }
  });

  test("pilot negative mutations: " + pilot.caseId, () => {
    assert.ok(Array.isArray(pilot.negativeCases) && pilot.negativeCases.length >= 1);
    for (const mutation of pilot.negativeCases) {
      const input=applyNegative(pilot,mutation);
      const report=validateDataset(input);
      assert.equal(report.stage,mutation.stage,"stage for "+mutation.name);
      assert.equal(report.valid,false,mutation.name+" expected rejection");
      assert.ok(report.issues.some(i=>i.code===mutation.expectedCode),
        mutation.name+": expected "+mutation.expectedCode+", got "+JSON.stringify(report.issues));
      assert.deepEqual(validateDataset(input),report,"deterministic diagnosis "+mutation.name);
    }
  });
}
