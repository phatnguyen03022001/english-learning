# Phase 6 — Claim Provenance and Rights (V2)

Schema/graph validity permits storage but does not make a statement true. Source metadata,
a plausible URL, a textual license or AI-generated evidence is never independent attestation.

## Typed contract

V2 `Source` extends V1 with optional `provider`, `sourceType`, `sourceIdentifier`,
`materialVersion`, `retrievedAt`, `attribution`, and structured `rights` containing
`status` (unknown, reference_only, permission_required, redistributable), intended
usage scopes, license identifier, permission reference, reviewer ID, decision ID,
review/effective timestamps and revocation/expiration data.

V2 `Evidence` extends V1 with a claim `subjectId`, JSON-pointer-like `fieldPath`,
SHA-256 `valueDigest`, `specificity`, location, attestation type,
collection method, review status, independence and limitations. Evidence association
`assertionIds` must include the claim subject, and the digest must match the current
value of the exact asserted field; otherwise `EVIDENCE_CLAIM_MISMATCH` blocks storage.
The digest proves identity of stored bytes, **not linguistic truth**.

V2 `EditorialReview.claims[]` identifies individual subject/path assertions; general
`subjectIds` does not by itself authorize every assertion inside a sense. An accepted
review of a definition does not certify a grammatical restriction, a contrasting example
or the Vietnamese gloss. New claim-specific review decisions include a `valueDigest`
for the exact value reviewed. That field remains optional only so legacy V2 review records
remain readable; a missing or stale digest never authorizes the current value, even if
new evidence is later attached. `publicationClaimPaths` enumerates learner-facing fields
for separate coverage and `CLAIM_PATH_UNVERIFIED` blocks uncovered claims.

Late evidence association uses the candidate pipeline's `bind-evidence` operation. It
requires an active draft subject, an expected revision, active draft evidence records for
the exact subject/path/value, and updates the subject's `evidenceIds` and revision in one
atomic state write. A failed check leaves the state untouched; successful bindings retain
before/after history and an idempotent binding key. Evidence records and their stable IDs
are not rewritten during association.

## Trust and publication

`evaluatePublication(records, options)` requires claim-specific exact attestation,
accepted independent review, correct scoped LER/linguistic specialty, and rights
cleared for `usageScope` (default `dictionary_publication`).
It requires `options.appointments` entries conforming to
`schemas/v2/reviewer-appointments.contract.json`, a trusted external `ownerId`,
an explicit `effectiveAt`, and independently authenticated
`options.verifyOwnerAttestation` for every scoped role/subject/field.
It additionally requires `options.verifyEvidence` for each exact independent
source claim and `options.verifyRights` for the intended reuse permission.
All verifiers must come from an outside trusted owner/evidence/rights process;
self-reported JSON alone is never authority.
The production CLI supplies neither callback: its eligibility answer remains
**fail-closed**. Arbitrary JSON properties such as `reviewerId`, `appointedBy`,
`permissionReference` cannot create this authority. Test-only forged callbacks
are adversarial fixtures, not actual approvals. Lack of owner appointments,
licensed content, legal permission evidence or trusted review means NOT READY.

No runtime internet verification of source URLs is implemented: a valid URL is not proof
of reachability, licensing or evidentiary relevance. Do not store commercially licensed
definitions, examples, audio, restricted corpus passages or invented citations in Git.

## Claims that cannot be machine-proven

- Independent existence, edition and provenance of the original external source.
- Accuracy, sense boundaries, grammar, register, example idiomaticity and equivalence.
- Actual copyright holder permission, compatibility with intended distribution and
  whether rights have been withdrawn in the outside world.
- Authenticity and scope of a real owner-appointed Lead Editorial Reviewer.

Automated validation must report insufficient external evidence until a genuinely trusted
human/editorial process supplies verified attestations.
