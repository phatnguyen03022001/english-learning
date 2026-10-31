import {createHash,randomBytes} from "node:crypto";
import {validateDatasetV2} from "../validators/validate-dataset-v2.mjs";
import {digest as claimDigest,valueAt} from "../validators/production-gates.mjs";
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
const entityProjection=x=>Object.fromEntries(Object.entries(x).filter(([key])=>
 !["_id","schemaVersion","revision","createdAt","updatedAt"].includes(key)));
function validateCandidateEvidence(batch,state){
 const candidates=new Map(batch.records.map(item=>[item.candidateId,item.entity]));
 const existing=new Map((state.records??[]).map(record=>[record._id,record]));
 for(const item of batch.records){
  if((item.type??prefixOf(item))!=="evd"||!item.entity.claim)continue;
  const evidence=item.entity,claim=evidence.claim,subjectRef=claim.subjectId;
  if(!Array.isArray(evidence.assertionIds)||!evidence.assertionIds.includes(subjectRef))
   return {code:"EVIDENCE_SUBJECT_MISMATCH",message:"Evidence claim subject must appear in assertionIds: "+item.candidateId};
  let subject;
  if(typeof subjectRef==="string"&&subjectRef.startsWith("candidate:"))
   subject=candidates.get(subjectRef.slice("candidate:".length));
  else subject=existing.get(subjectRef);
  if(!subject)return {code:"EVIDENCE_SUBJECT_NOT_FOUND",message:"Evidence claim subject is not available: "+subjectRef};
  const value=valueAt(subject,claim.fieldPath);
  if(value===undefined)return {code:"EVIDENCE_PATH_MISMATCH",message:"Evidence claim path is absent: "+claim.fieldPath};
  if(claimDigest(value)!==claim.valueDigest)
   return {code:"EVIDENCE_SOURCE_DIGEST_MISMATCH",message:"Evidence digest does not match the candidate's source value: "+item.candidateId};
 }
 return null;
}
function duplicateHints(existing,newRecords){
 const hints=[];
 const keys=new Map();
 for(const records of [existing,newRecords]){
  for(const r of records){
   if(r._id.startsWith("lex_")){
    const key=JSON.stringify([r.language,r.lemma.normalize("NFC"),r.pos,r.entryKind]);
    if(keys.has(key)&&keys.get(key)!==r._id)hints.push({kind:"possible_homograph_or_duplicate",existingId:keys.get(key),candidateId:r._id,lemma:r.lemma});
    else keys.set(key,r._id);
   }
  }
 }
 return hints.sort((a,b)=>sort(a.candidateId,b.candidateId));
}
// Pure preparation. Only the CLI persists a single atomic state snapshot.
// A batch ID is immutable: changed input requires a new batch ID plus review.
export function prepareBatch(batch,state={},options={}) {
 // Normalize lexical identity text to NFC, not quoted source attestations.
 // Equivalent Unicode spellings replay the same batch without altering meaning.
 if(batch&&Array.isArray(batch.records))batch={...batch,records:batch.records.map(item=>{
  if(!item?.entity||typeof item.entity!=="object"||Array.isArray(item.entity))return item;
  const entity={...item.entity};
  for(const field of ["lemma","form"])if(typeof entity[field]==="string")entity[field]=entity[field].normalize("NFC");
  return {...item,entity};
 })};
 const digest=sha(batch);
 if(!batch||typeof batch.batchId!=="string"||!/^[a-zA-Z0-9._:-]{1,120}$/.test(batch.batchId)||!Array.isArray(batch.records)||batch.records.length===0||batch.records.length>10000)
  return invalidReport(state,digest,"BATCH_INVALID","Invalid batch ID or record count (1..10000)");
 const keys=new Set(),sourceKeys=new Set(),types=new Map();
 if(batch.supersedesBatchId!==undefined&&
   (typeof batch.supersedesBatchId!=="string"||!/^[a-zA-Z0-9._:-]{1,120}$/.test(batch.supersedesBatchId)))
  return invalidReport(state,digest,"SUPERSEDES_BATCH_INVALID","Invalid superseded batch ID");
 for(const item of batch.records){
  if(!item||typeof item.candidateId!=="string"||!/^[a-zA-Z0-9._:-]{1,120}$/.test(item.candidateId)||!item.entity||typeof item.entity!=="object"||Array.isArray(item.entity))
   return invalidReport(state,digest,"CANDIDATE_INVALID","Candidate ID or payload invalid");
  if(keys.has(item.candidateId))return invalidReport(state,digest,"DUPLICATE_CANDIDATE_ID",item.candidateId);
  keys.add(item.candidateId);
  if(item.sourceItemKey!==undefined){
   if(typeof item.sourceItemKey!=="string"||!/^[a-zA-Z0-9._:/-]{1,240}$/.test(item.sourceItemKey))
    return invalidReport(state,digest,"SOURCE_KEY_INVALID",item.candidateId);
   if(sourceKeys.has(item.sourceItemKey))
    return invalidReport(state,digest,"DUPLICATE_SOURCE_ITEM_KEY",item.sourceItemKey);
   sourceKeys.add(item.sourceItemKey);
  }
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
 const next=clone({formatVersion:1,batches:{},mappings:{},sourceMappings:{},records:[],history:[],...state});
 if(next.formatVersion!==1)return invalidReport(state,digest,"STATE_VERSION_INVALID","Unrecognized persistent state format");
 const evidenceError=validateCandidateEvidence(batch,next);
 if(evidenceError)return invalidReport(state,digest,evidenceError.code,evidenceError.message);
 const mapping=new Map(),reused=new Set(),knownIds=new Set(next.records.map(r=>r._id));
 for(const item of batch.records){
  const mappingKey=batch.batchId+"#"+item.candidateId;
  if(next.mappings[mappingKey])return invalidReport(state,digest,"MAPPING_COLLISION",mappingKey);
  const known=item.sourceItemKey&&next.sourceMappings[item.sourceItemKey];
  const priorMapping=batch.supersedesBatchId&&next.mappings[batch.supersedesBatchId+"#"+item.candidateId];
  if(known){
   if(priorMapping&&priorMapping.canonicalId!==known.canonicalId)
    return invalidReport(state,digest,"IDENTITY_MAPPING_CONFLICT","Source-item and superseded-batch mappings identify different canonical records: "+item.candidateId);
   if(known.contentDigest!==sha(item.entity)||!known.canonicalId.startsWith(types.get(item.candidateId)+"_"))
    return invalidReport(state,digest,"SOURCE_ITEM_CHANGED","Existing source item changed; explicit revision required: "+item.sourceItemKey);
   if(!knownIds.has(known.canonicalId))return invalidReport(state,digest,"SOURCE_MAPPING_DANGLING",item.sourceItemKey);
   mapping.set(item.candidateId,known.canonicalId);
   reused.add(item.candidateId);
   continue;
  }
  if(priorMapping){
   if(!priorMapping.canonicalId?.startsWith(types.get(item.candidateId)+"_")||!knownIds.has(priorMapping.canonicalId))
    return invalidReport(state,digest,"SUPERSEDED_MAPPING_INVALID","Superseded candidate mapping is missing or has the wrong entity type: "+item.candidateId);
   mapping.set(item.candidateId,priorMapping.canonicalId);
   reused.add(item.candidateId);
   continue;
  }
  // Preview IDs are deterministic ephemeral placeholders, never persisted.
  const h=createHash("sha256").update(digest+"#"+item.candidateId).digest("hex");
  const preview=h.slice(0,8)+"-"+h.slice(8,12)+"-7"+h.slice(12,15)+"-8"+h.slice(15,18)+"-"+h.slice(18,30);
  const id=types.get(item.candidateId)+"_"+(options.dryRun?preview:uuidv7());
  if(knownIds.has(id))return invalidReport(state,digest,"ID_COLLISION",id);
  knownIds.add(id);
  mapping.set(item.candidateId,id);
 }
 const canonicalOwners=new Map();
 for(const item of batch.records){
  const id=mapping.get(item.candidateId),owner=canonicalOwners.get(id);
  if(owner&&owner!==item.candidateId)
   return invalidReport(state,digest,"CANONICAL_ID_REUSED_IN_BATCH","Multiple candidate IDs map to one canonical identity: "+owner+" / "+item.candidateId);
  canonicalOwners.set(id,item.candidateId);
 }
 let materialized;
 try {materialized=batch.records.map(item=>{
  const entity=resolveRefs(item.entity,mapping);
  if(entity.relationType&&["SYNONYM_OF","NEAR_SYNONYM_OF","ANTONYM_OF"].includes(entity.relationType)&&
    entity.sourceId>entity.targetId)[entity.sourceId,entity.targetId]=[entity.targetId,entity.sourceId];
  return {...entity,_id:mapping.get(item.candidateId),schemaVersion:"2.0.0"};
 });}catch(e){return invalidReport(state,digest,"UNRESOLVED_REFERENCE",e.message);}
 const materializedById=new Map([...next.records,...materialized].map(record=>[record._id,record]));
 for(const record of materialized.filter(record=>record._id.startsWith("evd_")&&record.claim)){
  if(!record.assertionIds.includes(record.claim.subjectId))
   return invalidReport(state,digest,"EVIDENCE_SUBJECT_MISMATCH","Resolved evidence claim subject is not asserted: "+record._id);
  const subject=materializedById.get(record.claim.subjectId);
  if(!subject)return invalidReport(state,digest,"EVIDENCE_SUBJECT_NOT_FOUND","Resolved evidence claim subject is unavailable: "+record.claim.subjectId);
  const value=valueAt(subject,record.claim.fieldPath);
  if(value===undefined)return invalidReport(state,digest,"EVIDENCE_PATH_MISMATCH","Resolved evidence claim path is absent: "+record.claim.fieldPath);
  record.claim.valueDigest=claimDigest(value);
 }
 const byExistingId=new Map(next.records.map(record=>[record._id,record]));
 for(const item of batch.records){
  if(!reused.has(item.candidateId))continue;
  const requested=materializedById.get(mapping.get(item.candidateId)),existing=byExistingId.get(mapping.get(item.candidateId));
  if(!existing||sha(entityProjection(requested))!==sha(entityProjection(existing)))
   return invalidReport(state,digest,"BATCH_REVISION_REQUIRED","Existing candidate changed; apply a CAS draft revision before preparing the replacement batch: "+item.candidateId);
 }
 const reusedIds=new Set([...reused].map(candidateId=>mapping.get(candidateId)));
 const created=materialized.filter(record=>!reusedIds.has(record._id));
 const dataset=[...next.records,...created];
 // Candidate preparation needs the full publication decision but never returns
 // publication diagnostics; count every issue while avoiding an unused list.
 const validated=validateDatasetV2(dataset,{publicationIssueLimit:0});
 if(!validated.valid)return invalidReport(state,digest,"VALIDATION_FAILED","Candidate graph/schema rejected",validated.issues);
 const duplicates=duplicateHints(next.records,created);
 const missingEvidence=materialized.filter(r=>!["src","evd","rev","dec"].includes(r._id.split("_")[0])&&!(r.evidenceIds?.length)).map(r=>r._id).sort(sort);
 const reviewQueue=materialized.filter(r=>r.editorialStatus!=="rejected").map(r=>r._id).sort(sort);
 if(options.dryRun)return {state,report:{status:"dry-run",batchId:batch.batchId,digest,issues:[],duplicates:duplicates.map(d=>({...d,candidateId:"preview",existingId:"preview"})),missingEvidence:missingEvidence.map(()=>"pending_identity"),reviewQueue:batch.records.map(x=>x.candidateId),publicationEligible:false}};
 for(const item of batch.records){
  next.mappings[batch.batchId+"#"+item.candidateId]={canonicalId:mapping.get(item.candidateId),batchId:batch.batchId,contentDigest:sha(item.entity)};
  if(item.sourceItemKey&&!next.sourceMappings[item.sourceItemKey])
   next.sourceMappings[item.sourceItemKey]={canonicalId:mapping.get(item.candidateId),contentDigest:sha(item.entity),firstBatchId:batch.batchId};
 }
 next.batches[batch.batchId]={digest,recordIds:batch.records.map(item=>mapping.get(item.candidateId)),contractVersion:"2.0.0",...(batch.supersedesBatchId?{supersedesBatchId:batch.supersedesBatchId}:{})};
 next.records.push(...created);
 next.history.push({action:"batch_prepared",batchId:batch.batchId,digest,recordIds:batch.records.map(item=>mapping.get(item.candidateId)),createdRecordIds:created.map(r=>r._id)});
 return {state:next,report:{status:"prepared",batchId:batch.batchId,digest,issues:[],duplicates,missingEvidence,reviewQueue,publicationEligible:false,recordIds:batch.records.map(item=>mapping.get(item.candidateId)),reusedCount:reused.size}};
}
