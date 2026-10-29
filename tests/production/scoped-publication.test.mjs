import {test} from "node:test";
import assert from "node:assert/strict";
import {evaluatePublication} from "../../validators/production-gates.mjs";
const id=(n)=>"lex_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
const record=(n,status)=>({_id:id(n),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:status,language:"en",lemma:"synthetic"+n,pos:"NOUN",entryKind:"word"});
test("unrelated disputed candidate does not block independent scoped publication evaluation",()=>{
 const a=record(1901,"verified"),b=record(1902,"disputed");
 const result=evaluatePublication([a,b],{subjectIds:[a._id]});
 assert.equal(result.eligible,false,"missing evidence and LER still fail closed");
 assert.ok(result.issues.some(i=>i.entityId===a._id));
 assert.ok(result.issues.every(i=>i.entityId!==b._id),JSON.stringify(result.issues));
});
test("unknown subject and empty publication scope never yield eligibility",()=>{
 const a=record(1901,"draft");
 const result=evaluatePublication([a],{subjectIds:["lex_01940000-0000-7000-8000-000000009999"]});
 assert.equal(result.eligible,false);
 assert.ok(result.issues.some(i=>i.code==="PUBLICATION_SUBJECT_NOT_FOUND"));
});
