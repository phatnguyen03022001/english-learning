# Phase 6 — Engineering and Lexicographic Readiness

Status is intentionally separated:

| Layer | Meaning |
| --- | --- |
| Engineering | Deterministic V2 schemas/validator, safe candidate preparation, persistent identity mappings, bounded batch processing, revision CAS/history, scoped publication checks, compatibility and regression |
| Lexicographic evidence | Independent accuracy/sense/valency/translation assertions and source checks; these are **not established** by synthetic tests |
| Publication | Only eligible when genuine appointed LER and specialists, externally verified source rights and all claim-specific evidence have been supplied |

## Golden candidate review queue

`tests/fixtures/production/golden-candidates.json` covers six synthetic pilot families:
`bank`, `run`, `analyse-family`, `big-large`, `depend-on`, `look-up`.
Each includes learner risks, required review types, **eight independent QA dimensions**,
explicit evidence limitations and `pending_independent_review`. They are **candidate benchmarks**, not human-approved
gold definitions, translations, grammar restrictions, corpus claims or licensed release
content. Independently reviewed count: **0**. Approved-for-publication count: **0**.
Pending family review count: **6**. Sense-by-sense accuracy, translation fidelity,
grammar, collocation, idiomaticity, usefulness and legality remain human gates.

## QA gates and historical limitations

`npm test` includes all frozen Phase 2–5 tests and additional Phase 6 regression
tests; GitHub Actions uses Ubuntu/Node.js 22 and pinned Ajv 8.17.1. Stress tests
measure bounded actual runner runtime and RSS without timing SLA or flaky thresholds.
The old V1 quadratic publication review scan is indexed while diagnostic behavior
remains unchanged.

V2 lifecycle rules reject omitted incoming-edge decisions and mismatched consumed
transitions, but no V1 snapshots or self-reported historical creation reference can
prove external identity/owner approval retroactively. Those remain evidence gaps.
The pipeline is a standalone CLI and JSON draft ledger, not an application, server,
database migration, search engine or automated linguistic truth classifier.

Blocking outside requirements: independently verified linguistic/translation/grammar
evidence, real owner-signed reviewer appointment and revocation provenance, legal
rights assessment for each intended use, and a genuinely reviewed golden sample.
Atlas deployment has not been authorized or attempted in Phase 6.

## Independent benchmark acceptance procedure

`assessGoldenQA` requires human-submitted, per-family review decisions for each
of the eight axes, cited independent evidence, reviewer identity, an external
authenticated review verifier and separate rights verification. A failed axis
cannot be averaged out by other passes. Missing approvals remain pending;
verified *linguistic QA* is **not publication permission** and must still pass
the independent publication gate. No test-only mocked authority counts as a
real review. The committed six families still have no submitted approvals.
