import {createHash} from "node:crypto";
import {validateGraph} from "./graph-v1.mjs";

const cmp=(a,b)=>a<b?-1:a>b?1:0;
const sort=(a,b)=>cmp(a.entityId,b.entityId)||cmp(a.path,b.path)||cmp(a.code,b.code)||cmp(a.message,b.message);
// A publication decision covers every asserted learner-facing claim, not
// merely one convenient evidence reference on a record.
export function publicationClaimPaths(record){
 const type=record._id.split("_")[0],paths=[];
 const add=(field)=>{if(Object.hasOwn(record,field))paths.push("/"+field);};
 const nested=(field)=>{
  if(record[field]&&typeof record[field]==="object")for(const key of Object.keys(record[field]).sort())paths.push("/"+field+"/"+key);
 };
 if(type==="lex"){add("lemma");add("pos");}
 else if(type==="sns"){
  add("definition");add("register");add("domain");nested("grammar");
  for(const [i,x]of (record.usageRestrictions??[]).entries())if(x.description)paths.push("/usageRestrictions/"+i+"/description");
  for(const [i,x]of (record.contrastiveNotes??[]).entries())if(x.text)paths.push("/contrastiveNotes/"+i+"/text");
  for(const [i,x]of (record.examples??[]).entries()){if(x.english)paths.push("/examples/"+i+"/english");if(x.vi)paths.push("/examples/"+i+"/vi");}
 }else if(type==="eqv"){
  add("sourceSenseId");add(record.alignmentMode==="gloss_only"?"glossVi":"targetSenseId");add("equivalenceType");add("context");add("register");
 }else if(type==="con"){add("pattern");add("prepositions");add("complements");nested("grammar");}
 else if(type==="rel"){add("relationType");add("sourceId");add("targetId");nested("qualifiers");}
 else if(type==="col"){add("anchorSenseId");add("pattern");add("components");add("context");}
 else if(type==="frm"){add("form");add("ipa");add("stress");}
 else if(type==="fam")add("familyBasis");
 else if(type==="top")add("label");
 else if(type==="mrf"){add("form");add("morphologicalRole");}
 else if(type==="ety")add("historicalForm");
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
 const published=records.filter(r=>!["src","evd","rev","dec"].includes(r._id?.split("_")[0]));
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
 const authorize=(reviewerId,role,reference,subjectId)=>{
  if(typeof options.isAuthorized!=="function")return false;
  try{return options.isAuthorized({reviewerId,role,appointmentReference:reference,subjectId})===true;}catch{return false;}
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
   ev.independence==="independent_reviewed"&&ev.lifecycleStatus==="active");
  if(evidence.length===0)add("CLAIM_EVIDENCE_INSUFFICIENT",id,"evidenceIds","No independent exact claim-level attestation");
  if(!evidence.some(ev=>rights(byId.get(ev.sourceId),options.usageScope??"dictionary_publication")))
   add("SOURCE_RIGHTS_UNVERIFIED",id,"evidenceIds","No authenticated rights approval for intended reuse");
  const reviews=(reviewBySubject.get(id)??[]).filter(item=>
   // Subject-only reviews are not claim-specific. Exact field path matters.
   evidence.some(ev=>ev.claim.fieldPath===item.fieldPath)&&
   item.review.subjectIds?.includes(id)&&
   authorize(item.review.reviewerId,item.review.role,item.review.appointmentReference,id));
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
  if(record._id.startsWith("eqv_")&&record.alignmentMode==="sense_aligned"){
   for(const senseId of [record.sourceSenseId,record.targetSenseId]){
    const sense=byId.get(senseId);
    if(!sense||sense.editorialStatus!=="verified")add("BILINGUAL_ENDPOINT_UNVERIFIED",id,"targetSenseId","Aligned senses require independent review");
   }
   if(record.translationEvidenceStatus!=="independently_reviewed")add("TRANSLATION_UNREVIEWED",id,"translationEvidenceStatus","Bilingual fidelity lacks reviewed evidence");
  }
 }
 for(const sense of records.filter(r=>r._id?.startsWith("sns_"))){
  for(const [i,ex] of (sense.examples??[]).entries()){
   if(ex.editorialStatus==="verified"&&(!ex.evidenceIds?.length||ex.exampleType==="synthetic_test"||ex.exampleType==="unverified_candidate"))
    add("EXAMPLE_EVIDENCE_MISSING",sense._id,"examples/"+i,"Example provenance not sufficient for independent verification");
   if(ex.vi&&ex.translationEvidenceStatus!=="independently_reviewed")
    add("EXAMPLE_TRANSLATION_UNREVIEWED",sense._id,"examples/"+i+"/vi","Translation has no independent approval");
  }
 }
 for(const d of records.filter(r=>r._id?.startsWith("dec_")&&r.decisionEffect==="lifecycle_transition")){
  if(!d.transitionAudit?.incomingEdges)add("LIFECYCLE_AUDIT_INCOMPLETE",d._id,"transitionAudit","Historical edge adjudication required");
  if(!authorize(d.reviewerId,"lead_editorial",d.appointmentReference,d.subjectIds?.[0]))
   add("LIFECYCLE_AUTHORITY_UNVERIFIED",d._id,"reviewerId","Decision appointment not authenticated");
 }
 issues.sort(sort);
 return {eligible:issues.length===0,issues};
}
