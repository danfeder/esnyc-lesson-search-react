# Concepts Worksheet Wizard — Execution Status

> **Plan:** `2026-05-15-concepts-worksheet-wizard-plan.md`
> **Design:** `2026-05-15-concepts-worksheet-wizard-design.md`
> **Per-milestone kickoff:** `2026-05-15-concepts-worksheet-wizard-execution-kickoff.md` ← paste at start of each fresh session
> **Original brainstorm kickoff:** `2026-05-15-concepts-tool-simplification-kickoff.md` (design phase only; do not re-execute)

## Current state

- Branch: `tools/concepts-worksheet-form` (not pushed; no PR)
- Batch 1 status: **IN PROGRESS**
- Last milestone completed: **M1.8** (per-entry Decide step renderer + §6.2/§6.4 layout live, commit `944f830`)
- Next milestone: **M1.9** (mode-routing distribution verification — no commit unless bug found) — tiny session

## Branch baseline at M1.0

```
dd7d45b docs(concepts-worksheet): tighten design clarifications     ← pre-flight clarifications
aeafcb0 docs(concepts-worksheet): patch round-2 nits + display priority fix
6d4ef5f docs(concepts-worksheet): patch design contradictions before impl plan
671447b docs(concepts-worksheet): design doc for wizard redesign
94fc66c tools(concepts-worksheet): apply Codex review feedback (F1-F4)
d284144 tools(concepts-worksheet): add HTML template + wire --build-html
de21973 tools(concepts-worksheet): add parser + builder scaffold
```

Parser baseline: `Parsed 208 entries (§11=32, §12=39, §13=137).`

## Session log

### Session 1 (2026-05-15)

- Read design end-to-end (`2026-05-15-concepts-worksheet-wizard-design.md`).
- Drafted plan; 3 review rounds with the user surfacing 11 findings total (6 P1/P2 fixes in round 1, 3 in round 2, 2 P3 nits in round 3). Plan v4 signed off for execution with per-milestone review.
- Committed design-doc clarifications standalone (`dd7d45b`) before plan finalization.
- **M1.0 complete (`c849fff`):** plan + status doc committed; branch verified clean against plan baseline.
- **M1.1 complete (`6ae69ef`):** parser emits `claude_notes_summary`; 208/208 entries have non-empty summaries with terminal punctuation.
- Per user request, scaffolded `2026-05-15-concepts-worksheet-wizard-execution-kickoff.md` as a durable per-milestone kickoff prompt so future sessions can `/clear` between milestones to keep context fresh.

### Session 2 (2026-05-15)

- **M1.2 complete (`b22e06a`):** parser emits `suggested_merge_target` via `Recommend merg(e|ing) into [§N ]`target`` regex with valid-key filtering plumbed through `entry_to_json` / `build_payload`. Extraction matched W19's empirical prediction exactly: 53/78 (68%) merge recommendations resolved, 25 fall through to picker by design.
- **M1.3 complete (`08e42d1`):** `--verify-only` (and full payload runs) now print `merge-target extraction: 53 of 78 merge recommendations (68%) — 25 fall through to picker` after the existing tier-distribution line; warns if rate ever drops below 60% floor. **Smoke check #8 baseline recorded: 53/78 (68%).** Matrix will be filled at M1.17 gate.
- Bundled in same session per Group rule (trivial parser-only TDD).

### Session 3 (2026-05-15)

- **M1.4 complete (`53024ca`):** template rewritten end-to-end (2198→1085 lines; -1462/+349). CSS replaced with ~290-line wizard-shell draft (single-card layout, top-bar decision-debt region, mode-chip + tier-strip tokens for M1.5+); body HTML swapped to `<header.top>` + single-card `<main>` + three-button nav + simplified onboarding modal. JS deletions: filter-state quartet, `buildSubjectChips`/`subjectCounts`/`setFilter`/`applyFilters`/`updateStatusCounts`, `parseReviewerNotesFromMarkdown`, `renderAllEntries`, `renderClusterSignalCard`, `updateClusterSignalMembers`, `updateProgress`, `scrollToEntry`/`scrollToClusterSignal`, `updateEntryCardChrome`. JS stubs added: `renderEntryCard(entry, mode)`, `renderClusterSignalsPanel`, `buildStepSequence`, `renderCurrentStep`, `navStep`, `navDefer`, `onJumpToEntry`, `updateDecisionDebt`. `reviewer_note` channel fully removed (W5): `buildExportMarkdown` no longer emits the HTML comment; `onImport` no longer parses it; legacy files import without alert noise. `init()` rewritten per plan Step 5; `onClearState` + `onVerdictChange` + `onMergeIntoChange` redirected to the new stubs. Preserved utilities: `el`, `escapeHtml`, `renderInlineMarkdown`, entry status helpers (`entryFilled`, `entryVerdict`, `entryMergeInto`, `entryNeedsMergeTarget`), `verdictLabel`, `tierReviewDepth`, `ensureCanonicalKeysDatalist`, `setBadgeDirty`, `clusterSignalCommentBlock`, `downloadFile`, `onExport`, `onDownloadJson`, `parseEntryEditsFromMarkdown`, `parseClusterSignalsFromMarkdown`, onboarding helpers, `toggleAdvancedMenu`.
- **Smoke check #1 (Empty-export SHA invariant) PASS** — `buildExportMarkdown()` SHA-256 = `0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03`, byte-identical to source `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (264,428 bytes, 3547 lines). Verified via chrome-devtools-mcp `evaluate_script` against the built artifact.
- Browser smoke (chrome-devtools-mcp): zero console errors; onboarding modal renders + dismisses; top bar shows all expected pieces (brand, saved badge, 0/0/0 debt counters, jump-to-entry, disabled Review-so-far, ⚙ Advanced); placeholder body line "Wizard step machine not yet wired. 208 entries loaded." renders; Advanced menu opens with all 5 items including "Save & Export markdown ↓".
- `tierReviewDepth()` refreshed to W10 wording ("review carefully" / "confirm or adjust" / "quick pass; pause when unsure") since renderers in M1.7+ will consume it.

### Session 4 (2026-05-15)

- **M1.5 complete (`e25e8bc`):** added `entryMode()` (design §3 routing), `clusterPrefillCandidate()` Batch-1 stub returning null, and the real `updateDecisionDebt()` body replacing the M1.4 stub. Wired `updateDecisionDebt()` into `setClusterState()` (newly added) and `init()` (after `renderCurrentStep()`); existing wires in `onVerdictChange` / `onMergeIntoChange` / `onImport` / `onClearState` carried over from M1.4 stub period.
- Browser smoke (chrome-devtools-mcp `evaluate_script`): live DOM counters at baseline = **decide=46, confirm=162, resolve=5, bar=0%**; total reconciles to 208 entries + 5 cluster signals = 213. Plan estimated ~35 Decide; actual 46 because the third Decide branch (`!hasAiRec && !hasClusterRec`) catches **12 §12/§13 entries with `suggested_verdict: null`** in the worksheet (e.g., `biodiversity`, `observation`, `phases_of_matter`, `creative_writing`). Spot-checked — these legitimately lack an AI verdict, so routing them to Decide is spec-correct, not a parser bug. Decide tier breakdown: 32 §11 + 8 §12 + 6 §13. State-change wiring exercised via 4 paths (Confirm verdict commit 162→161, Decide verdict commit 46→45, `setClusterState` 5→4, manual clear back to baseline); bar advances 1/213 per commit; zero console errors.
- M1.4 status doc bundled into M1.5 commit per kickoff default.

### Session 5 (2026-05-15)

- **M1.6 complete (`1232bba`):** added `state.wizard = { step_index, deferred }` to `defaultState()` + `loadState()` migration for pre-wizard state. Replaced `buildStepSequence()` stub with real impl: walks `ENTRIES` in `TIER_ORDER`, interleaves each cluster Resolve step before its earliest tier-order member (clamps stale `step_index`). Added `currentStep()` lookup. Replaced `renderCurrentStep()` stub with real dispatcher (entry / cluster / end-screen sentinel) + `updateNavButtonState()` (Prev disabled at step 0). Added three stub renderers — `renderEntryStep` (delegates to M1.4 `renderEntryCard`), `renderClusterStep` (M1.10 placeholder), `renderEndScreen` (M1.15 placeholder).
- Browser smoke (chrome-devtools-mcp `evaluate_script`): `stepSequence.length = 213` (208 entries + 5 clusters). All 5 cluster Resolve steps fire before their first tier-order member, including the W12 test case: **CON-22 emits at idx 44, immediately before `reading_comprehension` at idx 45** (not before `reading`, which sits at §13 well after the reading-comprehension §12 row). Cluster positions: CON-23@8 → measurement@9; CON-12@38 → writing@39; CON-22@44 → reading_comprehension@45; CON-24@128 → descriptive_language@129; CON-16@157 → indigenous_knowledge@158. Current step at index 0 = `entry:plant_parts` (§11 · Decide). Cluster step probe at index 8 renders `wizard-step cluster-step` class + M1.10 placeholder text. End-screen sentinel at index 213 renders `wizard-step end-screen` + M1.15 placeholder. Nav-button states: prev disabled at step 0, enabled at step 8. M1.5 decision-debt counters unchanged (46/162/5/0%). Zero console errors throughout. `state.wizard` migration from prior schema-1 state confirmed: `{step_index: 0, deferred: []}` initialized.
- M1.5 status doc bundled into M1.6 commit per kickoff default.

### Session 6 (2026-05-15)

- **M1.7 complete (`de0d787`):** replaced M1.6 `renderEntryStep` stub with mode dispatcher (Confirm → `renderConfirmStep`; Decide → `renderDecideStep`). Implemented full §6.1 Confirm layout: `displayedPrefillForEntry` (saved → cluster → AI → null source-of-truth), `renderStepHead` (mode chip + step counter + h2 title + key + freq/subject meta), `renderTierStrip` (W10 calm copy literals), `renderClaudeRecommendation` (headline + one-liner summary + ▸ more expand on `claude_notes`), `renderPrimaryAgreeAction` (atomic `{verdict, merge_into}` patch via `setEntryState` → `onCommit`; merge-with-no-target routes to picker stub), `renderPickSomethingElse` (radios for the two non-displayed verdicts + "Less common: add new concept" link → `onPickOtherVerdict`), `renderMergeAliases`. Commit handlers: `onCommit` (refreshes counters + re-renders), `onPickOtherVerdict` (auto-routes merge through picker), `openMergePicker` (M1.11 stub — commits immediately if `defaultTarget` present, else alert), `maybeAutoOpenNotesDrawer` (M1.12 stub), `renderNotesDrawer` (M1.12 stub returning empty div so `renderConfirmStep` append stays unconditional). §6.3 cluster caption swap wired but unreachable in Batch 1 (`clusterPrefillCandidate` returns null).
- **Two deltas from plan code** surfaced + applied during execution:
  1. `renderDecideStep` placeholder stub added in M1.7 (not in plan). Without it, init at step 0 = `plant_parts` (§11 · Decide) throws `ReferenceError` since the real `renderDecideStep` is M1.8. Stub renders mode chip + step head + tier strip + "(Decide renderer — M1.8.)" placeholder so the data-safety floor (tool builds + exports at every commit) holds across the standalone M1.7 ship. M1.8 will replace the stub with the real impl.
  2. `reviewerLabelWithTarget(verdict, target)` helper added because plan's straight `REVIEWER_LABELS["merge"] = "Fold into another"` produced grammatically awkward "Fold into another `plant_identification`" in both the recommendation headline and the primary Agree button. Design §6.1 / §6.3 mockups show "Fold into `X`" (no "another") when a target is named. Helper drops "another" when target known; standalone "Fold into another" preserved for Pick Something Else radios where no target is yet picked. User-decided 2026-05-15 ("Match design").
- **Orphan cleanup:** removed M1.4 stubs `renderEntryCard` (callers: just the M1.6 stub that the new dispatcher replaces), `onVerdictChange` / `onMergeIntoChange` / `onNotesChange` (no callers — were forward-looking handler stubs from M1.4, now superseded by atomic `setEntryState` + `onCommit` paths).
- **Added constant:** `REVIEWER_LABELS` (W8) near `VERDICTS`. Distinct from `verdictLabel()` (export vocab `keep / merge → / new / drop`), which stays untouched.
- Browser smoke (chrome-devtools-mcp): on `plant_id` (§13 · Confirm, step 184/213): mode chip "Confirm", tier strip "§13 Long-tail: quick pass; pause when unsure.", headline "💡 Claude recommends: Fold into `plant_identification`", summary present, ▸ more expands 279 chars of body, primary button "✓ Agree — Fold into `plant_identification`". Click ✓ Agree → `state.entries.plant_id = {verdict:"merge", merge_into:"plant_identification"}` atomic write confirmed; caption flips to "💡 Saved: Fold into `plant_identification`". On `recipe_writing` (§13 · Confirm with target `how_to_writing`): same layout, "Fold into `how_to_writing`" copy. On `drawing` (§13 · keep) Pick Something Else: radios `["Fold into another", "Remove"]` — standalone "Fold into another" preserved when target unknown. On `plant_parts` (§11 · Decide, step 1/213, init landing): M1.8 placeholder renders with chip + counter + title + key + tier strip + "(Decide renderer — M1.8.)" line, zero throw. Override path (Pick Something Else → "Keep as concept" radio on plant_id) commits `{verdict:"keep"}` and entryMode flips to Decide per W14 revisit rule (committed ≠ AI rec). Zero console errors throughout.
- M1.6 status doc bundled into M1.7 commit per kickoff default.

### Session 7 (2026-05-15)

- **M1.8 complete (`944f830`):** replaced M1.7 `renderDecideStep` placeholder with real §6.2 layout — step head + tier strip + `renderWhyAttention` row + optional theme-overlap callout + `renderMergeAliases` (when proposed) + Claude recommendation block (source label + full `claude_notes` body expanded; no summary, no ▸more — Decide always shows full notes) + notes-only fallback when AI/cluster rec absent but `claude_notes` present + blank verdict radio group with `"Your call (no default[ — high-impact tier]):"` legend + "Less common: add new concept" linkish + notes drawer stub. Added `renderWhyAttention(entry)` helper (priority order per design §3: theme_overlap → cluster (Batch 2) → §11 → no-rec). Added `onDecideVerdict(entry, v)` handler in commit/override section sibling to `onPickOtherVerdict`: merge → picker; `new`/`drop` auto-open notes drawer (M1.12 stubs); override of AI rec auto-open notes drawer; else commit + advance.
- Browser smoke (chrome-devtools-mcp, zero console errors throughout): **plant_parts** (§11 init step 1/213) Decide chip + tier "§11 High-impact: review carefully." + "Why this needs attention: §11 High-impact concept." + Claude body 506 chars expanded (no summary/▸more) + legend `Your call (no default — high-impact tier):` + 3 blank radios + Confirm-mode elements absent + notes drawer stub present. Click Keep → `state.entries.plant_parts = {verdict:"keep"}` saved to localStorage (verified via `beforeChecked: true` on next probe). **plant_growth** (§12 theme-overlap, step 36/213) Decide-mode forced by theme_overlap routing (not tier-11) + "Why this needs attention: Theme overlap with themes worksheet." + ⚠ callout visible + Claude rec "Keep as concept" + legend `Your call (no default):` (no tier-11 suffix). **biodiversity** (§12 no-rec, step 41/213) Decide via `!hasAiRec && !hasClusterRec` branch + "Why this needs attention: No confident recommendation." + no theme callout + notes-only block fires (no headline, 1653-char body). **ecosystems** (§11 + theme-overlap, step 6/213) priority order verified — theme_overlap reason fires before §11 reason on tier-11 entry, confirming `renderWhyAttention` priority chain.
- **Plan-text discrepancy noted (no code change):** plan verification §2 says "Click 'Keep' → 'Saved' caption appears" — that wording is M1.7-Confirm-specific (via `displayedPrefillForEntry`'s `captionSource`). Decide-mode never uses "Saved" caption; saved verdicts surface as the checked radio. On §11 entries (which stay Decide per `entryMode`'s tier-11 short-circuit), the headline keeps saying "Claude recommends:" while the radio shows the user's pick. Plan code (followed exactly) is consistent with actual behavior; verification text appears to be M1.7 copy-paste.
- **M1.7 status doc NOT bundled into M1.8 commit `944f830`** (plan's verbatim `git add` was template-only). Both M1.7's pending status doc edit (Session 6 log + header bump M1.6→M1.7) and this M1.8 edit (Session 7 log + header bump M1.7→M1.8) landed together as a tiny standalone status-doc commit (user-chosen — M1.9 may produce no commit per spec, so bundling would have deferred to M1.10).

## Open questions / parked concerns

(none yet)

## Smoke check matrix

Recorded at M1.17 (Batch 1 gate) and again at Batch 2 conclusion.

| # | Check | M1.17 result |
|---|---|---|
| 1 | Empty-export SHA invariant | PASS @ M1.4 (`53024ca`, 2026-05-15) |
| 2 | Decide-later semantics | — |
| 3 | Pre-fill non-commit | — |
| 4 | Commit roundtrip | — |
| 5 | Merge picker high-confidence shortcut | — |
| 8 | Merge-target extraction rate | — |
| 6 | Cluster Resolve + member walk (Batch 2) | n/a Batch 1 |
| 7 | Mismatch flag (Batch 2) | n/a Batch 1 |
