import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { validateDataset } from "../../validators/validate-dataset.mjs";
import { validateGraph } from "../../validators/graph-v1.mjs";

const from = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const base = from("../fixtures/graph/v1/base.json");
const negatives = from("../fixtures/graph/v1/negative/cases.json");
const clone = x => structuredClone(x);
const id = (prefix, n) => prefix + "_01940000-0000-7000-8000-" + n.toString(16).padStart(12, "0");
const record = (prefix, n, properties) => ({
  _id: id(prefix, n), schemaVersion: "1.0.0",
  lifecycleStatus: "active", editorialStatus: "draft", ...properties
});
const codes = report => new Set(report.issues.map(i => i.code));
function apply(fixture) {
  const result = clone(base);
  result.records.push(...clone(fixture.add ?? []));
  result.records = result.records.filter(r => !(fixture.removeIds ?? []).includes(r._id));
  for (const patch of fixture.patches ?? []) {
    const target = result.records.find(r => r._id === patch.id);
    assert.ok(target, "missing fixture patch target");
    Object.assign(target, clone(patch.set ?? {}));
    for (const key of patch.unset ?? []) delete target[key];
  }
  return result;
}
const negative = name => {
  const fixture = negatives.find(f => f.name === name);
  assert.ok(fixture, "missing existing Phase 3 negative fixture: " + name);
  return apply(fixture);
};
test("all attack classes exercise real schema-first validation", () => {
  const cases = [
    ["duplicate-canonical-id", "DUPLICATE_ID"],
    ["missing-entry-reference", "REFERENCE_NOT_FOUND"],
    ["retired-live-equivalence", "RETIRED_LIVE_REFERENCE"],
    ["reversed-symmetric-order", "RELATION_NOT_CANONICAL"],
    ["duplicate-symmetric-pair", "DUPLICATE_SEMANTIC_EDGE"],
    ["duplicate-unicode-normalized-context", "DUPLICATE_SEMANTIC_EDGE"],
    ["relation-self-loop", "RELATION_SELF_LOOP"],
    ["topic-two-node-cycle", "CYCLE_DETECTED"],
    ["derivation-two-node-cycle", "CYCLE_DETECTED"],
    ["split-unresolved-incoming", "RETIRED_LIVE_REFERENCE"],
    ["merge-one-source", "MERGE_GROUP_INVALID"],
    ["publication-disputed", "PUBLICATION_STATUS_BLOCKED"],
    ["inactive-mwe-entity", "SCHEMA_INVALID"],
    ["wrong-derivation-endpoint", "SCHEMA_INVALID"]
  ];
  for (const [name, expected] of cases) {
    const f = negatives.find(x => x.name === name);
    const result = validateDataset(negative(name), { publication: f.publication === true });
    assert.equal(result.valid, false, name);
    assert.ok(codes(result).has(expected), name + ": " + JSON.stringify(result.issues));
  }
});
test("different contexts remain distinct while NFC-equivalent contexts deduplicate", () => {
  const data = clone(base);
  const entryA = id("sns", 1), entryB = id("sns", 2);
  const add = (n, context) => record("rel", n, {
    relationType:"NEAR_SYNONYM_OF", sourceId:entryA, targetId:entryB,
    qualifiers:{context}
  });
  data.records.push(add(80001,"legal context"),add(80002,"medical context"));
  assert.equal(validateDataset(data).valid,true);
  data.records.push(add(80003,"cafe\u0301"),add(80004,"café"));
  const result=validateDataset(data);
  assert.ok(codes(result).has("DUPLICATE_SEMANTIC_EDGE"));
});
test("dense symmetric components do not generate implicit transitive edges", () => {
  const data=clone(base), nodes=120, edges=900;
  for(let i=0;i<nodes;i++) data.records.push(record("sns",100000+i,{
    entryId:id("lex",1),definition:"Unverified synthetic node "+i
  }));
  const seen = new Set();
  for(let i=0;i<nodes && seen.size<edges;i++) {
    for(let j=i+1;j<nodes && seen.size<edges;j++) {
      const key=i+":"+j; seen.add(key);
      data.records.push(record("rel",200000+seen.size,{
        relationType:"SYNONYM_OF",sourceId:id("sns",100000+i),targetId:id("sns",100000+j),
        qualifiers:{context:"explicit synthetic component only"}
      }));
    }
  }
  const before=clone(data), result=validateDataset(data);
  assert.equal(result.valid,true,JSON.stringify(result.issues));
  assert.equal(data.records.filter(x=>x._id.startsWith("rel_")).length,edges);
  assert.deepEqual(data,before);
  assert.deepEqual(validateDataset({records:[...data.records].reverse()}),result);
});
test("orphan editorial decision has no authoritative link-proof in V1", () => {
  const data=clone(base);
  data.records.push(record("dec",90001,{
    subjectIds:[id("sns",1)],issueType:"sense_boundary",
    outcome:"accepted",reviewerId:"unappointed-fixture",
    rationale:"Synthetic unlinked decision: not an approval",
    action:"retain",entryId:id("lex",1)
  }));
  // Exposes a known semantic gap; do NOT interpret graph validity as legitimate authority.
  const result=validateDataset(data);
  assert.equal(result.valid,true,JSON.stringify(result.issues));
  assert.equal(result.publication.eligible,false);
});
test("deep topic chain and cycle use iterative traversal, not recursive stack", () => {
  const count=10000;
  const records=[];
  for(let i=0;i<count;i++) records.push(record("top",500000+i,{
    label:"Synthetic topic "+i,parentTopicId:i===0?null:id("top",499999+i)
  }));
  const snapshot=clone(records);
  const start=performance.now();
  const result=validateDataset({records});
  const ms=Math.round(performance.now()-start);
  console.log("STRESS_METRIC "+JSON.stringify({case:"topic-chain",nodes:count,elapsedMs:ms,rssMiB:Math.round(process.memoryUsage().rss/1048576)}));
  assert.equal(result.stage,"graph");
  assert.equal(result.valid,true,JSON.stringify(result.issues.slice(0,4)));
  assert.deepEqual(records,snapshot);
  records[0].parentTopicId=id("top",500000+count-1);
  assert.ok(codes(validateDataset({records})).has("CYCLE_DETECTED"));
});
test("bounded scaling: 100, 1000, 10000 independent graph nodes", () => {
  const samples=[];
  for (const count of [100,1000,10000]) {
    const records=Array.from({length:count},(_,i)=>record("top",700000+i,{
      label:"Independent synthetic node "+i,parentTopicId:null
    }));
    const start=performance.now();
    const report=validateDataset({records});
    samples.push({nodes:count,elapsedMs:Math.round(performance.now()-start),rssMiB:Math.round(process.memoryUsage().rss/1048576)});
    assert.equal(report.valid,true,JSON.stringify(report.issues.slice(0,3)));
    assert.equal(report.publication.eligible,false);
  }
  for(const sample of samples) console.log("STRESS_METRIC "+JSON.stringify(sample));
  // Timing is observational, NOT a flaky speed threshold.
});
test("deterministic graph diagnostics across permutations of valid-schema attacks", () => {
  for(const name of ["duplicate-canonical-id","retired-live-equivalence","reversed-symmetric-order","duplicate-unicode-normalized-context","topic-two-node-cycle","merge-one-source"]) {
    const data=negative(name);
    const first=validateDataset(data);
    assert.equal(first.stage,"graph",name);
    assert.deepEqual(validateDataset(data),first,name);
    assert.deepEqual(validateDataset({records:[...data.records].reverse()}),first,name);
  }
});
test("publication gate fails closed even when asserted review metadata looks complete", () => {
  const data=negative("accepted-review-is-not-ler-appointment");
  const report=validateDataset(data,{publication:true});
  assert.equal(report.valid,false);
  assert.equal(report.publication.eligible,false);
  assert.ok(codes(report).has("INSUFFICIENT_EVIDENCE"));
});

// Red-team mutations are imported from unique disposable directories under OS tmp.
// They never modify production validators or commit mutated code.
const graphSource=readFileSync(new URL("../../validators/graph-v1.mjs",import.meta.url),"utf8");
const registrySource=readFileSync(new URL("../../schemas/v1/vocabularies.json",import.meta.url),"utf8");
async function loadMutant(search,replacement){
  assert.ok(graphSource.includes(search),"mutation anchor drifted: "+search);
  const directory=mkdtempSync(join(tmpdir(),"ielts-mutant-"));
  mkdirSync(join(directory,"validators"),{recursive:true});
  mkdirSync(join(directory,"schemas/v1"),{recursive:true});
  writeFileSync(join(directory,"validators/graph-v1.mjs"),graphSource.replace(search,replacement));
  writeFileSync(join(directory,"schemas/v1/vocabularies.json"),registrySource);
  const module=await import(pathToFileURL(join(directory,"validators/graph-v1.mjs")).href);
  return {module,cleanup:()=>rmSync(directory,{recursive:true,force:true})};
}
const mutations=[
  {
    name:"remove symmetric canonical-order enforcement",
    search:'if (rule.symmetric && record.sourceId > record.targetId)',
    replacement:'if (false && record.sourceId > record.targetId)',
    dataset:()=>negative("reversed-symmetric-order"),code:"RELATION_NOT_CANONICAL"
  },{
    name:"remove active-to-retired reference check",
    search:'if (!historical && owner.lifecycleStatus === "active" && target.lifecycleStatus === "retired")',
    replacement:'if (false && owner.lifecycleStatus === "active" && target.lifecycleStatus === "retired")',
    dataset:()=>negative("retired-live-equivalence"),code:"RETIRED_LIVE_REFERENCE"
  },{
    name:"remove cycle traversal",
    search:'cycles(map, (code, id, _path, detail) => emit(code, id, type, detail), type);',
    replacement:'void map;',
    dataset:()=>negative("topic-two-node-cycle"),code:"CYCLE_DETECTED"
  }
];
for(const mutation of mutations){
  test("mutation killed: "+mutation.name,async()=>{
    const data=mutation.dataset();
    assert.ok(codes(validateGraph(data)).has(mutation.code),"baseline must detect violation");
    const mutant=await loadMutant(mutation.search,mutation.replacement);
    try{
      const after=mutant.module.validateGraph(data);
      assert.ok(!codes(after).has(mutation.code),"target diagnostic must disappear under injected defect");
    }finally{ mutant.cleanup(); }
  });
}
