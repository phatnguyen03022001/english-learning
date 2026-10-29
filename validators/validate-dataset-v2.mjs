import {readFileSync,readdirSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import {validateGraph} from "./graph-v1.mjs";
import {evaluatePublication,digest,valueAt} from "./production-gates.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const directory=join(root,"schemas/v2");
const names={lex:"lexical-entry",sns:"lexical-sense",frm:"lexical-form",fam:"word-family",mrf:"morpheme",ety:"etymology",top:"topic",con:"construction",col:"collocation",eqv:"translation-equivalence",rel:"lexical-relation",evd:"evidence",src:"source",rev:"editorial-review",dec:"editorial-decision"};
const ajv=new Ajv2020({strict:true,strictRequired:false,strictTypes:false,allErrors:true,validateFormats:false});
ajv.addKeyword({keyword:"version",schemaType:"string"});
for(const n of readdirSync(directory).filter(n=>n.endsWith(".schema.json")).sort())ajv.addSchema(JSON.parse(readFileSync(join(directory,n),"utf8")));
const uri=n=>"https://raw.githubusercontent.com/phatnguyen03022001/ielts-tradition/main/schemas/v2/"+n+".schema.json";
const validators=new Map(Object.entries(names).map(([p,n])=>[p,ajv.getSchema(uri(n))]));
for(const [p,v]of validators)if(!v)throw Error("V2 schema not found: "+p);
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const sort=(a,b)=>cmp(a.entityId,b.entityId)||cmp(a.path,b.path)||cmp(a.code,b.code)||cmp(a.message,b.message);
const issue=(code,id,path,message)=>({code,entityId:id,path,message});
export function validateDatasetV2(input,options={}) {
 const records=Array.isArray(input)?input:input?.records;
 if(!Array.isArray(records))return {valid:false,stage:"schema",issues:[issue("SCHEMA_INVALID","","records","Missing records array")],publication:{eligible:false,issues:[]}};
 const errors=[];
 for(let i=0;i<records.length;i++){
  const r=records[i],id=typeof r?._id==="string"?r._id:"";
  const validate=validators.get(id.split("_",1)[0]);
  if(!validate){errors.push(issue("SCHEMA_INVALID",id,"records/"+i+"/_id","Unknown entity type"));continue;}
  if(!validate(r))for(const e of validate.errors??[])errors.push(issue("SCHEMA_INVALID",id,"records/"+i+(e.instancePath||"/")+(e.params?.missingProperty??""),e.keyword+": "+e.message));
 }
 if(errors.length)return {valid:false,stage:"schema",issues:errors.sort(sort),publication:{eligible:false,issues:[]}};
 const graph=validateGraph(records),extra=[],byId=new Map(records.map(r=>[r._id,r]));
 const ref=(record,path,id,prefix)=>{if(!byId.has(id))extra.push(issue("REFERENCE_NOT_FOUND",record._id,path,id));else if(!id.startsWith(prefix+"_"))extra.push(issue("REFERENCE_TYPE_MISMATCH",record._id,path,id));else if(record.lifecycleStatus==="active"&&byId.get(id).lifecycleStatus==="retired")extra.push(issue("RETIRED_LIVE_REFERENCE",record._id,path,id));};
 for(const r of records){
  if(r.constructionIds)r.constructionIds.forEach((id,i)=>{ref(r,"constructionIds/"+i,id,"con");const con=byId.get(id);if(con&&con.senseId!==r._id)extra.push(issue("CONSTRUCTION_SENSE_MISMATCH",r._id,"constructionIds/"+i,"Construction belongs to a different sense"));});
  if(r.claim){
   const target=byId.get(r.claim.subjectId);
   ref(r,"claim/subjectId",r.claim.subjectId,r.claim.subjectId.split("_")[0]);
   if(target&&(!r.assertionIds.includes(target._id)||valueAt(target,r.claim.fieldPath)===undefined||digest(valueAt(target,r.claim.fieldPath))!==r.claim.valueDigest))
    extra.push(issue("EVIDENCE_CLAIM_MISMATCH",r._id,"claim","Claim digest, path or assertion ID does not match"));
  }
  if(r.claims)r.claims.forEach((claim,i)=>{ref(r,"claims/"+i+"/subjectId",claim.subjectId,claim.subjectId.split("_")[0]);if(!r.subjectIds.includes(claim.subjectId)||valueAt(byId.get(claim.subjectId),claim.fieldPath)===undefined)extra.push(issue("EDITORIAL_CLAIM_MISMATCH",r._id,"claims/"+i,"Review does not apply to exact subject/path"));});
  for(const field of ["pronunciationEvidenceIds"])if(r[field])r[field].forEach((id,i)=>ref(r,field+"/"+i,id,"evd"));
  for(const [i,ex]of (r.examples??[]).entries())for(const [j,id]of (ex.evidenceIds??[]).entries())ref(r,"examples/"+i+"/evidenceIds/"+j,id,"evd");
 }
 const all=[...graph.issues,...extra].sort(sort);
 const publication=evaluatePublication(records,options);
 const selected=options.publication===true?[...all,...publication.issues].sort(sort):all;
 return {valid:selected.length===0,stage:"graph",issues:selected,publication:{eligible:all.length===0&&publication.eligible,issues:publication.issues}};
}
