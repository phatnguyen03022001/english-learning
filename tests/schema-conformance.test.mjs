import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const from=(p)=>JSON.parse(readFileSync(join(root,p),"utf8"));
const registry=from("schemas/v1/vocabularies.json");
const files=readdirSync(join(root,"schemas/v1")).filter(x=>x.endsWith(".schema.json")).sort();
// JSON Schema permits `required` in conditional branches that reuse root `properties`.
// Ajv's strictRequired lint cannot always resolve properties across allOf/if/then;
// keep all other strict checks active and test required/forbidden behavior via fixtures.
const ajv=new Ajv2020({strict:true,strictRequired:false,strictTypes:false,allErrors:true,validateFormats:false});
ajv.addKeyword({keyword:"version",schemaType:"string"});
for(const filename of files) ajv.addSchema(from("schemas/v1/"+filename));
const uri=(filename)=>"https://raw.githubusercontent.com/phatnguyen03022001/ielts-tradition/main/schemas/v1/"+filename;
const validator=(filename)=> {
  const validate=ajv.getSchema(uri(filename));
  assert.ok(validate,"Unresolved schema or $ref: "+filename);
  return validate;
};
test("all schemas parse, compile and resolve their references",()=>{
  assert.equal(files.length,16);
  for(const file of files) assert.ok(validator(file));
});
test("registry identities and discriminators are the canonical V1 sets",()=>{
  const ids=registry.identifiers;
  assert.equal(ids.allRegisteredPrefixes.length,ids.activeV1Prefixes.length+ids.reservedInactiveV1Prefixes.length);
  assert.deepEqual(ids.activeV1Prefixes.filter(p=>ids.reservedInactiveV1Prefixes.includes(p)),[]);
  assert.deepEqual(ids.reservedInactiveV1Prefixes,["mwe"]);
  assert.equal(registry.graphRules.mwePrefixActiveInV1,false);
  const common=from("schemas/v1/common.schema.json").$defs;
  for(const [name,values] of Object.entries(registry.enums)) assert.deepEqual(common[name].enum,values,"enum drift "+name);
  for(const type of registry.relationTypes){
    const rel=from("schemas/v1/lexical-relation.schema.json");
    const branch=rel.allOf.find(x=>x.oneOf).oneOf.find(x=>x.properties.relationType.const===type.type);
    assert.ok(branch,"missing relation discriminator "+type.type);
    const refPrefix=t=>t==="LexicalEntry"?"lex":"sns";
    assert.ok(branch.properties.sourceId.$ref.endsWith("/id_"+refPrefix(type.sourceType)));
    assert.ok(branch.properties.targetId.$ref.endsWith("/id_"+refPrefix(type.targetType)));
  }
  assert.ok(!files.some(name=>name.includes("multiword-expression")||name.includes("mwe")));
});
const positive=from("tests/fixtures/schema/v1/positive/cases.json");
const negative=from("tests/fixtures/schema/v1/negative/cases.json");
for(const f of positive) test("positive: "+f.name,()=>{
  const validate=validator(f.schema);
  assert.equal(validate(f.data),true,JSON.stringify(validate.errors));
});
for(const f of negative) test("negative: "+f.name+" ["+f.rule+"]",()=>{
  assert.ok(f.rule && f.keyword,"negative rule and keyword are required");
  const validate=validator(f.schema);
  assert.equal(validate(f.data),false,"invalid fixture unexpectedly accepted");
  assert.ok(validate.errors.some(e=>e.keyword===f.keyword),JSON.stringify(validate.errors));
});
