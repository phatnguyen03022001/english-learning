import {createHash} from "node:crypto";
import {validateGraph} from "./graph-v1.mjs";
import {verifyReviewerAppointment} from "./authority-v2.mjs";

const cmp=(a,b)=>a<b?-1:a>b?1:0;
const sort=(a,b)=>cmp(a.entityId,b.entityId)||cmp(a.path,b.path)||cmp(a.code,b.code)||cmp(a.message,b.message);
// A publication decision covers every asserted learner-facing claim, not
// merely one convenient evidence reference on a record.
export function publicationClaimPaths(record){
 const type=record._id.split("_")[0],paths=[];
 const add=field=>{if(Object.hasOwn(record,field))paths.push("/"+field);};
 const addAll=fields=>fields.forEach(add);
 const nested=field=>{
  if(record[field]&&typeof record[field]==="object")
   for(const key of Object.keys(record[field]).sort())paths.push("/"+field+"/"+key);
 };
 const items=(field,keys)=>{
  for(const [i,item] of (record[field]??[]).entries()){
   if(keys){
    for(const key of keys)if(item&&Object.hasOwn(item,key))paths.push("/"+field+"/"+i+"/"+key);
   }else if(item!==undefined)paths.push("/"+field+"/"+i);
  }
 };
 if(type==="lex")addAll(["language","lemma","pos","entryKind","multiwordKind","familyIds","homographNumber"]);
 else if(type==="sns"){
  addAll(["entryId","definition","topicIds","register","usageNote","domain","constructionIds"]);
  nested("grammar");
  items("usageRestrictions",["kind","description"]);
  items("contrastiveNotes",["language","text"]);
  items("examples",["english","exampleType","vi","register","variety"]);
 }else if(type==="eqv"){
  addAll(["sourceSenseId","targetSenseId","glossVi","direction","alignmentMode","equivalenceType","context","register"]);
  items("restrictions");
 }else if(type==="con"){
  addAll(["senseId","constructionType","pattern","prepositions","complements","separable"]);
  items("constraints");nested("grammar");
 }else if(type==="rel"){
  addAll(["relationType","sourceId","targetId"]);nested("qualifiers");
 }else if(type==="col")addAll(["anchorSenseId","pattern","components","context"]);
 else if(type==="frm")addAll(["entryId","form","locale","ipa","stress","pronunciationVariety"]);
 else if(type==="fam")addAll(["familyBasis","label"]);
 else if(type==="top")addAll(["label","parentTopicId"]);
 else if(type==="mrf")addAll(["form","morphologicalRole","language"]);
 else if(type==="ety")addAll(["entryId","historicalForm","sourceLanguage","notes"]);
 return [...new Set(paths)].sort(cmp);
}
export const digest = value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function valueAt(record,path){
 if(typeof path!=="string"||!path.startsWith("/")||path==="/")return undefined;
 let v=record;
 for(const part of path.slice(1).split("/")){
  const key=part.replace(/~1/g,"/").replace(/~0/g,"~");
  if(!v||typeof v!=="object"||!Object.hasOwn(v,key))return undefined;
  v=v[key];
 }
 return v;
}
// The authenticated trust callbacks MUST be provided by an independently
// verified owner-appointment/rights process. JSON metadata is not authority.
export function evaluatePublication(records, options={}) {
 const issues=[],byId=new Map(records.map(r=>[r._id,r]));
 const add=(code,id,path,message)=>issues.push({code,entityId:id,path,message});
 const graph=validateGraph(records);
 for(const i of graph.issues)add(i.code,i.entityId,i.path,i.message);

 const publishable=r=>!["src","evd","rev","dec"].includes(r._id?.split("_")[0]);
 const selectedIds=new Set();
 const constructionsBySense=new Map();
 for(const construction of records.filter(r=>r._id?.startsWith("con_")&&r.senseId)){
  if(!constructionsBySense.has(construction.senseId))constructionsBySense.set(construction.senseId,[]);
  constructionsBySense.get(construction.senseId).push(construction._id);
 }
 if(options.subjectIds!==undefined){
  if(!Array.isArray(options.subjectIds))add("PUBLICATION_SCOPE_INVALID","","subjectIds","Subject scope must be an array");
  const stack=Array.isArray(options.subjectIds)?[...options.subjectIds]:[];
  while(stack.length){
   const id=stack.pop(),r=byId.get(id);
   if(!r){add("PUBLICATION_SUBJECT_NOT_FOUND",String(id),"subjectIds","Unknown publication subject");continue;}
   if(selectedIds.has(id))continue;
   selectedIds.add(id);
   const kind=r._id?.split("_")[0],refs=[];
   if(kind==="sns"||kind==="frm"||kind==="ety")refs.push(r.entryId);
   if(kind==="con")refs.push(r.senseId);
   if(kind==="col")refs.push(r.anchorSenseId);
   if(kind==="eqv")refs.push(r.sourceSenseId,r.targetSenseId);
   if(kind==="rel")refs.push(r.sourceId,r.targetId);
   if(kind==="lex")refs.push(...(r.familyIds??[]));
   if(kind==="sns")refs.push(...(r.topicIds??[]),...(r.constructionIds??[]),...(constructionsBySense.get(r._id)??[]));
   for(const ref of refs)if(ref)stack.push(ref);
  }
 }else for(const r of records)if(publishable(r))selectedIds.add(r._id);
 const published=records.filter(r=>publishable(r)&&selectedIds.has(r._id));
 if(!published.length)add("NO_PUBLISHABLE_CLAIMS","","records","Nothing is eligible for publication");
 const reviewBySubject=new Map(), evidenceBySubject=new Map();
 for(const r of records){
  if(r._id?.startsWith("rev_")&&r.lifecycleStatus==="active"&&r.outcome==="accepted"){
   for(const claim of r.claims??[]) {
    if(!reviewBySubject.has(claim.subjectId))reviewBySubject.set(claim.subjectId,[]);
    reviewBySubject.get(claim.subjectId).push({...claim,review:r});
   }
  }
  if(r._id?.startsWith("evd_")&&r.claim){
   if(!evidenceBySubject.has(r.claim.subjectId))evidenceBySubject.set(r.claim.subjectId,[]);
   evidenceBySubject.get(r.claim.subjectId).push(r);
  }
 }
 const authorize=(reviewerId,role,reference,subjectId,fieldPath)=>
  verifyReviewerAppointment(options,{reviewerId,role,appointmentReference:reference,subjectId,fieldPath});
 const attest=(e,subject)=>{
  if(typeof options.verifyEvidence!=="function")return false;
  try{return options.verifyEvidence({evidence:e,subject,source:byId.get(e.sourceId)})===true;}catch{return false;}
 };
 const rights=(source,scope)=>{
  const r=source?.rights;
  if(!r||r.status!=="redistributable"||!r.scopes?.includes(scope)||r.revokedAt||!r.reviewerId)return false;
  // Eligibility is deterministic given explicit assessment time.
  // Missing time context cannot establish that expiring permission remains valid.
  if(r.expiresAt&&(!options.effectiveAt||Date.parse(r.expiresAt)<=Date.parse(options.effectiveAt)))return false;
  if(!authorize(r.reviewerId,"rights",r.permissionReference,source._id))return false;
  if(typeof options.verifyRights!=="function")return false;
  try{return options.verifyRights({source,scope})===true;}catch{return false;}
 };
 for(const record of published){
  const id=record._id;
  if(record.lifecycleStatus!=="active")add("RETIRED_PUBLICATION_BLOCKED",id,"lifecycleStatus","Retired claim cannot be published");
  if(record.editorialStatus!=="verified")add(record.editorialStatus==="disputed"?"DISPUTED_PUBLICATION_BLOCKED":"PUBLICATION_NOT_VERIFIED",id,"editorialStatus","Editorial status is not verified");
  const evidence=(evidenceBySubject.get(id)??[]).filter(ev=>
   record.evidenceIds?.includes(ev._id)&&ev.assertionIds?.includes(id)&&
   ev.claim&&valueAt(record,ev.claim.fieldPath)!==undefined&&
   digest(valueAt(record,ev.claim.fieldPath))===ev.claim.valueDigest&&
   ev.claim.specificity==="exact_value"&&ev.reviewStatus==="accepted"&&
   ev.independence==="independent_reviewed"&&ev.lifecycleStatus==="active"&&attest(ev,record));
  if(evidence.length===0)add("CLAIM_EVIDENCE_INSUFFICIENT",id,"evidenceIds","No independent exact claim-level attestation");
  if(!evidence.some(ev=>rights(byId.get(ev.sourceId),options.usageScope??"dictionary_publication")))
   add("SOURCE_RIGHTS_UNVERIFIED",id,"evidenceIds","No authenticated rights approval for intended reuse");
  const reviews=(reviewBySubject.get(id)??[]).filter(item=>{
   // A historical decision remains auditable after a claim changes, but only
   // its exact reviewed value can authorize the current assertion.
   const currentValue=valueAt(byId.get(item.subjectId),item.fieldPath);
   return currentValue!==undefined&&
    evidence.some(ev=>ev.claim.fieldPath===item.fieldPath&&ev.claim.valueDigest===item.valueDigest)&&
    item.valueDigest===digest(currentValue)&&
    item.review.subjectIds?.includes(id)&&
    authorize(item.review.reviewerId,item.review.role,item.review.appointmentReference,id,item.fieldPath);
  });
  if(!reviews.length)add("REVIEW_SCOPE_MISSING",id,"editorialStatus","No authorized accepted claim-specific review");
  if(!reviews.some(x=>x.review.role==="lead_editorial"))
   add("LER_AUTHORITY_UNVERIFIED",id,"editorialStatus","No independently authenticated scoped LER appointment");
  const specialty=id.startsWith("eqv_")?"bilingual":id.startsWith("con_")||reviews.some(x=>x.fieldPath.startsWith("/grammar"))?"grammar":"linguistic";
  if(!reviews.some(x=>x.review.role===specialty||x.review.role==="lead_editorial"))
   add("SPECIALIST_REVIEW_MISSING",id,"editorialStatus","No authorized review with appropriate lexical scope");
  for(const path of publicationClaimPaths(record)){
   const matching=evidence.filter(ev=>ev.claim.fieldPath===path&&rights(byId.get(ev.sourceId),options.usageScope??"dictionary_publication"));
   const reviewed=reviews.some(item=>item.fieldPath===path&&item.review.role==="lead_editorial");
   if(!matching.length||!reviewed)
    add("CLAIM_PATH_UNVERIFIED",id,path,"Exact learner assertion lacks authorized claim-specific evidence or review");
  }
  if(record._id.startsWith("eqv_")){
   const source=byId.get(record.sourceSenseId);
   if(!source||!source._id?.startsWith("sns_")||source.editorialStatus!=="verified")
    add("BILINGUAL_ENDPOINT_UNVERIFIED",id,"sourceSenseId","Source English sense must exist and be verified");
   if(record.alignmentMode==="sense_aligned"){
    const target=byId.get(record.targetSenseId);
    if(!target||!target._id?.startsWith("sns_")||target.editorialStatus!=="verified")
     add("BILINGUAL_ENDPOINT_UNVERIFIED",id,"targetSenseId","Aligned target sense must exist and be verified");
   }
   if(record.translationEvidenceStatus!=="independently_reviewed")add("TRANSLATION_UNREVIEWED",id,"translationEvidenceStatus","Bilingual fidelity lacks reviewed evidence");
  }
 }
 for(const sense of records.filter(r=>r._id?.startsWith("sns_")&&selectedIds.has(r._id))){
  for(const [i,ex] of (sense.examples??[]).entries()){
   if(ex.editorialStatus==="verified"&&(!ex.evidenceIds?.length||ex.exampleType==="synthetic_test"||ex.exampleType==="unverified_candidate"))
    add("EXAMPLE_EVIDENCE_MISSING",sense._id,"examples/"+i,"Example provenance not sufficient for independent verification");
   if(ex.vi&&ex.translationEvidenceStatus!=="independently_reviewed")
    add("EXAMPLE_TRANSLATION_UNREVIEWED",sense._id,"examples/"+i+"/vi","Translation has no independent approval");
  }
 }
 for(const d of records.filter(r=>r._id?.startsWith("dec_")&&r.decisionEffect==="lifecycle_transition"&&r.subjectIds?.some(id=>selectedIds.has(id)))){
  if(!d.transitionAudit?.incomingEdges)add("LIFECYCLE_AUDIT_INCOMPLETE",d._id,"transitionAudit","Historical edge adjudication required");
  if(!authorize(d.reviewerId,"lead_editorial",d.appointmentReference,d.subjectIds?.[0]))
   add("LIFECYCLE_AUTHORITY_UNVERIFIED",d._id,"reviewerId","Decision appointment not authenticated");
 }
 issues.sort(sort);
 return {eligible:issues.length===0,issues};
}
