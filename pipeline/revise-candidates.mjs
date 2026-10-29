import {createHash} from "node:crypto";
import {validateDatasetV2} from "../validators/validate-dataset-v2.mjs";
const clone=x=>JSON.parse(JSON.stringify(x));
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const forbidden=new Set(["_id","schemaVersion","language","lemma","pos","entryKind","multiwordKind","homographNumber","entryId","sourceId","targetSenseId","sourceSenseId","lifecycleStatus","retirementMode","retiredByDecisionId","supersededByIds","editorialStatus","createdAt","evidenceIds","revision"]);
const fail=(state,code,message)=>({state,report:{status:"conflict",issues:[{code,message}],publicationEligible:false}});
export function reviseCandidates(state,input,options={}){
 if(!state||state.formatVersion!==1||!Array.isArray(state.records)||!Array.isArray(state.history))
  return fail(state,"STATE_INVALID","A previously prepared state is required");
 if(!input||typeof input.revisionId!=="string"||!/^[a-zA-Z0-9._:-]{1,120}$/.test(input.revisionId)||!Array.isArray(input.changes)||input.changes.length<1||input.changes.length>1000)
  return fail(state,"REVISION_INVALID","Revision ID and bounded changes required");
 const digest=hash(input);
 const prior=state.revisions?.[input.revisionId];
 if(prior)return prior.digest===digest
  ?{state,report:{status:"replayed",revisionId:input.revisionId,issues:[],publicationEligible:false}}
  :fail(state,"REVISION_ID_CONFLICT","Revision ID already belongs to a different payload");
 const current=new Map(state.records.map(r=>[r._id,r]));
 const seen=new Set(),next=clone(state),before=[],after=[];
 for(const change of input.changes){
  if(!change||typeof change.canonicalId!=="string"||!Number.isSafeInteger(change.expectedRevision)||change.expectedRevision<1||!change.set||typeof change.set!=="object"||Array.isArray(change.set))
   return fail(state,"REVISION_CHANGE_INVALID","Invalid revision change");
  if(seen.has(change.canonicalId))return fail(state,"REVISION_DUPLICATE_TARGET",change.canonicalId);
  seen.add(change.canonicalId);
  const old=current.get(change.canonicalId);
  if(!old)return fail(state,"REVISION_TARGET_MISSING",change.canonicalId);
  if(old.lifecycleStatus!=="active"||old.editorialStatus!=="draft")
   return fail(state,"REVISION_STATUS_BLOCKED","Only active draft records can be revised");
  if((old.revision??1)!==change.expectedRevision)return fail(state,"REVISION_CAS_CONFLICT","Expected revision does not match current state");
  const keys=Object.keys(change.set);
  if(keys.length===0||keys.some(k=>forbidden.has(k)||k.startsWith("__")||k==="constructor"||k==="prototype"))
   return fail(state,"REVISION_FIELD_FORBIDDEN","Identity, lifecycle, editorial and audit fields are immutable in draft editor");
  const edited={...clone(old),...clone(change.set),revision:change.expectedRevision+1};
  const index=next.records.findIndex(r=>r._id===change.canonicalId);
  next.records[index]=edited;
  before.push(clone(old));after.push(clone(edited));
 }
 const check=validateDatasetV2(next.records);
 if(!check.valid)return fail(state,"REVISION_INVALID_DATASET",JSON.stringify(check.issues));
 if(options.dryRun)return {state,report:{status:"dry-run",revisionId:input.revisionId,issues:[],publicationEligible:false}};
 next.revisions??={};
 next.revisions[input.revisionId]={digest,recordIds:after.map(r=>r._id)};
 next.history.push({action:"draft_revision",revisionId:input.revisionId,digest,before,after});
 return {state:next,report:{status:"revised",revisionId:input.revisionId,recordIds:after.map(r=>r._id),issues:[],publicationEligible:false}};
}
