import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {publicationClaimPaths,evaluatePublication,digest,valueAt} from "../../validators/production-gates.mjs";

// Synthetic, test-only authority/evidence/rights. Nothing here appoints a real reviewer.
const id=(prefix,n)=>prefix+"_01940000-0000-7000-8000-"+n.toString(16).padStart(12,"0");
const verified=(prefix,n,extra)=>({_id:id(prefix,n),schemaVersion:"2.0.0",lifecycleStatus:"active",editorialStatus:"verified",...extra});
const lex=verified("lex",3001,{language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"word"});
const sns=verified("sns",3001,{entryId:lex._id,definition:"Test-only meaning",usageNote:"Do not use as authentic guidance"});
const con=verified("con",3001,{senseId:sns._id,constructionType:"verb_pattern",pattern:"synthetic pattern",constraints:["test-only constraint"],separable:false});
const frm=verified("frm",3001,{entryId:lex._id,form:"synthetics",pronunciationVariety:"en-GB"});
const eqv=verified("eqv",3001,{sourceSenseId:sns._id,direction:"en_to_vi",alignmentMode:"gloss_only",glossVi:"nghĩa thử nghiệm",equivalenceType:"approximate",restrictions:["test-only restriction"]});
const cases=[
 {subject:lex,dependencies:[],extra:"/entryKind"},
 {subject:sns,dependencies:[lex],extra:"/usageNote"},
 {subject:con,dependencies:[lex,sns],extra:"/constraints/0"},
 {subject:frm,dependencies:[lex],extra:"/pronunciationVariety"},
 {subject:eqv,dependencies:[lex,sns],extra:"/restrictions/0"}
];

test("original R1 reproducer and nested learner claims are enumerated",()=>{
 const examples=[
  [sns,["/usageNote"]],
  [eqv,["/restrictions/0"]],
  [con,["/constraints/0","/separable"]],
  [frm,["/pronunciationVariety"]],
  [verified("sns",3002,{entryId:lex._id,definition:"Synthetic",examples:[{english:"Synthetic only",exampleType:"editorial_original",editorialStatus:"draft",translationEvidenceStatus:"unreviewed",register:"formal",variety:"en-GB"}]}),
   ["/examples/0/english","/examples/0/exampleType","/examples/0/register","/examples/0/variety"]]
 ];
 for(const [record,expected] of examples){
  const paths=publicationClaimPaths(record);
  for(const path of expected)assert.ok(paths.includes(path),record._id+" missing "+path+": "+paths);
 }
});

// Avoid a hand-maintained schema/claim whitelist silently diverging when V2 adds fields.
// Internal IDs, lifecycle state and provenance references are not learner assertions.
test("V2 publication surface drift is reviewed for every publishable entity type",()=>{
 const excluded=["_id","schemaVersion","lifecycleStatus","editorialStatus","evidenceIds","revision","createdAt","updatedAt","retirementMode","retiredByDecisionId","supersededByIds"];
 const types={
  lex:["language","lemma","pos","entryKind","multiwordKind","familyIds","homographNumber"],
  sns:["entryId","definition","topicIds","register","usageNote","domain","usageRestrictions","contrastiveNotes","grammar","constructionIds","examples"],
  frm:["entryId","form","locale","ipa","stress","pronunciationVariety"],
  fam:["familyBasis","label"],
  mrf:["form","morphologicalRole","language"],
  ety:["entryId","historicalForm","sourceLanguage","notes"],
  top:["label","parentTopicId"],
  con:["senseId","constructionType","pattern","prepositions","complements","separable","constraints","grammar"],
  col:["anchorSenseId","pattern","components","context"],
  eqv:["sourceSenseId","targetSenseId","glossVi","direction","alignmentMode","equivalenceType","context","register","restrictions"],
  rel:["relationType","sourceId","targetId","qualifiers"]
 };
 const schemaNames={lex:"lexical-entry",sns:"lexical-sense",frm:"lexical-form",fam:"word-family",mrf:"morpheme",ety:"etymology",top:"topic",con:"construction",col:"collocation",eqv:"translation-equivalence",rel:"lexical-relation"};
 for(const [type,fields] of Object.entries(types)){
  const schema=JSON.parse(readFileSync(new URL("../../schemas/v2/"+schemaNames[type]+".schema.json",import.meta.url)));
  const nonClaims=type==="frm"?["pronunciationEvidenceIds"]:type==="eqv"?["translationEvidenceStatus"]:[];
  assert.deepEqual(Object.keys(schema.properties).filter(x=>![...excluded,...nonClaims].includes(x)).sort(),[...fields].sort(),type+" schema/claim surface drift");
 }
 const nested={
  "lexical-sense":{
   usageRestrictions:["kind","description","evidenceIds"],
   contrastiveNotes:["language","text","evidenceIds"],
   examples:["english","exampleType","editorialStatus","translationEvidenceStatus","vi","evidenceIds","register","variety"],
   grammar:["countability","transitivity"]
  },
  construction:{grammar:["countability","transitivity","complementTypes","requiredPrepositions","pronounPlacement","separability","register","variety"]}
 };
 for(const [schemaName,items] of Object.entries(nested)){
  const schema=JSON.parse(readFileSync(new URL("../../schemas/v2/"+schemaName+".schema.json",import.meta.url)));
  for(const [field,keys] of Object.entries(items)){
   const properties=schema.properties[field].items?.properties??schema.properties[field].properties;
   assert.deepEqual(Object.keys(properties).sort(),[...keys].sort(),schemaName+"."+field+" nested drift");
  }
 }
});

function trustedDataset(subject,dependencies=[]){
 const source=verified("src",3001,{title:"Synthetic provenance fixture",rights:{status:"redistributable",scopes:["dictionary_publication"],reviewerId:"rights",permissionReference:"test-rights"}});
 const records=[...dependencies.map(r=>({...r})),{...subject},source];
 const appointments=[{appointmentKey:"test-rights",reviewerId:"rights",appointedByOwnerId:"test-owner",role:"rights",scope:{subjectIds:[source._id]},effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"}];
 let seq=4000;
 for(const record of records.filter(r=>!r._id.startsWith("src_"))){
  const paths=publicationClaimPaths(record);
  const evidence=paths.map(path=>verified("evd",++seq,{
   sourceId:source._id,assertionIds:[record._id],
   claim:{subjectId:record._id,fieldPath:path,valueDigest:digest(valueAt(record,path)),specificity:"exact_value"},
   independence:"independent_reviewed",reviewStatus:"accepted"
  }));
  record.evidenceIds=evidence.map(r=>r._id);
  records.push(...evidence);
  records.push(verified("rev",++seq,{
   reviewerId:"test-ler",role:"lead_editorial",appointmentReference:"test-review",
   subjectIds:[record._id],outcome:"accepted",
   claims:paths.map(fieldPath=>({subjectId:record._id,fieldPath}))
  }));
  appointments.push({appointmentKey:"test-review",reviewerId:"test-ler",appointedByOwnerId:"test-owner",
   role:"lead_editorial",scope:{subjectIds:[record._id],fieldPaths:paths},
   effectiveFrom:"2026-01-01T00:00:00Z",ownerAttestationRef:"test-only"});
 }
 return {records,options:{subjectIds:[subject._id],ownerId:"test-owner",effectiveAt:"2026-10-30T00:00:00Z",
  appointments,verifyOwnerAttestation:()=>true,verifyEvidence:()=>true,verifyRights:()=>true}};
}

test("each new claim requires its own exact evidence, scoped LER review and rights",()=>{
 for(const {subject,dependencies,extra} of cases){
  const {records,options}=trustedDataset(subject,dependencies);
  // A fully attested fixture is a positive control; never represents real approval.
  const approved=evaluatePublication(records,options);
  assert.equal(approved.eligible,true,subject._id+" positive control: "+JSON.stringify(approved.issues));

  const proof=records.find(r=>r._id.startsWith("evd_")&&r.claim?.subjectId===subject._id&&r.claim.fieldPath===extra);
  assert.ok(proof,subject._id+" missing exact proof fixture for "+extra);
  const withoutEvidence=records.filter(r=>r!==proof);
  const missing=evaluatePublication(withoutEvidence,options);
  assert.equal(missing.eligible,false);
  assert.ok(missing.issues.some(i=>i.code==="CLAIM_PATH_UNVERIFIED"&&i.entityId===subject._id&&i.path===extra),JSON.stringify(missing.issues));

  const noReview=structuredClone(records);
  const review=noReview.find(r=>r._id.startsWith("rev_")&&r.subjectIds?.includes(subject._id));
  review.claims=review.claims.filter(x=>x.fieldPath!==extra);
  const missingReview=evaluatePublication(noReview,options);
  assert.ok(missingReview.issues.some(i=>i.code==="CLAIM_PATH_UNVERIFIED"&&i.entityId===subject._id&&i.path===extra),JSON.stringify(missingReview.issues));

  const noRights=evaluatePublication(records,{...options,verifyRights:()=>false});
  assert.equal(noRights.eligible,false);
  assert.ok(noRights.issues.some(i=>i.code==="CLAIM_PATH_UNVERIFIED"&&i.entityId===subject._id&&i.path===extra));
 }
});


test("every classified V2 learner assertion has a concrete per-field claim path",()=>{
 const sample={
  lex:{language:"en",lemma:"synthetic",pos:"NOUN",entryKind:"multiword",multiwordKind:"phrasal_verb",familyIds:["fam_test"],homographNumber:1},
  sns:{entryId:"lex_test",definition:"meaning",topicIds:["top_test"],register:"formal",usageNote:"note",domain:"finance",
   usageRestrictions:[{kind:"syntactic",description:"avoid use"}],
   contrastiveNotes:[{language:"vi",text:"contrast"}],
   grammar:{countability:"uncountable",transitivity:"transitive"},constructionIds:["con_test"],
   examples:[{english:"Example",exampleType:"editorial_original",editorialStatus:"draft",translationEvidenceStatus:"unreviewed",vi:"Ví dụ",register:"formal",variety:"en-GB"}]},
  frm:{entryId:"lex_test",form:"forms",locale:"en-GB",ipa:"ipa",stress:"stress",pronunciationVariety:"en-GB"},
  fam:{familyBasis:"morphological",label:"family"},
  mrf:{form:"un-",morphologicalRole:"prefix",language:"en"},
  ety:{entryId:"lex_test",historicalForm:"older",sourceLanguage:"la",notes:"etymology note"},
  top:{label:"topic",parentTopicId:"top_test"},
  con:{senseId:"sns_test",constructionType:"verb_pattern",pattern:"pattern",prepositions:["on"],complements:["NP"],separable:true,constraints:["pronoun must precede particle"],
   grammar:{countability:"uncountable",transitivity:"transitive",complementTypes:["noun_phrase"],requiredPrepositions:["on"],pronounPlacement:"before_particle",separability:"separable",register:"formal",variety:"en-GB"}},
  col:{anchorSenseId:"sns_test",pattern:"collocation",components:["noun"],context:"context"},
  eqv:{sourceSenseId:"sns_test",targetSenseId:"sns_vi",glossVi:"dịch",direction:"en_to_vi",alignmentMode:"sense_aligned",equivalenceType:"approximate",context:"context",register:"formal",restrictions:["restriction"]},
  rel:{relationType:"SYNONYM_OF",sourceId:"sns_a",targetId:"sns_b",qualifiers:{register:"formal"}}
 };
 const expected={
  lex:["/language","/lemma","/pos","/entryKind","/multiwordKind","/familyIds","/homographNumber"],
  sns:["/entryId","/definition","/topicIds","/register","/usageNote","/domain","/usageRestrictions/0/kind","/usageRestrictions/0/description","/contrastiveNotes/0/language","/contrastiveNotes/0/text","/grammar/countability","/grammar/transitivity","/constructionIds","/examples/0/english","/examples/0/exampleType","/examples/0/vi","/examples/0/register","/examples/0/variety"],
  frm:["/entryId","/form","/locale","/ipa","/stress","/pronunciationVariety"],
  fam:["/familyBasis","/label"],mrf:["/form","/morphologicalRole","/language"],
  ety:["/entryId","/historicalForm","/sourceLanguage","/notes"],
  top:["/label","/parentTopicId"],
  con:["/senseId","/constructionType","/pattern","/prepositions","/complements","/separable","/constraints/0","/grammar/countability","/grammar/transitivity","/grammar/complementTypes","/grammar/requiredPrepositions","/grammar/pronounPlacement","/grammar/separability","/grammar/register","/grammar/variety"],
  col:["/anchorSenseId","/pattern","/components","/context"],
  eqv:["/sourceSenseId","/targetSenseId","/glossVi","/direction","/alignmentMode","/equivalenceType","/context","/register","/restrictions/0"],
  rel:["/relationType","/sourceId","/targetId","/qualifiers/register"]
 };
 for(const [type,fields] of Object.entries(sample)){
  assert.deepEqual(publicationClaimPaths({_id:type+"_test",...fields}),[...expected[type]].sort(),type+" learner claim coverage");
 }
});
