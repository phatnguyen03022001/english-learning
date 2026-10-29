import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { validateGraph } from "./graph-v1.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "schemas/v1");
const uri = name => "https://raw.githubusercontent.com/phatnguyen03022001/ielts-tradition/main/schemas/v1/" + name;
const prefixSchemas = new Map([
  ["lex","lexical-entry"],["sns","lexical-sense"],["frm","lexical-form"],
  ["fam","word-family"],["mrf","morpheme"],["ety","etymology"],
  ["top","topic"],["con","construction"],["col","collocation"],
  ["eqv","translation-equivalence"],["rel","lexical-relation"],
  ["evd","evidence"],["src","source"],["rev","editorial-review"],
  ["dec","editorial-decision"]
]);
const ajv = new Ajv2020({
  strict: true, strictRequired: false, strictTypes: false, allErrors: true, validateFormats: false
});
ajv.addKeyword({ keyword: "version", schemaType: "string" });
for (const filename of readdirSync(dir).filter(name => name.endsWith(".schema.json")).sort()) {
  ajv.addSchema(JSON.parse(readFileSync(join(dir, filename), "utf8")));
}
const validators = new Map([...prefixSchemas].map(([prefix, name]) => {
  const validate = ajv.getSchema(uri(name + ".schema.json"));
  if (!validate) throw new Error("Schema not resolvable: " + name);
  return [prefix, validate];
}));
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sort = (a,b) => compare(a.entityId, b.entityId) ||
  compare(a.path,b.path) || compare(a.code,b.code) || compare(a.message,b.message);

/** Schema-first entry point: no semantic/graph success is reported on malformed records. */
export function validateDataset(dataset, options = {}) {
  const records = Array.isArray(dataset) ? dataset : dataset?.records;
  if (!Array.isArray(records)) {
    return { valid:false, stage:"schema", issues:[{
      code:"SCHEMA_INVALID", entityId:"", path:"records", message:"Dataset needs a records array"
    }], publication:{eligible:false,issues:[]} };
  }
  const issues = [];
  for (let i=0;i<records.length;i++) {
    const r = records[i], id = typeof r?._id === "string" ? r._id : "";
    const prefix = id.split("_",1)[0];
    const validate = validators.get(prefix);
    if (!validate) {
      issues.push({code:"SCHEMA_INVALID",entityId:id,path:"records/"+i+"/_id",
        message:"No active V1 entity schema for prefix "+prefix});
      continue;
    }
    if (!validate(r)) {
      for (const error of validate.errors ?? []) {
        issues.push({code:"SCHEMA_INVALID",entityId:id,
          path:"records/"+i+(error.instancePath || "/")+(error.keyword === "required" ? error.params.missingProperty : ""),
          message: error.keyword + ": " + (error.message ?? "schema violation")});
      }
    }
  }
  if (issues.length) {
    issues.sort(sort);
    return { valid:false, stage:"schema", issues, publication:{eligible:false,issues:[]} };
  }
  return { stage:"graph", ...validateGraph(records,options) };
}
