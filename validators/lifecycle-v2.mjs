// V2-only lifecycle integrity. Historical authenticity is NOT derivable
// from self-reported hashes; publication requires external review.
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const diag=(code,id,path,message)=>({code,entityId:id,path,message});
export function validateLifecycleV2(records){
 const issues=[],byId=new Map(records.map(r=>[r._id,r]));
 const incoming=new Map();
 for(const r of records){
  const kind=r._id.split("_")[0];
  const fields={rel:["sourceId","targetId"],eqv:["sourceSenseId","targetSenseId"],con:["senseId"],col:["anchorSenseId"]}[kind]??[];
  for(const f of fields)if(typeof r[f]==="string"&&r[f].startsWith("sns_")){
   if(!incoming.has(r[f]))incoming.set(r[f],new Set());
   incoming.get(r[f]).add(r._id);
  }
 }
 for(const decision of records.filter(r=>r._id.startsWith("dec_")&&r.decisionEffect==="lifecycle_transition")){
  const affected=new Set((decision.transitionAudit?.incomingEdges??[]).map(x=>x.edgeId));
  for(const predecessor of decision.previousSenseIds??[]){
   const sense=byId.get(predecessor);
   if(!sense||sense.lifecycleStatus!=="retired"||sense.retiredByDecisionId!==decision._id)
    issues.push(diag("LIFECYCLE_SOURCE_NOT_RETIRED",decision._id,"previousSenseIds","Consumed transition requires a retired predecessor tied to this decision"));
   for(const edgeId of [...(incoming.get(predecessor)??[])].sort(cmp)){
    if(!affected.has(edgeId))issues.push(diag("LIFECYCLE_INCOMING_EDGE_UNRESOLVED",decision._id,"transitionAudit/incomingEdges","Incoming edge "+edgeId+" has no explicit adjudication"));
   }
  }
  const seenEdges=new Set();
  for(const item of decision.transitionAudit?.incomingEdges??[]){
   if(seenEdges.has(item.edgeId))issues.push(diag("LIFECYCLE_EDGE_DUPLICATE",decision._id,"transitionAudit/incomingEdges","Same edge has multiple resolutions"));
   seenEdges.add(item.edgeId);
   if(item.decisionId!==decision._id)issues.push(diag("LIFECYCLE_EDGE_DECISION_MISMATCH",decision._id,"transitionAudit/incomingEdges","Incoming edge references another decision"));
   if(item.resolution==="reattached"&&!item.targetId)issues.push(diag("LIFECYCLE_EDGE_TARGET_MISSING",decision._id,"transitionAudit/incomingEdges","Reattached edge requires explicit target"));
   if(!byId.has(item.edgeId))issues.push(diag("LIFECYCLE_EDGE_HISTORY_MISSING",decision._id,"transitionAudit/incomingEdges","Recorded edge is absent from current snapshot; historical proof is required"));
  }
 }
 // Supersession must not form loops; non-transition retain decisions remain legal.
 for(const start of records.filter(r=>r._id.startsWith("dec_")&&r.supersedesDecisionId)){
  const seen=new Set([start._id]);let cur=start;
  while(cur?.supersedesDecisionId){
   if(seen.has(cur.supersedesDecisionId)){issues.push(diag("DECISION_SUPERSESSION_CYCLE",start._id,"supersedesDecisionId","Decision supersession cycle"));break;}
   seen.add(cur.supersedesDecisionId);cur=byId.get(cur.supersedesDecisionId);
  }
 }
 return issues.sort((a,b)=>cmp(a.entityId,b.entityId)||cmp(a.path,b.path)||cmp(a.code,b.code)||cmp(a.message,b.message));
}
