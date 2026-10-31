# English Learning

An English–Vietnamese dictionary core with IELTS-oriented learner annotations. The
repository owns lexical data, versioned contracts, deterministic validation, and
editorial evidence. It does not currently contain a learner application or service.

## Current capabilities

- Versioned V1 and V2 JSON Schemas with deterministic generators.
- Candidate preparation, revision, evidence binding, validation, and fail-closed
  publication checks.
- Graph and production regression suites.

## Repository map

| Path | Purpose |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Operating contract, capability limits, layout ownership, and links to canonical policies. |
| [`schemas/`](schemas/) | Versioned lexical JSON contracts; generated schema files are checked against their generators. |
| [`scripts/`](scripts/) | Schema generators and candidate command entrypoint. |
| [`pipeline/`](pipeline/) | Candidate lifecycle operations. |
| [`validators/`](validators/) | Schema, graph, evidence, authority, and publication invariants. |
| [`data/candidates/`](data/candidates/) | Draft lexical candidate snapshots. |
| [`data/reviews/`](data/reviews/) | Research and readiness snapshots. |
| [`docs/`](docs/) | Current domain policies and retained phase history. |
| [`tests/`](tests/) | Schema, graph, production, fixture, and stress coverage. |

The canonical domain policies are [identity](docs/identity-policy.md),
[English–Vietnamese alignment](docs/bilingual-alignment.md),
[sense division](docs/sense-division.md), and
[editorial review](docs/editorial-policy.md). Schema and executable behavior are
owned by `schemas/`, `pipeline/`, and `validators/`.

## Validate

With Node.js 22 or newer and the pinned development dependency installed:

```sh
npm run schema:check
npm test
npm run test:production
```

`npm test` runs schema, graph, fixture, stress, and production tests. The
[GitHub Actions workflow](.github/workflows/schema-conformance.yml) runs on relevant
pushes and supports manual dispatch.

## Publication readiness

The current readiness status and blockers are recorded in the
[Phase 13 assessment](data/reviews/phase13/readiness-assessment.json), which is the
authoritative snapshot.

## Extension boundary

The active scope is the dictionary core. Audio, IELTS practice, and web or mobile
experiences may be added when a concrete feature is approved. Keep lexical identity
and dictionary data independent of user interfaces, TTS providers, and exam scoring;
see [AGENTS.md](AGENTS.md) for the full boundary.
