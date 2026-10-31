---
name: verification-loop
description: Run dictionary schema, graph, production, stress, diff and CI checks before reporting completion or pushing main.
---
# Verification loop (adapted from ECC)
Activation: before a success claim, commit or push.
Input: authorized diff, expected invariants and baseline HEAD. Output: exact results and blockers.

1. Verify AGENTS.md, git diff --check, scope, identity/schema changes and secrets.
2. On Node 26 LTS run npm ci --ignore-scripts --no-audit --no-fund; npm run schema:check; npm test; npm run test:production; npm run test:stress.
3. Test draft/verified separation, source/rights, replay, CAS, graph, identity and bounded diagnostics as applicable.
4. Benchmark with existing bounded tools; report real resource usage, never extrapolate.
5. Only the integration writer may commit/push main. Verify exact remote SHA, clean tree and CI.
6. Report unverified runtime, independent editorial signoff or Atlas mutation state explicitly; never infer it from static tests.
7. Report target-environment checks separately: VERIFIED/FAILED only when executed, otherwise NOT PERFORMED; local green tests cannot prove live Codex fanout or GitHub Actions status.
