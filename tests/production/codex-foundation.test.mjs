import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
const root=new URL("../../",import.meta.url);
const path=relative=>new URL(relative,root);
const read=relative=>readFileSync(path(relative));
test("ECC import is pinned, licensed, checksummed and self-contained",()=>{
 const manifest=JSON.parse(read("third_party/ecc/manifest.json"));
 assert.equal(manifest.sourceCommit,"b38be6a7f6350964d59328b52f0624e1d1d552d1");
 assert.equal(manifest.license,"MIT");
 assert.match(read("third_party/ecc/LICENSE").toString(),/Copyright \(c\) 2026 Affaan Mustafa/);
 assert.equal(manifest.resources.length,6);
 for(const resource of manifest.resources){
  assert.ok(resource.sourcePath&&resource.purpose&&resource.activation);
  assert.equal(resource.license,"MIT");
  assert.equal(resource.installedSha256,createHash("sha256").update(read(resource.installedPath)).digest("hex"));
  assert.match(resource.sourceSha256,/^[a-f0-9]{64}$/);
  assert.ok(["adapted","unchanged"].includes(resource.mode));
 }
 assert.equal(new Set(manifest.resources.map(x=>x.installedPath)).size,manifest.resources.length);
});
test("skills have unique discoverable frontmatter and no absent scripts",()=>{
 const directory=path(".agents/skills/");
 const names=readdirSync(directory);
 assert.deepEqual(names.sort(),["coding-standards","living-docs-governance","verification-loop"]);
 for(const name of names){
  const text=read(".agents/skills/"+name+"/SKILL.md").toString();
  assert.match(text,new RegExp("^---\\nname: "+name+"\\ndescription: [^\\n]+\\n---\\n"));
  assert.doesNotMatch(text,/\.\.\/\.\.\/third-party\/ECC|\/Users\/|\.claude\/|npm run build|npm run lint/);
 }
 assert.ok(existsSync(path("scripts/benchmark-scale.mjs")));
});
test("Codex agent files and project config parse with Python's standard TOML parser",()=>{
 const dir=".codex/agents/";
 const files=readdirSync(path(dir)).sort();
 assert.deepEqual(files,["bilingual-reviewer.toml","evidence-reviewer.toml","grammar-reviewer.toml","lexicographer.toml"]);
 const script="import sys,tomllib,json; print(json.dumps([tomllib.load(open(p,'rb')) for p in sys.argv[1:]]))";
 const targets=[".codex/config.toml",...files.map(x=>dir+x)].map(x=>path(x).pathname);
 const result=spawnSync("python3",["-c",script,...targets],{encoding:"utf8"});
 assert.equal(result.status,0,result.stderr);
 const [config,...roles]=JSON.parse(result.stdout);
 assert.equal(config.agents.enabled,true);
 assert.equal(config.agents.max_concurrent_threads_per_session,4);
 for(const role of roles){
  assert.ok(role.name&&role.description&&role.developer_instructions);
  assert.match(role.developer_instructions,/read-only sandbox/);
  assert.equal(role.model,undefined);
  assert.equal(role.sandbox_mode,undefined,"Worker sandbox is inherited, not hard-enforced via TOML");
 }
 assert.equal(new Set(roles.map(x=>x.name)).size,4);
 assert.equal(config.mcp_servers,undefined);
});
