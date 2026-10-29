# Phase 2 — Versioned JSON Schema v1

Contracts use **JSON Schema Draft 2020-12**, one independently validated entity per document; no graph embedding or database write. `vocabularies.json` remains the only source for all controlled vocabularies, identifier prefix sets, relation discriminators and sense retirement cardinalities. Generated `*.schema.json` files must not be edited by hand.

## Commands

```sh
npm install --no-package-lock
npm run schema:check
npm test
```

Node.js 22+; Ajv 8.17.1 (Draft 2020-12) is pinned in `package.json`. `npm run schema:generate` deterministically rewrites generated files, while `schema:check` fails on drift. The test harness uses Node's built-in `node:test` plus Ajv (no MongoDB dependency). Fixtures are **synthetic schema-shape examples**, not licensed lexicographic attestations.

## Scope and semantic-validator boundary

- Entity IDs are lowercase prefixed UUIDv7. Registered `mwe_` is intentionally **inactive** and rejected by V1 records and polymorphic references. `LexicalEntry(entryKind=multiword)` has `lex_` identity.
- `alignmentMode` is independent of `editorialStatus`. `verified` on `gloss_only` means verified **gloss only**, not sense alignment. `disputed` data is storable, **not** publication approval.
- Relation source/target prefix constraints come from `relationTypes[]`. `HYPERNYM_OF`/ `PART_OF` orientation, symmetric ASCII sorting, non-self edges, graph cycles, semantic qualifiers, duplicate edges and inverse-view semantics require Phase 3 checks. Draft 2020-12 does **not** compare two arbitrary sibling string values.
- Retired **sense** successor shape follows registry: split 1→2+, merge N→1, duplicate 1→1, invalidated →0. The N-source group, successor new-vs-existing identity, decision approval, incoming edge adjudication and graph referential integrity require Phase 3. Other entity retirement does not pretend to reuse sense-specific transition rules.
- Language ownership/en→vi, target existence/active state, review authority, rights, evidence sufficiency, publication eligibility, Unicode NFC and historical provenance require Phase 3. No reverse equivalence, inverse relation, derivation or family memberships are generated.
- `schemaVersion` is fixed at registry version `1.0.0`; breaking changes require new versioned contracts. Timestamps are nonempty strings in V1, not an assumed BSON Date type. A time-format and revision-policy decision can be versioned separately.

The five governance baseline documents and the ontology/registry are read-only inputs to Phase 2.
