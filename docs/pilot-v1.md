# Phase 4 — Lexicographic Pilot Fixtures (v1)

**Status:** Six synthetic, unreviewed candidate models. **NOT** a licensed/verified dictionary release, not Atlas ingest, not authority for publication.

**Repository contract:** [AGENTS.md](../AGENTS.md), [ontology-v1.md](ontology-v1.md), [schema-v1.md](schema-v1.md), [graph-validation-v1.md](graph-validation-v1.md). No baseline, schema, registry, or validator has been changed to make an example pass.

## Files and modeling targets

All fixture files live under `tests/fixtures/pilot/v1/`, each containing `caseId`, `focus`, `editorialStatus: "synthetic_unreviewed"`, standalone `records`, `modelExpectations`, self-authored `contrastiveExamples`, and `negativeCases`.

| Pilot | Boundary under test | Deliberate exclusions |
| --- | --- | --- |
| `bank.json` | Two hypothetical homograph entry identities and sense-specific Vietnamese glosses | Do not claim that the chosen homograph division is lexicographically settled; no headword-level translation |
| `run.json` | One verb entry with three illustrative conventionalized meaning candidates | Not an exhaustive sense inventory; do not create an entry for each grammatical frame |
| `analyse-family.json` | Three lexical entries sharing one `fam_` membership cluster | No fabricated directed `DERIVED_FROM` edges or historical etymology |
| `big-large.json` | `NEAR_SYNONYM_OF` between two senses within explicitly scoped physical-size context | No global interchangeability or automatic transitivity |
| `depend-on.json` | `con_` required-preposition pattern attached to the sense of `depend` | No independent `depend on` `lex_` without a specific lexicalization decision |
| `look-up.json` | Multiword `lex_` entry with separate sense and a separable `con_` frame | No `mwe_` entity and no `look it up` lexical entry |

The contrastive examples are original *illustrations drafted for tests*. They are not corpus attestations, independently checked lexicographic assertions, IELTS/CEFR ratings, translations approved for reuse, or evidence that a cited dictionary endorses the proposed sense boundaries. Labels such as `look up it` and `depend the weather` describe editorial negative *candidates*. The V1 validator does **not** parse natural-language syntax or verify their linguistic acceptability. A specialist must evaluate these before treating them as authoritative.

## Automated checks and limitations

`tests/pilot-fixtures.test.mjs` exercises all six fixtures with the existing `validateDataset` schema-first entry point. On each positive fixture, it checks:

1. Draft-only records with no fabricated reviewer, source, editorial decision or licensing attestation.
2. Schema and graph storage validity, with no external access.
3. Publication eligibility **false**; `publication: true` must fail closed with `PUBLICATION_NOT_VERIFIED`.
4. Ontology-level *structural* expectations: entry/sense identity, sense-scoped glosses, word-family membership without derivation, contextual near-synonym edge ordering, construction ownership and separability.
5. Repeatable results and input immutability.

Each case includes deliberately invalid negative mutations (missing references, duplicate or reversed graph edge, structural misuse of `gloss_only`, inactive `mwe_`, derivation cycle), requiring the expected schema/semantic diagnostic.

**Passing tests certify shape and graph logic only.** They cannot certify a meaning, semantic equivalence, corpus frequency, grammaticality, etymological direction, licensed source or editorial authority.

## Run on GitHub (no Mac)

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

The GitHub Actions workflow `.github/workflows/schema-conformance.yml` uses Ubuntu and Node.js 22, and is triggered by changes under `tests/fixtures/pilot/v1/**` or `tests/pilot-fixtures.test.mjs`. The command preserves Phase 2/3 regression coverage.

## Editorial review and acceptance boundary

These **six fixture families** are ready for **human lexicographic review** when machine checks pass; they are not six published, licensed lexical entries. Review and replace speculative assertions with independent, reproducible evidence:

- Establish the right homograph vs polysemy and sense boundaries with attested examples, especially `bank` and `run`.
- Verify semantic/register constraints of `big` and `large`, required `depend on` frame and `look up` pronoun placement.
- Review family membership and direct morphological derivation separately; require independent sources before adding a `DERIVED_FROM` edge.
- Check each bilingual gloss or sense alignment against independent English/Vietnamese usage, licensing, and evidence.
- Obtain authorized Lead Editorial Reviewer adjudication and verified rights metadata. Current V1 lacks enough provenance to establish final publication authority; Phase 3 must continue to return `INSUFFICIENT_EVIDENCE` where appropriate.

**Do not promote these records to `verified`, import them into Atlas, or use CI results as a substitute for language expert review.** A separate approved provenance/authority contract revision is needed before publication.
