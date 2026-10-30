# Phase 9 — Evidence-Guided Lexical Candidate Remediation

## 1. Status

- **REMEDIATION:** PASS on the implementation snapshot and correction ledger.
- **CANDIDATE ENGINEERING:** PASS; V2 schema/graph and dry-run gates passed in GitHub Actions.
- **LEXICAL QUALITY:** PROVISIONAL / PARTIALLY SUPPORTED.
- **HUMAN REVIEW:** PENDING.
- **PUBLICATION:** NOT READY.

This phase applies only the ten items in the Phase 8 `correctionQueue`. It does not conduct new source research, expand the word inventory, change schemas, or promote candidates.

## 2. Snapshot and identity handling

The Phase 7 file `data/candidates/pilot-fanout-001.json` remains byte-for-byte historical evidence. Phase 8 continues to reference that source snapshot and its original claim paths.

The corrected replacement is `data/candidates/pilot-fanout-002.json`, with a new immutable batch ID. It retains all 53 original candidate IDs and all existing `candidate:` references. One additional draft construction is attached to the existing `sense-run-machine` candidate to represent the separately attested transitive frame while preserving the intransitive frame. This changes the record count from 53 to 54: 13 lexical entries, 1 family, 15 senses, 9 constructions, and 16 gloss-only translations. It adds no lexical entry or sense.

Use snapshot 002 instead of snapshot 001 only for ingestion attempts that have not started. The repository inspection found no tracked persisted candidate ledger; no external ledger or Atlas was accessed. Therefore batch-local references are preserved, while continuity to any canonical IDs in an external store is unproven. If batch 001 has already been persisted externally, do not ingest batch 002 as a second batch; resolve the existing canonical records through an authorized identity mapping and CAS revision first.

All records remain draft. No `sourceItemKey`, canonical `_id`, evidence ID, review, decision, or publication approval was created. Snapshot 002 digest (SHA-256 of exact UTF-8 bytes, including trailing newline): `d203048c769d6e033f219dc58531d3db9c87c59a00ec8482f9748a3005cab805`.

## 3. Correction matrix

| Item | Action | Previous value | Revised value | Phase 8 evidence | Result |
|---|---|---|---|---|---|
| COR-001 | Set noun countability; preserve one sense and defer bilingual process/result mapping. | Countability absent; usage note said unresolved. | `grammar.countability: both`; note says countable and uncountable uses are attested, while process/result Vietnamese wording remains contextual and pending. | `SRC-OALD`; Phase 8 countability claim was CONTRADICTED. | CORRECTED |
| COR-002 | Separate direct object from optional source complement. | `requiredPrepositions: ["from"]` despite optional pattern. | `requiredPrepositions: []`; complements name the direct object and optional `from` source separately. | `SRC-OALD`, `SRC-COLLINS`; Phase 8 contradiction was direct. | CORRECTED |
| COR-003 | Represent both valencies without splitting the sense. | Sense transitivity was `intransitive`; only one intransitive construction. | Sense transitivity `ambitransitive`; retained intransitive frame and added `run + NP (machine or program)` draft construction. | `SRC-OALD`, `SRC-COLLINS`; both patterns are reported, but shared sense boundary remains provisional. | CORRECTED |
| COR-004 | Narrow subject restrictions to the supported intransitive frame. | Machine/system/**process** subject; constraint extended to process. | Machine or system subject only for the intransitive functioning frame. | `SRC-OALD`; process was not directly supported. | CORRECTED |
| COR-005 | Broaden `analyse` definition beyond partitioning. | Careful examination defined through separating into parts/aspects. | “Examine something carefully and in detail, sometimes by considering its parts or aspects.” | `SRC-OALD`; supports detailed examination; paraphrase is an editorial candidate. | CORRECTED |
| COR-006 | Broaden the adjective definition without adding senses. | Analytical defined only as careful part-based examination. | “Involving careful, systematic examination or logical reasoning, including methods used to study information or data in scientific work.” | `SRC-OALD`; supports analytical thinking/method uses; specific scientific subuses still need review. | CORRECTED |
| COR-007 | Keep entry boundary and number pending. | `homographNumber: 1`. | Unchanged; recorded as a provisional editorial proposal, not canonical identity. | `SRC-OALD`, `SRC-COLLINS`; dictionary headword grouping does not settle entry-vs-sense treatment. | DEFERRED |
| COR-008 | Clarify contextual alternatives without selecting a default. | Restrictions implied “hoạt động” was the candidate default and “vận hành” was not selected. | Both remain approximate, gloss-only, context-specific candidates; preference between them is explicitly pending bilingual review. | `SRC-OALD`, `SRC-VDICT`, `SRC-VTUDIEN`; no exact one-to-one equivalence is established. | CLARIFIED |
| COR-009 | Preserve limited `large` context and pending restrictions. | Physical size/extent gloss; collocational restrictions pending. | Unchanged; no free substitution or invented collocation evidence. | `SRC-OALD`, `SRC-VDICT`; extent, quantity, register, and collocation need contextual review. | DEFERRED |
| COR-010 | Keep family membership editorial and provisional. | `familyBasis: editorially_related`. | Unchanged; no derivation or graph edge asserted. | `SRC-REPO` is governance context only; independent morphology evidence is absent. | DEFERRED |

The exact field paths, before/after values, phase 8 assessment references, source IDs, limitations, and review requirements are in `data/reviews/phase9-correction-ledger.json`.

## 4. Evidence grounding and learner impact

The two direct contradictions are corrected using the Phase 8 findings: `analysis` has countable and uncountable uses, and `borrow + NP` does not require a source phrase introduced by `from`. The run change preserves the valid “the engine runs” frame and separately records the reported “run a machine/program” frame. It does not decide whether those patterns share a canonical sense. The subject restriction no longer includes an unsupported process class.

The `analyse` definition no longer teaches that analysis must divide an object into parts. The `analytical` definition now covers systematic and logical examination. These are paraphrases, not copied commercial definitions.

The Vietnamese `run` alternatives stay gloss-only, approximate, and evidence-pending. `large` remains scoped to physical size or extent; a shared `lớn` gloss does not imply unrestricted substitution with `big`. Bank numbering and the analyse-family relation remain editorial proposals.

All source records remain reference-only unless separately cleared for reuse. The source evidence does not validate the original Vietnamese examples; all examples remain draft and their translations unreviewed.

## 5. Remaining human review queue

- LER decision on the bank entry/sense boundary and provisional homograph numbering.
- LER and grammar review of whether transitive and intransitive machine `run` uses form one sense or distinct senses, plus exact object and subject scope.
- Grammar review of `analysis` countability representation and the `borrow` frame.
- Independent bilingual review of `analysis` process/result wording; both `run` alternatives and their contexts; `big/large`; and all other gloss-only candidates.
- Morphology/lexicography review of `analyse / analysis / analytical` family membership; no derivational edge has been added.
- English usage and Vietnamese translation review for all authored examples.
- Rights review for all sources and any future reuse.
- Authorized LER, evidence/licensing, and data-integrity approvals before any verified promotion.

## 6. Validation and publication safety

The Phase 9 regression suite checks the immutable Phase 7 digest, candidate IDs and references, scoped inventory change, all ten ledger items and exact before/after values, the corrected snapshot digest, historical dossier linkage, draft-only/gloss-only status, and candidate dry-run purity. GitHub Actions runs on Ubuntu with Node.js 22 and validates both candidate snapshots; the candidate CLI must report `status=dry-run`, no schema/graph issues, `publicationEligible=false`, no state file, and unchanged input bytes.

GitHub-hosted Ubuntu validation passed on implementation commit `8df293d11902d220682a083eaf111e49003f8fec` using Node.js `v22.23.4` ([run 58](https://github.com/phatnguyen03022001/ielts-tradition/actions/runs/41004473857)). The run reported 191/191 core regressions, 63/63 production regressions (54 existing plus 9 Phase 9), 9/9 dedicated Phase 9 tests, and 2/2 Phase 8 dossier tests. Both Phase 7 and Phase 9 CLI checks returned `dry-run`, zero issues, `publicationEligible: false`, no state file, and unchanged input bytes. This evidence is for the stated implementation SHA; final report-commit CI and remote-HEAD equality are recorded in the Phase 9 task handoff.

Publication remains blocked. No Phase 8 assessment has been converted to a verified state, and no evidence, LER decision, rights clearance, or approval record has been fabricated.
