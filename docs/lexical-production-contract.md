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
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run candidates:validate -- --input candidate-batch.json --state .draft/state.json
npm run candidates:prepare -- --input candidate-batch.json --state .draft/state.json --dry-run
npm run candidates:prepare -- --input candidate-batch.json --state .draft/state.json
npm run candidates:check -- --state .draft/state.json
npm run candidates:check -- --state .draft/state.json --full-publication-diagnostics
npm run candidates:revise -- --input draft-revision.json --state .draft/state.json
npm run candidates:promote -- --input gated-promotion.json --state .draft/state.json --dry-run
npm run test:production
npm run benchmark:scale -- --sizes=1000,5000,10000 --cumulative-size=5000 --cumulative-batches=3 --negative-size=10000
```

`validate`, `check`, and `--dry-run` do not write a draft ledger. A successful
`prepare` uses an exclusive lock, a uniquely named temporary file and atomic rename;
the tool does not upload to Atlas, create Git commits, publish, or attest validity.
A batch can be re-run exactly without history mutation. Changed batches, source-item
conflicts, stale CAS revisions, unknown references and duplicate IDs are reported,
never silently corrected.

`candidates:check` returns up to 1,000 publication diagnostics by default, plus
the total and omitted counts. Pass `--full-publication-diagnostics` to retain every
publication issue. The V2 validator's `publicationIssueLimit` option applies the
same diagnostic cap while still evaluating every publication rule and preserving
the exact `eligible` decision. Candidate preparation retains no unused publication
issue objects; schema, graph and lifecycle checks remain complete.

The full scale benchmark is opt-in and writes only inside isolated OS temporary
directories. Each worker has a five-minute timeout and a 1 GiB V8 heap limit by
default; override these with `--timeout-ms` and `--max-heap-mib`. It prints one
JSON result per workload, including Node/V8/platform details, input size, full
snapshot size, phase timings and history/mapping counts. RSS is the process high
water mark. Heap high water is sampled after measured phases because synchronous
validators do not yield for continuous heap polling. Default CI keeps the 1K
cumulative correctness smoke test and does not run the 5K–10K benchmark.

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

## Future audio and IELTS practice boundaries

The V2 lexical contracts reject undeclared fields, so audio binaries, provider
configuration, practice content, attempts, learner progress and scoring state
do not belong in dictionary records. Future pronunciation assets can reference
stable lexical IDs and keep voice, generation provenance, content hashes,
storage references, version history and redistribution decisions in a separate
versioned media contract. The dictionary already represents pronunciation
variety and evidence metadata where applicable; it does not store audio bytes.

IELTS practice can use a separate versioned practice contract for Academic and
General Training content, skills, question formats, passages, recordings,
answer keys, rubrics, test versions, difficulty and attempts. Exercise items may
reference lexical IDs. The current V2 dictionary validator intentionally does
not accept practice records, so that future domain needs its own contract and
validation boundary when it is explicitly scoped. Neither boundary requires a
dictionary schema change now, and structural support alone does not establish
audio redistribution rights or official IELTS format/scoring validity.

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

## Codex lexical fanout for expert-oriented draft production

Goal: repeatable expert-oriented *candidate* generation, **not** independently verified
Fellow-level lexicography, CEFR labels, IELTS scores or corpus statistics.
Select 3–5 bounded lexical families, split independent questions into English semantics,
grammar/phraseology, bilingual alignment and evidence/adversarial QA lanes. For
trivial edits, do not fan out. A maximum of four workers researches in parallel;
workers cannot spawn more workers. The integration writer alone may change Git/files.
Use .codex/agents/ roles and run research under a parent read-only sandbox.
Custom agent text cannot enforce read-only permissions by itself.

Each specialist handoff must state:
- Scope, family and candidate IDs, exact asserted claims and field paths.
- Source title, URL/edition, retrieval date, claimed evidence relevance and reliability.
- Supporting evidence, conflicting attestations and explicit unknowns.
- Redistribution/right-to-use classification; unknown rights never mean permission.
- Proposed corrections and counterexamples, affected records/graph edges, open disputes.
- Exact acceptance checks and whether evidence is independent of the AI proposal.

No competing handoff schema: reconcile into the existing V2 batch shape
(`batchId`, `records`, `candidateId`, `type`, `entity`, optional `sourceItemKey`)
or its existing revision contract. Recommendations are not authenticated editorial
approval. Source-item identity is not independent lexicographic evidence.

Workflow: (1) select bounded lexical families; (2) compare authoritative English
definitions, senses and usage; (3) separate homographs and polysemy by contrastive
evidence; (4) review morphology, grammar, valency, region and register; (5) analyze
natural examples, collocations, phrasal verbs and phraseology; (6) assess contextual
English–Vietnamese equivalence, preserving gloss_only vs sense-aligned identities;
(7) adversarially inspect false equivalence, ambiguity and counterexamples;
(8) writer reconciles conflicts, preserving citations and unresolved disagreements;
(9) verify JSON Schema, graph, canonical identity, cross-batch reuse/replay,
revision CAS, source/rights and fail-closed publication; (10) persist **draft**
candidates and queue independent authenticated editorial and rights review.

Statuses remain `draft`, `provisional`, `verified`, `disputed` and `rejected`;
worker agreement is not authority. Verify learner usability, editorial provenance,
copyright and real redistribution rights before verified release.

### Scale and future consumer boundaries

The current JSON ledger caps individual ingestion at 10,000 candidates, keeps
append-only history and revalidates cumulative graph/snapshot state. It is *not*
unbounded: serialization/reload, history length, memory and graph validation cost
can grow with cumulative records. Existing single-entry stress data is baseline;
mixed entity workloads must be benchmarked separately with real RSS/heap and
edge density. Consider persistence migration only when **measured** production
batch size, latency/memory, snapshot size, or durability requirements exceed
the current bounded implementation. Atlas writes require new authorization.

Media (British/American/Australian/more, audio at word/phrase/sentence level,
Edge TTS or other providers, voices/speed/pitch, content hashes, external storage,
rights and provenance) should live in a separate future versioned media model
that references stable lexical IDs. Do not embed audio binaries/vendor settings
inside canonical records or Git.

IELTS Academic/General Training practice (Listening/Reading/Writing/Speaking,
passages/questions/answers/rubrics/test versions/media/attempts/progress) owns a
different future versioned domain and can reference lexical IDs without changing
dictionary revisions. It cannot be assumed official-equivalent without licensing
or scoring evidence. Consumer references must detect invalid/retired identities
and distinguish draft from verified/publishable data. Retirement/supersession
requires explicit migration decisions, not automatic dangling-reference rewrites.
No media/practice schema, app, API or pipeline is approved by this task.
