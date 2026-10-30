# Phase 8 — Evidence-Based Lexicographic Quality Review

## 1. Execution status

- **REAL FANOUT:** PASS. Four specialists were spawned in parallel, worked read-only, returned structured handoffs, and completed a second adversarial cross-review using the same four threads.
- **EVIDENCE RESEARCH:** PASS for the scoped pilot. Public English and Vietnamese reference pages were opened and paraphrased; unsupported claims remain explicitly unresolved.
- **CANDIDATE INTEGRITY:** PASS. The 53-record Phase 7 source was not changed, canonical IDs were not invented, and the dossier points only to batch-local candidate references.
- **LEXICOGRAPHIC ACCURACY:** PROVISIONAL / PARTIALLY SUPPORTED. Evidence supports many narrow English claims, while several claims are contradicted, contested, or incomplete.
- **HUMAN REVIEW:** PENDING.
- **PUBLICATION:** NOT READY.

This report evaluates the existing batch; it does not create or correct lexical records. The dossier is a research artifact, not an authenticated V2 Evidence or EditorialReview record.

## 2. Batch and coverage

Source: [data/candidates/pilot-fanout-001.json](../data/candidates/pilot-fanout-001.json), read at commit `733a4d137caf97581e83716e124804d685e315af`.

- Batch: `pilot-fanout-001`
- Records: 53
- Inventory: 13 `lex`, 1 `fam`, 15 `sns`, 8 `con`, 16 `eqv`
- Raw candidate SHA-256: `788d39e878d72104560f62c3b5298bc74348a90af2f0acbbbf1bda632f8705a4`
- All records remain `editorialStatus: "draft"`.
- All 16 equivalences remain `alignmentMode: "gloss_only"`, `translationEvidenceStatus: "evidence_pending"`, with empty `evidenceIds`.
- All 15 sense examples remain `editorial_original`; their Vietnamese translations remain `unreviewed`.

The dossier contains 232 field-level assessments. These are not one-claim-per-record counts:

| Status | Claims |
|---|---:|
| SUPPORTED | 147 |
| CONTRADICTED | 2 |
| CONTESTED | 26 |
| INSUFFICIENT_EVIDENCE | 55 |
| SOURCE_UNAVAILABLE | 0 |
| NOT_APPLICABLE | 2 |

`SUPPORTED` means that external research supports the narrow proposed claim. It does not mean human verification, rights clearance, LER approval, or publication eligibility.

## 3. Real agent fanout evidence

| Agent | ID | Task and handoff | Cross-review |
|---|---|---|---|
| Hooke | `01a18b03-00c0-73ff-b954-d51cae338081` | Semantic lexicographer; audited 13 identities and 15 senses, source-backed boundaries and omissions. | Reviewed bank entry boundary, run machine valency/translation, analysis process-result, big/large, and advice. |
| Dalton | `01a18b03-16fa-746a-a849-95b8332910a6` | Grammar/phraseology; audited 8 constructions, POS, valency, countability, prepositions, separability. | Rechecked equivalence-related grammar, negative claims, optional/required prepositions, and role frames. |
| Harvey | `01a18b03-102e-73e3-92ab-abc30b381091` | English–Vietnamese equivalence; audited all 16 gloss-only records and target-language role/context risks. | Rechecked whether English grammar was being incorrectly transferred into Vietnamese equivalence. |
| Averroes | `01a18b03-0776-74e4-b226-3c739d71b0b1` | Evidence/licensing/red-team; audited provenance, rights boundaries, unsupported confidence, and publication safety. | Red-teamed all three specialist findings and preserved blockers. |

This was real multi-agent execution, not simulated role separation. No specialist edited repository files, committed, assigned LER authority, or created approval records. Agent agreement was not counted as independent linguistic verification.

## 4. Sources evaluated

Sources were opened/read on 2026-10-30 UTC and paraphrased rather than copied.

- Oxford Advanced Learner’s Dictionary, Oxford University Press: entries for all 12 lexical targets. It supplied monolingual definitions, POS, countability, transitivity, valency and usage-pattern evidence. The pages are reference-only; reuse permission was not established.
- Collins English Dictionary / COBUILD, HarperCollins: independent English-side corroboration for selected identity, sense and grammar findings. Reuse permission was not established.
- British Council LearnEnglish: separable phrasal-verb word order, pronoun placement and double-object guidance. General pedagogical evidence, not a complete entry-specific dictionary.
- VDict: bilingual mappings and Vietnamese usage distinctions for selected glosses. Provenance and edition were not stated; the provider’s pages are not independent of one another.
- VNDIC 4in1: process/result interpretation for `analysis`.
- Vtudien: Vietnamese `vận hành` interpretation.
- Repository contracts at the reference commit: evidence, rights, LER and publication constraints. These are normative workflow sources, not independent linguistic evidence.

Public accessibility was never treated as a redistribution licence. No proprietary definition or corpus example was copied into the candidate data or dossier.

## 5. Eight QA axes

The dossier uses the existing `validators/golden-qa.mjs` dimensions exactly:

1. `sense_boundary_accuracy`
2. `translation_fidelity`
3. `grammar_accuracy`
4. `idiomaticity`
5. `collocation_validity`
6. `learner_usefulness`
7. `evidence_sufficiency`
8. `license_compliance`

No average score hides a high-impact contradiction. The field-level dossier preserves separate semantic, grammar, translation, example, evidence and rights findings.

## 6. Principal findings

1. **`analysis` countability is contradicted.** The candidate says countability remains unresolved, while OALD documents both countable and uncountable uses. This is the clearest direct learner-facing error. Correct to a reviewed `both` treatment; do not automatically split process/result into separate English senses.

2. **`borrow` has an internal grammar contradiction.** `borrow + NP (+ from + NP)` describes `from` as optional, but `grammar.requiredPrepositions` lists `from` as required. This can teach learners that “borrow a book” is incomplete.

3. **Machine `run` is constructionally incomplete.** The intransitive “the engine runs” frame is supported, but English also allows transitive operation frames such as running a machine or program. Do not split the sense automatically; scope the candidate construction and add a reviewed transitive frame later.

4. **The machine `run` Vietnamese alternatives are context-sensitive.** `hoạt động` is the neutral functioning hypothesis; `vận hành` is more operator/technical-oriented. The pair is not a universal one-to-one choice and remains contested for learner publication.

5. **`bank` meanings are distinct, but entry boundary remains editorial.** Financial and river meanings should not be collapsed semantically. Whether they become separate canonical entries or one entry with distinct senses is unresolved; `homographNumber` is not a canonical identity.

6. **`analyse` is too narrowly defined.** Its part-based wording misses broader detailed examination uses. The transitive `analyse + NP` construction is supported, but the definition needs a minimal semantic broadening before promotion.

7. **`analytical` is underspecified.** The candidate compresses logical, systematic and scientific uses into a narrow “separating into parts” description. Review should broaden the adjective definition or add carefully scoped variants.

8. **`big` and `large` overlap without being unrestricted substitutes.** A shared Vietnamese `lớn` gloss does not establish English synonymy. Register, quantity/extent and collocation restrictions need concrete bilingual and English usage review.

9. **`borrow`/ `lend` semantic roles are high-risk but directionally sound.** The borrower is the temporary recipient/user; the lender is the provider. Money contexts require separate `vay`/ `cho vay` review. English-role evidence does not by itself prove Vietnamese valency.

10. **`advice` ordinary countability is supported, but the optional Vietnamese variant is not settled.** Ordinary English `advice` is uncountable; `lời khuyên` is a plausible primary gloss. `lời tư vấn` should remain context-limited and pending bilingual review.

## 7. Cross-agent conflicts preserved

The coordinator did not resolve disagreements by majority vote.

- Bank: distinct meanings versus one dictionary headword page. Preserved as `CONTESTED`.
- Run machine: valid intransitive frame versus broader transitive operation frame. Preserved as a construction/scope conflict, not an automatic sense split.
- Run machine translation: `hoạt động` versus `vận hành`. Preserved as contextual alternatives.
- Analysis: one broad English noun sense versus process/result Vietnamese variants. Preserved with countability contradiction and translation review queue.
- Big/large: shared gloss versus English collocation/register differences. Preserved as overlap without free substitution.
- Advice: ordinary `lời khuyên` versus possible consultation `lời tư vấn`. Primary gloss retained only as a narrow research finding; optional variant remains insufficient.

## 8. Minimal correction queue

The exact field-level queue is in [data/reviews/phase8-evidence-dossier.json](../data/reviews/phase8-evidence-dossier.json). Highest-priority actions are:

- Correct `sense-analysis` countability claim.
- Remove or remodel `construction-borrow-from` required `from`.
- Scope `run` machine valency and subject restrictions.
- Broaden `analyse` and `analytical` definitions.
- Resolve bank entry/sense boundary before canonical identity.
- Obtain bilingual review for run alternatives, big/large restrictions, analysis process/result, borrow/lend roles, and advice variants.
- Verify authored-example quality and rights independently.
- Do not promote any raw `candidate:<id>` reference to a canonical ID.

## 9. Independent human review queue

1. LER decision on bank split and the `analyse / analysis / analytical` family relation.
2. Semantic review of run coverage and machine transitivity.
3. Grammar review of analysis countability, borrow optionality, depend frame scope and look-up negative placement.
4. Independent Vietnamese reviewer for all 16 gloss-only records and all 15 translated examples.
5. English usage reviewer for every editorial example’s sense fit, idiomaticity and collocation.
6. Rights reviewer for source use, original-example authorship and any future evidence record.
7. Authorized publication decision only after exact claims, evidence, rights and scoped authority are present.

## 10. Publication safety

The dossier deliberately does not create `evd_`, `rev_` or `dec_` identifiers, does not set any record to `verified`, and does not claim legal permission. The source candidate remains unchanged and fail-closed:

- draft records;
- gloss-only equivalences;
- empty equivalence evidence arrays;
- unreviewed example translations;
- missing exact editorial claims;
- missing scoped LER authority;
- unknown/restricted source rights.

## 11. GitHub verification

Evidence run 55 completed successfully on Ubuntu GitHub Actions:
- URL: https://github.com/phatnguyen03022001/ielts-tradition/actions/runs/41002799100
- Tested SHA: `cb1587060dc6899f64d51ea9add67a17c4f6d95c`
- Node.js: `v22.23.4`
- Regression: 191 base tests passed; 54 production tests passed.
- Candidate validation: `status=dry-run`, `issues=0`, `publicationEligible=false`, `stateCreated=false`, `inputUnchanged=true`.
- Phase 8 dossier test: 2/2 passed.

A subsequent report-only commit is covered by the same workflow path rules and must be checked as the final remote SHA before release handoff. This historical evidence does not imply human linguistic verification, rights clearance or publication eligibility.

## 12. Next production decision

The batch is suitable for continued evidence and human editorial review after the correction queue is addressed. It is not suitable for publication or verified promotion. Phase 8 stops here; no Phase 9 or new lexical batch is opened.

Artifact: [phase8-evidence-dossier.json](../data/reviews/phase8-evidence-dossier.json).
