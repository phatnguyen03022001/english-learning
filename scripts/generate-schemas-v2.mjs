import {readFileSync,readdirSync,mkdirSync,writeFileSync} from "node:fs";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {buildV2} from "./v2-contract.mjs";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const from=join(root,"schemas/v1"),to=join(root,"schemas/v2");
const reg=JSON.parse(readFileSync(join(to,"vocabularies.json"),"utf8"));
const names=readdirSync(from).filter(n=>n.endsWith(".schema.json")).sort();
const check=process.argv.includes("--check");
if(!check)mkdirSync(to,{recursive:true});
if(check&&JSON.stringify(readdirSync(to).filter(n=>n.endsWith(".schema.json")).sort())!==JSON.stringify(names))throw Error("V2 inventory drift");
for(const name of names){
 const target=join(to,name),data=JSON.stringify(buildV2(JSON.parse(readFileSync(join(from,name),"utf8")),reg),null,2)+"\n";
 if(check){if(readFileSync(target,"utf8")!==data)throw Error("V2 schema drift: "+name);}
 else writeFileSync(target,data);
}
console.log("V2 schema "+(check?"check":"generate")+" passed");
