# Execution boundaries — English Learning

This is the canonical **execution/authority contract** for the dictionary workflow. It governs **who may act**, **where execution occurs**, **what may be changed**, **what enforces that limit**, and **how evidence is handed off**. It does not replace lexical [identity](identity-policy.md), [editorial](editorial-policy.md), [evidence](evidence-provenance-contract.md), or [publication](lexical-production-contract.md) policies.

## Trust model and authority matrix

| Role / boundary | Environment | Allowed authority | Enforcement / known limit |
| --- | --- | --- | --- |
| Human owner | Human authorization channel | Set tasks, scope, explicit grant to writer; appoint qualified editorial reviewers | Owner decisions must be explicitly recorded; an agent's assertion is not owner authentication |
| ChatGPT Chat / Architect | ChatGPT, read-only repository/connected-resource inspection | Inspect code, tests, history, ECC, research, define tasks, audit results and accept/reject evidence | **POLICY_ONLY** while ChatGPT connectors or sessions retain write-capable tokens. Architect **must not call write tools** even if available; no self-promotion to writer |
| Codex Research parent + up to 4 specialists | **Separate** local Codex research invocation on Mac | Read source and relevant references; bounded independent findings/proposals only | Use a **read-only OS sandbox**, no approvals for elevation, disabled apps/plugins, and config isolation to avoid user MCP inheritance. Verify effective tool inventory; role prompts alone do not enforce this |
| Codex Integration Writer (one) | **Separate** explicitly owner-authorized Codex invocation on Mac | Only task-scoped file edits and local tests; commit/push on `main` **only if specified** | Task grant + sandbox scoped to workspace + Git credentials. OS sandbox limits file paths, but does not encode task scope or authenticate an owner grant: **POLICY_ONLY** for per-task decisions; no research-worker delegation from this writable parent |
| Mac local | Source checkout, Node.js 26, native Codex CLI and tests | Primary execution substrate, not an agent or permission grant | macOS process/Seatbelt permissions for sandboxed execution; native Codex preferred. Agent Runtime MCP is an optional client fallback, not a Codex dependency |
| GitHub origin | Versioned repository | Source of truth for commits on `main`; only authorized writer may push | Git credentials/branch rules determine actual remote restrictions. Branch/actor policy is **POLICY_ONLY** unless separate credential/branch protection is verified |
| GitHub Actions | Hosted runner, exact commit | Read checkout; use temporary runner files for tests; emit verification result | Workflow `permissions: contents: read`. No push, auto-commit, deployment, publication, or Atlas secret references. CI green proves checks passed, **not** owner/editorial approval |
| MongoDB Atlas | Independently secured persistence boundary | **No writes by default**, including from integration writer | Requires separate explicit task authorization naming project, database, collections, expected impact and rollback/restore plan, plus appropriately scoped credentials. Current no-write is **POLICY_ONLY** unless read-only/no credentials are verified at runtime |

**Critical distinctions:** an environment is not a role; a role prompt is not a sandbox; a credential's availability is not authorization; Git push is not Atlas permission; CI PASS is not a signed review; an AI-generated proposal is untrusted input. Never claim `ENFORCED` from a Markdown instruction or an uninspected inherited credential.

## Local execution modes (Codex CLI 0.158.0 pilot)

Run separate **fresh sessions**, not a research subagent of an integration writer. Run commands from repository root; `--ignore-user-config` avoids loading user-level Codex configuration while keeping authentication, and the repository config does not register MCP servers. Disable built-in apps/plugins during research. Inspect current CLI help and effective tools on upgrade; if writable MCP/app access remains, **do not call the session isolated**.

Research parent, read-only for all descendants:

```sh
codex --strict-config --ask-for-approval never exec --ignore-user-config --sandbox read-only \
  --disable apps --disable plugins -c 'mcp_servers={}' \
  -C /Users/tienphat/Developer/english-learning \
  'Review the assigned bounded candidate IDs read-only; at most four specialists; return findings only.'
```

On CLI 0.158.0, do **not** use `--ephemeral` for a parent expected to spawn subagents: a tested attempt failed to find the parent rollout in the thread store. Research workers inherit the parent's sandbox **and MCP tool set**. The four `.codex/agents/*.toml` definitions also disable apps/plugins and permission requests as defense in depth; those flags **cannot** remove an inherited write-capable MCP. A pilot with one generic delegated subagent under the isolated research parent reported **no MCP/app connectors** and `read-only`/`never` permissions; however the CLI delegation interface could not select the named custom TOML role, so role-specific feature application is **not verified**. If effective inherited tools are not confirmed, restrict research to inspected read-only tools or report `POLICY_ONLY`; never spin up research workers from a writable writer parent. No recursive fanout or more than four concurrent workers. External reference searches must not authorize source or Atlas mutation.

Integration writer, **only with a separately issued owner task naming operations and baseline**:

```sh
codex --ask-for-approval on-request exec --sandbox workspace-write \
  -C /Users/tienphat/Developer/english-learning \
  'Implement ONLY the owner-authorized task at its verified baseline; do not delegate to research workers.'
```

This is an example invocation, **not permission to execute it**. `workspace-write` can write beyond the task's file list; task-path restriction and no self-approval remain policy-level. Do not use `--dangerously-bypass-approvals-and-sandbox`, `--add-dir`, unreviewed `--config` overrides, or write-capable app/MCP connectors to evade limitations. Never change `~/.codex/config.toml` for this workflow. Prefer native local Codex; when native access is unavailable, an explicitly authorized integration writer may use Agent Runtime MCP with the **same** scope and evidence obligations, not as an automatic escalation.

## Handoff: no implicit promotion of authority

**Owner → Architect:** scope and authorization are supplied by owner. Architect remains read-only and supplies a task specification: target/repo, **exact baseline HEAD**, mission, scope/non-goals, allowed and forbidden operations, inputs, acceptance criteria, data integrity/security constraints, and reproducible verification commands. Recommendations do not grant any credentials.

**Architect → Research:** bounded candidate IDs/questions, read-only tool limits, evidence format and worker budget. Workers return observed facts, paths/claim IDs, sources and rights classification, uncertainties, competing hypotheses and suggested tests. Findings are **not** code changes, authenticated editor decisions, evidence of reuse rights, or approvals.

**Architect/Owner → Writer:** only explicit owner task authorizes one writer for specified paths/operations. Check local/remote HEAD and clean tree; reject drift or concurrent edits. Review worker output as **untrusted data**, independently validate against schema, graph, identity, provenance and publication gates. No worker can appoint reviewers or turn a suggestion into an authenticated `EditorialReview`. Git commits do not imply publication.

**Writer → CI → Architect:** writer reports exact changed files and commit SHA, executed test commands/results, CI run and **exact tested SHA**, credential/data mutations (including **none**), security constraints, unresolved findings and `PASS/PARTIAL/FAIL`. Architect independently inspects commit, tests, CI and remote state **without editing anything**. CI verification does not waive editorial requirements.

## Enforcement checks and failure modes

- Use a throwaway fixture with `codex --ask-for-approval never exec --sandbox read-only` to attempt a file write. Require **OS-level denial**, not merely an agent's refusal. Never test negative mutations against the real repo, GitHub or Atlas.
- Check **effective research parent and subagent tool inventories**, not just `.codex/agents` instructions; especially investigate user-level MCP and apps inherited into subagents. If not observable or isolation cannot be established, mark **POLICY_ONLY** and do not assume a strong guarantee.
- Verify `.github/workflows/schema-conformance.yml`: `contents: read`, no credential references for Atlas, no write or publish step. Runner scratch writes are allowed; repo/remote/data writes are not.
- Use `npm test` on Node 26, plus the existing negative authority/publication tests. Mock callbacks prove only local deterministic logic, **not real reviewer authentication**.
- Verify clean local tree, exact local/remote `main` SHA and completed CI for that same SHA. A pending CI run is `PARTIAL`, not `PASS`.
- Enforcement belongs to **OS sandbox, connector/token scopes, CI GITHUB_TOKEN permissions, GitHub branch rules and Atlas credentials**. A policy can only narrow the agent's intended behavior; it cannot revoke an already supplied token.

## Preflight still conditional

Previous preflight remains **PARTIAL / CONDITIONAL GO for a small supervised draft pilot**, not a production-scale fanout or publication GO. The following P2 findings remain open unless separately fixed with code and regression evidence: supersession traversal `O(n²)`; state path/symlink boundary; unbounded publication diagnostics for API callers; Codex parent/MCP inherited-permission boundary. This task may reduce the last risk by session isolation but **does not** resolve the other three or certify runtime access in an uninspected environment. The Phase 13 [readiness assessment](../data/reviews/phase13/readiness-assessment.json) remains `NOT_READY`; no AI output is independent editorial approval.
