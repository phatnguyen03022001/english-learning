// V2 adds learner and traceability fields; V1 and its registry are immutable.
export function buildV2(v1, reg) {
 const base="https://raw.githubusercontent.com/phatnguyen03022001/ielts-tradition/main/schemas/v2/";
 const d=n=>({$ref:base+"common.schema.json#/$defs/"+n});
 const s={type:"string",minLength:1}, a=items=>({type:"array",items,uniqueItems:true});
 const obj=(properties,required=[])=>({type:"object",properties,required,additionalProperties:false});
 const result=JSON.parse(JSON.stringify(v1));
 const walk=x=>{if(Array.isArray(x)){x.forEach(walk);return;}if(x&&typeof x==="object")for(const[k,v]of Object.entries(x)){
  if(typeof v==="string"&&v.includes("/schemas/v1/"))x[k]=v.replaceAll("/schemas/v1/","/schemas/v2/");
  else if(v&&typeof v==="object")walk(v);
 }};
 walk(result);result.version=reg.registryVersion;
 if(result.$defs){for(const[k,values]of Object.entries(reg.enums))result.$defs[k]={type:"string",enum:values};return result;}
 result.properties.schemaVersion={const:reg.registryVersion};
 const claim=obj({subjectId:d("activeV1Id"),fieldPath:{type:"string",pattern:"^/"},valueDigest:{type:"string",pattern:"^[a-f0-9]{64}$"},specificity:d("claimSpecificity"),description:s},["subjectId","fieldPath","valueDigest","specificity"]);
 const reference=obj({subjectId:d("activeV1Id"),fieldPath:s},["subjectId","fieldPath"]);
 const extra={
  "lexical-sense":{domain:s,usageRestrictions:a(obj({kind:s,description:s,evidenceIds:a(d("id_evd"))},["kind","description"])),contrastiveNotes:a(obj({language:d("languageTag"),text:s,evidenceIds:a(d("id_evd"))},["language","text"])),grammar:obj({countability:d("countability"),transitivity:d("transitivity")}),constructionIds:a(d("id_con")),examples:{type:"array",items:obj({english:s,exampleType:d("exampleType"),editorialStatus:d("editorialStatus"),translationEvidenceStatus:d("translationEvidenceStatus"),vi:s,evidenceIds:a(d("id_evd")),register:d("register"),variety:d("languageTag")},["english","exampleType","editorialStatus","translationEvidenceStatus"])}},
  "construction":{grammar:obj({countability:d("countability"),transitivity:d("transitivity"),complementTypes:a(d("complementType")),requiredPrepositions:a(s),pronounPlacement:d("pronounPlacement"),separability:d("separability"),register:d("register"),variety:d("languageTag")})},
  "lexical-form":{pronunciationVariety:d("languageTag"),pronunciationEvidenceIds:a(d("id_evd"))},
  "translation-equivalence":{translationEvidenceStatus:d("translationEvidenceStatus")},
  "evidence":{claim,location:s,attestationType:s,collectionMethod:s,reviewStatus:d("evidenceReviewStatus"),independence:d("sourceIndependence"),limitations:a(s)},
  "source":{provider:s,sourceType:d("sourceType"),sourceIdentifier:s,materialVersion:s,retrievedAt:s,attribution:s,rights:obj({status:d("sourceRightsStatus"),scopes:a(s),licenseIdentifier:s,permissionReference:s,reviewerId:s,decisionId:d("id_dec"),reviewedAt:s,expiresAt:s,revokedAt:s},["status"])},
  "editorial-review":{role:d("editorialRole"),appointmentReference:s,claims:a(reference)},
  "editorial-decision":{role:d("editorialRole"),appointmentReference:s,decisionEffect:d("decisionEffect"),claims:a(reference),transitionAudit:obj({beforeRevision:{type:"integer",minimum:1},afterRevision:{type:"integer",minimum:2},beforeDigest:{type:"string",pattern:"^[a-f0-9]{64}$"},afterDigest:{type:"string",pattern:"^[a-f0-9]{64}$"},successorCreationReferences:a(s),incomingEdges:{type:"array",items:obj({edgeId:d("activeV1Id"),resolution:d("edgeResolution"),targetId:d("activeV1Id"),decisionId:d("id_dec")},["edgeId","resolution","decisionId"])}},["beforeRevision","afterRevision","beforeDigest","afterDigest","incomingEdges"])}
 };
 const kind=result.$id.split("/").at(-1).replace(".schema.json","");
 Object.assign(result.properties,extra[kind]??{});
 return result;
}
