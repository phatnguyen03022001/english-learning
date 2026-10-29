# Phase 6 — Lexical Candidate Production Contract (2.0.0)

Status: **machine-checkable draft production; no independently validated dictionary release**.
V1 (16 immutable JSON Schemas) remains a historical contract. V2 is explicitly
additive with a `2.0.0` discriminator, typed learner fields and strict `additionalProperties:false`.
The active V1 ontology, entity IDs, translation directions, and governing five policies remain intact.

## Data and stage boundaries

A candidate batch JSON is:

```json
{
  "batchId": "import-2026-001",
  "records": [
    {"candidateId":"entry-1","sourceItemKey":"provider:release:item-1",
     "entity":{"language":"en","lemma":"illustration","pos":"NOUN",
       "entryKind":"word","lifecycleStatus":"active","editorialStatus":"draft"}},
    {"candidateId":"sense-1","type":"sns",
     "entity":{"entryId":"candidate:entry-1","definition":"Synthetic example only",
       "lifecycleStatus":"active","editorialStatus":"draft"}}
  ]
}
```

- `batchId` is immutable per payload. A changed payload with an existing batch ID is a **conflict**.
- `candidateId` resolves within a batch, never as a canonical ID. `candidate:<candidateId>` explicitly resolves dependencies inside that batch.
- Optional `sourceItemKey` is a namespaced, stable external source-item identity. Exact matching normalized payload across batches reuses the canonical ID. Divergent payload conflicts. It is **not** a source citation, independent evidence or permission.
- `language + lemma + POS` is only a homograph/duplicate **hint**. It is neither a stable ID nor a reason to merge senses.
- New canonical IDs are immutable, lowercase prefixed UUIDv7 (RFC 9562); a record receives one ID only when the prepared state is persisted. State preserves `mappings`, `sourceMappings`, `batches`, `records` and append-only `history`.
- Unicode NFC is applied to lexical `lemma` and `form` for normalized replay; original source attestations are never silently rewritten. Vietnamese diacritics remain meaningful.
- A batch is bounded to 10,000 candidates; failure leaves the previous state untouched. Every accepted batch is schema-first validated by Ajv 8.17.1 and graph-validated, including all existing records.
- Graph, evidence, rights, and review gates are separate. Candidates cannot be implicitly promoted by `prepare` or `revise`.

## Commands (Node.js 22, no database)

```sh
npm install --no-package-lock --ignore-scripts --no-audit --no-fund
npm test
npm run candidates:validate -- --input candidate-batch.json --state .draft/state.json
npm run candidates:prepare -- --input candidate-batch.json --state .draft/state.json --dry-run
npm run candidates:prepare -- --input candidate-batch.json --state .draft/state.json
npm run candidates:check -- --state .draft/state.json
npm run candidates:revise -- --input draft-revision.json --state .draft/state.json
npm run candidates:promote -- --input gated-promotion.json --state .draft/state.json --dry-run
npm run test:production
```

`validate`, `check`, and `--dry-run` do not write a draft ledger. A successful
`prepare` uses an exclusive lock, a uniquely named temporary file and atomic rename;
the tool does not upload to Atlas, create Git commits, publish, or attest validity.
A batch can be re-run exactly without history mutation. Changed batches, source-item
conflicts, stale CAS revisions, unknown references and duplicate IDs are reported,
never silently corrected.

A draft revision file is `{"revisionId":"review-edit-1","changes":[{"canonicalId":"sns_<existing-uuidv7>","expectedRevision":1,"set":{"definition":"Replacement candidate definition"}}]}`.
Only active draft records may be edited; immutable ID, lexical identity, lifecycle,
editorial status and evidence references are explicitly protected. A successful revision
increments `revision` and records complete `before`/`after` snapshots. Replay
using the same `revisionId` and content digest has no effects. Changed revision IDs
require an explicit fresh revision and current expected revision. No merge by similarity.

For recovery, preserve the last committed state JSON and rerun the same batch or revision.
Do not delete the lock file while another process may own it. Conflicting operations
need explicit editorial reconciliation, not a forced overwrite. Files under `.draft/`
are ignored by Git by default; a GitHub-hosted runner has ephemeral storage and
needs an explicitly supplied persisted state on a later run. CI does not implicitly
promote, commit or transport lexical data. Retain state backups securely under
authorized data governance; a local state file is not an authenticated source of truth.

## Learner contract

V2 has optional structured `LexicalSense.grammar` (countability, transitivity),
`usageRestrictions`, `domain`, `contrastiveNotes`, linked construction IDs,
and nested examples with `exampleType`, status, optional `vi`, translation evidence
state, register/variety and `evidenceIds`. `Construction.grammar` models complement
types, required prepositions, pronoun placement, separability and sense applicability
without parsing English syntax. `LexicalForm` can record pronunciation variety and
evidence. `TranslationEquivalence` remains EN-to-VI, sense-centric and directional;
`gloss_only` never becomes a synthetic Vietnamese sense. Missing learner metadata stays
missing/unknown; typed shape is **not** proof of an English usage rule.

## Output categories

CLI `prepare` reports `status`, batch digest, canonical record IDs, possible duplicate
inventory, missing evidence IDs, review queue, and `publicationEligible:false`.
`check` returns schema/graph storage diagnostics separately from publication issues.
Drafts are intentionally not independently reviewed or publication-ready.

## Explicit promotion boundary

A promotion request contains a permanent `promotionId` and
`subjects: [{"canonicalId":"lex_<existing-uuidv7>","expectedRevision":1}]`.
`promoteCandidates` builds a **temporary** verified snapshot, checks storage/graph
and then `evaluatePublication` over selected subjects and dependencies, using
independently verified owner appointments, claim evidence and source rights.
Only if every gate succeeds does it atomically persist the verified status,
revision increments and complete before/after history. Failed promotion is
recoverable with no ledger mutation; stale CAS and changed promotion IDs conflict.
The production CLI intentionally **does not have** trusted appointment/evidence/
rights verification providers; `candidates:promote` must return BLOCKED rather
than issue self-approvals. The pure module supports a future owner-authorized,
trust-backed integration. Mock trust providers in tests prove only behavior, not
genuine editorial or legal approval. No published dictionary content results from
these synthetic tests.
