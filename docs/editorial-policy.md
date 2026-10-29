# Editorial Arbitration and Publication Policy (v1)

Status: normative worker/approval rules. No asynchronous SLA, ticket service, or new tooling is required.

## Roles and authority

- **Specialist workers (read-only)** propose analyses with explicit sources and uncertainty; they never approve their own contested claims by default.
- **Lead Editorial Reviewer (LER)** is appointed per scope by the owner and is the **final arbiter of linguistic content**: entry/sense boundaries, grammar/valency, bilingual equivalence, usage labels, morphological and topic decisions.
- **Evidence & Licensing reviewer** can block inclusion where rights or source integrity are unproven; the LER cannot override legal/license restrictions.
- **Data/Schema reviewer** can block changes that violate schema, stable-ID or graph-integrity gates; bypass needs a separately approved design and migration, not a linguistic override.
- **Integration writer (one)** is the sole repository/Atlas mutator when authorized. The writer implements approved decisions but does not gain editorial approval authority merely by having write access.
- **Repository owner** appoints or replaces reviewers and approves high-impact scope/infrastructure/data mutations. No named person is presumed to be the current LER.

## Dispute workflow

1. **Open**: on conflicting claims, stop promotion and mark the affected assertions `disputed`, retaining both proposals and evidence.
2. **Compare**: capture affected IDs, exact question, competing hypotheses, source/rights, contrastive evidence and downstream graph impacts.
3. **Review**: LER assesses linguistic merit and rules `accepted`, `rejected`, or `deferred_pending_evidence`. Legal or technical blockers stay blocking until their own gates pass.
4. **Record**: persist an immutable audit record `decisionId`, reporter(s), reviewer, action, rationale, evidence IDs, affected IDs, revision/date and status transition; no silent overwrite.
5. **Integrate**: only the designated integration writer applies the approved minimal change and validates every affected reference.
6. **Reopen**: new evidence may trigger a fresh decision superseding the prior decision; never rewrite history.

If an LER has not been appointed or a dispute is unresolved, the assertion remains `disputed` / `provisional` and cannot be published as `verified`. There is **no time-based SLA**: no invented 24/48-hour deadlines or automatic approval by timeout.

## Publication rules and separation of statuses

- Editorial status: `draft`, `provisional`, `verified`, `disputed`, `rejected`.
- A disputed assertion blocks its **own promotion to verified** and publication as a verified claim; unrelated verified content may proceed only if it does not depend on the contested claim.
- `verified` requires appropriate review, traceable evidence, allowed reuse, stable identity, consistent endpoint and graph checks, and relevant domain gates. Optional unavailable attributes do not have to be fabricated.
- A reviewed Vietnamese gloss can be `verified` **as a gloss**, but a `sense_aligned` equivalence is verified only after both target/source sense and relationship have sufficient evidence. See [bilingual-alignment.md](bilingual-alignment.md).
- Never infer IELTS Band 9 status from rarity, CEFR, or synonym substitution alone.

## One-writer, main-only and database safeguards

- All Git changes go to `main` only; inspect remote HEAD before publishing; never force-push.
- Read-only specialists hand off proposed changes, affected IDs, factual sources, tests and risk. Concurrent workers must not mutate independently.
- Atlas writes demand explicit owner authorization of project `ielts-tradition`, cluster `IeltsTradition`, database `ielts-tradition`, exact collections, preconditions and rollback plan. Do not confuse documentation approval with database write approval.
- On error or inconclusive verification, record `PARTIAL/BLOCKED`; do not label work fully verified.

## Minimal decision record (conceptual, not an Atlas collection specification)

- `decisionId`, `subjectIds[]`, `issueType`, `proposals[]`, `evidenceIds[]`, `reviewerId`, `outcome`, `rationale`, `reviewedAt`, `supersedesDecisionId?`, `affectedEdges[]`.

## Future acceptance tests

1. Disputed claim cannot transition to verified without an appointed LER decision and evidence.
2. LER approval cannot bypass an invalid graph or missing reuse rights.
3. Writer cannot self-approve disputes solely based on write privilege.
4. Sense split/merge approval requires explicit affected-edge review and a non-destructive ID migration plan.
5. A newer decision references the old decision rather than destroying its history.
