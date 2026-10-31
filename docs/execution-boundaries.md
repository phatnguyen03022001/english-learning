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

## Local execution modes (Codex CLI 0.158.0 pilot)

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
