import registry from "../schemas/v1/vocabularies.json" with { type: "json" };

// Pure semantic validation. The caller must pass schema-valid V1 records;
// validateDataset() is the public schema-first entry point.
const names = {
  lex: "LexicalEntry", sns: "LexicalSense", frm: "LexicalForm",
  fam: "WordFamily", mrf: "Morpheme", ety: "Etymology",
  top: "Topic", con: "Construction", col: "Collocation",
  eqv: "TranslationEquivalence", rel: "LexicalRelation",
  evd: "Evidence", src: "Source", rev: "EditorialReview", dec: "EditorialDecision"
};
const prefixes = Object.fromEntries(Object.entries(names).map(([p, n]) => [n, p]));
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0; // Canonical ASCII UUID IDs only
const issueSort = (a, b) =>
  compare(a.entityId ?? "", b.entityId ?? "") ||
  compare(a.path ?? "", b.path ?? "") ||
  compare(a.code, b.code) ||
  compare(a.message, b.message);
const normalize = value => value.normalize("NFC");

export function qualifierKey(qualifiers = {}) {
  // Omitted values stay absent. Never fold case, strip diacritics, trim
  // meaningful whitespace, or conflate distinct semantic contexts.
  return JSON.stringify(registry.relationModel.qualifierFieldsInOrder
    .filter(k => Object.hasOwn(qualifiers, k))
    .map(k => [k, normalize(qualifiers[k])]));
}

function cycles(adjacency, emit, path) {
  // Iterative DFS, O(V+E) after deterministic sorting, independent of input order.
  const color = new Map(), stack = [], position = new Map();
  for (const start of [...adjacency.keys()].sort(compare)) {
    if (color.get(start)) continue;
    stack.push({ id: start, neighbors: [...(adjacency.get(start) ?? [])].sort(compare), next: 0 });
    color.set(start, 1); position.set(start, 0);
    while (stack.length) {
      const top = stack.at(-1);
      if (top.next >= top.neighbors.length) {
        color.set(top.id, 2); position.delete(top.id); stack.pop(); continue;
      }
      const target = top.neighbors[top.next++];
      if (!color.get(target)) {
        color.set(target, 1);
        position.set(target, stack.length);
        stack.push({ id: target, neighbors: [...(adjacency.get(target) ?? [])].sort(compare), next: 0 });
      } else if (color.get(target) === 1) {
        const nodes = stack.slice(position.get(target)).map(x => x.id);
        emit("CYCLE_DETECTED", top.id, path, nodes.concat(target).join(" -> "));
      }
    }
  }
}

export function validateGraph(dataset, options = {}) {
  const records = Array.isArray(dataset) ? dataset : dataset?.records;
  if (!Array.isArray(records)) {
    return { valid: false, issues: [{
      code: "DATASET_INVALID", entityId: "", path: "records",
      message: "Dataset must contain a records array"
    }], publication: { eligible: false, issues: [] } };
  }
  const issues = [], publicationIssues = [], byId = new Map(), prefixSet = new Set(registry.identifiers.activeV1Prefixes);
  const emit = (code, entityId, path, message, publishing = false) =>
    (publishing ? publicationIssues : issues).push({ code, entityId, path, message });

  for (const record of [...records].sort((a,b) => compare(a?._id ?? "", b?._id ?? ""))) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      emit("RECORD_INVALID", "", "records", "Record must be an object"); continue;
    }
    const id = record._id;
    if (typeof id !== "string") {
      emit("IDENTITY_INVALID", "", "_id", "Missing canonical identifier"); continue;
    }
    const prefix = id.split("_", 1)[0];
    if (!prefixSet.has(prefix)) {
      emit("INACTIVE_OR_UNKNOWN_ENTITY", id, "_id", "Prefix is not active in V1"); continue;
    }
    if (byId.has(id)) {
      emit("DUPLICATE_ID", id, "_id", "Canonical ID occurs more than once"); continue;
    }
    byId.set(id, record);
  }

  function reference(owner, path, id, expected, historical = false) {
    if (typeof id !== "string") return null; // JSON Schema reports invalid primitive types.
    const target = byId.get(id);
    if (!target) { emit("REFERENCE_NOT_FOUND", owner._id, path, "Referenced entity does not exist: " + id); return null; }
    const prefix = id.split("_", 1)[0];
    if (expected && !expected.includes(prefix)) {
      emit("REFERENCE_TYPE_MISMATCH", owner._id, path, "Expected " + expected.join("|") + ", found " + prefix);
      return null;
    }
    if (!historical && owner.lifecycleStatus === "active" && target.lifecycleStatus === "retired") {
      emit("RETIRED_LIVE_REFERENCE", owner._id, path, "Active record references retired entity: " + id);
    }
    return target;
  }
  function each(owner, field, types, historical = false) {
    const value = owner[field];
    if (Array.isArray(value)) value.forEach((id, n) => reference(owner, field + "/" + n, id, types, historical));
    else if (typeof value === "string") reference(owner, field, value, types, historical);
  }

  const rels = [];
  const relationRules = new Map(registry.relationTypes.map(x => [x.type, x]));
  const adjacency = new Map();
  const links = new Map();
  const addEdge = (type, from, to) => {
    if (!adjacency.has(type)) adjacency.set(type, new Map());
    const map = adjacency.get(type);
    if (!map.has(from)) map.set(from, new Set());
    map.get(from).add(to);
  };
  for (const record of [...records].sort((a,b) => compare(a?._id ?? "", b?._id ?? ""))) {
    if (!record || typeof record._id !== "string" || byId.get(record._id) !== record) continue;
    const type = record._id.split("_", 1)[0];
    if (!prefixSet.has(type)) continue;
    each(record, "evidenceIds", ["evd"], true); // historical provenance, not a live edge
    if (record.lifecycleStatus === "retired") {
      each(record, "retiredByDecisionId", ["dec"], true);
      each(record, "supersededByIds", type === "sns" ? ["sns"] : [...prefixSet], true);
      if (!record.retiredByDecisionId) emit("RETIREMENT_INVALID", record._id, "retiredByDecisionId", "Retirement requires a decision");
    } else if (record.retirementMode || record.retiredByDecisionId || record.supersededByIds) {
      emit("RETIREMENT_INVALID", record._id, "lifecycleStatus", "Active record cannot carry retirement metadata");
    }
    switch (type) {
      case "lex": each(record, "familyIds", ["fam"]); break;
      case "sns":
        each(record, "entryId", ["lex"]);
        each(record, "topicIds", ["top"]);
        break;
      case "frm": case "ety": each(record, "entryId", ["lex"]); break;
      case "con": each(record, "senseId", ["sns"]); break;
      case "col": each(record, "anchorSenseId", ["sns"]); break;
      case "top":
        if (record.parentTopicId !== null && record.parentTopicId !== undefined) {
          each(record, "parentTopicId", ["top"]);
          if (byId.has(record.parentTopicId)) addEdge("TOPIC_PARENT", record._id, record.parentTopicId);
        }
        break;
      case "eqv": {
        const source = reference(record, "sourceSenseId", record.sourceSenseId, ["sns"]);
        const target = record.alignmentMode === "sense_aligned"
          ? reference(record, "targetSenseId", record.targetSenseId, ["sns"]) : null;
        const sourceEntry = source && byId.get(source.entryId);
        const targetEntry = target && byId.get(target.entryId);
        if (sourceEntry && sourceEntry.language !== "en")
          emit("BILINGUAL_LANGUAGE_MISMATCH", record._id, "sourceSenseId", "Source sense must belong to an English entry");
        if (targetEntry && targetEntry.language !== "vi")
          emit("BILINGUAL_LANGUAGE_MISMATCH", record._id, "targetSenseId", "Target sense must belong to a Vietnamese entry");
        if (record.alignmentMode === "gloss_only" && record.targetSenseId !== undefined)
          emit("ALIGNMENT_MODE_INVALID", record._id, "targetSenseId", "Gloss-only may not contain a target sense");
        if (record.alignmentMode === "sense_aligned" && !record.targetSenseId)
          emit("ALIGNMENT_MODE_INVALID", record._id, "targetSenseId", "Aligned mode requires a real target sense");
        break;
      }
      case "rel": {
        const rule = relationRules.get(record.relationType);
        if (!rule) { emit("RELATION_TYPE_UNKNOWN", record._id, "relationType", "Unregistered relation type"); break; }
        const sourceType = prefixes[rule.sourceType], targetType = prefixes[rule.targetType];
        const source = reference(record, "sourceId", record.sourceId, [sourceType]);
        const target = reference(record, "targetId", record.targetId, [targetType]);
        if (record.sourceId === record.targetId)
          emit("RELATION_SELF_LOOP", record._id, "targetId", "Self-loop prohibited");
        if (rule.symmetric && record.sourceId > record.targetId)
          emit("RELATION_NOT_CANONICAL", record._id, "sourceId", "Symmetric storage order must be ascending ASCII");
        if (source && target) {
          const [a, b] = rule.symmetric && record.sourceId > record.targetId
            ? [record.targetId, record.sourceId] : [record.sourceId, record.targetId];
          const key = JSON.stringify([record.relationType, a, b, qualifierKey(record.qualifiers)]);
          const previous = links.get(key);
          if (previous) emit("DUPLICATE_SEMANTIC_EDGE", record._id, "relationType", "Same typed endpoints and semantic qualifiers as " + previous);
          else links.set(key, record._id);
          if (rule.cyclePolicy === "reject" && record.lifecycleStatus === "active" && source.lifecycleStatus === "active" && target.lifecycleStatus === "active")
            addEdge(record.relationType, record.sourceId, record.targetId);
        }
        rels.push(record);
        break;
      }
      case "evd": each(record, "sourceId", ["src"], true); each(record, "assertionIds", [...prefixSet], true); break;
      case "rev": each(record, "subjectIds", [...prefixSet], true); break;
      case "dec":
        each(record, "subjectIds", [...prefixSet], true);
        each(record, "entryId", ["lex"], true);
        each(record, "previousSenseIds", ["sns"], true);
        each(record, "proposedSenseIds", ["sns"], true);
        each(record, "supersedesDecisionId", ["dec"], true);
        each(record, "affectedEdges", ["rel"], true);
        break;
    }
  }

  // No generic graph-wide DAG rule: only topic parents and the registry's
  // cyclePolicy=reject relations are traversed.
  for (const [type, map] of [...adjacency].sort(([a], [b]) => compare(a, b))) {
    cycles(map, (code, id, _path, detail) => emit(code, id, type, detail), type);
  }

  const retired = [...byId.values()].filter(r => r._id.startsWith("sns_") && r.lifecycleStatus === "retired");
  const groups = new Map();
  for (const sense of retired) {
    const decision = byId.get(sense.retiredByDecisionId);
    if (!decision || !decision._id.startsWith("dec_")) continue; // missing ref diagnosed above
    const mode = sense.retirementMode;
    if (mode === "semantic_split" || mode === "semantic_merge" || mode === "duplicate_reconciliation") {
      const key = decision._id + "|" + mode;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(sense);
    }
    const expectedAction = {semantic_split:"split", semantic_merge:"merge",
      duplicate_reconciliation:"duplicate_reconciliation", invalidated:"invalidate"}[mode];
    if (decision.action !== expectedAction || !decision.subjectIds?.includes(sense._id) ||
      !decision.previousSenseIds?.includes(sense._id) ||
      JSON.stringify([...(decision.proposedSenseIds ?? [])].sort(compare)) !==
      JSON.stringify([...(sense.supersededByIds ?? [])].sort(compare))) {
      emit("DECISION_TRANSITION_MISMATCH", sense._id, "retiredByDecisionId",
        "Decision action, source IDs, or proposed successors do not match retirement");
    }
    if (decision.outcome !== "accepted")
      emit("DECISION_NOT_ACCEPTED", sense._id, "retiredByDecisionId", "Transition decision is not accepted");
    for (const successor of sense.supersededByIds ?? []) {
      const target = byId.get(successor);
      if (target && target.lifecycleStatus !== "active")
        emit("SUCCESSOR_RETIRED", sense._id, "supersededByIds", "Successor must be active");
      if (target && target.entryId !== sense.entryId)
        emit("SUCCESSOR_OWNERSHIP_MISMATCH", sense._id, "supersededByIds", "Successor belongs to a different entry");
    }
    if (["semantic_split","semantic_merge","duplicate_reconciliation"].includes(mode)) {
      // Current V1 records don't preserve independently verifiable creation
      // provenance, same-identity adjudication or per-edge resolution.
      emit("INSUFFICIENT_EVIDENCE", sense._id, "retiredByDecisionId",
        "Cannot prove new/existing successor identity or approved incoming-edge resolution", true);
    }
    if (mode === "duplicate_reconciliation" && !(decision.evidenceIds?.length && sense.evidenceIds?.length))
      emit("INSUFFICIENT_EVIDENCE", sense._id, "evidenceIds",
        "Duplicate identity has no independently reviewable evidence", true);
  }
  for (const [key, group] of groups) {
    const [id, mode] = key.split("|");
    const decision = byId.get(id);
    if (mode === "semantic_merge") {
      if (group.length < registry.retirementRequirements.semantic_merge.retiredSourceMin ||
        decision.previousSenseIds?.length !== group.length ||
        new Set(group.map(s => s.supersededByIds?.[0])).size !== 1)
        emit("MERGE_GROUP_INVALID", id, "previousSenseIds", "Merge requires two or more retired sources and exactly one common successor");
    } else if (mode === "semantic_split" || mode === "duplicate_reconciliation") {
      if (group.length !== 1 || decision.previousSenseIds?.length !== 1)
        emit("RETIREMENT_GROUP_INVALID", id, "previousSenseIds", "Split/reconciliation requires exactly one retired source");
    }
  }

  // Publication is separate from storable semantic validity. No GitHub
  // permission, status='verified', or reviewerId implies editorial authority.
  for (const record of byId.values()) {
    if (record.lifecycleStatus !== "active") continue;
    if (record.editorialStatus === "disputed" || record.editorialStatus === "rejected") {
      emit("PUBLICATION_STATUS_BLOCKED", record._id, "editorialStatus", "Disputed/rejected claim may not be published", true);
    } else if (record.editorialStatus !== "verified") {
      emit("PUBLICATION_NOT_VERIFIED", record._id, "editorialStatus", "Only verified records may be published", true);
    } else {
      if (!record.evidenceIds?.length) emit("PUBLICATION_EVIDENCE_MISSING", record._id, "evidenceIds", "Verified claim requires evidence", true);
      else {
        for (const id of record.evidenceIds) {
          const ev = byId.get(id), src = ev && byId.get(ev.sourceId);
          if (!ev || !ev.assertionIds?.includes(record._id))
            emit("PUBLICATION_EVIDENCE_MISSING", record._id, "evidenceIds", "Evidence must attest the specific claim", true);
          if (!src || !src.license || !src.permittedUse)
            emit("INSUFFICIENT_EVIDENCE", record._id, "evidenceIds", "Source permission/licensing not verifiable", true);
        }
      }
      const approvedReviews = [...byId.values()].filter(review =>
        review._id.startsWith("rev_") && review.lifecycleStatus === "active" &&
        review.outcome === "accepted" && review.subjectIds?.includes(record._id));
      if (approvedReviews.length === 0)
        emit("PUBLICATION_REVIEW_MISSING", record._id, "editorialStatus",
          "No accepted editorial review addresses this claim", true);
      // V1 EditorialReview stores reviewerId, not an owner-appointed LER
      // appointment or an authenticated decision/rights-approval chain.
      emit("INSUFFICIENT_EVIDENCE", record._id, "editorialStatus",
        "V1 cannot establish owner-appointed LER authority, final approval and permitted reuse", true);
    }
  }
  issues.sort(issueSort);
  publicationIssues.sort(issueSort);
  const selected = options.publication === true
    ? [...issues, ...publicationIssues].sort(issueSort) : issues;
  return {
    valid: selected.length === 0,
    issues: selected,
    publication: { eligible: issues.length === 0 && publicationIssues.length === 0, issues: publicationIssues }
  };
}
