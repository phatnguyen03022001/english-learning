# Phase 3 — Deterministic Semantic and Graph Integrity (V1)

Node.js 22. No app, MongoDB, network, graph database, or macOS requirement.
Ajv 8.17.1 (already pinned) validates every record first; graph validation is pure and offline.

## Usage

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

```js
import { validateDataset } from "./validators/validate-dataset.mjs";
const result = validateDataset({records: []}, {publication: false});
```

`validateDataset` is schema-first and uses the exact V1 schema for each prefix. On any
Ajv failure the result has `stage: 'schema'`, `valid: false` and `SCHEMA_INVALID`
diagnostics; graph validation is never reported as successful.
`validateGraph` is a lower-level, side-effect-free interface for already
schema-validated arrays or `{records: [...]}`. Neither mutates the supplied data.

## Outcomes

`valid` / `issues` indicate storage graph validity, except that
`{publication: true}` includes publication blockers in the main issue list.
`publication.eligible` / `publication.issues` separately represent eligibility.
All diagnostics are deterministically sorted and have `code`, `entityId`, `path`, and `message`.
Draft, disputed and rejected records are storable but cannot be published as verified.
An empty dataset has no claims to publish. A verified Vietnamese gloss is still a gloss,
not a verified sense-to-sense relationship.

## Guarantees and limitations

- Typed entity references and audit references, UUIDv7 / inactive mwe_ via Ajv,
  duplicate IDs, live references to retired entities, EN/VI sense-to-entry ownership.
- Relation endpoint signature and cycle policy come from registry relationTypes[].
  Sense-to-sense lexical relations are monolingual: resolve the owning LexicalEntry
  of both endpoints and compare BCP 47 primary language subtags (e.g. en/en-GB).
  A mismatch emits `RELATION_LANGUAGE_MISMATCH` on the relation's `targetId`.
  Missing or retired endpoints/parents preserve their own reference/lifecycle diagnostics;
  no speculative language error is emitted without two active resolved entries.
  This restriction does not apply to entry-to-entry `DERIVED_FROM` in V1;
  its linguistic validity still requires independent evidence.
  English–Vietnamese sense linkage remains directional `TranslationEquivalence`,
  whose existing V1 source language rule is unchanged.
  Symmetric ASCII ID order, semantic duplicate detection and self-loop blocking;
  per-type DFS cycle detection for topology and cyclePolicy=reject, no generic DAG.
- Qualifier keys use registry field order, Unicode NFC, preserving Vietnamese accents,
  case, semantic whitespace, missing versus present qualifiers and different contexts.
- No inverse edges, automatic reference redirect, evidence union, transitive synonym,
  family-inferred derivation, or lexical/translation creation.
- Retirement and editorial decision references, transition group consistency and
  basic cardinality are checked. Snapshot identity and independent provenance
  cannot prove a successor is actually new or was already canonical.
- No owner-appointed LER proof, legal rights attestation, or per-incoming-edge
  resolution authority is encoded in V1. These are reported as
  INSUFFICIENT_EVIDENCE and publication fails closed, even if editorialStatus
  says verified or a source contains a textual permittedUse field.

Tests use synthetic graph fixtures at tests/fixtures/graph/v1 with add/patch/remove
operations. They do not assert licensed vocabulary, authentic corpus evidence or
editorial approval. No changes to governance baseline, ontology, registry or Atlas.
