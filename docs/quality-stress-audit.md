# Phase 5 — Adversarial Lexicographic Quality & Stress Audit

**Scope:** GitHub `main` only; Node.js 22 on Ubuntu Actions. **No Mac, Atlas, production validator/schema/registry/governance modification, or application code.** Synthetic scenarios below are editorial prompts, NOT corpus attestations, real approved translations, LER decisions, or permission to publish. Inspection baseline: `4b8af6393961cb6865068440173fe911127dc4ca`.

## 1. Verdict and test evidence

- **ENGINEERING: PARTIAL** — independent regression test demonstrates a P1 cross-language semantic relation violation. Tests intentionally remain red until a separately authorized production patch.
- **LEXICOGRAPHIC QUALITY: UNVERIFIED** — zero independently reviewed lexical samples in Phase 5; six Phase 4 pilot files remain synthetic.
- **LEARNER READINESS: NOT READY** — structural capability is not linguistic correctness, evidence sufficiency, or verified bilingual learner guidance.
- Initial full stress CI: [run 40964005607](https://github.com/phatnguyen03022001/ielts-tradition/actions/runs/40964005607), **163/163 PASS**, before adding the P1 regression.
- P1 reproduction: [run 40964162616](https://github.com/phatnguyen03022001/ielts-tradition/actions/runs/40964162616), **163 PASS / 1 FAIL / 164 total**, Node.js `ERR_ASSERTION` at `tests/stress/lexical-quality.test.mjs`. The failure is deliberate, not waived or marked TODO.
- Existing fixture inventories (NOT test-case totals): 27 schema positive, 28 schema negative, 11 graph positive, 41 graph negative; six pilot families each have positive and negative cases. New stress suite contains 38 top-level test cases (27 lexical, 11 graph), including three actually executed mutant kills, with 14 graph attack scenarios in one table-driven test.
- No authorized import, ingestion, reviewer appointment, approved evidence bundle, or real lexical publication is claimed.

### Actual bounded benchmark observations

Github-hosted Ubuntu runner, Node 22, observed in passing [run 40963984267](https://github.com/phatnguyen03022001/ielts-tradition/actions/runs/40963984267):

| Fixture | Nodes | Elapsed | Process RSS | Status |
| --- | ---: | ---: | ---: | --- |
| Deep topic chain (iterative DFS) | 10,000 | 74 ms | 101 MiB | PASS |
| Independent topics | 100 | 0 ms (rounded) | 117 MiB | PASS |
| Independent topics | 1,000 | 2 ms | 118 MiB | PASS |
| Independent topics | 10,000 | 27 ms | 114 MiB | PASS |

These are single-run measurements with concurrent Node test files and process-level RSS, **not** isolated complexity curves or speed promises; do not assert timing ceilings. No stack overflow on the tested 10,000-node chain. Dense 120-sense/900-edge symmetric component passed; no inferred transitive synonym edges were materialized. `npm test` includes all Phase 2–5 tests; `npm run test:stress` runs stress tests separately. The Ubuntu job has a 10-minute timeout; no long-lived load service.

## 2. Sense Boundary Failure Matrix (Axis A)

| Probe | Adversarial risk | Representation | Automated verification / status |
| --- | --- | --- | --- |
| `bank`: institution vs river edge | Merge unrelated interpretations; a dictionary may differ in homograph treatment | Independent `lex_` identities and `sns_` with homographNumber | Schema/graph can represent; **human review required** for a particular division |
| `run`: movement, machine functioning, organization management, liquid flow | Missing senses or needless sense inflation | Multiple `sns_` under one `lex_`, constructions per sense | Three pilot senses only; completeness **UNVERIFIED** |
| `look up`: consult information vs look upward vs `look up to` | Treat lexicalized expression, compositional direction and respect as identical | `entryKind=multiword` for evidenced lexicalization; normal construction otherwise | Structural capability; lexicalization **human review** |
| `depend on` | Split a sense just because a preposition appears | `con_` linked to `sns_` | Representable; meaning/semantic-role split **human review** |
| Same lemma and POS with different homographs | Silent collision, wrong headword-level translations | Distinct immutable IDs + optional homographNumber | IDs checked; linguistic identity **NOT_TESTABLE** |
| Different POS under one spelling | Force noun and verb meanings into one entry | `lex.pos` | POS value checked, lemma/POS correctness not checked |
| Grammar alternation | Invent extra sense for word order | `con.pattern`, `constraints` | Over-split passes storage: **INSUFFICIENT_EVIDENCE** |
| Meaning changes participant role/truth conditions | Under-split breaks Vietnamese choice | Distinct `sns_` + evidence | Under-split passes storage: **INSUFFICIENT_EVIDENCE** |
| Figurative extension | Always split metaphor or never split idiom | Candidate sense and editorial decision | Human evidence required; no automatic split |
| Morphologically similar spellings | Incorrect deduplication of lexical identities | Separate entries with families | Graph cannot adjudicate same-identity evidence |

**Observed boundary:** `lexical-quality.test.mjs` changes the `bank` pilot to duplicate a sense or put unrelated meanings under one entry. Both remain storage-valid. This is not a validator defect by itself; language expert judgment cannot be inferred from graph shape. Distinguish actual sense division from the optional editorial homographNumber.

## 3. Bilingual Accuracy & False Equivalence Audit (Axis B)

The table is a **risk-and-question matrix**, not an attested learner dictionary. Each contrast undergoes a real `validateDataset` call using deliberately unsafe synthetic `glossVi`/context values; **all pass storage shape, none is approved for publication**.

| Contrast | Misleading candidate | Editor must verify before display | Likely learner harm |
| --- | --- | --- | --- |
| big / large | “large sister” in place of “big sister” | relational vs physical size, preferred collocations | unnatural or changed meaning |
| borrow / lend | translate borrower as giver | agent, recipient and transfer direction | reversed semantic roles |
| economic / economical | use economical for economic policy | policy-domain vs resource-saving characteristic | academic precision |
| sensible / sensitive | treat both as “nhạy cảm” | judgment vs responsiveness | false personal description |
| actual / current | assume current means actual | factuality vs time reference | incorrect chronology |
| make / do | “make homework” | sense-dependent verb–noun collocation | systematic production error |
| say / tell | “say me the news” | argument/recipient structure | incorrect valency |
| remember / remind | “remember me the appointment” | experiencer/causer and complement frame | semantic-role reversal |

Additional failure modes to review: a single gloss for multiple English senses; `approximate` misrepresented as `exact_in_context`; English/Vietnamese POS forced to match; literal idiom translation; gloss treated as `vi` LexicalSense; reversing `en_to_vi`; verified English with unverified Vietnamese; repeated glosses lacking context; register, connotation and pragmatic drift.

**Machine-detectable:** `gloss_only` containing `targetSenseId` is rejected by schema; aligned VI target under EN entry is rejected by graph; directional `en_to_vi` is schema-enforced. **NOT machine-detectable:** whether “ngân hàng”, “bờ sông”, or any arbitrary Unicode gloss is correct for the chosen English sense; whether two expressions are substitutable in the stated context; whether reverse direction is semantically valid. Storage acceptance is *not* approval.

## 4. Grammar, Constructions and Phraseology (Axis C)

| Probe | Intended editorial distinction | V1 field or risk |
| --- | --- | --- |
| `look up something`, `look something up` | noun phrase placement alternation | `con.pattern`, `separable` |
| `look it up` vs `look up it` | pronoun position | `con.constraints` free text; no grammar parser |
| `depend on something` | prepositional complement of a specific sense | `con.prepositions`, `complements` |
| `information` vs `informations` | normally uncountable in ordinary use | no structured countability contract; textual notes only |
| `advise` vs `advice` | verb vs uncountable noun | POS supported; countability not typed |
| `interested in` vs `interesting` | adjectival complement vs different adjective use | sense/construction notes, no inference |
| `used to do` vs `be used to doing` | past habit vs accustomed-state constructions | two patterns can be written; syntax not verified |
| `conduct research` | collocation, not automatic idiom | `col_` anchor, no corpus-based strength |
| `look up to` | independently evaluate lexicalized MWE | `lex_` multiword if justified; `mwe_` inactive |
| Transitive / intransitive alternations | distinct valency, not always distinct sense | `con_`; free-form complement restrictions |
| BrE/AmE and inflection | variant form vs lexical derivation | `frm.locale`, `form`; feature typing is limited |
| Register-specific patterns | context-dependent usage, not universal | `register`, `usageNote`; claims unverified |

11 active tests replace a live pilot `con.pattern` with each candidate while preserving valid schema/graph, including erroneous forms. **Expected and actual:** schema and reference validity PASS; natural-language grammar is NOT_TESTABLE and must be editorially verified. British Council documents separability and pronoun placement; Cambridge documents uncountable `advice`, `information` and say/tell frames (sources below).

## 5. Morphology, Etymology, Family Risk Matrix (Axis D)

| Candidate | Attack | Expected governance | Machine status |
| --- | --- | --- | --- |
| analyse / analysis / analytical | infer specific direct `DERIVED_FROM` edges from shared family | `fam_` may cluster without any `rel_`; verify derivation separately | Existing pilot PASS for family without edges; asserted history UNVERIFIED |
| advise / advice | treat spelling likeness as sufficient etymology | separate POS/entry; verify historical path | NOT_TESTABLE |
| interested / interesting | treat adjectival/participial patterns as indiscriminate family evidence | independently analyze inflection vs derivation | NOT_TESTABLE |
| inflected variants | mint new lexical entries just for plurals/past tense | use forms when analysis supports it | Graph cannot verify morphology |
| family cycles | `DERIVED_FROM` cycle or wrong endpoint | directed derived→base, cycle reject | PASS for graph and typed endpoints |
| morpheme segmentation | naive string slicing becomes “verified root” | citation and linguistic review per segmentation | no sequence-level segment check |
| historical claim | confound synchronic family with etymology | `ety_` separately evidenced | source truth/chronology NOT_TESTABLE |

No historical origin or directed derivation is attested by these tests. An undirected family cluster is not a derivation tree, and explicit `DERIVED_FROM` graph direction does not certify a real historical relationship.

## 6. Evidence, Licensing, Editorial Governance (Axis E)

| Attack | Actual V1 behavior | Audit judgment |
| --- | --- | --- |
| Source URL points to nonexistent page | Valid `https://...` string can pass storage | UNVERIFIED; source existence not checked |
| Evidence ID references claim, attestation unrelated | Graph-valid if IDs link | **P1 semantic evidence gap**; evidence presence ≠ evidence sufficiency |
| URL and `license`/`permittedUse` strings present | Publication still `INSUFFICIENT_EVIDENCE` | correct fail-closed, cannot establish rights |
| Two dependent sources repeat one mistake | no independence graph | NOT_TESTABLE |
| LLM writes definition and self-verifies | status/ID strings can be present | actual authority unproved; publication blocked |
| Self-appointed LER | free-text `reviewerId` allowed | publication `INSUFFICIENT_EVIDENCE` |
| Disputed or rejected claim | `PUBLICATION_STATUS_BLOCKED` | PASS |
| Gloss verified but alignment not reviewed | remains `gloss_only`; no target sense invented | structural PASS; UI labeling is out of scope |
| Fictional corpus count/IELTS/CEFR | schema has no governed numeric claim contract | cannot verify, do not add to canonical data |
| Evidence points to different sense | linkage check only if claim ID differs; content mismatch undetectable | PARTIAL |
| No legally usable source proof | publication fails closed | PASS safety; NOT_READY publication |

The red-team test supplies a non-resolving `example.invalid` URL, invented license strings, unrelated text and a self-appointed accepted reviewer. It **passes storage**, but `publication:true` rejects with `INSUFFICIENT_EVIDENCE`. It must **not** be reported as an actual approved publication or an external license attestation.

### Independent reference register

| Source | URL | What it substantiates | Reuse / licensing for this project |
| --- | --- | --- | --- |
| British Council, *Word order in phrasal verbs* | https://learnenglish.britishcouncil.org/free-resources/grammar/c1/word-order-phrasal-verbs | pronoun between verb and particle for separable verb use | reference only; redistribution NOT cleared |
| Cambridge, *Look up* | https://dictionary.cambridge.org/dictionary/english/look-up | consultation, improvement and visiting senses; distinct use of looking upward | reference only; proprietary definitions/examples NOT copied |
| Cambridge, *Lend or borrow?* | https://dictionary.cambridge.org/grammar/british-grammar/borrow-or-lend | giver vs receiver semantics | reference only, redistribution NOT cleared |
| Cambridge, *Say or tell?* | https://dictionary.cambridge.org/grammar/british-grammar/say-or-tell | recipient/complement constraints | reference only, redistribution NOT cleared |
| Cambridge, *Advice or advise?* | https://dictionary.cambridge.org/grammar/british-grammar/advice-or-advise | verb vs uncountable noun | reference only, redistribution NOT cleared |
| Cambridge, *Uncountable nouns* | https://dictionary.cambridge.org/grammar/british-grammar/uncountable-nouns/ | information as a normal uncountable noun | reference only, redistribution NOT cleared |
| Cambridge, *Phrases with used to* | https://dictionaryblog.cambridge.org/2016/02/10/i-used-to-work-hardim-used-to-working-hard-phrases-with-used-to/ | used to / be used to contrast | reference only, redistribution NOT cleared |
| Open English WordNet, project README | https://github.com/globalwordnet/english-wordnet | candidate licensed English semantic network | project declares CC BY 4.0; check exact release, attribution and underlying content before any import |

**No bulk ingestion, proprietary example copying, lexical citation laundering, inferred CEFR/IELTS labels or attestation from LLM output.** The sources above support narrow **English** claims only. They do not independently attest the candidate Vietnamese glosses, source matching of the current six pilots, or any lexical item in this repository as reviewed.

## 7. Graph attacks, determinism, mutation (Axis F)

- Existing Phase 3 negative fixtures are re-run through `validateDataset`: canonical ID duplication, dangling references, retired live edges, symmetric reverse order, semantic duplicate, Unicode NFC duplicate, cycle/self-loop, invalid typed endpoints, invalid `mwe_`, retirement transition mismatch, unresolved incoming edges and disputed publication.
- Additional distinct-qualifier test preserves two genuinely different contexts; NFC-equivalent contexts are rejected as duplicates.
- Dense symmetric graph: **900 explicit** edges, no synthetic transitive closure. Permuted record order gives identical graph report for this tested graph.
- Topic hierarchy depth 10,000 uses iterative DFS and catches a closing cycle. Scale 100/1,000/10,000 runs offline; measured runtime/RSS, no flaky performance assertions.
- Orphan `EditorialDecision` with a real subject but no binding to an authorized reviewed action remains graph-valid. It is not authority.
- **Mutants killed 3/3**: drop canonical symmetric ordering; drop retired-live reference check; remove cycle traversal. Each mutant runs in a disposable OS temp directory importing its own unchanged registry copy. No modified production validator is committed.
- Schema error reports contain input array indices and therefore are **not** permutation-invariant by contract; graph reports are ordered independently of record order for tested cases. Do not assert global deterministic equivalence across schema-invalid permuted datasets.
- **New P1 counterexample:** `SYNONYM_OF` with `sns_` endpoints of different `lex.language` values is graph-valid. Failing regression requires `RELATION_LANGUAGE_MISMATCH`. This is a real graph-integrity hole in a semantic relation, independent of source meaning correctness.

## 8. Learner Utility Gap Analysis (Axis G)

| Level / task | Needed information | Ontology / schema / validator | Evidence | Potential learner consequence |
| --- | --- | --- | --- | --- |
| A1–A2: understand basic meaning | well-divided senses, clear Vietnamese gloss | yes / yes / only shape | none independently reviewed | wrong basic translation |
| A1–A2: POS / simple sentence | real POS, countability, frame | yes / POS, free-form grammar / structural only | unverified | “informations”, wrong word order |
| B1–B2: distinguish senses | contrast, selectional restrictions | yes / sense + usageNote / no natural semantics | unverified | sense confusion |
| B1–B2: collocations/prepositions | attested collocation and valency | yes / con and col / references only | unverified | unnatural production |
| B1–B2: register | register by meaning/context | yes / register enum / enum validity only | unverified | inappropriate tone |
| C1–C2: near synonyms | context, differences in entailment, connotation | yes / relation qualifiers / shape+dedup only | unverified | false paraphrase |
| C1–C2: academic writing | accurate collocations and examples | yes conceptually / free-form pattern / no corpus tests | unverified | misleading fluent-looking phrasing |
| C1–C2: EN–VI nuance | directional, many-to-many aligned senses | yes / eqv with restrictions / endpoint checks | unverified | false one-to-one equivalence |
| All: trusted sources | independent review, legal permission | governance only / insufficient authority fields / fail closed | not established | release blocked by design |

No numerical CEFR/IELTS individual-word rating is inferred; higher-level learner tasks need greater rigor, not automatic word labels.

## 9. Findings ledger — root causes, reproduction and minimal remediation

### GRAPH-001 — P1 — cross-language semantic edge accepted
- **Layer:** Validator / Ontology contract. **Machine-checkable:** yes.
- **Reproduce:** `tests/stress/lexical-quality.test.mjs` test `REGRESSION RED`; graphBase `en` sense #1 → `vi` sense #3 via `SYNONYM_OF`; `npm test` on GitHub.
- **Expected:** cross-language monolingual `rel_` rejected with typed `RELATION_LANGUAGE_MISMATCH`.
- **Actual:** `validateDataset` reaches `stage=graph` with no matching error; test 164 fails in run 40964162616.
- **Impact:** downstream consumers may interpret bilingual pairs as mutually substitutable synonyms, bypassing `eqv_` restrictions/review.
- **Root cause:** `validators/graph-v1.mjs` validates relation endpoint types but does not compare parent `lex.language` for semantic sense-to-sense edges.
- **Minimal proposed fix (NOT in Phase 5):** in `rel_` handling resolve parent `LexicalEntry` of both sense endpoints and reject semantic monolingual relations across languages; add positive same-language and negative cross-language regression, verify impact to current fixtures.

### LEX-002 — P1 — false EN–VI and collocation content still storage-valid
- **Layer:** Lexical Data / Editorial Process. **Machine-checkable:** no general natural-language proof.
- **Reproduce:** eight bilingual false-equivalence and eleven malformed/ambiguous construction candidate tests; `assertStorageOnly` checks actual `validateDataset` calls.
- **Expected:** editorial review, independent bilingual evidence and grammar examples before promoting *any claim* for learner use.
- **Actual:** schema/graph valid with wrong candidate glosses / unchecked patterns; publication remains blocked.
- **Impact:** learner can internalize incorrect verb roles, prepositions and false equivalence if a future display/ingestion process mistakes structural PASS for content approval.
- **Root cause:** current validator is a structural validator, not a semantic or syntactic parser.
- **Minimal proposed fix:** require claim-level independent EN and VI review/contrastive usage acceptance at ingestion, and enforce publication only after human evidence approval. Do not implement an LLM judge as ground truth.

### GOV-003 — P2 — provenance, rights and reviewer authority not machine-verifiable
- **Layer:** Governance / Schema / Editorial Process. **Machine-checkable:** only missing fields and links.
- **Reproduce:** accepted-review synthetic attack and Phase 3 `publication-ler-unproven` fixtures.
- **Expected:** authenticated LER appointment, independently checked source license/permission, claim-specific sufficient attestation.
- **Actual:** `INSUFFICIENT_EVIDENCE` blocks publication even with plausible strings.
- **Impact:** no legitimate release path to READY; this is **safe fail-closed**, not a current unauthorized publication.
- **Fix:** versioned authority/provenance contract and external legal/editorial review pipeline; never invent approval fields.

### LEX-004 — P2 — sense boundaries cannot be determined from identity alone
- **Layer:** Lexical Data / Editorial Process. **Machine-checkable:** no.
- **Reproduce:** over-splitting and under-splitting test cases, both schema/graph valid.
- **Expected:** contrastive evidence, semantics-based editorial decisions and downstream translation inventory.
- **Actual:** no automatic judgment of semantic distinction.
- **Impact:** wrong teaching inventory if unreviewed data is ingested.
- **Fix:** paired human-reviewed contrastive attestations per disputed split/merge; retain provisional state pending review.

### GRAM-005 — P2 — learner grammar encoded as prose, no parseable restriction guarantee
- **Layer:** Schema / Lexical Data. **Machine-checkable:** partial.
- **Reproduce:** replace `look-up` construction `pattern` with `look up it`; graph still valid.
- **Expected:** learner presentation distinguishes licensed frames/negative examples.
- **Actual:** strings stored as-is, no syntactic evaluation.
- **Impact:** generated learner guidance can be misleading.
- **Fix:** initially require reviewed positive/negative examples and structured complement restrictions where already supported; only version schema if concrete ingestion shows gaps.

### MORPH-006 — P2 — word family, derivation and etymology not independently grounded
- **Layer:** Lexical Data / Editorial Process. **Machine-checkable:** only graph direction/cycle.
- **Reproduce:** `analyse-family` pilot has no `DERIVED_FROM`; negative cycle fixture rejected.
- **Expected:** documented, verifiable direct morphological relationship or leave it unasserted.
- **Actual:** storage cannot prove historical claims from form similarity.
- **Impact:** fabricated word roots/family guidance.
- **Fix:** review morphological/etymological references separately and abstain when evidence is absent.

### EDIT-007 — P2 — orphan decision is structurally storable
- **Layer:** Validator / Editorial Process. **Machine-checkable:** link use could be checked; authority still human.
- **Reproduce:** `graph-scale.test.mjs` orphan `dec_` with referenced subject but no consumer/applicable transition.
- **Expected:** decision applicability and authentic authority proved before use.
- **Actual:** graph accepts an unattached accepted decision; publication not eligible.
- **Impact:** possible later misuse as an approval shortcut.
- **Fix:** downstream decision-consumption gate, plus binding to authenticated reviewed action in future schema.

### PERF-008 — P3 — publication review lookup has potential quadratic behavior
- **Layer:** Validator / Performance. **Machine-checkable:** complexity inferred from code, not bench-proven.
- **Reproduce:** `graph-v1.mjs` loops over verified records, scanning `[...byId.values()].filter(...)` for reviews each time. No 10k independently verified licensed publication corpus is available.
- **Expected:** avoid n² when publication becomes real-scale.
- **Actual:** source-level potential only; no observed performance failure in bounded draft graph stress.
- **Impact:** future large verified ingests could be slow.
- **Fix:** pre-index accepted reviews by subject ID when an independently reviewed publishing dataset exists; do not prematurely optimize draft-only tests.

## 10. Risk-separated quality scorecard

**A. Engineering Robustness (risk-adjusted provisional assessment, not empirical confidence interval)**

| Dimension | Available | Assigned | Basis |
| --- | ---: | ---: | --- |
| Schema / registry integrity | 15 | 15 | 16 schemas, registry contract, schema fixtures |
| Referential integrity | 15 | 11 | typed/retired reference checks, but semantic cross-language endpoint violation |
| Graph invariant enforcement | 20 | 13 | cycles, dedup, symmetric canonicalization pass; GRAPH-001 |
| Lifecycle correctness | 15 | 10 | shapes pass, successor provenance/incoming adjudication not provable |
| Publication fail-closed | 15 | 13 | disputed and unreviewed blocked, provenance/authority unverifiable |
| Determinism | 10 | 8 | tested graph permutation stable, schema diagnostics intentionally indexed |
| Stress/performance | 10 | 9 | 10k successful, finite scale; publication n² untested |
| **Total** | **100** | **79** | **PARTIAL, NOT a release certificate** |

**B. Lexicographic & Learner Quality (100-point rubric): UNRATED / UNVERIFIED.** Sense correctness (20), bilingual fidelity (20), grammar (15), examples (15), pragmatics/collocation (10), morphology (5), learner utility (5), independent evidence/licensing (10): **all eight scores withheld**, because synthetic scenarios are not independently adjudicated lexical data. Architecture suitability is **conditional**: good separation of identity, sense, context, MWE, construction, family, evidence; learner evidence, content authority and release eligibility remain unproven.

## 11. Release gates and minimal roadmap

**P0:** None independently demonstrated as an actual unauthorized publication; do not treat absence as proof of safety of future pipelines.

**Active P1 blockers:** GRAPH-001 and LEX-002 (unreviewed content promotion risk). Phase 5 release is **NOT READY**. Graph CI currently fails intentionally; a future scope-approved validator fix must make this test pass without weakening assertions.

**Must fix before real lexical ingestion:** GRAPH-001; an explicit editorial verification workflow distinguishing original English sense proof, independent Vietnamese meaning/equivalence, licensed examples, grammar constraints and uncertainty; no implicit release on schema pass. Resolve ambiguous homographs, polysemy and grammar before creating canonical identities.

**Must fix before publication:** GOV-003 authority, provenance, evidence sufficiency, rights proof; adjudicate relevant LEX-004, GRAM-005, MORPH-006 cases; demonstrate reviewed representative samples by learner difficulty; no `verified` claim solely because strings/IDs/reviewer names exist.

**Can improve later:** structured countability/valency where the pilot proves free-text insufficient; EDIT-007 orphan applicability; PERF-008 if publication-scale evidence emerges; broader corpus/BrE-AmE research. Do not add entities, enums, infrastructure, databases or an app without real need.

## 12. Governance compliance

- Governance baseline (AGENTS + four policies), ontology, registry, generated 16 schemas and production validators unchanged.
- Only tests, test wiring, and this audit document are in task scope.
- All runs were GitHub Actions Ubuntu + Node.js 22. Isolated mutants existed only in runner temporary folders and were removed.
- No Mac, Agent Runtime, MongoDB Atlas, Google Drive, application, UI, API or new dependency was used.
- Single integration writer; direct commits on `main` only; no PR/branch, force-push or approved lexical assertion invented.
