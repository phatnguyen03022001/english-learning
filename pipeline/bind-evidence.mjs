import {createHash} from "node:crypto";
import {digest,valueAt} from "../validators/production-gates.mjs";
import {validateDatasetV2} from "../validators/validate-dataset-v2.mjs";

const clone=value=>JSON.parse(JSON.stringify(value));
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail=(state,code,message)=>({state,report:{status:"conflict",issues:[{code,message}],publicationEligible:false}});

// Late evidence association is a single CAS-guarded state transition. Evidence
// records are immutable here; only a draft subject's evidenceIds and revision
// change, with the exact evidence snapshots retained in history.
export function bindEvidence(state,input,options={}){
 const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
 if(!object(state)||state.formatVersion!==1||!Array.isArray(state.records)||!Array.isArray(state.history)||
   (state.evidenceBindings!==undefined&&!object(state.evidenceBindings)))
  return fail(state,"STATE_INVALID","Prepared candidate state is required");
 if(!input||typeof input.bindingId!=="string"||!/^[a-zA-Z0-9._:-]{1,120}$/.test(input.bindingId)||
   typeof input.subjectId!=="string"||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||
   !Array.isArray(input.evidenceIds)||input.evidenceIds.length<1||input.evidenceIds.length>1000)
  return fail(state,"EVIDENCE_BINDING_INVALID","Binding ID, subject, expected revision, and evidence IDs are required");
 const digestInput=hash(input),prior=state.evidenceBindings?.[input.bindingId];
 if(prior)return prior.digest===digestInput
  ?{state,report:{status:"replayed",bindingId:input.bindingId,issues:[],publicationEligible:false}}
  :fail(state,"EVIDENCE_BINDING_ID_CONFLICT","Binding ID already belongs to a different payload");
 if(new Set(input.evidenceIds).size!==input.evidenceIds.length)
  return fail(state,"EVIDENCE_BINDING_DUPLICATE","Evidence IDs must be unique");
 const subject=state.records.find(record=>record._id===input.subjectId);
 if(!subject||["src","evd","rev","dec"].includes(subject._id.split("_")[0]))
  return fail(state,"EVIDENCE_BINDING_SUBJECT_INVALID","Binding subject must be a publishable canonical record");
 if(subject.lifecycleStatus!=="active"||subject.editorialStatus!=="draft")
  return fail(state,"EVIDENCE_BINDING_STATUS_BLOCKED","Evidence may only be bound to active draft records");
 if((subject.revision??1)!==input.expectedRevision)
  return fail(state,"EVIDENCE_BINDING_CAS_CONFLICT","Expected revision does not match current subject revision");
 const byId=new Map(state.records.map(record=>[record._id,record])),evidence=[];
 for(const id of input.evidenceIds){
  const item=byId.get(id);
  if(!item||!id.startsWith("evd_"))return fail(state,"EVIDENCE_BINDING_TARGET_INVALID","Unknown evidence record: "+id);
  if(item.lifecycleStatus!=="active"||item.editorialStatus!=="draft"||!item.claim||item.claim.subjectId!==subject._id||!item.assertionIds?.includes(subject._id))
   return fail(state,"EVIDENCE_BINDING_SUBJECT_MISMATCH","Evidence must be active, draft, and assert the exact subject: "+id);
  const value=valueAt(subject,item.claim.fieldPath);
  if(value===undefined||digest(value)!==item.claim.valueDigest)
   return fail(state,"EVIDENCE_BINDING_CLAIM_MISMATCH","Evidence does not match the current exact claim: "+id);
  if(subject.evidenceIds?.includes(id))return fail(state,"EVIDENCE_BINDING_ALREADY_PRESENT","Evidence is already bound to the subject: "+id);
  evidence.push(item);
 }
 const next=clone(state),before=clone(subject),updated={...clone(subject),evidenceIds:[...(subject.evidenceIds??[]),...input.evidenceIds],revision:input.expectedRevision+1};
 next.records[next.records.findIndex(record=>record._id===subject._id)]=updated;
 const validation=validateDatasetV2(next.records);
 if(!validation.valid)return fail(state,"EVIDENCE_BINDING_INVALID_DATASET",JSON.stringify(validation.issues));
 if(options.dryRun)return {state,report:{status:"dry-run",bindingId:input.bindingId,issues:[],publicationEligible:false}};
 next.evidenceBindings??={};
 next.evidenceBindings[input.bindingId]={digest:digestInput,subjectId:subject._id,evidenceIds:[...input.evidenceIds]};
 next.history.push({action:"evidence_binding",bindingId:input.bindingId,digest:digestInput,before:[before],after:[clone(updated)],evidence:evidence.map(item=>({evidenceId:item._id,subjectId:item.claim.subjectId,fieldPath:item.claim.fieldPath,valueDigest:item.claim.valueDigest}))});
 return {state:next,report:{status:"bound",bindingId:input.bindingId,subjectId:subject._id,evidenceIds:[...input.evidenceIds],issues:[],publicationEligible:false}};
}
