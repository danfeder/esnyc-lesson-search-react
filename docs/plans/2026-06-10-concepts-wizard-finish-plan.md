# Concepts Wizard — Finish & Handoff Plan

> **Adopted 2026-06-10**, replacing the per-milestone Batch-3 machinery. Prior history lives in
> `2026-05-15-concepts-worksheet-wizard-status.md` (frozen) and the Batch 1–3 sections of
> `2026-05-15-concepts-worksheet-wizard-plan.md`. Resume a fresh session via `/concepts-batch2`.

## Goal

Get the concepts review wizard (`docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`)
into the curriculum team's hands so they can decide the fate of the 208 Stage-1 concept candidates.
**Handoff = the user gives the built HTML file (plus the README) directly to the team.** No push, no PR.

## Decisions locked (2026-06-10)

- **B2 reasoning rewrite = SHA-safe sidecar.** The plain-language rewrites of the 208 `claude_notes`
  live in a separate sidecar file next to the worksheet. The build script merges them in as a
  display-only field (`plain_reasoning`); the source worksheet is never edited, so the empty-export
  SHA invariant never moves. The tool displays `plain_reasoning` when present, falls back to
  `claude_notes`.
- **W3 content errors** (e.g. `measurement`'s "anatomically" copy-paste artifact) get fixed in the
  rewritten display text. Genuine factual errors worth correcting in the *source* worksheet are
  listed for the metadata-rebuild track, not patched here.
- **Handoff artifact:** the single built HTML file + `docs/plans/concepts-worksheet-form/README.md`.

## Safety floor (never relaxed)

1. **Empty-export SHA invariant:** clean-state `buildExportMarkdown()` stays byte-identical to the
   source worksheet — SHA-256
   `0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03`. Verify after every change.
2. **Never stage the generated HTML** (`docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`,
   gitignored). Source files only: the template, the build script, the sidecar, docs.
3. **Stay on `tools/concepts-worksheet-form`; no push/PR** without explicit direction.
4. **Plain language on screen** (curriculum-team voice): no §-codes, `CON-xx`, "tier", "verdict",
   "cluster", "canonical", internal mode names, or `<to_fill>` in reviewer-visible text. Export
   format is exempt and unchanged.
5. **Build script changes are allowed ONLY for the Session-2 sidecar merge**, and only if
   `--verify-only` still prints `Parsed 208 entries (§11=32, §12=39, §13=137).` +
   `merge-target extraction: 53 of 78 … (68%)` and the SHA invariant holds.
6. Don't reopen settled decisions (W1–W22, 4-verdict export vocab, tier split, cluster option text,
   M3.6 keyboard shortcuts = won't-fix).

## Process (deliberately lighter than Batches 1–3)

- **Inline edits, one browser verify (chrome-devtools MCP), SHA check, one commit per session.**
  No per-milestone workflow ceremony.
- Workflows only where they pay: the Session-2 208-note rewrite fan-out, and the Session-3 dry run.
- **The only review gate: the user reads new reviewer-facing wording before it's committed.**
- Track progress by checking boxes below + a one-line session note. No forensic session logs.

## The three sessions

### Session 1 — polish pass (old M3.7 + M3.8)

- [x] Friendly labels over `snake_case` keys everywhere reviewers look: review-summary rows, group
      member rows, Agree-button targets, fold-picker placeholder ("Type a concept name…"),
      jump-search matches labels too. (`canonical_label` already exists; export still writes keys.)
- [x] Nits: "▸ ▸ more" double arrow; "Agree — Fold into another" unnamed-target button copy;
      "1 appearances" plural; "Download progress as JSON" menu-item clarity; 208-counters-vs-213-steps
      confusion.
- [x] Verify: SHA invariant + focused browser smoke + zero console errors. User approves wording → commit.

### Session 2 — plain-reasoning sidecar (B2 + W3)

- [x] Decide sidecar format + location (suggest: `docs/plans/concepts-worksheet-form/plain-reasoning.json`,
      keyed by `canonical_key`, values = rewritten note text; committed as source).
- [x] Generate rewrites for all 208 notes via a fan-out workflow (batches of concepts per agent;
      rewrite brief: curriculum-team voice, preserve the *reasoning substance* — what the concept is,
      why keep/fold/remove, what it overlaps with — drop code paths/IDs/§-refs/hashes; fix W3-style
      copy-paste artifacts).
- [x] Mechanical jargon scan over all 208 outputs (regex: `§|CON-\d|\.ts|\.py|D-C\d|<to_fill>|_[a-z]+_|[0-9a-f]{8,}|\bcanonical\b|\bcorpus\b|\bverdict\b|\btier\b`)
      + spot-check ~10 against their sources for fidelity.
- [x] Build script merges sidecar → `plain_reasoning` per entry; template displays it (with
      `claude_notes` fallback); `--verify-only` counts + SHA invariant unchanged.
- [x] User reviews a sample (~5 rewrites, including `measurement`) → commit (sidecar + script + template).

#### W3 — genuine source-worksheet inconsistencies (for the metadata-rebuild track, NOT patched here)

Surfaced by the Session-2 rewrite agents while reworking the 208 notes; display text routes around
each, source worksheet untouched:

- `measurement`: "anatomically more specific" — copy-paste artifact from the Plant Parts note
  (fixed in display text only).
- `preservation`: "Post-merge total: 5 lessons" only adds up (3+1+1) if the lone Social Studies
  lesson (Three Sisters Succotash) is included; the science-side merge described is 4.
- `seasonal_cycles` / `seasonality`: alias list gives Seasonal Cycles a frequency of 6, but the
  same note says "6 of 7 sampled seasonal cycles lessons" — the two figures may not reconcile.
- `consumers`: note calls Producers a "long-tail singleton" while giving it a count of 2.
- `tallying`: structured fold target is `counting`, but the note's own reasoning leans
  `data_collection` — confirm which target was intended.
- `phases_of_matter`: note cites an "alpha tie-break convention" while simultaneously justifying
  the survivor by frequency ("higher frequency wins") — contradictory phrasing; the actual
  Phases of Matter count is never stated.
- `poetry`: "once each under Literacy/ELA and Arts" is ambiguous between 2 lessons and 1
  double-tagged lesson.
- Pattern (not an error, a worksheet-style gap): many long-tail notes never state the entry's OWN
  count, only neighbors' counts — rewrites use qualitative phrasing ("rarely used") rather than
  invented numbers.

### Session 3 — final dry run + handoff

- [ ] One fresh-eyes role-play dry run (single agent, real browser, non-technical-reviewer lens);
      fix anything trivial it finds.
- [ ] Re-run the 8-check smoke gate (design §15) once; record results below.
- [ ] Rebuild, confirm the artifact opens clean from `file://`, and hand the HTML + README to the user.

## Session notes

- 2026-06-10 (S1): plan adopted; sidecar + handoff decisions locked. M3.7 + M3.8 polish pass executed inline.
- 2026-06-10 (S2): 208-note plain-reasoning sidecar shipped — 16-agent workflow rewrite, jargon scan
  0 hits (workflow + independent main-loop re-scan), 10/10 fidelity spot-check, sidecar 208/208,
  SHA `0c49a7a7…cd03` byte-identical, console clean, user approved 5-sample. W3 list recorded above.

## Final smoke-gate results (Session 3)

| # | Check | Result |
|---|---|---|
| 1 | Empty-export SHA invariant | |
| 2 | Decide-later semantics | |
| 3 | Pre-fill non-commit | |
| 4 | Commit roundtrip | |
| 5 | Merge picker | |
| 6 | Cluster resolve + member walk | |
| 7 | Mismatch flag | |
| 8 | Merge-target extraction rate | |
