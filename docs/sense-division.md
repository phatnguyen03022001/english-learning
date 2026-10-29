# Sense Division and Homograph Policy (v1)

Status: normative editorial guidance. Avoid both arbitrary lumping and arbitrary splitting.

## Scope and identities

A `LexicalEntry` is not automatically one meaning. Separate homograph/homonym entries when linguistic and editorial evidence warrants distinct lexical identities; multiple related meanings under one entry are individual `LexicalSense` nodes. Stable identifiers and supersession follow [identity-policy.md](identity-policy.md).

## Decision rule

**Split into different senses** when there is a reproducible, conventionalized meaning contrast that materially changes interpretation, truth conditions/entailments, participant roles, or translation/usage selection, with attested evidence. Supporting diagnostics include:

- Paraphrase/definition incompatibility and different semantic roles.
- Different selectional restrictions or **meaning-changing** valency/complementation, not merely superficial patterns.
- Established figurative/idiomatic lexicalization rather than a one-off rhetorical extension.
- Persistent domain/regional usage that changes meaning, not only frequency or style.
- Examples from appropriately licensed sources where a single unified definition predicts incorrect interpretations or translations.

**Keep as one sense with variants/subsenses/usage labels** when examples share a stable core definition and differences are predictable from context, collocation, syntax, register, topic or region without a distinct lexicalized meaning. A grammatical-frame change or a new preposition alone is **not** sufficient to split. Nor is shared grammar alone proof of one sense.

If genuinely uncertain, record a provisional distinction/decision and hold publication of contested sense-level assertions. Use outside frameworks such as WordNet/COBUILD as **comparison evidence**, never as mandatory sense-count templates or permission to copy restricted definitions.

## Editorial decision record

For each split/merge/retain ruling that changes existing sense boundaries, record:

- `decisionId`, `entryId`, `previousSenseIds[]`, `proposedSenseIds[]`, action (`split` | `merge` | `retain`), author, reviewer, date/revision.
- Competing definitions, contrastive original/licensed example pairs, semantic/grammar diagnostics, sources/rights, confidence, final rationale.
- Impact assessment: translations, Vietnamese target senses, constructions, collocations, synonym edges, examples, topic mappings, learner annotations and external IDs.
- If a prior sense is retired, preserve history; one-to-many redirects never silently fan out. Use [editorial-policy.md](editorial-policy.md) for unresolved disputes and final approval.

## Boundary examples to investigate (not automatic verdicts)

- `bank` as financial institution vs river edge: substantively unrelated homograph meanings; review lexical-entry boundaries and sense assignments.
- `depend on` ("be determined by" vs "rely on"): grammar frame may match while semantic roles and Vietnamese equivalence differ.
- `run`: high polysemy; neither "five senses" nor "thirty senses" is a quality target; work through contrasting attestations.
- `look up` and `look it up`: separability is a construction constraint, **not** by itself two lexical senses.
- `big` and `large`: synonymy depends on specific sense and collocational restriction; do not force a universal synonym edge.

## Future acceptance tests

1. Two distinct meanings with materially different translations remain distinguishable even if POS/preposition is identical.
2. Register-only or grammar-form-only alternations do not automatically create new senses.
3. A split/migration plan identifies every inbound edge; cannot publish while dangling mappings remain.
4. All decisions carry reproducible contrastive examples and evidence/license metadata.
5. Revision of display order must not change stable sense IDs.
