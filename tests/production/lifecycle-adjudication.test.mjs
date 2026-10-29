import {test} from "node:test";
import assert from "node:assert/strict";
import {validateLifecycleV2} from "../../validators/lifecycle-v2.mjs";
const id=(p,n)=>p+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
test("same incoming edge cannot receive two conflicting adjudications",()=>{
 const old=id("sns",2401),newId=id("sns",2402),decisionId=id("dec",2401),edgeId=id("con",2401);
 const rows=[
  {_id:old,lifecycleStatus:"retired",retiredByDecisionId:decisionId,entryId:id("lex",2401)},
  {_id:newId,lifecycleStatus:"active",entryId:id("lex",2401)},
  {_id:edgeId,lifecycleStatus:"retired",senseId:old},
  {_id:decisionId,decisionEffect:"lifecycle_transition",previousSenseIds:[old],subjectIds:[old],transitionAudit:{incomingEdges:[
   {edgeId,resolution:"retired",decisionId},
   {edgeId,resolution:"reattached",decisionId,targetId:newId}
  ]}}
 ];
 const result=validateLifecycleV2(rows);
 assert.ok(result.some(i=>i.code==="LIFECYCLE_EDGE_DUPLICATE"),JSON.stringify(result));
});
