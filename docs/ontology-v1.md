# Canonical Lexicographic Ontology — v1

**Status:** Historical Phase 1 normative design. Its original Phase 2/3 implementation
gap is now covered by versioned schemas and validators. Use those executable contracts
for current behavior.
**Scope:** English–Vietnamese dictionary knowledge base, not an application.
**Registry (machine-readable):** [`schemas/v1/vocabularies.json`](../schemas/v1/vocabularies.json).
**Governance baseline:** [`AGENTS.md`](../AGENTS.md), [identity](identity-policy.md), [bilingual alignment](bilingual-alignment.md), [sense division](sense-division.md), [editorial](editorial-policy.md).
**Non-goal:** This document does not authorize MongoDB Atlas writes, collection creation, indexes, imports, public release of unreviewed lexical data, or changes to the frozen governance baseline.

## 1. Design axioms and source of truth

1. **LexicalEntry (lex_) owns lexical identity; LexicalSense (sns_) owns meaning.** No sense may have a `mwe_` parent in V1.
2. **Construction (con_) owns syntax and valency; Collocation (col_) owns lexical co-occurrence.** Do not create new senses merely for surface word order or syntactic separability.
3. **WordFamily (fam_) is an undirected, evidence-bounded cluster.** Membership is not evidence of a derivational path.
4. **LexicalRelation (rel_) represents typed graph edges.** Direct derivation is an entry-to-entry edge, `DERIVED_FROM`, oriented `derived → base`. Semantic relations are sense-to-sense unless a registry rule explicitly says otherwise.
5. **Bilingual equivalence (eqv_) is English sense → Vietnamese sense, or explicitly only a Vietnamese gloss.** A gloss is not a fabricated target sense.
6. **Identity is immutable; editorial and lifecycle states are independent.** Split/merge/duplicate reconciliation must preserve audit history and explicitly resolve affected references.
7. **Evidence and license control publication.** LLM output and similar spelling are not linguistic evidence.
8. **One owner for each fact:** e.g. `LexicalSense.entryId` determines sense ownership; `LexicalEntry.familyIds[]` determines family membership; `Topic.parentTopicId` determines parentage. Reverse lists are derived views and must not be maintained as competing authorities.

The ontology is a **conceptual and interchange contract**. Physical BSON collection boundaries, indexes, embedding vs referencing, and eventual production data shape are to be decided by validated access patterns in later phases.

## 2. Entity catalog and ownership

| Entity / ID prefix | Role | Authoritative relationships | Scope |
| --- | --- | --- | --- |
| `LexicalEntry / lex_` | Headword or lexicalized multiword identity | `language`, `lemma`, `pos`, `entryKind`, `familyIds[]` | en / vi |
| `LexicalSense / sns_` | Distinct conventionalized meaning | `entryId → lex_`; meaning, usage, topic associations | en / vi |
| `LexicalForm / frm_` | Orthographic, inflectional, pronunciation record | `entryId → lex_`; form type and locale | when independently managed |
| `WordFamily / fam_` | Identity of an undirected family set | membership is queried from `lex.familyIds[]` | never implies derivation |
| `Morpheme / mrf_` | Verified root, base, prefix, suffix | morphological segmentation relationships with evidence | synchronous morphology |
| `Etymology / ety_` | Historical etymological analysis | `entryId → lex_` plus sources/history | not a family edge |
| `Topic / top_` | Controlled topic hierarchy | `parentTopicId → top_` or null | sense-level annotation |
| `Construction / con_` | Typed syntactic/valency pattern | `senseId → sns_`; examples, constraints | grammar |
| `Collocation / col_` | Evidence-based collocational pattern | `anchorSenseId → sns_`; components | phraseology |
| `TranslationEquivalence / eqv_` | Directional bilingual claim | `sourceSenseId → sns_`; optionally `targetSenseId → sns_` | bilingual |
| `LexicalRelation / rel_` | Typed directed/symmetric edge | `sourceId` and `targetId` typed by relation registry | semantic or morphological |
| `Evidence / evd_` | Attested claim and rights trace | `sourceId → src_` and reviewed assertion IDs | provenance |
| `Source / src_` | Provenance and reuse terms | source edition, URL, permitted use | licensing |
| `EditorialReview / rev_` | Review outcome and scope | reviewer, assertion IDs, decision | publishing |
| `EditorialDecision / dec_` | Irreversible audit of conflict/split/merge | affected IDs, reasoning, evidence, reviewer | governance |
| `MultiwordExpression / mwe_` | **Reserved, inactive in V1** | **No V1 records or references** | future extension only |

The complete prefix regex is preserved verbatim in the identity policy and registry. An ID matching the **global registered pattern** is not necessarily **admissible in V1**: `mwe_` matches the global registry but must be rejected by V1 entity validators and by all typed reference fields.

## 3. Common fields and lifecycle

For first-class records, the candidate standard surface is:

- `_id`: permanent prefixed UUIDv7; `schemaVersion`: version of the contract used to serialize.
- `lifecycleStatus`: `active` | `retired`; `editorialStatus`: `draft` | `provisional` | `verified` | `disputed` | `rejected`.
- `evidenceIds[]`, `revision`, `createdAt`, `updatedAt`; original attribution and license where applicable.
- When retired: `retirementMode`, `retiredByDecisionId`, `supersededByIds[]`, plus historical revision. Never erase this audit chain.
- An absent or unreviewed fact stays absent/unknown. `null` must not be used to fake the existence of an entity.

**Invariants:** `_id` cannot change with lemma, POS, display ordering, entryKind or editorial revisions. The set of `lex_` and `sns_` identities is shared across languages; language is a validated attribute of the parent entry. Data cannot publish as `verified` when relevant legal, identity, graph, or editorial gates fail. Historical audit edges may reference retired entities but live published graph relations cannot.

### Retirement modes and cardinality

| Mode | Prior IDs | Successor IDs | Required action |
| --- | --- | --- | --- |
| `semantic_split` | Exactly one retired sense | At least two **new** sense IDs | Review each incoming edge; never fan out blindly |
| `semantic_merge` | At least two retired senses under one `decisionId` | Exactly one **new** sense ID | Review/reconcile and context-deduplicate incoming edges |
| `duplicate_reconciliation` | A mistaken duplicate sense is retired | Exactly one **already existing** canonical sense | Preserve original survivor ID; review incoming links and keep provenance |
| `invalidated` | One or more genuinely invalidated records | No successor | Explicitly retire/resolve all live references; historical references remain |

The table describes **sense lifecycle transitions**. Do not assume an entry-level split/merge is identical without a separately reviewed decision. For `semantic_merge`, all retired sources refer to the same new successor and the same editorial decision; `createdAt`/record provenance, not UUID string ordering, establish whether a successor is new. For `duplicate_reconciliation`, compare independent linguistic evidence proving identical identity; this is *not* a semantic merger. Never infer that duplicate reference payloads or their evidence can be blindly unioned.

Use `supersededByIds[]` to record successor candidates/history, **not to implement automatic live-reference redirection**. Live links to retired IDs must be blocked or explicitly reattached under an approved decision. Reattachment requires analysis of target meaning, register/context and provenance.

## 4. Lexicalized multiwords vs constructions vs collocations

### Canonical decision tree

1. Does the sequence form a conventional **lexical unit** with its own meaning and headword treatment that cannot be represented as a mere grammatical variant or routine combination? If evidence supports this, create **one `LexicalEntry`** with `_id=lex_...`, `entryKind=multiword`, optional `multiwordKind`, and its own `sns_` records.
2. Is it an inflection, separability/order/argument arrangement, or obligatory preposition for the sense of an existing entry? Create/reuse a **`Construction`** attached to that `sns_`; do **not** mint another `lex_`.
3. Is it an evidenced but semantically compositional frequent lexical partnership? Create a **`Collocation`**; do **not** mint a `lex_` solely because the words frequently appear together.
4. If lexicalization is uncertain, stage editorial evidence and decision. **Do not create both `lex_` and `mwe_`** to avoid making the choice.

| Illustrative candidate | V1 modeling choice | Why |
| --- | --- | --- |
| `look` | `lex_` word | independent lexical unit |
| `look up` ("consult a reference") | `lex_` multiword + its own `sns_` | conventionalized lexical meaning |
| `look it up` / `look the word up` | `con_` of the `look up` sense | separability and pronoun placement, not new senses |
| `take into account` | `lex_` multiword | conventionalized fixed lexical unit |
| `depend on + NP` | `con_` under the relevant `depend` sense by default | required complement pattern; separate multiword entry only after a positive lexicalization decision |
| `conduct research` | `col_` attached to relevant sense(s) | conventional collocation without obligatory new lexical identity |

These are **modeling test candidates**, not verified corpus entries. The rule is evidence-based: not all phrasal/prepositional verbs automatically qualify as independent lexical entries, and not every collocation is an idiom. Form, Construction and Sense IDs may belong to the same lex_ multiword entry without polymorphic ownership.

**V1 invariant:** only `lex_` owns senses; `mwe_` records and references are invalid despite `mwe` remaining reserved in the wider prefix registry. A future activation is a versioned migration, not an ad-hoc worker choice.

## 5. Word family, morphology, derivation and history

- `fam_` identifies a **cluster**, never a root or direction. `LexicalEntry.familyIds[]` is the single authoritative many-to-many membership map; `WordFamily.members[]`, if presented, is a computed read view.
- `WordFamily.familyBasis` in the registry is either `synchronically_derivational` or `editorially_related`; do not silently turn "related words" into evidence of direct derivation. Family classification and memberships require editorial evidence.
- `DERIVED_FROM` is a `rel_` with `sourceId=derived lex_` and `targetId=base lex_`. A direct edge is allowed only on morphological evidence. Do not infer edges from a shared family.
- `DERIVED_FROM` is **not transitive as a stored immediate derivational step**. Inferred ancestry is a query result, not an automatically materialized direct edge. Cycle and self-loop are prohibited.
- `mrf_` identifies a verified morphological component; segmentations use ordered, cited components and must not be inferred by naive string slicing.
- `ety_` represents historical source languages/forms, not an assertion that every modern family member was derived by a single path. Evidence for etymology and modern derivation is separately required.

**Example:** `analyse`, `analysis` and `analytical` can be candidates for a `fam_` cluster, but no directional edge is added without morphological evidence establishing the step. Topic membership is entirely independent of family membership.

## 6. Topics and sense-level learner metadata

A `Topic` has a stable `top_` ID, a label, and `parentTopicId` (null for a root topic). Single-parent hierarchical taxonomy is the V1 default. The parent reference is the authoritative source: there is no duplicate persisted `TOPIC_PARENT_OF` edge.

A `LexicalSense` references zero or more `top_` IDs only when meaning and usage justify them. A word's unrelated senses must not automatically inherit its other senses' topics; tagging a sense does not imply tagging every sense in that entry.

Topic invariants: parent exists and is active, no self-parent/cycles, label uniqueness checked within a defined hierarchy scope, no inferred CEFR/IELTS score from topic. Topic indexing, topic-vs-domain and polyhierarchy extensions require a versioned decision.

## 7. Bilingual semantics and grammar

- English-first means ingestion priority, not English-only ontology. A Vietnamese translation can be a **reviewed Vietnamese gloss** (`alignmentMode=gloss_only`; `glossVi` required; `targetSenseId` forbidden), or an **aligned Vietnamese sense** (`alignmentMode=sense_aligned`; `targetSenseId` required; `glossVi` is not the target identity).
- The `eqv_` has an independent ID and directed `sourceSenseId`, `translationDirection=en_to_vi`, `equivalenceType`, context restrictions, evidence and editorial status. No implicit reverse edge.
- For aligned claims the target must be a real, active `sns_` whose parent `lex_` has `language=vi`. Source `sns_` parent must have `language=en`. Different grammatical categories across languages are allowed.
- A `verified` gloss is verified **as gloss text**, never as fully verified sense alignment; publication and display cannot misrepresent the two.
- `Construction` attaches to a sense, specifying valency, complement classes, prepositions, separability and placement restrictions; one pattern can have multiple attested constructions, but spellings alone do not create senses.
- `Collocation` attaches to a sense and carries actual co-occurrence evidence; numeric frequencies/strengths are allowed only when computed from documented data.

## 8. Typed lexical relations and symmetric storage

The registry's `relationTypes[]` is the **only authoritative set** of V1 `rel_` kinds. Each declares: `sourceType`, `targetType`, symmetry, canonical order/direction, cycle policy, scope, and optionally virtual inverse.

### Directed relations

- `DERIVED_FROM`: derived **lexical entry** → base **lexical entry**.
- `HYPERNYM_OF`: more-general **sense** → more-specific **sense** (virtual inverse `HYPONYM_OF`).
- `PART_OF`: part **sense** → whole **sense** (virtual inverse `HAS_PART`).
- Virtual inverses are **query views**; do not store the second edge automatically.
- Apply cycle checks per relation's defined semantics; a cycle in `DERIVED_FROM` or `HYPERNYM_OF` fails. Do not impose one generic "graph must be DAG" check over all relations.

### Symmetric relations

`SYNONYM_OF`, `NEAR_SYNONYM_OF`, and `ANTONYM_OF` can be stored once for a **verified, context-scoped mutual relation**. Given two `sns_` IDs A and B, persist:

    sourceId = minASCII(A, B)
    targetId = maxASCII(A, B)

where `minASCII` and `maxASCII` compare the full lowercase canonical ID strings by ASCII code point, not locale collation; `A === B` is invalid. The order is **storage-only**, not a claim that meaning or substitution works in every context.

- Synonymy and near-synonymy are **not automatically transitive**. Neither implies universal lexical substitutability; persist context, register, domain and usage restrictions with evidence.
- `NEAR_SYNONYM_OF` is symmetric **only when the specialist has reviewed mutual similarity within the same specified context**. Directional bilingual translations belong in an evidenced `eqv_` record; directional **monolingual** paraphrases are not modeled as symmetric near-synonym edges in V1 and must remain sourced usage notes until a separately approved directed relation type exists.
- Antonymy is likewise sense-scoped; do not assert whole-headword antonymy.
- To detect duplicate unordered pairs, canonicalize endpoints **before** computing the uniqueness key.
- Unique semantic edge key is (`relationType`, `sourceId`, `targetId`, `qualifierKey`). `qualifierKey` is based on a **fixed-order canonical representation** of meaningful context/variety/domain/register/period qualifiers. Missing qualifiers, blank strings and materially different contexts must not be conflated.
- Hashing the qualifier payload is optional; hashes must be collision-checked against canonical qualifier data before claims are merged. Evidence IDs and editorial review metadata are **not part of semantic-edge identity**, but may be combined only under editorial compatibility and provenance rules.
- Canonical storage plus an appropriate **unique index** enables fast duplicate lookup; lexicographic sorting by itself does not guarantee O(1) database performance. No Atlas index is created in Phase 1.

### Relation endpoint/type checks

A generic sourceId/targetId regex cannot establish type correctness: `DERIVED_FROM` requires `lex_` at both endpoints while `SYNONYM_OF` requires `sns_`. Shape validation restricts prefixes based on `relationType`; Phase 3 verifies actual entity existence, language/semantic compatibility, lifecycle and editorial evidence. Prevent active edges to retired/missing nodes.

## 9. Controlled vocabularies as a versioned registry

`schemas/v1/vocabularies.json` is the single source of truth for:

- Entry kind, active/inactive prefixes, the 17 Universal Dependencies UPOS values, and V1 lexical-entry POS subset.
- Editorial and lifecycle states; retirement modes; sense-decision actions; issue and decision outcomes.
- Alignment mode and equivalence type; initial direction `en_to_vi`.
- Register, morphology roles, family basis, construction type and multiword kind.
- Relation type signatures, direction/canonical ordering, symmetric/cycle/transitivity semantics, qualifiers and duplicate key components.

Do **not** maintain competing enums in worker prompts, TypeScript or independent JSON schemas. Phase 2 should generate/reference enums from this registry; Phase 3 should consume relation metadata and reject unknown values. Changes require registry versioning, affected-schema/fixture review and editorial approval. The registry is **not itself a full JSON Schema**.

Closed administrative enums (e.g. editorial/lifecycle state, retirement mode) require explicit versioned changes. Linguistic categories such as register/domain may need extensible controlled term catalogues in a future registry version; workers cannot invent V1 values to make an entry pass.

## 10. Phase boundary, planned assertions and non-goals

**Phase 1 delivers only** this conceptual contract and the machine-readable controlled registry. The five governance files remain unchanged and are still normative. No new data claims or source attestations are implied.

**Phase 2 (not done):** Write JSON Schema Draft 2020-12 documents for `lex_`, `sns_`, `eqv_`, `rel_`, `con_`, `fam_` and others as justified by fixtures. Required conditional checks include:

1. Prefix-specific references; reject V1 `mwe_` records/references, UUIDv4 and unregistered prefixes.
2. `gloss_only` requires gloss and rejects targetSenseId; `sense_aligned` requires a targetSenseId with `sns_` syntax.
3. Retirement modes and required lifecycle metadata; fields are shape-checked, while "new vs existing" remains a semantic check.
4. Unknown enums, relationType/endpoint prefix combinations, self-references and canonical symmetric ordering where expressible.
5. Valid/invalid fixtures must be explicitly paired and traceable to the governing rule.

**Phase 3 (not done):** TypeScript deterministic validator resolves cross-document IDs, lexical ownership, language, retired/incoming links, merge/split decision group, topic cycles, derivation cycles, contextual edge deduplication, evidence/rights and publication gate. It must distinguish `true semantic merge` (new unified ID) from `duplicate reconciliation` (surviving existing ID). Report **PASS/PARTIAL/FAIL** from executed tests, not inferred from documentation.

**Phase 4 (not done):** Six reviewed pilot families of positive/negative fixtures: `bank`, `run`, `analyse/analysis/analytical`, `big/large`, `depend on`, `look up`. They are modeling and test examples until independently verified and licensed.

**No MongoDB Atlas writes or production indexes in Phases 1–4.** Future Atlas migration is a separate user-authorized operation with reviewed impact and rollback/restore plan.

### Reference standards (adaptation, not certification)

- IETF [RFC 9562 UUIDs](https://www.rfc-editor.org/rfc/rfc9562.html) — UUIDv7 bit layout.
- [Universal Dependencies UPOS](https://universaldependencies.org/u/pos/all.html) — POS vocabulary reference.
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12) — Phase 2 shape validation target.
- [TEI Dictionaries](https://www.tei-c.org/release/doc/tei-p5-doc/en/html/DI.html), [OntoLex-Lemon](https://www.w3.org/community/ontolex/wiki/Final_Model_Specification), and ISO Lexical Markup Framework — conceptual inspiration; this is not a claim of standards compliance.
