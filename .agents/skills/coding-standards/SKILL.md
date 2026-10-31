---
name: coding-standards
description: Review or modify Node.js dictionary validators and pipeline code for naming, readability, correctness and maintainability; not for web frameworks.
---
# Coding standards (adapted from ECC)
Activation: implementation or review of JS modules, schemas, generators or tests.
Input: focused task, existing code and tests. Output: minimal patch/review and verification evidence.

1. Follow root AGENTS.md and README.md; load the role-relevant `MUST_READ` context from `docs/execution-boundaries.md` and only task-relevant code, tests, and policy. They override ECC guidance.
2. Preserve Node ESM .mjs conventions, stable canonical IDs, schema and lifecycle contracts. Favor KISS, descriptive naming, narrow error handling and clarity.
3. Extract helpers only for actual reuse. Do not add dependencies, services, APIs or speculative structure.
4. Test direct and transitive consumers; use npm run schema:check, focused node --test and npm test.
5. third_party/ecc/rules/common/coding-style.md is an optional reference, not binding policy. Ignore frontend/API examples.
6. Workers research read-only; the integration writer alone edits.
