# Stable Identifier & Identity Policy (v1)

Status: normative for future schemas and editorial data; no database migration is authorized by this document.

## Canonical identifiers

- Every first-class entity receives one globally unique, immutable **UUIDv7 (RFC 9562)** string, lowercase and hyphenated, prefixed with its entity type: `<prefix>_<uuidv7>`.
- Canonical types and prefixes: lexical entry `lex`; lexical sense `sns`; lexical form `frm`; word family `fam`; morpheme/root `mrf`; etymology `ety`; topic `top`; multiword expression `mwe`; construction `con`; collocation `col`; bilingual equivalence `eqv`; lexical relation `rel`; evidence `evd`; source `src`; editorial review `rev`; editorial decision `dec`.
- A Vietnamese lexical entry uses `lex` and a Vietnamese lexical sense uses `sns` too; **language is an attribute, not a different identity namespace**.
- UUIDv7 is generated once per genuinely new entity and persisted. Never regenerate it on update or import replay.
- Exact validation pattern (ASCII lowercase UUIDv7; version nibble 7; variant 8/9/a/b):

    ^(lex|sns|frm|fam|mrf|ety|top|mwe|con|col|eqv|rel|evd|src|rev|dec)_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$

- Illustrative IDs: `lex_01940000-0000-7000-8000-000000000001` and `sns_01940000-0000-7000-8000-000000000002`. These do not identify real reviewed words.
- In future MongoDB collections, prefer the canonical ID directly as `_id` when appropriate. Do not introduce a second competing canonical ID. The existing empty `lexemes` collection is **not** migrated by this policy.

## Identity is not the identifier

- A lemma, slug, spelling hash, POS, sense ordinal, or external vendor ID must **not** be embedded in the canonical ID.
- Store entry identity attributes separately: `language` (BCP 47 tag such as `en` or `vi`), canonical lemma (Unicode NFC), lexical category/POS (controlled vocabulary), `entryKind` (word/multiword where applicable), and editorial homograph/homonym distinction.
- A candidate identity key can be built from these attributes for **duplicate detection**; it is **not** automatically authoritative. Case folding and whitespace normalization can support search/dedup suggestions but must not erase meaningful distinctions (e.g., proper names, accents in Vietnamese, homographs).
- Homograph indices and sense display order are presentation/editorial attributes, not identity. Two homographs or two senses must not share one canonical ID. POS and language may be corrected via an explicit identity decision; never silently rewrite IDs or merge records.
- External source IDs go in a separately namespaced mapping with source, release/version, and license; do not overwrite canonical IDs with them.

## Lifecycle, split, merge, and graph integrity

- IDs are **never reused**. Record `active` or `retired` lifecycle; retired records retain stable provenance and cannot be edited as if they were new entries.
- Minor definition corrections preserving the underlying sense keep the same sense ID, with an editorial revision.
- A true sense split retires the original sense and creates two or more new sense IDs; a true merge retires affected senses and creates a new sense ID when the merged concept changes identity.
- Track `supersededByIds[]`, `decisionId` and `effectiveRevision` on retirement. **One-to-many supersession is not an automatic redirect**: each incoming translation, collocation, topic, construction, example, or lexical relation must be reviewed for reattachment.
- Check graph edges for valid type-compatible endpoints, cycles forbidden by the specific relation, duplicate edges, orphaned references, and references to retired entities.
- Merge and split are editorial decisions governed by [sense-division.md](sense-division.md) and [editorial-policy.md](editorial-policy.md). Do not delete history to make migration pass.

## Import and compatibility contract

- Imports must be idempotent. Re-import of an existing source item resolves via a **persistent external-to-canonical mapping** or explicitly matched record; it must not mint a fresh UUID for the same item.
- Ambiguous matches are staged as candidates, not auto-merged. Unmatched source data gets a new canonical ID only when the creating operation is authorized and dedup has been checked.
- Record `schemaVersion`, `sourceId` and decision/revision metadata needed for audit. Treat any change to ID representation as a breaking migration requiring an approved plan; no silent mixed ID formats.

## Acceptance examples (for future automated tests)

1. Correct UUIDv7 prefixed ID accepted; UUIDv4, `lex_depend_v_1`, uppercase, and unknown prefix rejected.
2. Update lemma/definition/display order does not change existing canonical ID.
3. Distinct `bank` homographs and distinct English/Vietnamese entries do not collide; normalized search does not drop Vietnamese diacritics from canonical identity.
4. Re-import identical licensed source records produces no new entities.
5. Sense split 1→2 preserves retired source and requires explicit resolution of all incoming links; auto-redirect to both targets fails.
6. Deleted/retired/missing cross-collection endpoint fails graph integrity checks before publication.
