# Brief t4a — Dedup candidate sweep + evidence deck (Opus executor)

**Read first:** `2026-07-02-t4-dedup-design-decisions.md` (esp. D2, D3, recon section) and
`2026-07-02-t4-status.md`. You are building the inputs for a Fable-run live walkthrough with
the user. You write scripts and orchestrate Sonnet agents; you make NO data mutations and NO
design decisions. **Everything you touch on the DB is read-only SELECT.**

## Deliverables (all committed on branch `feat/t4a-dedup-sweep`, one PR)

1. `scripts/dedup-sweep/export-corpus.ts` — pulls live PROD lessons to a local JSON.
2. `scripts/dedup-sweep/generate-candidates.ts` — deterministic candidate groups + tiers.
3. `docs/plans/t4-dedup/candidates.json` — the groups with all computed signals.
4. `docs/plans/t4-dedup/deck.md` (+ `deck.json`) — the walkthrough deck, one section per
   group, ordered Tier A → B → C.
5. The PR also carries the currently-uncommitted session docs: the modified tracker, the T4
   design-decisions doc, this brief, brief t4b, the T4 status doc, and the
   `2026-07-02-t4-dedup-design-handoff-for-fable.md` handoff file. Do NOT sweep other
   untracked docs into it.

## Step 1 — corpus export (read-only)

Adapt the connection pattern from `scripts/stage2-retag/export-corpus.ts` (it has a working
corpus-export precedent). Target **PROD** (`jxlxtzkmicfhchkhiojz`), SELECT-only. Fields per
live lesson (`retired_at IS NULL`): `lesson_id, title, summary, content_text, content_hash,
created_at, updated_at, original_submission_id, file_link, grade_levels`, the 12 facet array
columns, and `length(content_text)`. Expect **764 rows** (785 total − 21 retired).
**STOP if:** no working read credential path exists (fallback you may use WITHOUT stopping:
chunked export via `mcp__supabase-remote__execute_sql` SELECTs written to the JSON — never
any other MCP verb); or live count differs from 764 by more than ±5 (report actual, ask).

## Step 2 — candidate generation (deterministic script, no AI)

Normalization: `norm(title) = lowercase, collapse ALL runs of whitespace INCLUDING control
characters ( etc.) to single spaces, trim`. (10 known pairs differ only by a trailing
vertical tab — plain trim() fails; this is a hard requirement.)

Trigram similarity in TS mimicking pg_trgm closely enough: lowercase, replace non-alphanumerics
with space, split into words, pad each word with two leading spaces + one trailing space,
collect 3-grams into a set; `sim(A,B) = |A∩B| / |A∪B|`. Exact pg_trgm parity is NOT required —
see the calibration gate below.

Candidate pairs = union of:
- (a) `norm(title)` equality
- (b) title trigram sim ≥ 0.55
- (c) `content_hash` equality
- (d) identical non-empty `main_ingredients` set AND identical non-empty
  `thematic_categories` set (catches renamed copies)

For every candidate pair compute: title_sim, content_sim (trigram on full `content_text`),
len_a/len_b, created dates, per-side populated-facet count, summary present y/n. Group pairs
with union-find. Tier per group by its max-content_sim pair: **A ≥ 0.92** (near-certain
copy), **B 0.75–0.92**, **C < 0.75** (judgment/family territory). Also flag family signals
per group: title tokens matching grade bands (`3K|PK|K-2|3-5|6-8|\(K\)|MS|grade`), `Mobile
Education`, `Part \d|Pt\.? \d|Session \d|Day \d`.

Output `candidates.json`: groups sorted Tier A→C, each with lesson entries + pairwise signal
matrix + flags.

**Calibration gate (pre-registered from live PROD probes 2026-07-02 — your output must
reproduce these or STOP):**
- Same-title live groups (normalized): **46** exactly; 96 rows involved.
- Exactly **one** hash-equal pair: two `Fattoush` rows, content length 1008 each.
- Tier membership must hold for these named same-title pairs (SQL pg_trgm reference values):
  Sun Printing ≈0.99, The Garden in the Fall ≈0.97, Worm Study ≈0.97, Vegetable Ramen top
  pair ≈0.96 → all Tier A. Seed Dispersal pairs ≈0.46–0.54, The Water Cycle ≈0.50, Fattoush
  non-hash pairs ≈0.30–0.57 → all Tier C. Your TS trigram values may differ from these
  numerically (tolerance ±0.08) but the tier assignments above must hold; if any flips,
  STOP and report the values.
- Total group count expected roughly 60–160. **STOP if <40 or >250** (blocking rules are
  probably wrong).

## Step 3 — evidence deck (Sonnet fan-out, thin-driver rules binding)

One Sonnet agent per group — **pinned to Sonnet 4.6 (`claude-sonnet-4-6`), user directive
2026-07-02: do NOT use the bare `sonnet` alias (it now resolves to Sonnet 5). If the harness
rejects the pinned ID, STOP and report — do not silently fall back to another model.** The
prompt must be SELF-CONTAINED: inline both/all lessons'
title, summary, dates, facet arrays, and `content_text` (truncate each at ~6,000 chars,
note truncation). Agents get NO DB access and NO file access; they return ONLY structured
JSON (use the Workflow tool's `schema` option or an equivalently strict contract):

```json
{ "group_id": "...",
  "whats_the_same": "1-2 plain sentences",
  "whats_different": "1-3 plain sentences, concrete (activities, grade focus, template era)",
  "recommended_verdict": "retire_duplicate | keep_family | unrelated",
  "family_type": "grade-band | mobile-ed | series-part | same-dish-different-lesson | other | null",
  "survivor_lesson_id": "lesson_id or null",
  "survivor_why": "1 sentence (newer template / richer tags / longer content) or null",
  "confidence": "high | medium | low" }
```

Collection is script/Workflow-side into `deck.json` — agent outputs never pass through your
conversational context beyond spot-checks. Language rule: deck text is read aloud to a
non-technical user — everyday words, no jargon, no internal field names.

Mechanical sanity checks (scripted, not eyeballed): every group has a row; JSON validates;
no `retire_duplicate` recommendation where the group's max content_sim < 0.75 (list
violations, re-run those agents once, then STOP if still violating); every
`retire_duplicate` names a survivor that is in the group. Manually spot-check 5 random
groups against their content excerpts.

Assemble `deck.md`: per group — a plain-English header (titles + tier + flags), the agent's
what's-same/what's-different, the recommendation with survivor, and a compact signal line
(content sim as a percentage phrase, dates, lengths, facet counts). Tier A groups
additionally roll up into one summary table at the top for batch confirmation.

## Gates before opening the PR

`npm run check` (scripts are TS — they must typecheck) + `npm run test:run`. No app code
changes in this PR, so no E2E surprises expected. Bot triage all four PR surfaces per the
standard workflow.

## STOP conditions (halt, report, do not improvise)

Any calibration-gate failure; export row-count drift; >5 live lessons with NULL/empty
`content_text`; >10% Sonnet schema failures after one retry round; any temptation to write
to any database; any temptation to decide a verdict yourself — recommendations are Sonnet's,
decisions are the user's.

## Session end

Update the T4 status doc + tracker status line. Report: one line + file paths + group counts
per tier. Next step = **Fable walkthrough session with the user** (needs `deck.md`).
