import {test} from "node:test";
import assert from "node:assert/strict";
import {evaluatePublication,digest,valueAt} from "../../validators/production-gates.mjs";
const id=(p,n)=>p+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
const rec=(p,n,x)=>({_id:id(p,n),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"verified",...x});
test("a reviewed definition does not implicitly certify sense-specific grammar",()=>{
 // Synthetic adversarial metadata; not an actual rights or owner appointment.
 const lex=rec("lex",1301,{language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word",evidenceIds:[id("evd",1301)]});
 const sense=rec("sns",1301,{entryId:lex._id,definition:"synthetic definition",grammar:{countability:"uncountable"},evidenceIds:[id("evd",1302)]});
 const source=rec("src",1301,{title:"synthetic not a citation",rights:{status:"redistributable",scopes:["dictionary_publication"],reviewerId:"fake",permissionReference:"fake"}});
 const ev=(n,target,path,value)=>rec("evd",n,{sourceId:source._id,assertionIds:[target._id],claim:{subjectId:target._id,fieldPath:path,valueDigest:digest(value),specificity:"exact_value"},independence:"independent_reviewed",reviewStatus:"accepted"});
 const review=(n,target,path)=>rec("rev",n,{reviewerId:"fake",subjectIds:[target._id],outcome:"accepted",role:"lead_editorial",appointmentReference:"fake",claims:[{subjectId:target._id,fieldPath:path,valueDigest:digest(valueAt(target,path))}]});
 const records=[lex,sense,source,ev(1301,lex,"/lemma","synthetic"),ev(1302,sense,"/definition","synthetic definition"),review(1301,lex,"/lemma"),review(1302,sense,"/definition")];
 const result=evaluatePublication(records,{isAuthorized:()=>true,verifyRights:()=>true});
 assert.equal(result.eligible,false,"grammar needs its own claim-specific evidence");
 assert.ok(result.issues.some(i=>i.code==="CLAIM_PATH_UNVERIFIED"&&i.entityId===sense._id&&i.path==="/grammar/countability"),JSON.stringify(result.issues));
});
