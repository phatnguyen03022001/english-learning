# Phase 7 Pilot — Codex Multi-Agent Lexical Production

## Result

- Multi-agent fanout: REAL
- Candidate engineering: PASS
- Lexical quality: PROVISIONAL
- Publication: NOT READY
- Reference HEAD: 116edd03c812e93bdef5fa83692ba5f0f6984d36
- Batch: pilot-fanout-001
- Candidate digest: 3453c9fe9cb5117a76ffbf9b7d5ac5f3af585ce20a99a639e2091a6f9e970695

This is a draft candidate batch, not a reviewed dictionary release. No claim is
treated as independently verified merely because multiple agents proposed it.

## A. Agent Fanout Evidence

| Agent | Task | Execution | Findings | Handoff |
| --- | --- | --- | --- | --- |
| Coordinator | Integration, validation, single writer | Main thread; repository read/write owner | Integrated 53 V2 candidate records, preserved conflicts, ran tests and pipeline checks | Coordinator handoff |
| Agent A — Euler | Lexicography / semantics | Real read-only subagent; agent 01a18af0-3d8f-70fe-9089-2059e34500b1 | Split bank; bounded run; kept analyse family non-directional; rejected global big/large synonymy | Structured A–F handoff plus cross-agent QA |
| Agent B — Leibniz | Grammar / phraseology | Real read-only subagent; agent 01a18af0-4b41-7201-8159-10cd8a2c50b3 | Required depend on; separable look up; role-sensitive borrow/lend; uncountable advice; corrected run + NP | Structured A–F handoff plus cross-agent QA |
| Agent C — Wegener | English–Vietnamese alignment | Real read-only subagent; agent 01a18af0-448c-70c3-9338-8480254030b9 | Preserved sense-specific glosses; exposed run gloss conflict; rejected false equivalence and synthetic target senses | Structured A–F handoff plus cross-agent QA |
| Agent D — Boole | Evidence, licensing, adversarial QA | Real read-only subagent; agent 01a18af0-5200-7788-b8ac-25e8d3380098 | Confirmed all claims lack independent evidence/rights/authority; publication remains fail-closed | Structured A–F handoff plus cross-agent QA |

All four agents inspected the exact reference HEAD through cloud/GitHub
read-only access. No specialist changed files, created branches, committed,
or pushed. The second QA round reused the same four agents; no second team was
spawned.

## B. Lexical Production

### Scope and counts

- Lexical targets processed: 12
- Candidate LexicalEntry identities: 13 (bank has two homograph candidates)
- Candidate senses: 15
- Candidate word-family records: 1
- Candidate constructions: 8
- Candidate gloss-only translation records: 16
- Total raw candidate records: 53
- External sourceItemKey values: none; no stable external source identity was
  available.
- Canonical IDs in raw input: none; all identities are minted only by the
  preparation ledger.

### Integrated candidate boundaries

| Target | Integrated draft | Vietnamese candidate(s) | Grammar / usage |
| --- | --- | --- | --- |
| bank | Two noun entries: financial institution and river edge | ngân hàng; bờ sông | Countable candidates; contexts remain separate |
| run | One verb with movement, machine operation, and management senses; non-exhaustive | chạy; hoạt động; unresolved alternative vận hành; điều hành | Movement/machine candidates intransitive; management run + NP transitive |
| analyse | Verb: examine in detail | phân tích | analyse + NP candidate |
| analysis | Noun: detailed examination | phân tích, with process/report restrictions | Countability intentionally unresolved |
| analytical | Adjective related to detailed analysis | mang tính phân tích | POS and usage remain sense-specific |
| big | Physical-size candidate only | lớn | No serialized synonym relation |
| large | Physical-size/extent candidate only | lớn | Shared gloss does not imply substitution |
| depend | Conditional/contingent sense only | phụ thuộc vào | depend on + NP; reliance/support sense deferred |
| look up | One lexicalized phrasal-verb entry | tra cứu | Separable: look up + NP, look + NP + up, look it up; look up it rejected |
| borrow | Temporarily receive/use a non-money item | mượn | borrow + NP (+ from + NP); recipient/source roles explicit |
| lend | Temporarily provide a non-money item | cho mượn | lend + recipient + thing and lend + thing + to + recipient |
| advice | Guidance/recommendation noun | lời khuyên | Candidate uncountable usage; lời tư vấn remains context-specific and deferred |

Examples are explicitly marked editorial_original, but remain draft,
unreviewed examples. Their presence does not establish external attestation,
licensing, or translation approval.

### Open linguistic disputes retained

1. run machine sense: hoạt động versus technical/operator-oriented vận hành.
2. run movement: chạy versus exercise-specific chạy bộ.
3. depend on: conditional dependence versus reliance/support.
4. borrow/lend: mượn/vay and cho mượn/cho vay by object type.
5. advice: ordinary lời khuyên versus consultation-specific lời tư vấn.
6. analysis countability and process/result translation wording.
7. big/large: context-limited near-synonymy remains unreviewed.
8. analyse family membership is editorially related only; no directional
   DERIVED_FROM edge was created.

## C. Quality Assessment

### Findings from independent specialist streams

- Semantic: bank homographs must not be merged; run has a deliberately
  incomplete candidate inventory; grammar alone did not force extra senses.
- Grammar: depend requires on; look up is separable with pronouns before the
  particle; lend role order differs from borrow; advice is a draft uncountable
  candidate.
- Bilingual: translations are sense-specific and gloss_only; no Vietnamese
  target sense was fabricated; English/Vietnamese POS was not forced to match.
- Evidence/QA: repository fixtures, agent consensus, schema validity, and
  original examples are not independent linguistic evidence or rights
  clearance.

### Proposals rejected or deferred

- Unrestricted bank headword-to-ngân hàng mapping.
- Treating the three run senses as a complete inventory.
- Selecting hoạt động and vận hành as unrestricted equivalents.
- Treating big and large as global synonyms.
- Adding depend on as a new lexical entry solely because of the preposition.
- Creating look it up or look up it as separate entries.
- Treating borrow and lend as synonyms or reversing their semantic roles.
- Adding DERIVED_FROM edges from spelling or family membership.
- Fabricating CEFR, IELTS band, IPA, frequency, etymology, source, license,
  reviewer appointment, or publication approval claims.

Conflicts were preserved as contextual alternatives or review-queue notes;
they were not resolved by majority vote.

## D. Integration and Verification

### Files

- data/candidates/pilot-fanout-001.json
- docs/lexical-fanout-pilot-report.md

### Pipeline results

Executed in the cloud workspace against the reference checkout:

    npm test
    191 pass / 0 fail
    production suite: 51 pass / 0 fail

    npm run candidates:validate -- --input data/candidates/pilot-fanout-001.json --state /tmp/ielts-phase7-pilot-state.json
    status=dry-run
    issues=0
    possible duplicates=1 (the two bank homograph candidates)
    publicationEligible=false

    npm run candidates:prepare -- --input data/candidates/pilot-fanout-001.json --state /tmp/ielts-phase7-pilot-state.json --dry-run
    status=dry-run
    issues=0
    publicationEligible=false

    persistent prepare
    status=prepared
    records=53
    history=1
    mappings=53
    publicationEligible=false

    repeated persistent prepare
    status=replayed
    same batch digest
    no new records and no history growth

    check
    storageValid=true
    publicationEligible=false
    publication issues=696

The local cloud workspace used Node.js v24.22.1; the repository contract
requires Node.js >=22, and the GitHub workflow is configured for Node.js 22.
No state ledger or temporary runtime state is committed.

### Gate interpretation

- Schema validation: PASS.
- Graph validation: PASS.
- Identity compatibility and reference resolution: PASS.
- Unicode input immutability: PASS; candidate file SHA-256 was
  788d39e878d72104560f62c3b5298bc74348a90af2f0acbbbf1bda632f8705a4.
- Batch idempotency: PASS (prepared then replayed; 53 mappings, one history event).
- Duplicate inventory: PASS; one possible bank homograph/duplicate hint was
  surfaced and not auto-merged.
- Draft-only statuses: PASS; raw records contain no verified status.
- Publication fail-closed: PASS; missing exact evidence, rights, claim-specific
  review, and authenticated LER authority remain blocking.

## E. GitHub

- Repository: phatnguyen03022001/ielts-tradition
- Branch: main only
- Original tested HEAD: 116edd03c812e93bdef5fa83692ba5f0f6984d36
- Final HEAD: recorded in the final coordinator handoff after the CAS publish
- Changed files: the two files listed above
- GitHub Actions: NOT claimed PASS. The existing workflow path filter does not
  include data/candidates/** or this report, and the available GitHub connector
  exposed no workflow-dispatch mutation. The local cloud execution evidence
  above is genuine; a GitHub Actions run for the final candidate SHA therefore
  remains unverified.
- No force-push, branch, PR, Atlas write, or secret was used.

## F. Final Verdict

- MULTI-AGENT FANOUT: REAL
- CANDIDATE ENGINEERING: PASS
- LEXICAL QUALITY: PROVISIONAL
- PUBLICATION: NOT READY

The batch is structurally valid and safely staged as a draft candidate set.
It is not a verified dictionary dataset and must not be published or promoted.

## G. Agent Team Evaluation

1. Fanout found issues the Coordinator could miss. The strongest additions
   were the run machine-gloss conflict, exact lend role order, analysis
   countability caution, and the requirement to keep gloss_only/empty evidence
   fail-closed.
2. Conflicts detected: 8 material linguistic/evidence conflicts are retained.
3. Proposals rejected/deferred: 10 major unsafe proposal classes, plus
   unsupported optional metadata, were rejected or deferred.
4. Duplication/context overhead: four independent readings overlapped on
   governance and six synthetic fixtures. That overhead was intentional and
   exposed convergence versus genuine disagreement; no specialist mutated
   repository state.
5. Highest-value roles: Agent B for exact construction/role constraints,
   Agent C for translation ambiguity, and Agent D for publication safety.
   Agent A supplied the critical entry/sense boundaries.
6. Keep four specialists for larger batches: yes, provided targets are
   partitioned, handoffs stay claim-level, and an appointed human/editorial
   process remains separate from AI-assisted QA.

## Stop condition

Phase 7 pilot scope is complete. No Phase 8, schema redesign, Atlas mutation,
bulk expansion, or orchestration framework was started.
