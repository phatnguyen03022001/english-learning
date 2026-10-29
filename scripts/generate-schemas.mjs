import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
function generate(reg) {
  const root="https://raw.githubusercontent.com/phatnguyen03022001/ielts-tradition/main/schemas/v1/";
  const ref=(name)=>root+"common.schema.json#/$defs/"+name;
  const d=(name)=>({$ref:ref(name)});
  const s=(min=1)=>({type:"string",minLength:min});
  const arr=(items,min)=>({...{type:"array",items,uniqueItems:true},...(min===undefined?{}:{minItems:min})});
  const defs={};
  for(const prefix of reg.identifiers.allRegisteredPrefixes)
    defs["id_"+prefix]={type:"string",pattern:"^"+prefix+"_"+reg.identifiers.uuidV7Pattern+"$"};
  for(const [name,values] of Object.entries(reg.enums)) defs[name]={type:"string",enum:values};
  const active=reg.identifiers.activeV1Prefixes;
  const reserved=reg.identifiers.reservedInactiveV1Prefixes;
  defs.registeredId={type:"string",pattern:reg.identifiers.globalPattern};
  defs.activeV1Id={type:"string",pattern:"^("+active.join("|")+")_"+reg.identifiers.uuidV7Pattern+"$"};
  defs.reservedInactiveV1Id={type:"string",pattern:"^("+reserved.join("|")+")_"+reg.identifiers.uuidV7Pattern+"$"};
  defs.languageTag={type:"string",pattern:"^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$"};
  const files={};
  const meta=(filename,title)=>({$schema:"https://json-schema.org/draft/2020-12/schema",$id:root+filename,title,version:reg.registryVersion});
  files["common.schema.json"]={...meta("common.schema.json","Shared V1 vocabulary and identifier definitions"),$defs:defs};
  const common={
    schemaVersion:{const:reg.registryVersion},
    lifecycleStatus:d("lifecycleStatus"),
    editorialStatus:d("editorialStatus"),
    evidenceIds:arr(d("id_evd")),
    revision:{type:"integer",minimum:1},
    createdAt:s(),
    updatedAt:s(),
    retirementMode:d("retirementMode"),
    retiredByDecisionId:d("id_dec"),
    supersededByIds:arr(d("activeV1Id"))
  };
  const retirement=[
    {if:{properties:{lifecycleStatus:{const:"active"}},required:["lifecycleStatus"]},
      then:{not:{anyOf:["retirementMode","retiredByDecisionId","supersededByIds"].map(x=>({required:[x]}))}},
      else:{required:["retirementMode","retiredByDecisionId","supersededByIds"]}}
  ];
  const senseRetirement=reg.enums.retirementMode.map(mode=>{
    const spec=reg.retirementRequirements[mode];
    const shape={items:d("id_sns"),...(spec.successorMin!==undefined?{minItems:spec.successorMin}:{}),...(spec.successorMax!==undefined?{maxItems:spec.successorMax}:{})};
    return {if:{properties:{lifecycleStatus:{const:"retired"},retirementMode:{const:mode}},required:["lifecycleStatus","retirementMode"]},
      then:{properties:{supersededByIds:shape}}};
  });
  function entity(filename,title,prefix,required,props,allOf=[]) {
    const obj={
      ...meta(filename,title),
      type:"object",
      properties:{_id:d("id_"+prefix),...common,...props},
      required:["_id","schemaVersion","lifecycleStatus","editorialStatus",...required],
      additionalProperties:false,
      allOf:[...retirement,...allOf]
    };
    files[filename]=obj;
  }
  entity("lexical-entry.schema.json","LexicalEntry","lex",["language","lemma","pos","entryKind"],{
    language:d("languageTag"),lemma:s(),pos:d("lexicalEntryPos"),entryKind:d("entryKind"),
    multiwordKind:d("multiwordKind"),familyIds:arr(d("id_fam")),homographNumber:{type:"integer",minimum:1}
  },[{if:{properties:{entryKind:{const:"word"}},required:["entryKind"]},then:{not:{required:["multiwordKind"]}}}]);
  entity("lexical-sense.schema.json","LexicalSense","sns",["entryId","definition"],{
    entryId:d("id_lex"),definition:s(),topicIds:arr(d("id_top")),register:d("register"),usageNote:s()
  },senseRetirement);
  entity("translation-equivalence.schema.json","TranslationEquivalence","eqv",
    ["sourceSenseId","direction","alignmentMode","equivalenceType","evidenceIds"],{
    sourceSenseId:d("id_sns"),targetSenseId:d("id_sns"),glossVi:s(),
    direction:d("translationDirection"),alignmentMode:d("alignmentMode"),equivalenceType:d("equivalenceType"),
    context:s(),register:d("register"),restrictions:arr(s())
  },[
    {if:{properties:{alignmentMode:{const:"gloss_only"}},required:["alignmentMode"]},
      then:{required:["glossVi"],not:{required:["targetSenseId"]}},
      else:{required:["targetSenseId"]}}
  ]);
  const entityTypePrefix={LexicalEntry:"lex",LexicalSense:"sns"};
  const branches=reg.relationTypes.map(r=>({
    properties:{relationType:{const:r.type},sourceId:d("id_"+entityTypePrefix[r.sourceType]),targetId:d("id_"+entityTypePrefix[r.targetType])},
    required:["relationType","sourceId","targetId"]
  }));
  entity("lexical-relation.schema.json","LexicalRelation","rel",["relationType","sourceId","targetId"],{
    relationType:{type:"string"},sourceId:s(),targetId:s(),
    qualifiers:{type:"object",properties:{
      context:s(),variety:s(),domain:s(),register:d("register"),period:s()
    },additionalProperties:false}
  },[{oneOf:branches}]);
  entity("word-family.schema.json","WordFamily","fam",["familyBasis"],{
    familyBasis:d("familyBasis"),label:s()
  });
  entity("topic.schema.json","Topic","top",["label","parentTopicId"],{
    label:s(),parentTopicId:{anyOf:[d("id_top"),{type:"null"}]}
  });
  entity("construction.schema.json","Construction","con",["senseId","constructionType","pattern"],{
    senseId:d("id_sns"),constructionType:d("constructionType"),pattern:s(),
    prepositions:arr(s()),complements:arr(s()),separable:{type:"boolean"},constraints:arr(s())
  });
  entity("collocation.schema.json","Collocation","col",["anchorSenseId","pattern"],{
    anchorSenseId:d("id_sns"),pattern:s(),components:arr(s()),context:s()
  });
  entity("lexical-form.schema.json","LexicalForm","frm",["entryId","form"],{
    entryId:d("id_lex"),form:s(),locale:d("languageTag"),ipa:s(),stress:s()
  });
  entity("morpheme.schema.json","Morpheme","mrf",["form","morphologicalRole"],{
    form:s(),morphologicalRole:d("morphologicalRole"),language:d("languageTag")
  });
  entity("etymology.schema.json","Etymology","ety",["entryId"],{
    entryId:d("id_lex"),historicalForm:s(),sourceLanguage:d("languageTag"),notes:s()
  });
  entity("evidence.schema.json","Evidence","evd",["sourceId","assertionIds"],{
    sourceId:d("id_src"),assertionIds:arr(d("activeV1Id"),1),attestation:s(),rightsNote:s()
  });
  entity("source.schema.json","Source","src",["title"],{
    title:s(),url:{type:"string",pattern:"^https?://"},edition:s(),license:s(),permittedUse:s()
  });
  entity("editorial-review.schema.json","EditorialReview","rev",["reviewerId","subjectIds"],{
    reviewerId:s(),subjectIds:arr(d("activeV1Id"),1),outcome:d("decisionOutcome"),
    issueType:d("issueType"),rationale:s()
  });
  entity("editorial-decision.schema.json","EditorialDecision","dec",["subjectIds","issueType","outcome","reviewerId","rationale"],{
    subjectIds:arr(d("activeV1Id"),1),issueType:d("issueType"),
    outcome:d("decisionOutcome"),reviewerId:s(),rationale:s(),reviewedAt:s(),
    action:d("senseDecisionAction"),entryId:d("id_lex"),
    previousSenseIds:arr(d("id_sns")),proposedSenseIds:arr(d("id_sns")),
    supersedesDecisionId:d("id_dec"),affectedEdges:arr(d("id_rel"))
  });
  return files;
}
const registry=JSON.parse(readFileSync(join(root,"schemas/v1/vocabularies.json"),"utf8"));
const expected=generate(registry);
const dir=join(root,"schemas/v1");
const check=process.argv.includes("--check");
const existing=readdirSync(dir).filter(name=>name.endsWith(".schema.json")).sort();
const target=Object.keys(expected).sort();
if(check && JSON.stringify(existing)!==JSON.stringify(target)) throw new Error("schema file inventory drift");
for(const [name,value] of Object.entries(expected)) {
  const path=join(dir,name), serialized=JSON.stringify(value,null,2)+"\n";
  if(check) {
    if(readFileSync(path,"utf8")!==serialized) throw new Error("schema drift: "+name);
  } else writeFileSync(path,serialized);
}
console.log(check?"Schema registry drift check passed ("+target.length+" schemas)":"Generated "+target.length+" schemas");
