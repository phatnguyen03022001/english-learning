import {createHash} from "node:crypto";
import {validateDatasetV2} from "../validators/validate-dataset-v2.mjs";
import {evaluatePublication} from "../validators/production-gates.mjs";
const clone=x=>JSON.parse(JSON.stringify(x));
const sha=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const result=(state,status,issues=[],extra={})=>({state,report:{status,issues,publicationEligible:false,...extra}});
// Engineering transition only: every intended verified assertion must be
// supported by externally authenticated appointments, evidence and rights.
// The stock CLI passes no trust callbacks and can NEVER self-approve.
export function promoteCandidates(state,input,options={}){
 if(!state||state.formatVersion!==1||!Array.isArray(state.records)||!Array.isArray(state.history))
  return result(state,"conflict",[{code:"STATE_INVALID",message:"Prepared ledger required"}]);
 if(!input||typeof input.promotionId!=="string"||!/^[a-zA-Z0-9._:-]{1,120}$/.test(input.promotionId)||!Array.isArray(input.subjects)||!input.subjects.length||input.subjects.length>1000)
  return result(state,"conflict",[{code:"PROMOTION_INVALID",message:"Promotion ID and bounded subject selection required"}]);
 const hash=sha(input),prior=state.promotions?.[input.promotionId];
 if(prior)return prior.digest===hash?result(state,"replayed",[],{promotionId:input.promotionId}):
  result(state,"conflict",[{code:"PROMOTION_ID_CONFLICT",message:"Promotion ID reused with different payload"}]);
 const seen=new Set(),before=[],after=[],next=clone(state),byId=new Map(state.records.map(r=>[r._id,r]));
 for(const subject of input.subjects){
  const id=subject?.canonicalId;
  if(typeof id!=="string"||seen.has(id)||!Number.isSafeInteger(subject.expectedRevision)||subject.expectedRevision<1)
   return result(state,"conflict",[{code:"PROMOTION_SUBJECT_INVALID",message:"Invalid or duplicate subject"}]);
  seen.add(id);
  const old=byId.get(id);
  if(!old||["src","evd","rev","dec"].includes(id.split("_")[0]))
   return result(state,"conflict",[{code:"PROMOTION_TARGET_INVALID",message:"Unknown or non-lexical subject"}]);
  if((old.revision??1)!==subject.expectedRevision)
   return result(state,"conflict",[{code:"PROMOTION_CAS_CONFLICT",message:"Stale expected revision for "+id}]);
  if(old.lifecycleStatus!=="active"||old.editorialStatus!=="draft")
   return result(state,"blocked",[{code:"PROMOTION_STATUS_BLOCKED",message:"Only active draft subjects can be considered"}]);
  before.push(clone(old));
  const candidate={...clone(old),editorialStatus:"verified",revision:subject.expectedRevision+1};
  next.records[next.records.findIndex(x=>x._id===id)]=candidate;
  after.push(clone(candidate));
 }
 const schema=validateDatasetV2(next);
 if(!schema.valid)return result(state,"blocked",schema.issues);
 const trust={...options,subjectIds:input.subjects.map(s=>s.canonicalId)};
 const publication=evaluatePublication(next.records,trust);
 if(!publication.eligible)return result(state,"blocked",publication.issues);
 if(options.dryRun)return result(state,"dry-run",[],{publicationEligible:true,promotionId:input.promotionId,subjectIds:trust.subjectIds});
 next.promotions??={};
 next.promotions[input.promotionId]={digest:hash,subjectIds:trust.subjectIds};
 next.history.push({action:"promotion",promotionId:input.promotionId,digest:hash,before,after});
 return result(next,"promoted",[],{publicationEligible:true,promotionId:input.promotionId,subjectIds:trust.subjectIds});
}
