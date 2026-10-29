# English–Vietnamese Alignment Policy (v1)

Status: normative conceptual contract. Defines target modeling without creating database collections.

## Principle

Dictionary definitions and translations are **sense-centric**, contextual, directional, potentially many-to-many, and never inferred by spelling alone. The canonical editorial workflow starts with English entries but recognizes Vietnamese as an independent language with its own lexical entries and senses. Do not attach Vietnamese as an anonymous English-only metadata field when claiming a fully aligned translation.

## Three distinct entities

1. **English entry/sense**: `LexicalEntry(language=en)` owns `LexicalSense` and English grammar/usage.
2. **Vietnamese entry/sense**: `LexicalEntry(language=vi)` owns its own `LexicalSense`; a word or multiword phrase has distinct POS, meaning, register, usages, and evidence. This **does not require** full symmetric Vietnamese dictionary coverage in v1.
3. **TranslationEquivalence**: a separately identified, typed and directed edge from one source sense to one target sense, with context, equivalence kind, evidence and editorial status. Reverse translation is **not** automatically implied.

All real sense nodes share the common ID rules from [identity-policy.md](identity-policy.md); use language attributes rather than separate `vi_sns` prefix. Vietnamese accents are data and must be preserved.

## Staged alignment without fake target senses

- `gloss_only`: source English sense + Vietnamese text gloss (`language=vi`) + optional usage/context + evidence. **No `targetSenseId`**. This is an editorial gloss candidate or reviewed gloss, **not** a verified sense-to-sense equivalence.
- `sense_aligned`: source English sense + `targetSenseId` pointing to an existing Vietnamese sense + evidence, usage constraints and equivalence type. This is a structural alignment; publication still requires editorial review.
- Keep `alignmentMode` (`gloss_only` | `sense_aligned`) **separate** from `editorialStatus` (`draft` | `provisional` | `verified` | `disputed` | `rejected`). A reviewed gloss may be verified **as a gloss** but never labeled "verified sense alignment".
- Do not fabricate Vietnamese senses solely to satisfy a required field. For a new Vietnamese target sense, create/review a genuine Vietnamese LexicalEntry and LexicalSense with distinct identity and definition.
- Every equivalence specifies `direction` (`en_to_vi` initially), `sourceSenseId`, `context` / restrictions when applicable, `equivalenceType` (e.g. exact_in_context, approximate, paraphrase), `evidenceIds[]` and `editorialStatus`. For `sense_aligned`, `targetSenseId` is required; for `gloss_only`, `glossVi` is required and `targetSenseId` must be absent.
- The equivalence status cannot be published as verified if sense endpoints are retired, unknown, mismatched to expected languages, or editorial evidence is insufficient. An approved reviewed gloss may be included as an explicitly identified gloss, never presented as a verified sense alignment.

## Examples (illustrative, not corpus attestations)

- English `bank` (financial institution) must not align with Vietnamese `bờ sông`; a second English sense `bank` (river edge) may align with a verified Vietnamese sense for `bờ sông`.
- `depend on` meaning "be determined by" may be glossed `phụ thuộc vào`, whereas "rely on someone for support" may be glossed `trông cậy vào`. Lexical overlap does not prove complete equivalence.
- An English verb sense may align with a Vietnamese multiword expression whose POS or complementation is different; do not force POS equality across languages.

## Required graph checks

- Source and target IDs exist, both are active and are `LexicalSense` IDs, and their parents have expected language tags.
- No accidental cross-language headword-to-headword shortcut or dangling gloss masquerading as a sense node.
- No implicit reciprocal edges, duplicate equivalent edges with contradictory contexts, or false assumption of one translation per sense.
- A split/merge must explicitly re-evaluate affected translations; references are not automatically redirected.
- Check licensing and provenance for both English and Vietnamese claims.

## Deferred implementation

Choose physical embedding/references based on access patterns. A bounded gloss list may be embedded into a sense draft, whereas reusable Vietnamese entries, senses, and many-to-many alignments require stable references. **Do not create or migrate Atlas collections** until the JSON contract and reviewed pilot fixtures prove the model.

## Future acceptance tests

1. `gloss_only` with `targetSenseId` is rejected; `sense_aligned` without `targetSenseId` is rejected.
2. Verified sense alignment to missing, retired, or wrong-language target is rejected.
3. One English sense may link to multiple Vietnamese senses with distinct, evidenced contexts.
4. English/Vietnamese POS or phrase structure need not match; actual sense compatibility must be reviewed.
5. Marking a reviewed gloss as "verified equivalence" fails; it can only be a verified **gloss**.
