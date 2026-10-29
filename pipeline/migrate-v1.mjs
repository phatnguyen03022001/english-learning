// Explicit representation migration; metadata absent in V1 stays absent.
export function migrateV1Records(input) {
 const records=Array.isArray(input)?input:input?.records;
 if(!Array.isArray(records))throw new TypeError("V1 migration requires records");
 const ids=new Set();
 for(const r of records){
  if(!r||r.schemaVersion!=="1.0.0"||typeof r._id!=="string")throw new Error("MIGRATION_INVALID_V1_RECORD");
  if(ids.has(r._id))throw new Error("MIGRATION_DUPLICATE_ID: "+r._id);
  ids.add(r._id);
 }
 return {records:records.map(r=>({...r,schemaVersion:"2.0.0"})),migration:{from:"1.0.0",to:"2.0.0",preservedIdentities:true,reviewStatus:"not_assessed",rightsStatus:"not_assessed"}};
}
