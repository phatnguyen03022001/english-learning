# IELTS Tradition — Agent Operating Contract

## 1. Mission and scope

Build a **high-quality English–Vietnamese lexicographic knowledge base** with IELTS-oriented learner annotations. This repository owns dictionary **data, ontology, schemas, ingestion/validation tooling, editorial rules, and tests**. It is **not** a website, mobile app, learning platform, or backend service.

Quality is measured by semantic correctness, grammatical coverage, reliable evidence, licensing, consistency, and reproducibility—not by the raw number of headwords. There is no official word count required for IELTS Band 9, and no word should be marked "Band 9" without a justified, documented criterion.

Prefer the smallest correct solution. Never introduce a UI, API, authentication, framework, message broker, extra database, graph database, vector index, or external service without an approved concrete need.

## 2. Repository and execution boundaries

- GitHub: `phatnguyen03022001/ielts-tradition`.
- Branch policy: **MAIN_ONLY**. Work on `main` only; do not create feature/dev/control branches, worktrees, or pull requests unless explicitly authorized by the owner.
- **One writer invariant:** only the explicitly designated integration writer may mutate repository files, commit, publish, migrate schemas, or change data. Specialist workers operate read-only and deliver findings, designs, examples, and test proposals.
- Before doing work: inspect current repository contents, `git status`, current `main` HEAD, relevant schemas/tests, and the exact task authorization. Do not overwrite concurrent edits.
- Preserve existing conventions and stable identifiers. Do not silently reset, force-push, rewrite history, drop data, or modify other repositories.
- No credentials, MongoDB URIs with secrets, production exports, private user data, or licensing-restricted materials in Git, logs, examples, or prompts.

## 3. Verified infrastructure (2026-10-30)

- Atlas project: `ielts-tradition` (separate from other Atlas projects).
- Atlas cluster: `IeltsTradition`, M0 Free, AWS `AP_SOUTHEAST_1`.
- Database: `ielts-tradition` (**hyphen**, not underscore).
- Existing collection: `lexemes`; **0 documents** at inspection time.
- These names identify the existing environment; they are not instructions to create/rename resources or an assertion that a production schema exists.
- MongoDB is the database of record once schemas are approved. Store connection settings in environment variables or an approved secret store. Apply least-privilege DB roles and narrowly scoped access lists.
- No writes to Atlas without an explicitly authorized, reviewed mutation plan identifying target project, database, collections, expected effects, and rollback/restore strategy. Never operate on other Atlas projects.
- Prefer local, deterministic TypeScript/Node.js scripts for data validation and controlled imports if tooling is needed. No background service is required.

### Binding policies (read before changing schemas or lexical data)

The following documents are part of this operating contract and must be followed together:

- [Stable identifiers, identity and supersession](docs/identity-policy.md)
- [English–Vietnamese alignment and Vietnamese lexical entities](docs/bilingual-alignment.md)
- [Sense division, lumping/splitting and migration](docs/sense-division.md)
- [Lead editorial arbitration and publication decisions](docs/editorial-policy.md)

These are **policy specifications**, not evidence that code, JSON Schema, MongoDB collections, or migrations already implement them. A conflict between these policies, a task, and existing data must be surfaced before mutation. The human owner authorizes scope; workers must not silently override policy.

## 4. Lexicographic domain model

**Identity and sense are first-class.** The canonical conceptual units are:

- `LexicalEntry`: language + lemma + part of speech + homograph distinction + stable ID. A spelling is not a unique entry; an entry is not a single sense.
- `LexicalForm`: orthographic variants, inflections, BrE/AmE forms, pronunciation, IPA/stress when verified.
- `LexicalSense`: a separately identified meaning within an entry, with usage, register, domain, examples, evidence, and editorial status.
- `TranslationEquivalence`: source English **sense** ↔ Vietnamese **sense** (or separately identified Vietnamese gloss if a full target sense is not yet available), direction, context, equivalence type, and evidence. Translation is not a headword-to-headword string map.
- `Construction`: grammatical frame, valency, complements, required prepositions, syntactic constraints, separability, and sense applicability.
- `MultiwordExpression`: phrasal/prepositional verbs, idioms, fixed phrases, lexical bundles, and their own senses where needed.
- `Collocation`: typed co-occurrence tied to appropriate sense(s), with corpus/evidence and association strength only when measured.
- `WordFamily` / `Derivation`: derivational relatives and their **direction**; distinguish derivation from inflection.
- `Morpheme` / `Root`: synchronically defensible prefix, suffix, base, root, combining form, and segmentation. Do not infer etymology from similar spelling.
- `Etymology`: historical source language/forms and transitions with citations; distinct from modern morphology.
- `Topic`: controlled hierarchical topics with stable IDs and parent relations, assigned primarily to **senses**, not blindly to every sense of a headword.
- `LexicalRelation`: typed, directed, sense-scoped semantic edges (e.g., synonym, near-synonym, antonym, hypernym/hyponym), and entry-scoped morphological/etymological edges where appropriate.
- `Evidence` / `Source` / `EditorialReview`: provenance, attestation, permission/license, reviewer decision, and version.

Treat English and Vietnamese as distinct languages with their own semantics and grammar. Do not force one-to-one mappings. **English-first is an ingestion/editorial priority, not an English-only data model**: reusable Vietnamese translations require real Vietnamese LexicalEntry/LexicalSense identities. A `gloss_only` translation contains a Vietnamese gloss but **no synthetic target sense**; a `sense_aligned` equivalence requires an existing target Vietnamese sense. Keep alignment mode separate from editorial verification. See [bilingual alignment](docs/bilingual-alignment.md).

## 5. Explicit taxonomy dimensions

Every record should support, **where applicable and evidenced**:

1. Identity: lemma, language, POS, homograph, stable identifiers.
2. Writing and speech: spelling variants, IPA, stress, pronunciation provenance.
3. Morphology: inflections; derivation, word family, root/prefix/suffix structure.
4. History: etymology and historical cognates, independently verified.
5. Semantics: ordered senses, definitions, polysemy, figurative meaning.
6. Syntax: valency, complementation, required prepositions, grammar constraints.
7. Phraseology: collocations, phrasal verbs, idioms, multiword expressions.
8. Relations: typed semantic links, not untyped "related words".
9. Bilingual equivalence: translations per sense and usage context.
10. Pragmatics: register, connotation, region, discipline, countability, transitivity where relevant.
11. Learner annotations: CEFR only with attributed evidence; IELTS topics, skills and common errors with editorial justification.
12. Evidence and governance: source, licensing, confidence, status, reviewer, schema version.

**Do not manufacture fields merely to fill a completeness checklist.** Missing facts are unknown/not reviewed—not invented. Word family, root, etymology, and topic are different graph dimensions; never merge them.

## 6. Data representation and MongoDB rules

- Use **versioned JSON contracts** for interchange and automated validation. JSON is a representation, not a requirement to embed the entire graph in one document.
- Design MongoDB documents around real access patterns. Embed small, bounded, co-accessed values (e.g., a few forms); reference independently edited or unbounded entities and many-to-many edges. Avoid copying a relational schema into one collection per field.
- **Canonical identity contract:** generate immutable lowercase `<type>_<UUIDv7>` IDs once (RFC 9562; e.g. `lex_`, `sns_`, `frm_`, `fam_`, `mrf_`, `top_`, `eqv_`, `rel_`). The full prefix registry and UUIDv7 validation rule are in [identity policy](docs/identity-policy.md). Never derive an ID from lemma, POS, spelling hash or sense index. Track homograph distinctions and deduplication candidates as separate attributes.
- Preserve stable IDs across imports; upserts must be idempotent and explicitly keyed. No ID reuse. Retain retired IDs and typed supersession history on split/merge; a one-to-many split must **not** fan-out inbound relations automatically. Never reassign a sense ID when meaning changes or use a lemma alone as the deduplication key.
- Keep relationships typed and endpoint-compatible. Validate referential integrity and graph invariants in scripts/tests: MongoDB does **not** enforce foreign keys across collections.
- Prevent cycles where forbidden (e.g., hierarchical topic parent relations), orphan references, duplicated canonical IDs, contradictory relation direction, and malformed constructions.
- Propose indexes only for evidenced query shapes; inspect existing indexes before adding new ones. Respect M0 Free constraints and 16 MB BSON document limit.
- Do not create collections, validators, indexes, cluster tiers, or new services merely because they appear in a conceptual design. Changes to Atlas require a separate approved migration.
- Use MongoDB `$jsonSchema` where appropriate after data contracts are agreed; validate source JSON in the tooling layer as well.

## 7. Evidence, licensing, and lexical correctness

- Prefer official, authoritative lexicographic references, reputable corpora, recognized linguistic standards, and licensed reusable datasets. Record source identifier, URL/edition, retrieval date where relevant, and licensing status for imported/quoted material.
- Distinguish **reference-only** sources from **redistributable** sources. Do not bulk copy proprietary Oxford/Cambridge definitions, examples, pronunciation audio, CEFR labels, or corpus records without permission.
- LLM output is a proposal, **never independent linguistic evidence**. Do not fake corpus frequencies, collocation strengths, CEFR levels, IELTS band labels, citations, or historical roots.
- Compare senses by actual usage. Synonymy is sense- and context-dependent; near synonyms must not imply unrestricted substitution.
- **Sense boundaries:** split on an evidenced, conventionalized semantic contrast; lump predictable contextual variations when a stable core meaning remains. Grammar frame, preposition, topic or register alone never mechanically determines a split. Every substantive split/merge/retain decision requires evidence, contrastive examples, an impact inventory and an editorial decision; see [sense division](docs/sense-division.md).
- Examples should be original editorial examples or suitably licensed/attributed corpus attestations. If made up for illustration, label them accordingly.
- Editorial states: `draft`, `provisional`, `verified`, `disputed`, `rejected`. Only publish `verified` data meeting agreed gates. Keep disagreement and uncertainty visible. A verified Vietnamese gloss is **not** a verified sense-to-sense equivalence unless its target Vietnamese sense is actually modeled and verified. Unresolved disputed claims remain excluded from verified publication; unaffected verified claims may proceed independently.
- Avoid using "IELTS 9.0 vocabulary" as a purported official fixed word list. CEFR and IELTS are not a deterministic one-to-one word-level conversion.

## 8. Worker responsibilities and handoffs

Specialists may be assigned independently with bounded, read-only scope:

- **Lexicographer / Semantics:** homographs, entry boundaries, sense splitting/merging, definitions, contextual English–Vietnamese equivalence.
- **Grammar / Phraseology:** POS, inflection, valency, preposition patterns, separable phrasal verbs, MWEs, collocations, learner-error analysis.
- **Morphology / Etymology / Topics:** word families, derivational chains, defensible morpheme segmentation, historical roots, controlled sense-level topic graph.
- **Evidence / Licensing / Editorial QA:** verify claims, source/usage rights, provenance, release quality gates and disputed cases.
- **Data Model / MongoDB:** propose JSON contracts, stable IDs, embeds vs references, indexes, safe migration and rollback; **read-only by default**.
- **Lead Editorial Reviewer (LER):** owner-appointed final arbiter of **linguistic** disagreements (sense, valency, translation, usage). The LER cannot waive licensing or data-integrity blockers. If none is appointed, disputes remain unresolved and must not be marked verified.
- **Integration writer (single):** reconcile approved proposals; implement only in authorized scope; run validations; commit/publish to `main`; report hashes and results. Git/Atlas write permission is **not** editorial approval authority; use the recorded LER decision when a claim is disputed.
- **Conflict resolution:** document competing hypotheses, exact affected IDs, sources, decision (`accepted` | `rejected` | `deferred_pending_evidence`), rationale and audit trail. No invented calendar-time SLA or timeout-based acceptance. Follow [editorial arbitration](docs/editorial-policy.md).

Every specialist handoff must include: **scope; inspected evidence and source paths; factual findings; proposed minimal change; affected IDs/collections; risks/open questions; acceptance tests**. Separate observed facts from recommendations and unverifiable hypotheses. Workers must not independently publish conflicting edits.

## 9. Task execution protocol

1. **Inspect** target repo, current task, schema and data state; read [identity](docs/identity-policy.md), [alignment](docs/bilingual-alignment.md), [sense division](docs/sense-division.md), and [editorial rules](docs/editorial-policy.md) where relevant. Verify facts before making assumptions.
2. **State scope** and non-goals. If no schema exists yet, propose one without claiming it is already deployed.
3. **Design smallest correct change** consistent with existing conventions; identify identity/evidence/compatibility implications.
4. **Verify before mutation**: data rights, target namespace, preconditions, rollback, and expected result. Require explicit owner authorization for DB mutations or destructive/high-impact operations.
5. **Implement through one writer** on `main`; avoid broad refactors, new dependencies, or unrelated files.
6. **Validate** applicable tests and data checks (see below); if unavailable, state precisely what was not verified.
7. **Report** changed files, database effects (including none), exact test commands/results, commit SHA and remote state; do not claim PASS without evidence.

## 10. Mandatory quality gates for proposed data and schema

- **Identity:** UUIDv7 prefix/format, immutability, deduplication, homographs, forms vs entries vs senses correct; imports idempotent and no implicit split/merge redirects.
- **Sense coverage:** no incompatible meanings blended; definitions do not rely solely on Vietnamese glosses.
- **Bilingual correctness:** equivalence tied to the correct sense, context and register; `gloss_only` never misrepresented as `sense_aligned`; Vietnamese sense endpoints exist and match language when present.
- **Grammar:** required objects/prepositions and separability represented; incorrect substitutions rejected in tests.
- **Morphology:** inflection vs derivation vs etymology separated; root segmentation evidence recorded.
- **Graph:** valid endpoints, directions and relation types; no dangling IDs/cycles where prohibited.
- **Topics:** hierarchy valid, sense-level mappings justified.
- **Sources/legal:** permitted reuse, traceable source and clear uncertainty.
- **Operational:** schema/version compatibility, deterministic import, idempotent re-run, safe partial failure, rollback/restore approach.
- **Publication:** review decision attached; `verified` means all relevant gates passed, not "every optional field populated". Disputed claims require an appointed LER's recorded linguistic adjudication plus legal/data-integrity clearance before promotion.

Test with polysemy (`bank`), high-sense-count words (`run`), word families (`analyse/analysis/analytical`), ambiguous synonymy (`big/large`), prepositional frames (`depend on`), and separable phrasal verbs (`look it up`, not `look up it`). These are **test-case suggestions**, not preverified lexical records.

## 11. Current capability and expansion boundaries

- The repository currently implements a versioned English–Vietnamese dictionary foundation: V2 contracts, candidate ingestion/revision, graph and publication validators, evidence binding, and tests. Earlier phase reports are historical evidence, not current implementation instructions.
- The current publication-readiness snapshot is `data/reviews/phase13/readiness-assessment.json`; it reports `NOT_READY`. Passing tests or AI research must not be mistaken for authenticated editorial, provenance, or redistribution approval.
- Scope **today** is the dictionary core. A future web/mobile app, pronunciation media pipeline, or IELTS practice domain is **allowed** when explicitly scoped; do not scaffold it prematurely or bind lexical entities to a UI, framework, TTS provider, or exam runtime.
- Prefer referencing canonical lexical IDs from future domain records. Keep exercises, audio assets, scoring/attempts, and users out of lexical source-of-truth entities unless an actual shared invariant requires otherwise.
- Atlas migrations and production publication continue to require separate explicit authorization, bounded impact and rollback evidence.

## 12. Repository layout, naming and file ownership

Follow the applicable ECC common/JavaScript principles **KISS, DRY, YAGNI, cohesive files, meaningful names and regression tests**, adapted to this repository. ECC is guidance, not a copied framework or a reason to create extra infrastructure.

- **Layout ownership:** `schemas/v1` and `schemas/v2` contain versioned JSON contracts; `scripts/` owns generators and CLI entrypoints; `pipeline/` owns candidate lifecycle transitions; `validators/` owns deterministic invariants and readiness gates; `data/candidates/` owns candidate snapshots; `data/reviews/` owns dated, immutable research/audit history; `tests/` owns behavior and fixtures; `docs/` owns current policies and relevant historical records. Keep these boundaries while small; regroup by domain/feature only when actual coupling or size justifies it.
- **File names:** use lowercase `kebab-case` for new executable modules and Markdown documents (`prepare-batch.mjs`, `identity-policy.md`); `*.test.mjs` for Node tests; `*.schema.json` for entity schemas; lowercase, descriptive `*.json` for datasets. Use existing versioned snapshot conventions (`pilot-fanout-003.json`, `phase13-source-audit-001.json`) where identity/history requires them, but name new behavior tests by what they test rather than by arbitrary phase numbers.
- **Symbol names:** use JavaScript `camelCase` for functions/variables, `PascalCase` for classes/types, and `UPPER_SNAKE_CASE` for real constants where applicable. Preserve established JSON field names and canonical `<type>_<UUIDv7>` identifiers; renaming code files must never rewrite persistent identities or schema semantics.
- **One fact, one canonical owner:** `AGENTS.md` holds compact operating rules and links; `docs/` holds policy/explanation; schemas and code are executable truth; readiness assessments record snapshots; Git and historic review artifacts retain audit history. Do not copy rules, status or phase reports into a second parallel knowledge base. Add a short README/navigation map only when genuinely needed.
- **Generated versus authored:** update schema generators/contracts before regenerating generated schemas; verify `npm run schema:check`. Do not edit generated contracts in isolation or commit local runtime state, credentials, caches, generated MP3/audio binaries, or bulk external copyrighted content.
- **Focused changes:** prefer explicit, understandable functions and cohesive modules; ECC's ~200–400 lines typical / ~800 lines soft ceiling is a review signal, **not** a mandate to split working code or audit snapshots. Extract helpers only for observed reuse. No speculative repository pattern, dependency injection, microservices, queues or storage adapters.
- **Quality and compatibility:** for changed code, test the direct and transitive consumers, including schema/graph validity, identity/replay, evidence and publication fail-closed as relevant. Use existing Node tests and `npm test`; measure coverage when practical and prefer additional behavior tests over decorative abstractions. Do not weaken tests to pass CI.
- **Future domains:** create audio/media and IELTS practice contracts only with an approved concrete feature. Keep media metadata and provider provenance separate from binary assets; exercise items reference lexical IDs without modifying dictionary identity. No provider-specific fields in lexical truth unless justified by enduring domain semantics.
- **No junk:** no `final-v2`/backup copies, parallel status dashboards, unreferenced documentation, placeholders, unused dependencies, empty scaffolds, or unbounded artifacts. Preserve historical research needed for traceability; prune only after proving it has no live audit/dependency role.

When layout, naming, or governance rules conflict with an established wire format, persistent ID, historical proof or an explicit owner requirement, prefer compatibility and document the narrow exception instead of performing a cosmetic mass rename.
