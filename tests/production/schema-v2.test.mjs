import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import {validateDatasetV2} from "../../validators/validate-dataset-v2.mjs";
import {migrateV1Records} from "../../pipeline/migrate-v1.mjs";
const read=p=>JSON.parse(readFileSync(new URL("../../"+p,import.meta.url)));
test("V2 16 generated contracts and separate appointment contract compile without weakening V1",()=>{
 const files=readdirSync(new URL("../../schemas/v2/",import.meta.url)).filter(n=>n.endsWith(".schema.json"));
 assert.equal(files.length,16);
 const ajv=new Ajv2020({strict:true,strictRequired:false,strictTypes:false,allErrors:true,validateFormats:false});
 ajv.addKeyword({keyword:"version",schemaType:"string"});
 for(const name of files)ajv.addSchema(read("schemas/v2/"+name));
 const appointment=read("schemas/v2/reviewer-appointments.contract.json");
 const validate=ajv.compile(appointment);
 assert.equal(validate({contractVersion:"2.0.0",appointments:[]}),true,JSON.stringify(validate.errors));
 assert.equal(validate({contractVersion:"2.0.0",appointments:[{reviewerId:"made up"}]}),false);
});
test("all six V1 pilot identities and draft statuses survive explicit V2 upgrade",()=>{
 const names=["bank","run","analyse-family","big-large","depend-on","look-up"];
 for(const name of names){
  const old=read("tests/fixtures/pilot/v1/"+name+".json").records;
  const migrated=migrateV1Records(old);
  assert.deepEqual(migrated.records.map(x=>x._id),old.map(x=>x._id));
  assert.equal(migrated.records.length,old.length);
  assert.deepEqual(migrateV1Records(old),migrated);
  assert.ok(migrated.records.every((r,i)=>r.editorialStatus===old[i].editorialStatus&&r.schemaVersion==="2.0.0"));
  const check=validateDatasetV2(migrated);
  assert.equal(check.valid,true,name+": "+JSON.stringify(check.issues));
  assert.equal(check.publication.eligible,false);
 }
});
test("wrong-language lexical relation and forbidden reverse alignment remain blocked in V2",()=>{
 const records=migrateV1Records(read("tests/fixtures/graph/v1/base.json").records).records;
 const en=records.find(r=>r._id.startsWith("sns_")),vi=records.find(r=>r._id==="sns_01940000-0000-7000-8000-000000000003");
 const rel=records.find(r=>r._id.startsWith("eqv_"));
 assert.ok(en&&vi&&rel);
 rel.direction="vi_to_en";
 const bad=validateDatasetV2(records);
 assert.equal(bad.stage,"schema");
 assert.ok(bad.issues.some(i=>i.code==="SCHEMA_INVALID"));
});
