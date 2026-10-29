// Human quality cannot be inferred from storage/schema or an LLM score.
// An external, genuinely authenticated reviewer must attest each axis.
export const QUALITY_DIMENSIONS=Object.freeze([
 "sense_boundary_accuracy","translation_fidelity","grammar_accuracy",
 "idiomaticity","collocation_validity","learner_usefulness",
 "evidence_sufficiency","license_compliance"
]);
const compare=(a,b)=>a<b?-1:a>b?1:0;
export function assessGoldenQA(benchmark,submissions=[],options={}){
 const issues=[],results=[];
 if(!benchmark||!Array.isArray(benchmark.families)||!Array.isArray(submissions))
  return {qualityAcceptedCount:0,pendingCount:0,qualityRejectedCount:0,publicationApprovedCount:0,results:[],issues:[{code:"GOLDEN_QA_INPUT_INVALID",caseId:""}]};
 const byCase=new Map();
 for(const s of submissions){
  if(!s||typeof s.caseId!=="string")continue;
  if(byCase.has(s.caseId))issues.push({code:"GOLDEN_QA_DUPLICATE_SUBMISSION",caseId:s.caseId});
  else byCase.set(s.caseId,s);
 }
 const expected=new Set(benchmark.families.map(f=>f.pilotFile.replace(/\.json$/,"")));
 for(const id of byCase.keys())if(!expected.has(id))issues.push({code:"GOLDEN_QA_UNKNOWN_FAMILY",caseId:id});
 for(const family of benchmark.families){
  const caseId=family.pilotFile.replace(/\.json$/,""),submission=byCase.get(caseId);
  let status="pending";
  if(submission){
   const answers=submission.dimensions??{};
   const outcomes=QUALITY_DIMENSIONS.map(dim=>answers[dim]);
   if(outcomes.some(x=>x==="fail"||x==="disputed"||x==="rejected")){
    issues.push({code:"GOLDEN_QA_REJECTED",caseId});status="rejected";
   }else if(outcomes.some(x=>x!=="pass")||typeof submission.reviewerId!=="string"||
      !submission.authorityReference||!Array.isArray(submission.evidenceReferences)||!submission.evidenceReferences.length){
    issues.push({code:"GOLDEN_QA_INCOMPLETE",caseId});
   }else{
    let trusted=typeof options.verifyIndependentReview==="function"&&
      typeof options.verifyRights==="function";
    if(trusted){
     for(const dimension of QUALITY_DIMENSIONS){
      try{
       if(options.verifyIndependentReview({family,submission,dimension})!==true){trusted=false;break;}
      }catch{trusted=false;break;}
     }
     if(trusted){
      try{trusted=options.verifyRights({family,submission})===true;}catch{trusted=false;}
     }
    }
    if(trusted)status="independently_reviewed";
    else issues.push({code:"GOLDEN_QA_AUTHORITY_UNVERIFIED",caseId});
   }
  }
  results.push({caseId,status,publicationEligible:false});
 }
 issues.sort((a,b)=>compare(a.caseId,b.caseId)||compare(a.code,b.code));
 return {qualityAcceptedCount:results.filter(x=>x.status==="independently_reviewed").length,
  pendingCount:results.filter(x=>x.status==="pending").length,
  qualityRejectedCount:results.filter(x=>x.status==="rejected").length,
  publicationApprovedCount:0,results,issues};
}
