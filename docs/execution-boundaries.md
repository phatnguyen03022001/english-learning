# Execution boundaries — English Learning

This is the canonical **execution/authority contract** for the dictionary workflow. It governs **who may act**, **where execution occurs**, **what may be changed**, **what enforces that limit**, and **how evidence is handed off**. It does not replace lexical [identity](identity-policy.md), [editorial](editorial-policy.md), [evidence](evidence-provenance-contract.md), or [publication](lexical-production-contract.md) policies.

## Trust model and authority matrix

| Role / boundary | Environment | Allowed authority | Enforcement / known limit |
| --- | --- | --- | --- |
| Human owner | Human authorization channel | Set tasks, scope, explicit grant to writer; appoint qualified editorial reviewers | Owner decisions must be explicitly recorded; an agent's assertion is not owner authentication |
| ChatGPT Chat / Architect | ChatGPT, read-only repository/connected-resource inspection | Inspect code, tests, history, ECC, research, define tasks, audit results and accept/reject evidence | **POLICY_ONLY** while ChatGPT connectors or sessions retain write-capable tokens. Architect **must not call write tools** even if available; no self-promotion to writer |
| Codex Research parent + up to 4 specialists | **Separate** local Codex research invocation on Mac | Read source and relevant references; bounded independent findings/proposals only | Use a **read-only OS sandbox**, no approvals for elevation, disabled apps/plugins, and config isolation to avoid user MCP inheritance. Verify effective tool inventory; role prompts alone do not enforce this |
| Integration Writer (one; Codex Native default, Google Antigravity optional) | Explicitly owner-authorized executor on Mac, in the existing checkout | Only task-scoped file edits and local tests; commit/push on `main` **only if specified** | Shared Integration Writer role and task grant. Provider does not expand authority. Codex sandbox or Antigravity permissions must be checked at runtime; task scope and owner authority remain **POLICY_ONLY** |
| Mac local | Source checkout, Node.js 26, native Codex CLI and tests | Primary execution substrate, not an agent or permission grant | macOS process/Seatbelt permissions for sandboxed execution; native Codex preferred. Agent Runtime MCP is an optional client fallback, not a Codex dependency |
| GitHub origin | Versioned repository | Source of truth for commits on `main`; only authorized writer may push | Git credentials/branch rules determine actual remote restrictions. Branch/actor policy is **POLICY_ONLY** unless separate credential/branch protection is verified |
| GitHub Actions | Hosted runner, exact commit | Read checkout; use temporary runner files for tests; emit verification result | Workflow `permissions: contents: read`. No push, auto-commit, deployment, publication, or Atlas secret references. CI green proves checks passed, **not** owner/editorial approval |
| MongoDB Atlas | Independently secured persistence boundary | **No writes by default**, including from integration writer | Requires separate explicit task authorization naming project, database, collections, expected impact and rollback/restore plan, plus appropriately scoped credentials. Current no-write is **POLICY_ONLY** unless read-only/no credentials are verified at runtime |

**Critical distinctions:** an environment is not a role; a role prompt is not a sandbox; a credential's availability is not authorization; Git push is not Atlas permission; CI PASS is not a signed review; an AI-generated proposal is untrusted input. Never claim `ENFORCED` from a Markdown instruction or an uninspected inherited credential.

## Executor providers

The unchanged flow is **Human Owner → ChatGPT Architect → Authorized Executor → GitHub Actions**. Codex Native is the default executor provider; Google Antigravity is optional. Both use the same Integration Writer role. Only one provider may write the repository at a time. Do not let Codex and Antigravity implement one task concurrently in the same checkout. ChatGPT Architect stays **READ-ONLY** and cannot grant or assume owner/executor authority.

Antigravity is `AVAILABLE_AS_OPTION`; application version 2.27.0 is installed locally. Its project permissions, sandbox, MCP inventory, and write boundary are `ENFORCEMENT_NOT_VERIFIED` because no Antigravity session was launched for this task. Before using it, the owner-authorized writer must:

- Read root `AGENTS.md` and this execution contract.
- Open the existing repository checkout in **Local Mode**; do not create a worktree.
- Inspect effective project permissions, sandbox behavior, and MCP/tool inventory before writing. If any write-capable tool is outside task scope or the boundary cannot be observed, do not use that session for mutation; report `POLICY_ONLY` or `NOT_VERIFIED` as applicable.
- Keep Turbo/unrestricted permissions off by default. Do not change global Antigravity settings or install/use plugins or MCP servers with out-of-scope write access.
- Make no Atlas writes or lexical publication without separate owner authorization. Existing ECC skills may be used when compatible; do not copy `.agents/skills/` into a second skill system.
- Report exact commit/HEAD, checks and evidence, CI SHA, mutation summary, and remaining blockers.

Provider changes do not resolve state-path TOCTOU, inherited credentials, unauthorized write access, or missing editorial authority. Antigravity must not be used to bypass a Codex `NO-GO` gate.

## Prior local execution modes pilot (Codex CLI 0.158.0)

This is a dated one-worker pilot record, not Task 005's current readiness result. See
the Task 005 runtime findings and current Codex CLI invocation below.

Run separate **fresh sessions**, not a research subagent of an integration writer. Run commands from repository root; `--ignore-user-config` avoids loading user-level Codex configuration while keeping authentication, and the repository config does not register MCP servers. Disable built-in apps/plugins during research. Inspect current CLI help and effective tools on upgrade; if writable MCP/app access remains, **do not call the session isolated**.

Research parent, read-only for all descendants:

```sh
codex --strict-config exec --ignore-user-config --sandbox read-only \
  --disable apps --disable plugins -c 'mcp_servers={}' \
  -C /Users/tienphat/Developer/english-learning \
  'Review the assigned bounded candidate IDs read-only; at most four specialists; return findings only.'
```

On CLI 0.158.0, do **not** use `--ephemeral` for a parent expected to spawn subagents: a tested attempt failed to find the parent rollout in the thread store. Research workers inherit the parent's sandbox **and MCP tool set**. The four `.codex/agents/*.toml` files are role-reference templates only: a real CLI delegation probe with unique markers in each file did not deliver any marker to its corresponding worker, including when `agents.<name>.config_file` was configured. The CLI delegation interface therefore does not activate these project TOML roles. It also accepts agent labels only with lowercase letters, digits, and underscores; the former `grammar-reviewer` label was rejected. Use a generic delegated worker with the relevant role instructions included directly in its task. A real worker applied a task-only marker under a read-only parent with `approval=never`, apps/plugins disabled, and `mcp_servers={}`. Workers inherit parent sandbox and MCP settings; TOML flags cannot revoke an inherited write-capable MCP. If effective inherited tools are not confirmed, restrict research to inspected read-only tools or report `POLICY_ONLY`; never spin up research workers from a writable writer parent. No recursive fanout or more than four concurrent workers. External reference searches must not authorize source or Atlas mutation.

Integration writer, **only with a separately issued owner task naming operations and baseline**:

```sh
codex --strict-config exec --sandbox workspace-write -c 'approval_policy="on-request"' \
  --disable apps --disable plugins -c 'mcp_servers={}' \
  -C /Users/tienphat/Developer/english-learning \
  'Implement ONLY the owner-authorized task at its verified baseline; do not delegate to research workers.'
```

This is an example invocation, **not permission to execute it**. `workspace-write` can write beyond the task's file list; task-path restriction and no self-approval remain policy-level. Do not use `--dangerously-bypass-approvals-and-sandbox`, `--add-dir`, unreviewed `--config` overrides, or write-capable app/MCP connectors to evade limitations. Never change `~/.codex/config.toml` for this workflow. Prefer native local Codex; when native access is unavailable, an explicitly authorized integration writer may use Agent Runtime MCP with the **same** scope and evidence obligations, not as an automatic escalation.

## Runtime isolation smoke test (2026-11-01)

On the installed Codex CLI `0.158.0`, a bounded synthetic test ran in a fresh
`codex exec` process with `--ignore-user-config`, `--sandbox read-only`,
the observed `approval=never` exec default, `--disable apps`, `--disable plugins`,
`-c 'mcp_servers={}'`, and one concurrent worker. Environment inheritance was
replaced with an allowlist containing only `PATH`, `HOME`, `CODEX_HOME`, and
`TMPDIR`; no Atlas/MongoDB environment variable names were present. The temporary
fixture was outside the checkout.

The parent and one delegated worker each attempted both a shell write and a native
`apply_patch` edit. The shell attempts returned `Operation not permitted` under the OS sandbox. The
native patch tool returned `writing is blocked by read-only sandbox`, rejected by
the `never` approval policy. Neither session requested or received elevation.
The fixture and candidate/repository data stayed unchanged. Invocation overrides
exposed no MCP, app, plugin, Atlas, or database connector. Built-in shell,
collaboration, patch, web, and image tools remained visible; the write attempts
confirmed that shell and patch writes were still sandboxed.

**Role limitation:** custom TOML instructions were `NOT_VERIFIED` as active roles
and failed the marker probe for all four roles. The native fallback is inline,
task-specific worker instructions. A real task-marker probe verified that a
delegated worker applied those instructions. Its inherited read-only sandbox and
disabled/empty connectors supplied the verified write boundary for that invocation.
This test verifies the current Mac CLI invocation only; repeat it after CLI,
sandbox, configuration, or connector changes. The isolated invocation kept Codex
authentication available while skipping user config; it did not inspect or pass
Atlas credentials. It does not prove that arbitrary secret files elsewhere on the
host are unreadable under a read-only filesystem policy.

## Context routing

`MUST_READ` means required for the role on every task; `READ_ON_DEMAND` applies only
when scope touches that domain; `GENERALLY_SKIP` avoids bulk loading unless a concrete
question depends on it. This routing does not hide or relax authority, security,
licensing, editorial, or publication requirements.

| Role | MUST_READ | READ_ON_DEMAND | GENERALLY_SKIP |
| --- | --- | --- | --- |
| ChatGPT Architect | Current task; repository, branch and exact HEAD/status; AGENTS operating contract; this document's applicable authority and handoff sections | Relevant domain policy, code/schema/tests, existing design or historical evidence, selected ECC guidance, official current runtime docs | Whole-repo scans, all ECC, candidate batches, unrelated phase history |
| Integration Writer | Owner-authorized task and exact baseline; AGENTS rules relevant to the scope; effective permissions; target files and direct tests | Affected domain contracts, transitive consumers, compatibility/migration history, applicable ECC skills | Unaffected schemas, data, policies and history |
| Research parent | Bounded mission and claim/file scope; research boundary and handoff requirements; effective sandbox and tool configuration | Applicable lexical policy excerpts and source materials for assigned claims | Other batches, unrelated schemas, full phase reports |
| Research worker | Inline bounded role; exact claim IDs or paths; read-only and no-recursion rules; requested evidence format | Relevant policy excerpt and named source material | Full AGENTS file, unrelated policies, all candidate snapshots, broad repository history |

Workers must receive necessary safety and authority rules directly in their task;
progressive disclosure never delegates those rules to a file they were not told to
read. The `.codex/agents/*.toml` files remain role-reference templates: current CLI
delegation marker probes did not apply their instructions. Put active role instructions
in each bounded worker task.

## Task 005 runtime and model findings (2026-11-01)

The installed Mac CLI is `codex-cli 0.158.0`; Node is `v26.13.0` on macOS ARM64.
`codex debug models` listed `gpt-6-astra` (`low`, `medium`, `high`, `xhigh`, `max`,
`ultra`), `gpt-6-sol` (same levels), and `gpt-6-luna` (`low`, `medium`, `high`, `xhigh`,
`max`), all with `visibility=list`. `gpt-6.1-sol` was absent from this installed
catalog. `GPT-6 Luna` is a product/display label; `gpt-6-luna` is the Codex CLI
identifier. This is the installation catalog, not proof that the signed-in
account/workspace can use the model. User config currently
selects Luna/high; the project config now supplies the same parent defaults and
`agents.default_subagent_model` / `agents.default_subagent_reasoning_effort` defaults.
Official Codex configuration docs state that a project config loads only for a trusted
project; precedence is CLI override, trusted project config, selected profile, user
config, cloud defaults, system config, then built-in defaults. An explicit spawn
model/effort overrides the subagent defaults. Effective model and effort therefore remain
`MODEL_NOT_VERIFIED` until captured for the actual parent and every worker. On any
request failure or apparent fallback, stop and record the observed error/model; do not
report a configured default as a runtime result.

Task 005 used `env -i` with only `PATH`, `HOME`, and `TMPDIR`, plus
`--ignore-user-config`, `--sandbox read-only`, `approval_policy="never"`, disabled
apps/plugins, empty MCP, and explicit Luna/high parent and worker defaults. The CLI
failed before parent startup with `failed to initialize in-process app-server client:
Operation not permitted`. No model request or worker began. A disposable fixture stayed
unchanged because the parent never reached its requested write attempt. A separate
`codex --version` invocation reports `Operation not permitted` while creating PATH
aliases; no evidence links that warning to app-server startup. `/private/tmp` was
writable by the caller. `codex login status` and `codex doctor` showed ChatGPT auth
configured; user config listed two MCP servers, which the attempted invocation
overrode with an empty set. The shell ran inside the managed workspace-write caller,
not an ordinary unsandboxed Terminal. Available logs do not distinguish an enclosing
caller sandbox, macOS Seatbelt denial, app-server process startup denial, or another OS
permission; there is no evidence for a CLI defect, config/auth error, or temp-directory
cause.

That failure was confined to the managed workspace-write caller: a fresh native CLI
invocation through the local Agent Runtime service, whose process ancestry ended at
`launchd` rather than the failed caller, started successfully with a separate temporary
`HOME`/`CODEX_HOME` and the same installed CLI. This rules out a general CLI startup,
authentication, model-catalog, or project-config failure. The earlier trace still does
not identify which nested caller restriction denied in-process app-server startup; it
does not prove that macOS Seatbelt alone was responsible.

Two real read-only smoke sessions then spawned exactly two direct workers each, with no
recursive delegation. The first parent thread was
`01a19392-ada6-7c21-b823-289b78c1f928`; its workers were
`01a19392-c0dd-7d51-b577-5ed3f94c45b0` and
`01a19392-c8f1-7850-81e3-1f962c9599b7`. Worker A's one append attempt against a
disposable repository fixture returned `PermissionError: [Errno 1] Operation not
permitted`; the fixture SHA-256 was identical before and after, and the host removed
it. The repository diff remained limited to the authorized Task 005 files.

The second isolated run's rollout `turn_context` records show the parent
`01a19393-7445-70f2-a5d6-9276454d0690` and workers
`01a19393-85e6-77a2-82e3-43118beaa002` and
`01a19393-8de4-77e3-aee5-02588364b02c` each used model `gpt-6-luna`, effort `high`,
`approval_policy=never`, and `sandbox_policy.type=read-only`. Both workers' recorded
`parent_thread_id` points to that parent. Each invocation used a minimal temporary
Codex home containing only the copied Codex login state and project trust; `mcp_servers`
was explicitly empty and apps/plugins were disabled. Rollout homes and login copies
were removed after collecting the metadata. Codex 0.158.0 does not expose a complete
advertised built-in tool list in `turn_context`; the runs did show native delegation
and shell use. The effective external connector set was empty by isolated config and
startup overrides, rather than inferred from role prompts.

This establishes the required smoke boundary for the bounded read-only research
invocation below. It does not attribute the earlier nested-caller `EPERM` to one
specific macOS permission mechanism, and it does not authorize a lexical fanout beyond
the repository's existing candidate and editorial gates.

## Codex CLI runtime and isolation

Run separate fresh sessions; never run research workers under a writable integration
writer. After CLI upgrades, check `codex --version`, `codex exec --help`, and the current
[Codex configuration reference](https://developers.openai.com/codex/config-reference/).
The bounded research invocation is:

```sh
isolated_root=$(mktemp -d /private/tmp/codex-research.XXXXXX)
trap 'rm -rf "$isolated_root"' EXIT
isolated_home="$isolated_root/home"
codex_home="$isolated_root/codex"
mkdir -m 700 "$isolated_home" "$codex_home" "$isolated_root/tmp"
cp "$HOME/.codex/auth.json" "$codex_home/auth.json"
chmod 600 "$codex_home/auth.json"
printf '[projects."/Users/tienphat/Developer/english-learning"]\ntrust_level = "trusted"\n' > "$codex_home/config.toml"
chmod 600 "$codex_home/config.toml"
env -i PATH="$PATH" HOME="$isolated_home" CODEX_HOME="$codex_home" TMPDIR="$isolated_root/tmp" \
  codex exec --strict-config --sandbox read-only \
  -c 'model="gpt-6-luna"' -c 'model_reasoning_effort="high"' \
  -c 'agents.default_subagent_model="gpt-6-luna"' \
  -c 'agents.default_subagent_reasoning_effort="high"' \
  -c 'approval_policy="never"' \
  --disable apps --disable plugins -c 'mcp_servers={}' \
  -C /Users/tienphat/Developer/english-learning \
  'Review only assigned bounded claims; spawn at most four independent specialists; return findings only.'
```

The isolated homes preserve only the Codex login and the trusted-project marker; do not
copy the owner's full user config, plugins, or MCP definitions. Keep temporary login
copies until the process finishes, then remove the isolated root. The environment
allowlist excludes inherited variables, but does not prove host secret files are
unreadable. Inspect effective parent and worker metadata. Workers inherit the parent's
sandbox and MCP set. If any write-capable connector remains or credential exposure
cannot be bounded, do not claim isolation. Never use
`--dangerously-bypass-approvals-and-sandbox`, broaden filesystem access, or disable OS
sandboxing to make a smoke test pass. Do not use `--ephemeral` for a parent expected to
spawn workers; the installed CLI's prior pilot could not resolve the parent's rollout.

For a separately authorized integration writer, use the existing owner-specified
workspace-write invocation with apps/plugins disabled and empty MCP. `workspace-write`
can write beyond a task's file list; scope and self-approval remain policy-level. Never
change `~/.codex/config.toml` or use an out-of-scope connector to widen authority.

## Handoff: no implicit promotion of authority

**Owner → Architect:** scope and authorization are supplied by owner. Architect remains read-only and supplies a task specification: target/repo, **exact baseline HEAD**, mission, scope/non-goals, allowed and forbidden operations, inputs, acceptance criteria, data integrity/security constraints, and reproducible verification commands. Recommendations do not grant any credentials.

**Architect → Research:** bounded candidate IDs/questions, read-only tool limits, evidence format and worker budget. Workers return observed facts, paths/claim IDs, sources and rights classification, uncertainties, competing hypotheses and suggested tests. Findings are **not** code changes, authenticated editor decisions, evidence of reuse rights, or approvals.

**Architect/Owner → Writer:** only explicit owner task authorizes one writer for specified paths/operations. Check local/remote HEAD and clean tree; reject drift or concurrent edits. Review worker output as **untrusted data**, independently validate against schema, graph, identity, provenance and publication gates. No worker can appoint reviewers or turn a suggestion into an authenticated `EditorialReview`. Git commits do not imply publication.

**Writer → CI → Architect:** writer reports exact changed files and commit SHA, executed test commands/results, CI run and **exact tested SHA**, credential/data mutations (including **none**), security constraints, unresolved findings and `PASS/PARTIAL/FAIL`. Architect independently inspects commit, tests, CI and remote state **without editing anything**. CI verification does not waive editorial requirements.

## Session continuity

**Continue the existing session only when all are true:** same task ID/mission and executor role; task is still open; pending changes belong to that executor; context remains reliable; and repository plus baseline/current HEAD have been rechecked. Do not rerun a workflow already marked PASS unless its inputs changed.

**Start a new session when any are true:** a task completed; mission or authority changed materially; provider changes between Codex and Antigravity; an independent audit must be separate from the writer; context is lost, noisy, or unreliable; or the old session cannot be resumed. A new session reads repository contracts and handoff first; chat history is not its source of truth.

Every session or executor handoff includes: repository and branch; exact baseline/current HEAD; mission and scope; executor and effective permissions; worktree status and pending-diff ownership; changed files; completed checks and evidence; remaining blockers; and the exact next action. Put this in the task message or final report. Git and existing canonical documents remain the verification source; do not add a session database, memory service, dashboard, or Markdown progress log.

## Enforcement checks and failure modes

- Use a throwaway fixture with `codex exec --ignore-user-config --sandbox read-only` to attempt a file write. Require **OS-level denial**, not merely an agent's refusal. Never test negative mutations against the real repo, GitHub or Atlas.
- Check **effective research parent and subagent tool inventories**, not just `.codex/agents` instructions; especially investigate user-level MCP and apps inherited into subagents. If not observable or isolation cannot be established, mark **POLICY_ONLY** and do not assume a strong guarantee.
- Verify `.github/workflows/schema-conformance.yml`: `contents: read`, no credential references for Atlas, no write or publish step. Runner scratch writes are allowed; repo/remote/data writes are not.
- Use `npm test` on Node 26, plus the existing negative authority/publication tests. Mock callbacks prove only local deterministic logic, **not real reviewer authentication**.
- Verify clean local tree, exact local/remote `main` SHA and completed CI for that same SHA. A pending CI run is `PARTIAL`, not `PASS`.
- Enforcement belongs to **OS sandbox, connector/token scopes, CI GITHUB_TOKEN permissions, GitHub branch rules and Atlas credentials**. A policy can only narrow the agent's intended behavior; it cannot revoke an already supplied token.

## Historical preflight snapshot

The Phase 13 [readiness assessment](../data/reviews/phase13/readiness-assessment.json) remains a historical `NOT_READY` snapshot; this remediation does not rewrite it or promote any lexical data. The former P2 findings must be judged against the current source, focused regression tests, exact `main` commit, and CI result. A future readiness report must retain the state-path TOCTOU limitation and the custom-role TOML limitation above; neither may be presented as an enforced guarantee. No AI output is independent editorial approval.
