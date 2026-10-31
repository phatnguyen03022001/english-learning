# Versioned Schema Migration — V1 to V2

The 16 V1 schemas, V1 vocabulary registry, frozen baseline policies, and V1 graph
validator remain unchanged. `schemas/v2` contains another 16 JSON Schema Draft
2020-12 contracts and a versioned V2 vocabulary extending learner, claim, provenance
and editorial fields. The deterministic generator `scripts/generate-schemas-v2.mjs`
starts from canonical V1, changes `$id`/`$ref` to the separate V2 namespace,
updates `schemaVersion`, and adds optional typed fields; never mutates V1.

## Repository rename compatibility

The V1 and V2 `$id` and canonical `$ref` values keep the legacy
`https://raw.githubusercontent.com/phatnguyen03022001/ielts-tradition` URI after the
repository rename to `english-learning`. These URIs are schema contract identities,
not decorative repository links. Do not rewrite them in place; any identity change
requires a versioned schema transition and compatibility regressions. Historical
research URLs and immutable source snapshots retain the repository path that was
current when they were recorded.

```js
import {migrateV1Records} from "./pipeline/migrate-v1.mjs";
import {validateDatasetV2} from "./validators/validate-dataset-v2.mjs";
const draft=migrateV1Records(recordsV1);
const check=validateDatasetV2(draft);
```

Migration is explicit, deterministic and preserves canonical IDs and the original
editorial states. It will reject malformed schema version and duplicate IDs; it
does **not** mint evidence, reviewer appointments, rights approval, historical
snapshots, or missing grammar fields. V1 material remains separately readable and
testable, not implicitly reinterpreted.

Keep the original V1 records and version-pinned serialized draft state before any
migration. For rollback, discard newly generated **unpublished draft** V2 state and
restore the preserved original V1 snapshot. Do not reverse-edit canonical identities,
erase history, or run a direct Atlas migration. Persisting a V2 draft and rolling it
back is an explicitly authorized, independent operational decision.
