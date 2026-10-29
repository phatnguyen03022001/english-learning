import {createHash,randomBytes} from "node:crypto";
import {validateDatasetV2} from "../validators/validate-dataset-v2.mjs";
const clone=x=>JSON.parse(JSON.stringify(x));
const sha=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const sort=(a,b)=>a<b?-1:a>b?1:0;
const uuidv7=()=>{
 const t=Date.now().toString(16).padStart(12,"0");
 const r=randomBytes(10).toString("hex");
 return t.slice(0,8)+"-"+t.slice(8)+"-7"+r.slice(0,3)+"-"+(((parseInt(r[3],16)&3)|8).toString(16)+r.slice(4,7))+"-"+r.slice(7,19);
};
const prefixOf=(item)=>{
 const e=item.entity;
 if(item.type)return item.type;
 if(e.language&&e.lemma&&e.pos)return "lex";
 if(e.entryId&&e.definition)return "sns";
 if(e.sourceSenseId&&e.alignmentMode)return "eqv";
 if(e.senseId&&e.pattern)return "con";
 if(e.anchorSenseId&&e.pattern)return "col";
 if(e.relationType&&e.sourceId)return "rel";
 if(e.sourceId&&e.assertionIds)return "evd";
 if(e.title)return "src";
 if(e.reviewerId&&e.subjectIds)return e.action?"dec":"rev";
 if(e.entryId&&e.form)return "frm";
 return null;
};
const validPrefixes=new Set(["lex","sns","frm","fam","mrf","ety","top","con","col","eqv","rel","evd","src","rev","dec"]);
const invalidReport=(state,digest,code,message,details=[])=>({state,report:{status:"conflict",digest,issues:[{code,message},...details],duplicates:[],missingEvidence:[],reviewQueue:[],publicationEligible:false}});
const resolveRefs=(x,ids)=>{
 if(typeof x==="string"){
  if(!x.startsWith("candidate:"))return x;
  const found=ids.get(x.slice("candidate:".length));
  if(!found)throw Error("UNRESOLVED_CANDIDATE_REFERENCE: "+x);
  return found;
 }
 if(Array.isArray(x))return x.map(v=>resolveRefs(v,ids));
 if(x&&typeof x==="object")return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,resolveRefs(v,ids)]));
 return x;
};
function duplicateHints(existing,newRecords){
 const hints=[];
 const keys=new Map();
 for(const r of [...existing,...newRecords]){
  if(r._id.startsWith("lex_")){
   const key=JSON.stringify([r.language,r.lemma.normalize("NFC"),r.pos,r.entryKind]);
   if(keys.has(key)&&keys.get(key)!==r._id)hints.push({kind:"possible_homograph_or_duplicate",existingId:keys.get(key),candidateId:r._id,lemma:r.lemma});
   else keys.set(key,r._id);
  }
 }
 return hints.sort((a,b)=>sort(a.candidateId,b.candidateId));
}
// Pure preparation. Only the CLI persists a single atomic state snapshot.
// A batch ID is immutable: changed input requires a new batch ID plus review.
export function prepareBatch(batch,state={},options={}) {
 const digest=sha(batch);
 if(!batch||typeof batch.batchId!=="string"||!/^[a-zA-Z0-9._:-]{1,120}$/.test(batch.batchId)||!Array.isArray(batch.records)||batch.records.length===0||batch.records.length>10000)
  return invalidReport(state,digest,"BATCH_INVALID","Invalid batch ID or record count (1..10000)");
 const keys=new Set(),types=new Map();
 for(const item of batch.records){
  if(!item||typeof item.candidateId!=="string"||!/^[a-zA-Z0-9._:-]{1,120}$/.test(item.candidateId)||!item.entity||typeof item.entity!=="object"||Array.isArray(item.entity))
   return invalidReport(state,digest,"CANDIDATE_INVALID","Candidate ID or payload invalid");
  if(keys.has(item.candidateId))return invalidReport(state,digest,"DUPLICATE_CANDIDATE_ID",item.candidateId);
  keys.add(item.candidateId);
  const prefix=prefixOf(item);
  if(!validPrefixes.has(prefix))return invalidReport(state,digest,"ENTITY_TYPE_UNKNOWN",item.candidateId);
  if(item.entity._id!==undefined||item.entity.schemaVersion!==undefined)
   return invalidReport(state,digest,"CANONICAL_ID_IN_CANDIDATE","Provide canonical IDs only via persistent mapping");
  if(item.entity.editorialStatus==="verified")return invalidReport(state,digest,"SELF_VERIFICATION_FORBIDDEN",item.candidateId);
  types.set(item.candidateId,prefix);
 }
 const prior=state.batches?.[batch.batchId];
 if(prior)return prior.digest===digest
  ?{state,report:{status:"replayed",digest,batchId:batch.batchId,issues:[],duplicates:[],missingEvidence:[],reviewQueue:[],publicationEligible:false}}
  :invalidReport(state,digest,"CHANGED_BATCH_CONFLICT","Batch ID already processed with another digest");
 if(options.dryRun)return {state,report:{status:"dry-run",digest,batchId:batch.batchId,issues:[],duplicates:[],missingEvidence:[],reviewQueue:batch.records.map(x=>x.candidateId),publicationEligible:false}};
 const next=clone({formatVersion:1,batches:{},mappings:{},records:[],history:[],...state});
 if(next.formatVersion!==1)return invalidReport(state,digest,"STATE_VERSION_INVALID","Unrecognized persistent state format");
 const mapping=new Map();
 for(const item of batch.records){
  const mappingKey=batch.batchId+"#"+item.candidateId;
  if(next.mappings[mappingKey])return invalidReport(state,digest,"MAPPING_COLLISION",mappingKey);
  const id=types.get(item.candidateId)+"_"+uuidv7();
  if(next.records.some(r=>r._id===id))return invalidReport(state,digest,"ID_COLLISION",id);
  mapping.set(item.candidateId,id);
 }
 let created;
 try {created=batch.records.map(item=>({
  ...resolveRefs(item.entity,mapping),_id:mapping.get(item.candidateId),schemaVersion:"2.0.0"
 }));}catch(e){return invalidReport(state,digest,"UNRESOLVED_REFERENCE",e.message);}
 const dataset=[...next.records,...created];
 const validated=validateDatasetV2(dataset);
 if(!validated.valid)return invalidReport(state,digest,"VALIDATION_FAILED","Candidate graph/schema rejected",validated.issues);
 const duplicates=duplicateHints(next.records,created);
 const missingEvidence=created.filter(r=>!["src","evd","rev","dec"].includes(r._id.split("_")[0])&&!(r.evidenceIds?.length)).map(r=>r._id).sort(sort);
 const reviewQueue=created.filter(r=>r.editorialStatus!=="rejected").map(r=>r._id).sort(sort);
 for(const item of batch.records)next.mappings[batch.batchId+"#"+item.candidateId]={canonicalId:mapping.get(item.candidateId),batchId:batch.batchId,contentDigest:sha(item.entity)};
 next.batches[batch.batchId]={digest,recordIds:created.map(r=>r._id),contractVersion:"2.0.0"};
 next.records.push(...created);
 next.history.push({action:"batch_prepared",batchId:batch.batchId,digest,recordIds:created.map(r=>r._id)});
 return {state:next,report:{status:"prepared",batchId:batch.batchId,digest,issues:[],duplicates,missingEvidence,reviewQueue,publicationEligible:false,recordIds:created.map(r=>r._id)}};
}
