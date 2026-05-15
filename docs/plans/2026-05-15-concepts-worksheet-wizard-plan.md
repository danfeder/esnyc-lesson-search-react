# Concepts Worksheet Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan milestone-by-milestone.

**Goal:** Convert the concepts worksheet tool from a long-scroll metadata editor into a guided single-entry wizard, implementing the locked W1–W21 design at `docs/plans/2026-05-15-concepts-worksheet-wizard-design.md`.

**Architecture:** Two batches. **Batch 1** (this session) ships the wizard MVP: single-entry layout, Confirm/Resolve/Decide mode routing, pre-fill display with commit-on-action semantics, merge destination picker, auto-surface notes drawer, and a simple Save & Export end screen. Cluster Resolve steps render fully but don't yet auto-pre-fill member entries. **Batch 2** (later session) adds the cluster→member auto-prefill chain, mismatch detection, review summary, and intro rewrite. Both share the same parser + state shape, so the boundary is a natural split.

**Tech Stack:** Python 3 stdlib parser (`scripts/build-concepts-tool.py`, 824 lines), vanilla JS + HTML5 + CSS template (`scripts/concepts-worksheet-tool.template.html`, 2198 lines), self-contained build artifact at `docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`. No test framework — TDD applies to parser changes only; JS UI work uses build + browser smoke checks as the verification gate.

---

## Context the implementer needs

### Key locked decisions (don't reopen)

| Decision | Where |
|---|---|
| Confirm / Resolve / Decide mode routing | Design §3 |
| Pre-fill is display-only; state writes on commit only; cluster wins over AI in display priority | Design §5, W4, W21 |
| §11 entries never receive a pre-fill regardless of cluster source | Design §6.4, W17 |
| Reviewer-facing verb labels ("Keep as concept" / "Fold into another" / "Add new concept" / "Remove"); export vocab unchanged | Design §4, W8 |
| Merge is two-stage: `verdict=merge` writes only with `merge_into` | Design §5, W18 |
| Notes drawer auto-opens on override + new/drop (Batch 1); cluster-mismatch trigger deferred | Design §8 |
| `reviewer_note` channel fully removed | Design §12, W5 |
| Three-tier locked distribution (32/39/137) and four-verdict vocab (`keep/merge/new/drop`) | D-C4 / D-C8 (parser invariants) |

### Files touched in Batch 1

| Path | Tracked? | Role |
|---|---|---|
| `scripts/build-concepts-tool.py` | yes | Parser; adds `claude_notes_summary` + `suggested_merge_target`; emits extraction-rate report |
| `scripts/concepts-worksheet-tool.template.html` | yes | UI template — rewritten body + JS for wizard; CSS rebuilt for single-card layout |
| `docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html` | **no, generated — NEVER `git add`** | Built artifact (~1 MB). Rebuild via `--build-html`; do not commit. All `git add` commands in this plan stage source files only. |
| `docs/plans/2026-05-15-concepts-worksheet-wizard-design.md` | yes | Design — read-only reference. Clarification edits landed as `dd7d45b` before plan v2. |
| `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md` | not yet | Status doc — per-batch session log |

### Build & verify commands

```bash
# Parser-only invariant check (must pass before any --build-html)
python3 scripts/build-concepts-tool.py --verify-only

# Build self-contained HTML tool
python3 scripts/build-concepts-tool.py --build-html

# Open built artifact in browser (macOS)
open docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html
```

### Existing code worth reusing

**Parser** (`scripts/build-concepts-tool.py`):
- `extract_suggested_verdict()` at line 405 — keep as-is (already extracts `keep/merge/drop/new` from `claude_notes` prose, used by wizard)
- `entry_to_json()` at line 629 — add `claude_notes_summary` + `suggested_merge_target` fields to its `parsed` block
- `verify_invariants()` at line 537 — extend with merge-target extraction rate report

**Template JS** (`scripts/concepts-worksheet-tool.template.html`):
- DOM utils `el()` at line 1153, `escapeHtml()` at line 1182, `renderInlineMarkdown()` at line 1193 — keep
- State helpers `loadState()` at line 1059, `saveState()` at line 1081, `getEntryState()`, `setEntryState()`, `getClusterState()`, `setClusterState()` (lines 1095-1116) — keep, extend
- Status helpers `entryFilled()` at line 1204, `entryVerdict()` at line 1217, `entryMergeInto()` at line 1222, `entryNeedsMergeTarget()` at line 1226 — keep
- Export `buildExportMarkdown()` at line 1819 — keep core walk-and-edit logic; **remove the `reviewer_note` branch (lines 1869-1877)**; the empty-export invariant already works (no entries committed → no `lineEdits` set → source lines pass through verbatim)
- `clusterSignalCommentBlock()` at line 1905, `downloadFile()` at line 1917, `onExport()` at line 1929, `onDownloadJson()` at line 1934 — keep
- Import: `parseEntryEditsFromMarkdown()` at line 1990, `parseClusterSignalsFromMarkdown()` at line 2041 — keep
- **Remove:** `parseReviewerNotesFromMarkdown()` at line 2017 (W5 — channel removed)

**Template JS to fully replace:**
- `renderEntryCard()` at line 1233 (long-scroll card → per-entry wizard step)
- `renderClusterSignalsPanel()` at line 1589, `renderClusterSignalCard()` at line 1598 (right-rail panel → in-flow Resolve step)
- All filter machinery: `buildSubjectChips()`, `applyFilters()`, `setFilter()`, `subjectCounts()`, `loadFilterState()`, `defaultFilterState()`, `saveFilterState()` (lines 1118-1149, 1678-1757) — deleted entirely
- `tierReviewDepth()` at line 1581 — replaced by tier strip copy from W10
- `updateStatusCounts()` at line 1759 — replaced by decision-debt counters
- `scrollToEntry()` at line 1789 — replaced by step jump (state-preserving navigation)
- Onboarding modal body (lines 993-1010) — Batch 1 keeps the modal element but stubs the body to "Wizard intro rewrite is Batch 2"

**HTML body to fully replace:**
- Filter chip rows (lines 951-979) — removed
- Right sidebar (lines 986-990) — removed
- Top-bar layout — rebuilt with decision-debt counters + jump-to-entry search + Advanced menu
- Main layout — single centered card container

### Working tool constraint

Each milestone's commit must leave the tool **building** (`--verify-only` exits 0; `--build-html` produces a valid HTML). The tool's **behavior** can be in flight across commits during the wizard rewrite milestones, but at every commit boundary the file should load without JS errors and `Save & Export` should still write a markdown file (even if unstyled). This is the data-safety floor: a curriculum-team member opening the build at any commit should not lose work, even if the UI is mid-rewrite.

### What the user reviews between milestones

- Batch 1 milestones M1.1–M1.3 (parser): I rebuild, run `--verify-only`, show the new fields in a payload sample, get a thumbs-up before committing.
- Batch 1 milestones M1.4–M1.16 (JS/template): I rebuild + open in browser via chrome-devtools-mcp, run the relevant smoke checks, show screenshots/state probes, get a thumbs-up before committing.
- Batch 1 milestone M1.17 (full smoke gate): All 6 Batch-1-relevant smoke checks (§15 #1–5, #8) pass before declaring Batch 1 done.

### Pre-flight: design doc clarifications (landed)

The 4 wording clarifications on `docs/plans/2026-05-15-concepts-worksheet-wizard-design.md` (Decide-later marked as UI-only deferred set; empty-export wording; smoke check #2 rename) landed in commit `dd7d45b` before this plan revision. The design doc is clean on disk. No pre-flight action required.

---

## Batch 1 — Wizard MVP

Each milestone is committed independently with `--verify-only` passing. Commit messages follow the existing `tools(concepts-worksheet): …` pattern from the branch history.

### Milestone 1.0: Branch readiness + status doc scaffold

**Files:**
- Create: `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md`

**Step 1: Verify branch + tool state**

Run:
```bash
git status --short --branch
git log --oneline origin/main..HEAD
python3 scripts/build-concepts-tool.py --verify-only
```

Expected output (modulo design-doc clarifications choice):
- Branch `tools/concepts-worksheet-form`, not ahead/behind upstream (no upstream tracked)
- 4 design/docs commits (`671447b`, `6d4ef5f`, `aeafcb0`, `dd7d45b`) + 3 prior tool commits (`de21973`, `d284144`, `94fc66c`) ahead of `origin/main`
- Parser stderr: `Parsed 208 entries (§11=32, §12=39, §13=137).` and exit 0

**Step 2: Create status doc with Batch 1 starter skeleton**

Create `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md` mirroring the four-file pattern:

```markdown
# Concepts Worksheet Wizard — Execution Status

> **Plan:** `2026-05-15-concepts-worksheet-wizard-plan.md`
> **Design:** `2026-05-15-concepts-worksheet-wizard-design.md`
> **Kickoff:** `2026-05-15-concepts-tool-simplification-kickoff.md`

## Current state

- Branch: `tools/concepts-worksheet-form`
- Batch 1 status: IN PROGRESS
- Last milestone completed: M1.0 (status doc scaffolded)

## Session log

### Session 1 (2026-05-15)
- Read design end-to-end.
- Drafted plan (M1.0 onward), user signed off.
- M1.0 complete: branch verified clean; status doc scaffolded.

## Open questions / parked concerns

(none yet)

## Smoke check matrix

| # | Check | M1.17 result |
|---|---|---|
| 1 | Empty-export SHA invariant | — |
| 2 | Decide-later semantics | — |
| 3 | Pre-fill non-commit | — |
| 4 | Commit roundtrip | — |
| 5 | Merge picker high-confidence shortcut | — |
| 8 | Merge-target extraction rate report | — |
| 6 | Cluster Resolve + member walk (Batch 2) | n/a Batch 1 |
| 7 | Mismatch flag (Batch 2) | n/a Batch 1 |
```

**Step 3: Commit**

```bash
git add docs/plans/2026-05-15-concepts-worksheet-wizard-plan.md \
        docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
docs(concepts-worksheet): impl plan + status doc for wizard redesign

Implementation plan for the Confirm/Resolve/Decide wizard redesign
(W1-W21). Two batches: Batch 1 ships the MVP wizard layout +
pre-fill commit-on-action + merge picker + notes drawer; Batch 2
adds cluster auto-prefill chain + review summary + mismatch
detection.

Status doc scaffolded with smoke check matrix.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.1: Parser — `claude_notes_summary` field

**Files:**
- Modify: `scripts/build-concepts-tool.py:405-423` (extract_suggested_verdict region — add `extract_claude_notes_summary` adjacent)
- Modify: `scripts/build-concepts-tool.py:629-681` (entry_to_json — emit field)

**What:** Extract the first sentence of `claude_notes` for the Confirm-step one-liner display (per Design §6.1 "One-line summary of the reasoning … `▸ more` expands the full prose"). Pure data extraction — no UI yet.

**Step 1: Add the helper function**

In `scripts/build-concepts-tool.py`, immediately after `extract_suggested_verdict()` (after line 423), add:

```python
def extract_claude_notes_summary(claude_notes: str) -> str:
    """Return the first sentence of claude_notes for one-line Confirm display.

    The wizard's Confirm step shows a single-sentence summary by default;
    "▸ more" expands the full prose. First-sentence boundary is the first
    period/question mark/exclamation followed by space or end-of-string.
    Defensive: empty input returns empty string.
    """
    if not claude_notes:
        return ""
    # Walk for the first sentence terminator. Matches `. ` / `? ` / `! `
    # or end-of-string. Avoids matching abbreviations like "e.g." by
    # requiring whitespace (or EOL) after the terminator.
    match = re.search(r"^(.+?[.!?])(?:\s|$)", claude_notes.strip())
    if match:
        return match.group(1).strip()
    # No terminator found — return the entire prose stripped.
    return claude_notes.strip()
```

**Step 2: Wire into `entry_to_json`**

In `entry_to_json()`, in the `"parsed"` dict block (around line 654-680), add:

```python
            "claude_notes_summary": extract_claude_notes_summary(
                entry.field_value("claude_notes")
            ),
```

Position it adjacent to `claude_notes` for readability.

**Step 3: Run parser + spot-check output**

```bash
python3 scripts/build-concepts-tool.py --verify-only
python3 scripts/build-concepts-tool.py --pretty --output /tmp/payload.json
python3 -c "
import json
p = json.load(open('/tmp/payload.json'))
samples = [e for e in p['entries'] if e['parsed']['claude_notes']][:3]
for e in samples:
    print(f\"{e['canonical_key']}\")
    print(f\"  summary: {e['parsed']['claude_notes_summary'][:120]}\")
    print(f\"  full:    {e['parsed']['claude_notes'][:120]}…\")
    print()
"
```

Expected: 3 entries print with `summary` clearly shorter than `full` and ending in a punctuation mark.

**Step 4: Commit**

```bash
git add scripts/build-concepts-tool.py
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): parser emits claude_notes_summary

Adds first-sentence extraction for the wizard's Confirm-step
one-liner display (per design §6.1). Full claude_notes remain
available via the `▸ more` expand path.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.2: Parser — `suggested_merge_target` field

**Files:**
- Modify: `scripts/build-concepts-tool.py:247-280` (regex section)
- Modify: `scripts/build-concepts-tool.py:405-423` (helper region)
- Modify: `scripts/build-concepts-tool.py:629-681` (entry_to_json)

**What:** Extract Claude's suggested merge target from `claude_notes` prose when one is named with high confidence. Powers the merge picker's "Claude suggests" one-click shortcut (Design §7.1). Per W19, empirical coverage on the Session 81 worksheet is 53/78 (68%) — the remaining 32% legitimately fall through to the picker.

**Step 1: Add the regex constant**

In `scripts/build-concepts-tool.py`, in the regex region (after line 280 where `RECOMMEND_HINT_RE` is defined), add:

```python
# Match "Recommend merge into `target`" / "Recommend merging into §11 `target` 11"
# in claude_notes prose. The §\d+\s+ prefix is optional because the worksheet's
# §-prefixed form is far more common than the bare-key form. Per W19, empirical
# coverage is 53/78 (68%) on the Session 81 worksheet. Unmatched cases (e.g.,
# "Recommend either merge into A OR keep standalone") legitimately fall through
# to the merge destination picker.
SUGGESTED_MERGE_TARGET_RE = re.compile(
    r"Recommend\s+merg(?:e|ing)\s+into\s+(?:§\d+\s+)?`([a-z_]+)`",
    re.IGNORECASE,
)
```

**Step 2: Add the helper function**

After `extract_claude_notes_summary()` from M1.1, add:

```python
def extract_suggested_merge_target(
    claude_notes: str,
    valid_keys: set[str],
) -> str | None:
    """Return Claude's high-confidence merge target if claude_notes names one.

    Returns None when:
      - no `Recommend merg(e|ing) into ...` clause is present
      - the named target isn't in the parsed canonical_key set (typo / stale ref)
      - multiple ambiguous targets are present (only the FIRST match is examined;
        ambiguity surfaces empirically as unmatched targets)

    Used by the wizard's merge destination picker to render a single-click
    "Claude suggests → X [Confirm]" shortcut (design §7.1).
    """
    if not claude_notes:
        return None
    match = SUGGESTED_MERGE_TARGET_RE.search(claude_notes)
    if not match:
        return None
    target = match.group(1)
    if target not in valid_keys:
        return None
    return target
```

**Step 3: Wire into `entry_to_json` with valid-keys plumbing**

The current `entry_to_json(entry)` doesn't have access to the full canonical_key set. The cleanest fix is plumbing through `build_payload()` (line 684):

In `build_payload()`, before the `entry_to_json` loop, compute:

```python
    valid_keys = {e.canonical_key for e in entries}
```

Pass it to `entry_to_json`:

```python
        "entries": [entry_to_json(e, valid_keys) for e in entries],
```

Update `entry_to_json` signature:

```python
def entry_to_json(entry: Entry, valid_keys: set[str]) -> dict[str, Any]:
```

In the `"parsed"` block, add (adjacent to `suggested_verdict`):

```python
            "suggested_merge_target": extract_suggested_merge_target(
                entry.field_value("claude_notes"),
                valid_keys,
            ),
```

**Step 4: Run + spot-check**

```bash
python3 scripts/build-concepts-tool.py --pretty --output /tmp/payload.json
python3 -c "
import json
p = json.load(open('/tmp/payload.json'))
with_target = [e for e in p['entries'] if e['parsed']['suggested_merge_target']]
print(f'{len(with_target)} of {p[\"entry_count\"]} entries have suggested_merge_target')
for e in with_target[:5]:
    print(f\"  {e['canonical_key']} → {e['parsed']['suggested_merge_target']}\")
# Count merge-recommendation parents (suggested_verdict == 'merge')
merge_recs = [e for e in p['entries'] if e['parsed']['suggested_verdict'] == 'merge']
matched = [e for e in merge_recs if e['parsed']['suggested_merge_target']]
print(f'Of {len(merge_recs)} merge recs: {len(matched)} matched ({100*len(matched)/max(1,len(merge_recs)):.0f}%)')
"
```

Expected: ~53 of 78 merge recommendations matched (68% per W19). Off by ±2 entries is acceptable — depends on which recommendations have valid post-`§N ` targets vs typos. Report the exact ratio to user before committing.

**Step 5: Commit**

```bash
git add scripts/build-concepts-tool.py
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): parser emits suggested_merge_target

Adds high-confidence merge-target extraction (design §7.3, W19).
Powers the wizard's merge destination picker single-click shortcut.

Pattern: `Recommend merg(e|ing) into [§N ]\`target\``. Empirical
coverage on Session 81 worksheet: ~53/78 (68%). Unmatched cases
fall through to the autocomplete picker — by design, not a bug.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.3: Parser — emit merge-target extraction rate on `--verify-only`

**Files:**
- Modify: `scripts/build-concepts-tool.py:761-770` (stderr-report region in `main()`)

**What:** Smoke check #8 from Design §15: "the build script's `--verify-only` output must print, e.g., `merge-target extraction: 53 of 78 merge recommendations (68%) — 25 fall through to picker`. Baseline is 53/78 against the Session 81 worksheet; alert if it drops below ~60% on later worksheet revisions."

**Step 1: Compute + emit the report**

In `main()`, after the existing tier-distribution stderr print (around line 762-767), add:

```python
    # Merge-target extraction rate (smoke check #8 per design §15).
    valid_keys = {e.canonical_key for e in entries}
    merge_rec_count = 0
    matched_count = 0
    for entry in entries:
        suggested = extract_suggested_verdict(entry.field_value("claude_notes"))
        if suggested == "merge":
            merge_rec_count += 1
            if extract_suggested_merge_target(
                entry.field_value("claude_notes"), valid_keys
            ):
                matched_count += 1
    pct = (100 * matched_count / merge_rec_count) if merge_rec_count else 0
    fallthrough = merge_rec_count - matched_count
    print(
        f"merge-target extraction: {matched_count} of {merge_rec_count} "
        f"merge recommendations ({pct:.0f}%) — {fallthrough} fall through to picker",
        file=sys.stderr,
    )
    if merge_rec_count > 0 and pct < 60:
        print(
            f"WARNING: extraction rate {pct:.0f}% is below the 60% floor — "
            f"worksheet prose may have drifted; investigate before shipping.",
            file=sys.stderr,
        )
```

**Step 2: Run + verify the new line appears**

```bash
python3 scripts/build-concepts-tool.py --verify-only
```

Expected stderr (modulo exact numbers):
```
Parsed 208 entries (§11=32, §12=39, §13=137).
merge-target extraction: 53 of 78 merge recommendations (68%) — 25 fall through to picker
```

If percentage drifts below 60%, investigate (worksheet prose changed?) before continuing.

**Step 3: Commit**

```bash
git add scripts/build-concepts-tool.py
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): --verify-only reports merge-target rate

Smoke check #8 from design §15: alert on extraction drift below
the 60% floor. Baseline is 53/78 (68%) against Session 81.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.4: Template — rip out legacy long-scroll body + filters, replace with wizard shell

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (lines 7-980 CSS+header, 982-991 layout, 993-1010 onboarding modal stub, all body content)
- Modify: `scripts/concepts-worksheet-tool.template.html` (lines 1014-2196 — script: drop filter machinery + old renderEntryCard + old renderClusterSignalsPanel; keep utilities; stub init() to render a minimal "step 1 of N" placeholder)

**What:** This is the big "rewrite" milestone. After it, the tool builds + loads but shows only a placeholder per-entry view ("Step N of 208: `<canonical_key>`") — no decision UI yet. Subsequent milestones enrich the rendered step. Existing utilities (DOM helpers, state helpers, status helpers, export, import-non-reviewer-note, datalist) survive.

This milestone is large; estimated 30-60 minutes of careful template editing. Single commit at the end. Each sub-step below is a separate Edit/Write call.

**Step 1: Rewrite the CSS block (lines 7-919)**

Replace the entire `<style>...</style>` block with a CSS rewrite targeting:
- Single centered card (~720 px max, 24 px padding, soft border)
- Top bar: brand on left, decision-debt counters in middle, jump-to-entry + advanced on right
- Mode chips: muted Confirm / amber Resolve / red-orange Decide
- Tier strip: §11 red-orange tint / §12 amber tint / §13 muted green tint
- Verdict radio group: large clickable rows with "selected" affordance
- Primary action button: prominent, full card width
- Merge destination picker: collapsible panel that appears below verdict area
- Notes drawer: collapsible panel below action area
- Bottom nav: Previous (left) · Decide later (center) · Save · Next (right primary)
- End screen: centered, large export button

Preserve these utility classes from the existing CSS for reuse: `.mono`, `.btn`, `.btn.primary`, `.btn.ghost`, `.saved-badge`, `.collapsible`, `.collapsible-body`, `.hidden`, `.flash`, `<dialog>` styles. The new wizard re-uses them.

(Detailed CSS is too long to inline; this step delivers a draft that the wizard milestones M1.5–M1.15 will visually tighten as the JS renders against it. The acceptance bar at M1.4 is: page loads without runtime errors, top bar visible, single placeholder card visible centered.)

**Step 2: Rewrite the `<body>` HTML (lines 921-1011)**

Replace with:

```html
<body>

<header class="top">
  <div class="top-row">
    <div class="brand">
      <h1>Concepts Worksheet</h1>
      <span class="subtitle">Curriculum Team Review</span>
    </div>
    <span class="saved-badge" id="savedBadge">Saved locally</span>
    <div class="decision-debt" id="decisionDebt">
      <span class="debt-decide"><b id="debtDecideCount">0</b> to decide</span>
      <span class="debt-confirm"><b id="debtConfirmCount">0</b> to confirm</span>
      <span class="debt-resolve"><b id="debtResolveCount">0</b> cluster shapes</span>
      <span class="debt-bar"><i id="debtBar" style="width: 0%"></i></span>
    </div>
    <div class="actions">
      <div class="jump-to-entry">
        <input type="search" class="jump-input" id="jumpInput"
               placeholder="🔍 Jump to entry…" list="all-canonical-keys"
               autocomplete="off">
      </div>
      <button class="btn ghost" id="reviewSoFarBtn" type="button" disabled
              title="Available in Batch 2">Review so far</button>
      <button class="btn ghost" id="advancedBtn" type="button" aria-haspopup="menu">⚙ Advanced</button>
      <div class="advanced-menu" id="advancedMenu" role="menu">
        <div class="menu-hint">Import / Export</div>
        <button class="menu-item" id="exportBtn" type="button">Save &amp; Export markdown ↓</button>
        <button class="menu-item" id="importBtn" type="button">Import a saved markdown file…</button>
        <button class="menu-item" id="downloadJsonBtn" type="button">Download progress as JSON</button>
        <input type="file" id="importInput" accept=".md,text/markdown,text/plain" class="hidden">
        <div class="menu-divider"></div>
        <div class="menu-hint">Help</div>
        <button class="menu-item" id="showOnboardingBtn" type="button">Show wizard intro</button>
        <div class="menu-divider"></div>
        <div class="menu-hint">Reset</div>
        <button class="menu-item" id="clearStateBtn" type="button" style="color: var(--drop);">Clear all progress…</button>
      </div>
    </div>
  </div>
</header>

<main class="wizard-layout">
  <article class="wizard-card" id="wizardCard">
    <!-- step content rendered by JS -->
  </article>
  <nav class="wizard-nav" id="wizardNav">
    <button class="btn ghost" id="prevBtn" type="button">← Previous</button>
    <button class="btn ghost" id="deferBtn" type="button">Decide later</button>
    <button class="btn primary" id="nextBtn" type="button">Save · Next →</button>
  </nav>
</main>

<dialog id="onboardingModal" class="onboarding">
  <div class="modal-body">
    <h2>Concepts Worksheet</h2>
    <p>Walk through 208 concepts one at a time. Confirm Claude's calls, resolve five clusters, and pause on the few that matter.</p>
    <p style="color: var(--muted); font-size: 12.5px;">(Full intro rewrite lands in Batch 2.)</p>
    <div class="modal-actions">
      <button class="btn primary" type="button" id="dismissOnboardingBtn">Get started</button>
    </div>
  </div>
</dialog>
```

**Step 3: Drop filter machinery from JS**

Delete entirely:
- `FILTER_KEY` constant + `loadFilterState()` / `defaultFilterState()` / `saveFilterState()` (lines 1120-1149)
- `buildSubjectChips()` / `subjectCounts()` / `setFilter()` / `applyFilters()` / `updateStatusCounts()` (lines 1678-1769)
- `parseReviewerNotesFromMarkdown()` (lines 2017-2039)

**Step 4: Stub `renderEntryCard()` and `renderClusterSignalsPanel()` with placeholders**

Replace `renderEntryCard()` body with a minimal placeholder:

```javascript
function renderEntryCard(entry, mode) {
  // Stub: render a placeholder step card. Filled in by M1.5-M1.13.
  const card = el("article", {
    className: "wizard-step entry-step",
    dataset: { key: entry.canonical_key, mode },
  });
  card.appendChild(el("header", { className: "step-head" },
    el("span", { className: "step-tier-mode mono" }, `§${entry.tier} · ${mode}`),
    el("span", { className: "step-of" }, `step ?? of ??`),
  ));
  card.appendChild(el("h2", {}, entry.parsed.canonical_label || entry.canonical_key));
  card.appendChild(el("p", { className: "step-placeholder" },
    `(Wizard step renderer not yet implemented — milestone M1.7-M1.8.)`));
  return card;
}
```

Replace `renderClusterSignalsPanel()` with stub: `function renderClusterSignalsPanel(){}` (no-op until M1.10).

**Step 5: Replace `init()` with a step-machine bootstrap**

Replace the entire `init()` function (lines 2111-2193) with:

```javascript
function init() {
  // Build step sequence (entries in tier order; cluster Resolve steps
  // interleaved before their first member). Stubbed in M1.6.
  buildStepSequence();

  // Render the current step into #wizardCard. Stubbed in M1.6.
  renderCurrentStep();

  // Top-bar buttons
  document.getElementById("advancedBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleAdvancedMenu();
  });
  document.addEventListener("click", (ev) => {
    if (!ev.target.closest("#advancedMenu") && !ev.target.closest("#advancedBtn")) {
      toggleAdvancedMenu(false);
    }
  });
  document.getElementById("exportBtn").addEventListener("click", () => {
    onExport();
    toggleAdvancedMenu(false);
  });
  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importInput").click();
    toggleAdvancedMenu(false);
  });
  document.getElementById("importInput").addEventListener("change", (ev) => {
    const f = ev.target.files && ev.target.files[0];
    onImport(f);
    ev.target.value = "";
  });
  document.getElementById("downloadJsonBtn").addEventListener("click", () => {
    onDownloadJson();
    toggleAdvancedMenu(false);
  });
  document.getElementById("showOnboardingBtn").addEventListener("click", () => {
    showOnboarding();
    toggleAdvancedMenu(false);
  });
  document.getElementById("clearStateBtn").addEventListener("click", () => {
    onClearState();
    toggleAdvancedMenu(false);
  });

  // The end screen (M1.15) renders a second, more prominent Save & Export
  // button. The Advanced menu item above is the always-available affordance
  // that keeps the data-safety floor working across all in-flight milestones.

  // Wizard navigation buttons (wired to step machine in M1.13)
  document.getElementById("prevBtn").addEventListener("click", () => navStep(-1));
  document.getElementById("nextBtn").addEventListener("click", () => navStep(+1));
  document.getElementById("deferBtn").addEventListener("click", () => navDefer());

  // Jump-to-entry (wired in M1.14)
  ensureCanonicalKeysDatalist();
  document.getElementById("jumpInput").addEventListener("change", (ev) => {
    onJumpToEntry(ev.target.value);
    ev.target.value = "";
  });

  document.getElementById("dismissOnboardingBtn").addEventListener("click", () => dismissOnboarding(true));
  maybeShowOnboarding();
}

// ---------- Step machine stubs (filled in M1.6+) ----------
// Source of truth for current step is state.wizard.step_index (added in M1.6);
// stepSequence is module-level for fast lookups inside renderers and nav.
let stepSequence = [];
function buildStepSequence() { stepSequence = []; }
function renderCurrentStep() {
  const card = document.getElementById("wizardCard");
  card.innerHTML = "";
  card.appendChild(el("p", {}, `Wizard step machine not yet wired. ${ENTRIES.length} entries loaded.`));
}
function navStep(delta) { /* M1.13 */ }
function navDefer() { /* M1.13 */ }
function onJumpToEntry(key) { /* M1.14 */ }
```

**Step 6: Remove `setEntryState` writes from import for `reviewer_note`**

In `onImport()` (around line 1955), delete the `importedReviewerNotes` parse + apply lines (1955, 1963-1965, and the alert tally on 1979). New import becomes:

```javascript
function onImport(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      if (typeof text !== "string") throw new Error("Imported file is not text");
      const importedEntries = parseEntryEditsFromMarkdown(text);
      const importedClusterSignals = parseClusterSignalsFromMarkdown(text);

      let entryCount = 0;
      for (const [key, patch] of Object.entries(importedEntries)) {
        state.entries[key] = { ...(state.entries[key] || {}), ...patch };
        entryCount++;
      }
      let clusterCount = 0;
      for (const [id, optionIndex] of Object.entries(importedClusterSignals)) {
        state.cluster_signals[id] = optionIndex;
        clusterCount++;
      }
      saveState();
      renderCurrentStep();
      updateDecisionDebt();
      alert(
        `Imported. ${entryCount} entries updated; `
        + `${clusterCount} cluster-signal answers.`
      );
    } catch (e) {
      console.error(e);
      alert("Import failed: " + e.message);
    }
  };
  reader.readAsText(file);
}
```

(Note: `updateDecisionDebt()` is a forward reference filled in M1.14.)

**Step 7: Remove `reviewer_note` branch from `buildExportMarkdown`**

In `buildExportMarkdown()` (lines 1830-1878), delete the `const reviewerNote = entryState.reviewer_note;` declaration (line 1835) and the entire `if (reviewerNote && reviewerNote.trim()) { ... }` block (lines 1869-1877). The export now only emits verdict / curriculum_notes / merge_into edits.

**Step 8: Build + browser-smoke**

```bash
python3 scripts/build-concepts-tool.py --verify-only
python3 scripts/build-concepts-tool.py --build-html
```

Expected: `--verify-only` passes, `--build-html` writes to `docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html` (~1 MB).

Open via chrome-devtools-mcp at `file://.../concepts-worksheet-form/concepts-worksheet-tool.html`:
- Top bar visible: brand "Concepts Worksheet · Curriculum Team Review", saved badge, decision-debt placeholder (showing 0/0/0), jump input, Review so far (disabled), Advanced button
- Onboarding modal opens on first load; "Get started" dismisses
- Body shows the placeholder `<p>` ("Wizard step machine not yet wired. 208 entries loaded.")
- Open browser console: no errors
- Click ⚙ Advanced → "Save & Export markdown ↓" item is visible and clickable; clicking it downloads `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md`. SHA-256 matches source worksheet's SHA-256 (the empty-export invariant — already true since no commits write to state)

Verification probe (compare hashes):

```bash
shasum -a 256 docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md
# In browser: open Advanced menu → "Save & Export markdown ↓"
# Save the downloaded file to /tmp/exported.md, then:
shasum -a 256 /tmp/exported.md
# Both must match.
```

**Step 9: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): rip out long-scroll UI, wizard shell

Replaces the long-scroll body + filter chips + right-sidebar
cluster panel with the wizard shell (top bar with decision-debt
counters + jump-to-entry, single-card layout, three-button bottom
nav). Old renderEntryCard / renderClusterSignalsPanel stubbed for
M1.5-M1.10 to fill in.

Removes the reviewer_note channel entirely (W5): drops the textarea,
parse logic, and export branch. Import still handles legacy files
gracefully (reviewer_note lines just don't restore anything).

Empty-export hash invariant verified against source worksheet
SHA-256.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.5: Top-bar decision-debt counters

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — add `updateDecisionDebt()` and call from init)

**What:** Live-update the three counters in the top bar. "to decide" = number of Decide-mode steps with no committed verdict; "to confirm" = number of Confirm-mode steps with no committed verdict; "cluster shapes" = number of Resolve steps with no committed `cluster_signals[id]`. Counters update on every state change. Per Design §10.

This milestone is implementable before the step renderer (M1.7-M1.10) because the mode-routing logic (M1.9) can be computed directly from entries + cluster state without needing the visual step.

**Step 1: Add `entryMode(entry)` and `clusterMode(signal)` helpers**

Below the existing `entry*` helper region (after line 1229), add:

```javascript
function entryMode(entry) {
  // Mode routing per design §3. Returns "Confirm" or "Decide".
  // (Resolve is a cluster-step mode, not per-entry.)
  if (entry.tier === "11") return "Decide";
  const theme = entry.parsed.theme_overlap;
  if (theme && theme.flagged) return "Decide";
  const hasAiRec = entry.parsed.suggested_verdict
    && VERDICTS.includes(entry.parsed.suggested_verdict);
  const hasClusterRec = !!clusterPrefillCandidate(entry); // M1.10
  if (!hasAiRec && !hasClusterRec) return "Decide";
  // Revisit-as-Decide: previously committed verdict differs from AI rec.
  const committed = getEntryState(entry.canonical_key).verdict;
  if (committed && committed !== entry.parsed.suggested_verdict) return "Decide";
  return "Confirm";
}

function clusterPrefillCandidate(entry) {
  // Stub for M1.5 — actual cluster→member derivation is M2.1 (Batch 2).
  // Batch 1 always returns null, so cluster pre-fills don't yet propagate.
  return null;
}

function updateDecisionDebt() {
  let toDecide = 0;
  let toConfirm = 0;
  for (const entry of ENTRIES) {
    const filled = entryFilled(entry.canonical_key);
    if (filled) continue;
    const mode = entryMode(entry);
    if (mode === "Decide") toDecide++;
    else toConfirm++;
  }
  let unresolvedClusters = 0;
  for (const signal of CLUSTER_SIGNALS) {
    if (getClusterState(signal.id) === undefined) unresolvedClusters++;
  }
  document.getElementById("debtDecideCount").textContent = toDecide.toString();
  document.getElementById("debtConfirmCount").textContent = toConfirm.toString();
  document.getElementById("debtResolveCount").textContent = unresolvedClusters.toString();
  // Progress bar tracks (1 - debt/total).
  const total = ENTRIES.length + CLUSTER_SIGNALS.length;
  const remaining = toDecide + toConfirm + unresolvedClusters;
  const pct = total > 0 ? (100 * (total - remaining) / total) : 0;
  document.getElementById("debtBar").style.width = `${pct}%`;
}
```

**Step 2: Wire `updateDecisionDebt()` into init + all state-changing handlers**

In `init()`, after `renderCurrentStep()`, add `updateDecisionDebt();`. In `onVerdictChange`, `onMergeIntoChange`, `setClusterState`, `onImport`, `onClearState` — add `updateDecisionDebt();` after their state writes.

**Step 3: Build + verify counters**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Open in browser. Inspect:
- `to decide` should equal 35 (32 §11 entries + 3 theme-overlap-flagged, before any commits) — adjust if probe shows different. Let's spot-check:

```javascript
// In browser console
const decide = ENTRIES.filter(e => entryMode(e) === "Decide");
console.log(`Decide entries: ${decide.length}`);
console.log(decide.slice(0, 5).map(e => `${e.tier} ${e.canonical_key}`));
```

Expected: 32 §11 entries + however-many theme-overlap-flagged §12/§13 entries (design doc cites "3 entries"). So ~35 total.

- `to confirm` ≈ 208 - 35 = ~173 minus any §12/§13 without `suggested_verdict`. Probe:

```javascript
const confirm = ENTRIES.filter(e => entryMode(e) === "Confirm");
console.log(`Confirm entries: ${confirm.length}`);
```

- `cluster shapes` = 5 (all unresolved)

Report exact numbers to user before commit.

**Step 4: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): wire decision-debt top-bar counters

Adds entryMode() routing helper (design §3) and updateDecisionDebt()
that computes the three counters live from state. clusterPrefillCandidate
is stubbed to null for Batch 1; Batch 2 wires the real cluster→member
derivation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.6: Step machine — derived sequence + current-index storage

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS)

**What:** Build the linear step sequence (entries in tier order with cluster signals interleaved before each cluster's first member). Track current step index in localStorage so reload preserves position.

**Step 1: Extend state shape**

In `defaultState()` (around line 1072), add a `wizard` block:

```javascript
function defaultState() {
  return {
    schema_version: 1,
    entries: {},
    cluster_signals: {},
    wizard: {
      step_index: 0,
      deferred: [],     // array of step ids (entry canonical_keys or cluster ids)
    },
  };
}
```

Update `loadState()` to migrate older state (just `state.wizard = state.wizard || defaultState().wizard;` in the load path).

**Step 2: Implement `buildStepSequence()`**

Replace the stub:

```javascript
function buildStepSequence() {
  // Step sequence: entries in tier order, with each cluster's Resolve step
  // interleaved BEFORE that cluster's first member encountered in the walk.
  // Each step is { kind: "entry" | "cluster", id: <canonical_key or CON-id>, entry?, signal? }.
  stepSequence = [];

  // Index entries by tier in worksheet order.
  const entriesInOrder = [];
  for (const tier of TIER_ORDER) {
    for (const entry of ENTRIES) {
      if (entry.tier === tier) entriesInOrder.push(entry);
    }
  }

  // Track which cluster signals have been emitted; emit each before its first
  // member is encountered IN WIZARD ORDER (not in signal.members order).
  // signal.members lists the "anchor" first by curation, but that anchor isn't
  // necessarily the earliest-appearing member in tier-walk order — e.g., CON-22
  // lists `reading` first but `reading_comprehension` is §12 and `reading` is
  // §13, so the cluster should fire before `reading_comprehension`.
  const clusterFirstMember = new Map(); // CON-id -> canonical_key
  for (const signal of CLUSTER_SIGNALS) {
    const memberSet = new Set(signal.members);
    for (const entry of entriesInOrder) {
      if (memberSet.has(entry.canonical_key)) {
        clusterFirstMember.set(signal.id, entry.canonical_key);
        break;
      }
    }
  }
  const emittedClusters = new Set();

  for (const entry of entriesInOrder) {
    // Emit cluster step if this entry is the first member of an un-emitted cluster.
    for (const [clusterId, firstMember] of clusterFirstMember.entries()) {
      if (emittedClusters.has(clusterId)) continue;
      if (firstMember === entry.canonical_key) {
        const signal = CLUSTER_SIGNALS.find((s) => s.id === clusterId);
        stepSequence.push({ kind: "cluster", id: clusterId, signal });
        emittedClusters.add(clusterId);
      }
    }
    stepSequence.push({ kind: "entry", id: entry.canonical_key, entry });
  }

  // Clamp current step index in case state has stale value.
  // Allow stepSequence.length as a valid index — that's the end-screen
  // sentinel introduced in M1.15. Anything beyond that wraps back.
  if (state.wizard.step_index > stepSequence.length) {
    state.wizard.step_index = stepSequence.length - 1;
  }
  if (state.wizard.step_index < 0) state.wizard.step_index = 0;
}

function currentStep() {
  return stepSequence[state.wizard.step_index];
}
```

**Step 3: Implement `renderCurrentStep()`**

Replace the stub:

```javascript
function renderCurrentStep() {
  const card = document.getElementById("wizardCard");
  card.innerHTML = "";
  const step = currentStep();
  if (!step) {
    card.appendChild(renderEndScreen()); // M1.15
    return;
  }
  if (step.kind === "entry") {
    const mode = entryMode(step.entry);
    card.appendChild(renderEntryStep(step.entry, mode));
  } else if (step.kind === "cluster") {
    card.appendChild(renderClusterStep(step.signal));
  }
  // Mode chip + step counter in step-head are set inside the renderers.
  updateNavButtonState();
}

function updateNavButtonState() {
  // Disable Previous on step 0; disable Next when step isn't "advanceable"
  // (M1.9 fills in mode-specific rules; for M1.6 we treat advance as always allowed).
  document.getElementById("prevBtn").disabled = state.wizard.step_index <= 0;
  document.getElementById("nextBtn").disabled = false;
}
```

Add stub renderers that M1.7+ replace:

```javascript
function renderEntryStep(entry, mode) {
  // Stub — M1.7 (Confirm) + M1.8 (Decide) fill in.
  return renderEntryCard(entry, mode);  // current M1.4 stub
}
function renderClusterStep(signal) {
  // Stub — M1.10 fills in.
  const card = el("article", { className: "wizard-step cluster-step" });
  card.appendChild(el("p", {}, `Cluster ${signal.id} step — milestone M1.10.`));
  return card;
}
function renderEndScreen() {
  // Stub — M1.15 fills in.
  const card = el("article", { className: "wizard-step end-screen" });
  card.appendChild(el("p", {}, "End of wizard — milestone M1.15."));
  return card;
}
```

**Step 4: Build + verify sequence**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

In browser console:
```javascript
console.log(`stepSequence length: ${stepSequence.length}`);
console.log(stepSequence.slice(0, 10).map(s => `${s.kind}:${s.id}`));
console.log(`Current step: ${state.wizard.step_index} → ${currentStep().kind}:${currentStep().id}`);
```

Expected: length is 208 + 5 = **213**. First 10 entries should show the §11 tier order with cluster signals interleaved as their first member appears (e.g., CON-23 emits before `measurement` enters).

**Step 5: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): build wizard step sequence + index state

Builds the linear walk (208 entries + 5 cluster Resolve steps,
interleaved before first member). Tracks current step index in
localStorage; reload preserves position. Renderers still stubbed
until M1.7-M1.10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.7: Per-entry Confirm step renderer (§6.1 + §6.3)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — replace `renderEntryStep()` Confirm branch)

**What:** The Confirm step layout from Design §6.1: tier strip + Claude-recommends one-liner + primary "✓ Agree" button + "Pick something else ▾" expand. §6.3 (cluster-derived caption) is also handled here but the cluster source returns null in Batch 1, so the caption swap is unreachable until Batch 2 — wire the conditional now.

**Step 1: Implement the Confirm renderer**

Replace the M1.6 stub `renderEntryStep` with a `renderEntryStep(entry, mode)` that dispatches by mode, and implement `renderConfirmStep(entry)`:

```javascript
function renderEntryStep(entry, mode) {
  if (mode === "Confirm") return renderConfirmStep(entry);
  return renderDecideStep(entry);  // M1.8
}

// Single source of truth for "what pre-fill does this entry's Confirm step
// display, and where does it come from." MUST be called by BOTH the renderer
// and any commit path (primary Agree button, Save·Next, keyboard Enter) so
// the user can't accidentally commit a value different from what the screen
// shows. Becomes load-bearing in Batch 2 when cluster pre-fill (per W21)
// outranks AI pre-fill on cluster member entries.
function displayedPrefillForEntry(entry) {
  const s = getEntryState(entry.canonical_key);
  if (s.verdict) {
    return {
      verdict: s.verdict,
      merge_into: s.merge_into || null,
      captionSource: "Saved",
      isCommitted: true,
    };
  }
  const clusterPrefill = clusterPrefillCandidate(entry); // null in Batch 1
  if (clusterPrefill) {
    return {
      verdict: clusterPrefill.verdict,
      merge_into: clusterPrefill.merge_into || null,
      captionSource: `Suggested from ${clusterPrefill.from}`,
      isCommitted: false,
    };
  }
  if (entry.parsed.suggested_verdict) {
    return {
      verdict: entry.parsed.suggested_verdict,
      merge_into: entry.parsed.suggested_merge_target || null,
      captionSource: "Claude recommends",
      isCommitted: false,
    };
  }
  return null; // no pre-fill — caller should fall back to Decide layout
}

function renderConfirmStep(entry) {
  const key = entry.canonical_key;
  const prefill = displayedPrefillForEntry(entry);
  // Defensive: Confirm mode requires some pre-fill. Fall back to Decide if not.
  if (!prefill) return renderDecideStep(entry);
  const displayed = prefill.verdict;
  const displayedTarget = prefill.merge_into;
  const captionSource = prefill.captionSource;

  const card = el("article", {
    className: "wizard-step entry-step confirm-mode",
    dataset: { key, mode: "Confirm", tier: entry.tier },
  });

  // ---- Step head: mode chip + step counter ----
  card.appendChild(renderStepHead(entry, "Confirm"));

  // ---- Tier strip (calm copy per W10) ----
  card.appendChild(renderTierStrip(entry.tier));

  // ---- Theme overlap callout (if flagged — also pushes mode to Decide, so unreachable here, but defensive) ----
  // ---- Merge aliases proposal (if any) ----
  if (entry.parsed.merge_aliases && entry.parsed.merge_aliases.length > 0) {
    card.appendChild(renderMergeAliases(entry));
  }

  // ---- Claude one-liner with ▸ more expand ----
  card.appendChild(renderClaudeRecommendation(entry, displayed, displayedTarget, captionSource));

  // ---- Primary action: ✓ Agree — <displayed verdict>[ → <target>] ----
  card.appendChild(renderPrimaryAgreeAction(entry, displayed, displayedTarget));

  // ---- "Pick something else ▾" expand → 3-option radio + new link ----
  card.appendChild(renderPickSomethingElse(entry, displayed));

  // ---- + Add a note (collapsed by default; M1.12 auto-opens on override) ----
  card.appendChild(renderNotesDrawer(entry, /*forceOpen=*/false));

  return card;
}
```

**Step 2: Implement the sub-renderers**

Add these helper functions (kept compact for readability):

```javascript
function renderStepHead(entry, mode) {
  const totalSteps = stepSequence.length;
  const stepNum = state.wizard.step_index + 1;
  const head = el("header", { className: "step-head" });
  head.appendChild(el("span", { className: `mode-chip mode-${mode.toLowerCase()}` }, mode));
  head.appendChild(el("span", { className: "step-of" }, `step ${stepNum} of ${totalSteps}`));
  head.appendChild(el("h2", { className: "step-title" },
    entry.parsed.canonical_label || entry.canonical_key));
  head.appendChild(el("div", { className: "step-key-row" },
    el("code", {}, `\`${entry.canonical_key}\``),
    el("span", { className: "step-meta" },
      `${entry.parsed.frequency_primary} appearances · ${entry.parsed.recommended_primary_subject || "—"}`)
  ));
  return head;
}

function renderTierStrip(tier) {
  const strip = el("div", { className: `tier-strip tier-strip-${tier}` });
  if (tier === "11") strip.textContent = "§11 High-impact: review carefully.";
  else if (tier === "12") strip.textContent = "§12 Mid-tier: confirm or adjust.";
  else strip.textContent = "§13 Long-tail: quick pass; pause when unsure.";
  return strip;
}

function renderClaudeRecommendation(entry, displayed, target, captionSource) {
  const wrap = el("div", { className: "claude-rec" });
  const verdictLabel = REVIEWER_LABELS[displayed] || displayed || "(no recommendation)";
  const targetSuffix = (displayed === "merge" && target) ? ` \`${target}\`` : "";
  wrap.appendChild(el("p", { className: "claude-rec-headline" },
    el("span", {}, "💡 "),
    el("strong", {}, `${captionSource}: `),
    document.createTextNode(`${verdictLabel}${targetSuffix}`),
  ));
  // One-line summary + ▸ more expand
  const summary = entry.parsed.claude_notes_summary || "";
  if (summary) {
    wrap.appendChild(el("p", { className: "claude-rec-summary" }, summary));
  }
  if (entry.parsed.claude_notes && entry.parsed.claude_notes !== summary) {
    const more = el("details", { className: "claude-rec-more" });
    more.appendChild(el("summary", {}, "▸ more"));
    const body = el("div", { className: "claude-rec-more-body" });
    body.innerHTML = renderInlineMarkdown(entry.parsed.claude_notes);
    more.appendChild(body);
    wrap.appendChild(more);
  }
  return wrap;
}

function renderPrimaryAgreeAction(entry, displayed, target) {
  const key = entry.canonical_key;
  const wrap = el("div", { className: "primary-action-row" });
  if (!displayed) {
    // Shouldn't happen in Confirm mode (mode routing requires a pre-fill or rec)
    wrap.appendChild(el("p", { className: "muted" }, "(no pre-fill — pick below)"));
    return wrap;
  }
  const verdictLabel = REVIEWER_LABELS[displayed] || displayed;
  const targetSuffix = (displayed === "merge" && target) ? ` \`${target}\`` : "";
  const btn = el("button", {
    type: "button",
    className: "btn primary primary-agree",
    onclick: () => {
      // For merge with no target, route through the picker (M1.11)
      if (displayed === "merge" && !target) {
        openMergePicker(entry, /*defaultTarget=*/null);
        return;
      }
      // Atomic commit of verdict (+ merge target if merge)
      const patch = { verdict: displayed };
      if (displayed === "merge") patch.merge_into = target;
      setEntryState(key, patch);
      onCommit(key);
    },
  }, `✓ Agree — ${verdictLabel}${targetSuffix}`);
  wrap.appendChild(btn);
  return wrap;
}

function renderPickSomethingElse(entry, displayed) {
  const key = entry.canonical_key;
  const wrap = el("details", { className: "pick-other" });
  wrap.appendChild(el("summary", {}, "Pick something else ▾"));
  const group = el("div", { className: "verdict-options-group" });
  for (const v of ["keep", "merge", "drop"]) {
    if (v === displayed) continue;  // skip the current displayed
    const label = el("label", { className: "verdict-option" });
    label.appendChild(el("input", {
      type: "radio",
      name: `pick-other-${key}`,
      onchange: () => onPickOtherVerdict(entry, v),
    }));
    label.appendChild(el("span", {}, REVIEWER_LABELS[v]));
    group.appendChild(label);
  }
  wrap.appendChild(group);
  // "Less common: add new concept" link (W9)
  const newLink = el("button", {
    type: "button",
    className: "btn linkish",
    onclick: () => onPickOtherVerdict(entry, "new"),
  }, "Less common: add new concept");
  wrap.appendChild(newLink);
  return wrap;
}

function renderMergeAliases(entry) {
  const block = el("div", { className: "merge-aliases-block" });
  block.appendChild(el("div", { className: "label" }, "Merge aliases (proposed):"));
  const ul = el("ul");
  for (const a of entry.parsed.merge_aliases) {
    ul.appendChild(el("li", {},
      el("code", {}, a.alias),
      el("span", { className: "count" }, `(${a.count})`),
    ));
  }
  block.appendChild(ul);
  return block;
}

// Constants for reviewer-facing labels (W8)
const REVIEWER_LABELS = {
  keep: "Keep as concept",
  merge: "Fold into another",
  new: "Add new concept",
  drop: "Remove",
};
```

**Step 3: Add commit-handler stubs**

```javascript
function onCommit(key) {
  // Called after any state.entries[key].verdict write.
  updateDecisionDebt();
  renderCurrentStep();  // re-render to update "Saved" caption + button styles
}

function onPickOtherVerdict(entry, v) {
  if (v === "merge") {
    openMergePicker(entry, entry.parsed.suggested_merge_target);  // M1.11
    return;
  }
  setEntryState(entry.canonical_key, { verdict: v });
  // Auto-open notes drawer if this is an override of Claude's rec (M1.12)
  maybeAutoOpenNotesDrawer(entry, v, "override");
  onCommit(entry.canonical_key);
}

function openMergePicker(entry, defaultTarget) {
  // M1.11 fills in. Stub: just commit the suggestion if defaultTarget present.
  if (defaultTarget) {
    setEntryState(entry.canonical_key, { verdict: "merge", merge_into: defaultTarget });
    onCommit(entry.canonical_key);
  } else {
    alert("Merge picker — M1.11.");
  }
}

function maybeAutoOpenNotesDrawer(entry, verdict, trigger) {
  // M1.12 fills in.
}

function renderNotesDrawer(entry, forceOpen) {
  // M1.12 fills in. Stub: empty.
  return el("div", { className: "notes-drawer-stub" });
}
```

**Step 4: Build + browser-smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Open. Navigate to a §13 Confirm step (use jump-to-entry to type a long-tail key e.g. `plant_id`):
- Mode chip says "Confirm"
- Tier strip: "§13 Long-tail: quick pass; pause when unsure."
- Claude recommends headline visible with verdict label + optional target
- One-liner summary visible; "▸ more" expands full prose
- "✓ Agree — Fold into `plant_identification`" button clickable; click commits
- After commit: captionSource flips to "Saved", page re-renders
- "Pick something else ▾" expands to keep/drop radios + "Less common: add new concept" link

Verify state writes in console:
```javascript
JSON.stringify(state.entries['plant_id'])
// → {"verdict":"merge","merge_into":"plant_identification"}
```

**Step 5: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): Confirm step renderer (§6.1)

Single centered card with mode chip, tier strip, Claude one-liner +
▸ more expand, primary "✓ Agree" button (atomic commit for non-merge
or with-target merge), and "Pick something else ▾" expand to
keep/drop radios + "Less common: add new concept" link. Cluster
caption swap (§6.3) wired but unreachable in Batch 1 since
clusterPrefillCandidate stays null.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.8: Per-entry Decide step renderer (§6.2 + §6.4)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — add `renderDecideStep`)

**What:** Decide step layout from Design §6.2 (and §6.4 for §11 cluster members). No pre-fill; blank radio; full claude_notes expanded by default; "Why this needs attention" microcopy below tier strip.

**Step 1: Implement Decide renderer**

```javascript
function renderDecideStep(entry) {
  const key = entry.canonical_key;
  const stateForEntry = getEntryState(key);
  const verdict = stateForEntry.verdict;
  const aiSuggestion = entry.parsed.suggested_verdict;
  const clusterSuggestion = clusterPrefillCandidate(entry); // null in Batch 1

  const card = el("article", {
    className: "wizard-step entry-step decide-mode",
    dataset: { key, mode: "Decide", tier: entry.tier },
  });

  card.appendChild(renderStepHead(entry, "Decide"));
  card.appendChild(renderTierStrip(entry.tier));
  card.appendChild(renderWhyAttention(entry));

  // Theme-overlap callout (more prominent on Decide steps)
  if (entry.parsed.theme_overlap && entry.parsed.theme_overlap.flagged) {
    const cb = el("div", { className: "theme-overlap-callout" });
    cb.innerHTML = `<strong>⚠ Theme overlap.</strong> ${renderInlineMarkdown(entry.parsed.theme_overlap.note)}`;
    card.appendChild(cb);
  }

  if (entry.parsed.merge_aliases && entry.parsed.merge_aliases.length > 0) {
    card.appendChild(renderMergeAliases(entry));
  }

  // Claude's recommendation if any — shown but radio stays blank.
  if (aiSuggestion || clusterSuggestion) {
    const source = clusterSuggestion
      ? `Suggested from ${clusterSuggestion.from}`
      : "Claude recommends";
    const v = clusterSuggestion ? clusterSuggestion.verdict : aiSuggestion;
    const t = clusterSuggestion ? clusterSuggestion.merge_into : entry.parsed.suggested_merge_target;
    const wrap = el("div", { className: "claude-rec" });
    const targetSuffix = (v === "merge" && t) ? ` \`${t}\`` : "";
    wrap.appendChild(el("p", { className: "claude-rec-headline" },
      el("span", {}, "💡 "),
      el("strong", {}, `${source}: `),
      document.createTextNode(`${REVIEWER_LABELS[v] || v}${targetSuffix}`),
    ));
    if (entry.parsed.claude_notes) {
      const body = el("div", { className: "claude-rec-body-expanded" });
      body.innerHTML = renderInlineMarkdown(entry.parsed.claude_notes);
      wrap.appendChild(body);
    }
    card.appendChild(wrap);
  } else if (entry.parsed.claude_notes) {
    // No suggestion but notes exist — still show them.
    const wrap = el("div", { className: "claude-rec" });
    const body = el("div", { className: "claude-rec-body-expanded" });
    body.innerHTML = renderInlineMarkdown(entry.parsed.claude_notes);
    wrap.appendChild(body);
    card.appendChild(wrap);
  }

  // ---- Verdict radio group (blank — no pre-fill, even if cluster suggestion present) ----
  const fs = el("fieldset", { className: "verdict-options-group" });
  fs.appendChild(el("legend", {},
    "Your call (no default", entry.tier === "11" ? " — high-impact tier" : "", "):"
  ));
  for (const v of ["keep", "merge", "drop"]) {
    const label = el("label", { className: "verdict-option" });
    label.appendChild(el("input", {
      type: "radio",
      name: `decide-${key}`,
      checked: verdict === v,
      onchange: () => onDecideVerdict(entry, v),
    }));
    label.appendChild(el("span", {}, REVIEWER_LABELS[v]));
    fs.appendChild(label);
  }
  card.appendChild(fs);
  const newLink = el("button", {
    type: "button",
    className: "btn linkish",
    onclick: () => onDecideVerdict(entry, "new"),
  }, "Less common: add new concept");
  card.appendChild(newLink);

  // Notes drawer (M1.12)
  card.appendChild(renderNotesDrawer(entry, false));

  return card;
}

function renderWhyAttention(entry) {
  // Priority order per design §3.
  const theme = entry.parsed.theme_overlap;
  let reason = null;
  if (theme && theme.flagged) {
    reason = "Theme overlap with themes worksheet.";
  } else if (clusterPrefillCandidate(entry)) {
    // (Batch 2 path) revisit-mode + Differs-from-cluster + Part-of-cluster-no-decision
    // For Batch 1 this branch is unreachable (clusterPrefillCandidate stays null)
    reason = "(Cluster reason — Batch 2.)";
  } else if (entry.tier === "11") {
    reason = "§11 High-impact concept.";
  } else if (!entry.parsed.suggested_verdict) {
    reason = "No confident recommendation.";
  }
  const wrap = el("div", { className: "why-attention" });
  if (reason) {
    wrap.appendChild(el("span", { className: "why-label" }, "Why this needs attention: "));
    wrap.appendChild(document.createTextNode(reason));
  }
  return wrap;
}

function onDecideVerdict(entry, v) {
  if (v === "merge") {
    openMergePicker(entry, entry.parsed.suggested_merge_target);
    return;
  }
  setEntryState(entry.canonical_key, { verdict: v });
  // Auto-open notes drawer on new/drop and on override (M1.12)
  if (v === "new" || v === "drop") {
    maybeAutoOpenNotesDrawer(entry, v, "new-or-drop");
  } else if (entry.parsed.suggested_verdict && v !== entry.parsed.suggested_verdict) {
    maybeAutoOpenNotesDrawer(entry, v, "override");
  }
  onCommit(entry.canonical_key);
}
```

**Step 2: Build + browser-smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Open. Navigate to §11 entry (e.g., `plant_parts`):
- Mode chip says "Decide"
- Tier strip: "§11 High-impact: review carefully."
- "Why this needs attention: §11 High-impact concept." visible
- Full claude_notes prose shown (not the one-line summary)
- Radio group blank — no option checked initially
- Click "Keep as concept" → state writes; "Saved" caption appears

Navigate to a theme-overlap entry (one of 3 — check `ENTRIES.filter(e=>e.parsed.theme_overlap.flagged)`):
- "Why this needs attention: Theme overlap with themes worksheet."
- Theme overlap callout visible

Navigate to a §12/§13 entry with no `suggested_verdict` (probe `ENTRIES.filter(e=>e.tier!='11'&&!e.parsed.suggested_verdict).slice(0,3)`):
- Mode = "Decide"
- "Why this needs attention: No confident recommendation."

**Step 3: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): Decide step renderer (§6.2, §6.4)

§11 + theme-overlap + no-rec entries render with blank radio,
"Why this needs attention" microcopy (priority-ordered per §3),
full claude_notes expanded by default. §11 + cluster-member
case (§6.4) reachable in Batch 2 once clusterPrefillCandidate
is wired.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.9: Mode routing verification

**Files:**
- (No edits — verification milestone)

**What:** Quick smoke pass confirming `entryMode` produces correct distributions and the right entries get Confirm vs Decide. No commit unless we discover a routing bug.

**Step 1: Probe distributions**

In the built HTML in-browser console:

```javascript
const counts = { Confirm: 0, Decide: 0 };
for (const e of ENTRIES) counts[entryMode(e)]++;
console.log(counts);

// Expected: ~150 Confirm + ~50 Decide (design §3 estimates)
// Actual exact will depend on theme_overlap count + no-rec count

const decideReasons = {};
for (const e of ENTRIES) {
  if (entryMode(e) === "Decide") {
    let reason = "?";
    if (e.parsed.theme_overlap.flagged) reason = "theme-overlap";
    else if (e.tier === "11") reason = "§11";
    else if (!e.parsed.suggested_verdict) reason = "no-rec";
    decideReasons[reason] = (decideReasons[reason] || 0) + 1;
  }
}
console.log(decideReasons);
```

**Step 2: Walk 3 representative entries**

Manually navigate (via jump-to-entry) to:
- `plant_parts` (§11) → Decide, no pre-fill
- `plant_id` (§13 with merge rec) → Confirm, "✓ Agree — Fold into `plant_identification`"
- Some §12 entry that has `suggested_verdict=keep` → Confirm, "✓ Agree — Keep as concept"

Report counts and any anomalies to user. **If counts are wildly off design estimates (more than 60 Decide entries, say) we need to investigate before continuing.**

---

### Milestone 1.10: Cluster signal Resolve step renderer (§9)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — replace `renderClusterStep`)

**What:** Render the Resolve UI for cluster signals. Verbatim option text from `signal.options`, member list, "Save · Continue" commits but Batch 1 does NOT yet auto-pre-fill members (that's M2.1).

**Step 1: Implement renderer**

```javascript
function renderClusterStep(signal) {
  const stepNum = state.wizard.step_index + 1;
  const totalSteps = stepSequence.length;
  const card = el("article", {
    className: "wizard-step cluster-step resolve-mode",
    dataset: { id: signal.id, mode: "Resolve" },
  });

  const head = el("header", { className: "step-head" });
  head.appendChild(el("span", { className: "mode-chip mode-resolve" }, "Resolve"));
  head.appendChild(el("span", { className: "step-of" }, `step ${stepNum} of ${totalSteps}`));
  head.appendChild(el("h2", { className: "step-title" }, signal.label));
  head.appendChild(el("div", { className: "step-key-row" },
    el("code", {}, signal.id),
    el("span", { className: "step-meta" }, `${signal.members.length} members`),
  ));
  card.appendChild(head);

  card.appendChild(el("p", { className: "cluster-question" }, signal.question));

  const optionsContainer = el("div", { className: "cluster-options" });
  signal.options.forEach((opt, idx) => {
    const selected = getClusterState(signal.id) === idx;
    const label = el("label", { className: "cluster-option" + (selected ? " selected" : "") });
    label.appendChild(el("input", {
      type: "radio",
      name: `cluster-${signal.id}`,
      checked: selected,
      onchange: () => {
        setClusterState(signal.id, idx);
        onClusterCommit(signal.id);
      },
    }));
    label.appendChild(el("span", { className: "option-text" }, opt));
    optionsContainer.appendChild(label);
  });
  card.appendChild(optionsContainer);

  // Members list (click to peek/jump)
  const membersBlock = el("div", { className: "cluster-members" });
  membersBlock.appendChild(el("h3", {}, `Members (${signal.members.length})`));
  const ul = el("ul");
  for (const memberKey of signal.members) {
    const memberEntry = ENTRIES_BY_KEY.get(memberKey);
    const v = memberEntry ? (getEntryState(memberKey).verdict || "(no decision yet)") : "(not in worksheet)";
    const li = el("li", {});
    const peekBtn = el("button", {
      type: "button",
      className: "member-peek mono",
      onclick: () => jumpToStepByEntryKey(memberKey),
    }, memberKey);
    li.appendChild(peekBtn);
    li.appendChild(document.createTextNode(` — ${v}`));
    ul.appendChild(li);
  }
  membersBlock.appendChild(ul);
  card.appendChild(membersBlock);

  // Note drawer (open via + Add a note; auto-open behavior doesn't apply to cluster steps in Batch 1)
  card.appendChild(renderClusterNotesDrawer(signal));

  return card;
}

function onClusterCommit(signalId) {
  updateDecisionDebt();
  renderCurrentStep();
  // Batch 2 (M2.1): also recompute downstream member pre-fills.
}

function renderClusterNotesDrawer(signal) {
  // Cluster signal notes are NOT exported to the worksheet's curriculum_notes
  // field (those are per-entry). For Batch 1, this is a placeholder drawer
  // (no persistence yet) — Batch 2 wires cluster_notes to the cluster comment block.
  return el("div", { className: "cluster-notes-stub" });
}

function jumpToStepByEntryKey(key) {
  for (let i = 0; i < stepSequence.length; i++) {
    if (stepSequence[i].kind === "entry" && stepSequence[i].id === key) {
      state.wizard.step_index = i;
      saveState();
      renderCurrentStep();
      return;
    }
  }
}
```

**Step 2: Build + smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Navigate the wizard to a cluster step (jump to `measurement` then step back one or two to land on CON-23):
- Mode chip = "Resolve" (different color than Confirm/Decide)
- Step title: "Measurement-cluster boundary"
- Question: "Does `measurement` keep alongside 4 specific sub-types, or collapse into the parent?"
- 2 option radios (verbatim from audit register)
- 5 members listed; click `weight` → jumps to that entry's step

Pick option 2 → state writes; counter "cluster shapes" decrements from 5 → 4.

**Step 3: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): Cluster Resolve step renderer (§9)

In-flow Resolve UI: verbatim cluster question + options (no rephrase
per audit-register contract) + member list with click-to-jump.
Cluster→member pre-fill propagation deferred to Batch 2 (M2.1).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.11: Merge destination picker (§7)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — implement `openMergePicker`)

**What:** Replace the M1.7 stub `openMergePicker()`. When verdict picks "Fold into another", an in-card picker UI appears. If a high-confidence target is available, show one-click "Confirm" pill. Else autocomplete picker.

**Step 1: Implement picker UI**

```javascript
function openMergePicker(entry, defaultTarget) {
  // Render the picker as a modal-style overlay inside the current step card.
  // The wizard step card holds the picker; commit triggers re-render of the step.
  const card = document.getElementById("wizardCard");
  // Remove any existing picker
  for (const old of card.querySelectorAll(".merge-picker")) old.remove();

  const picker = el("div", { className: "merge-picker" });
  picker.appendChild(el("h3", {}, `Fold \`${entry.canonical_key}\` into…`));

  if (defaultTarget && ENTRIES_BY_KEY.has(defaultTarget)) {
    // High-confidence shortcut
    const shortcut = el("div", { className: "merge-shortcut" });
    shortcut.appendChild(el("p", {}, "Claude suggests:"));
    const confirmBtn = el("button", {
      type: "button",
      className: "btn primary merge-shortcut-confirm",
      onclick: () => commitMerge(entry.canonical_key, defaultTarget, picker),
    }, `→ ${defaultTarget} (high-confidence target) — Confirm`);
    shortcut.appendChild(confirmBtn);
    picker.appendChild(shortcut);
    picker.appendChild(el("p", { className: "muted" }, "Or pick a different target ▾"));
  }

  // Autocomplete fallback
  const input = el("input", {
    type: "text",
    className: "merge-input mono",
    placeholder: "Type canonical_key (autocomplete)…",
    list: "all-canonical-keys",
    autocomplete: "off",
  });
  picker.appendChild(input);

  const actions = el("div", { className: "merge-actions" });
  const cancelBtn = el("button", {
    type: "button",
    className: "btn ghost",
    onclick: () => { picker.remove(); },
  }, "Cancel");
  const confirmBtn = el("button", {
    type: "button",
    className: "btn primary",
    disabled: true,
    onclick: () => commitMerge(entry.canonical_key, input.value.trim(), picker),
  }, "Confirm");
  input.addEventListener("input", () => {
    const v = input.value.trim();
    confirmBtn.disabled = !v || !ENTRIES_BY_KEY.has(v) || v === entry.canonical_key;
  });
  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  picker.appendChild(actions);

  card.appendChild(picker);
  input.focus();
}

function commitMerge(key, target, pickerEl) {
  if (!target || !ENTRIES_BY_KEY.has(target) || target === key) {
    alert(`Invalid target: \`${target}\` is not a known canonical_key.`);
    return;
  }
  setEntryState(key, { verdict: "merge", merge_into: target });
  pickerEl.remove();
  // Auto-open notes drawer when committed merge differs from Claude's suggestion.
  // MUST run BEFORE onCommit so the auto-open marker is set before
  // renderCurrentStep reads it. Agreement-with-suggestion does not auto-open.
  const entry = ENTRIES_BY_KEY.get(key);
  const isOverride = entry.parsed.suggested_verdict !== "merge"
    || (entry.parsed.suggested_merge_target && target !== entry.parsed.suggested_merge_target);
  if (isOverride) {
    maybeAutoOpenNotesDrawer(entry, "merge", "override");
  }
  onCommit(key);
}

function ensureCanonicalKeysDatalist() {
  if (document.getElementById("all-canonical-keys")) return;
  const dl = el("datalist", { id: "all-canonical-keys" });
  for (const e of ENTRIES) {
    dl.appendChild(el("option", {
      value: e.canonical_key,
      label: e.parsed.canonical_label || e.canonical_key,
    }));
  }
  document.body.appendChild(dl);
}
```

**Step 2: Build + smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Navigate to a §13 with merge rec but with `suggested_merge_target` populated (e.g., `plant_id`):
- "✓ Agree — Fold into `plant_identification`" commits in one click
- After commit: state has `verdict=merge`, `merge_into=plant_identification`

Navigate to a §13 entry where `suggested_verdict='merge'` but `suggested_merge_target` is null (probe `ENTRIES.filter(e=>e.parsed.suggested_verdict==='merge' && !e.parsed.suggested_merge_target)`):
- "✓ Agree — Fold into another" routes to picker (no shortcut since target is null)
- Type a valid canonical_key (e.g., `seasonality`) → Confirm enables → click → commits

Click "Pick something else ▾" → "Fold into another" → picker opens with high-confidence shortcut if applicable.

**Step 3: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): merge destination picker (§7)

High-confidence shortcut "→ X — Confirm" when suggested_merge_target
is populated; autocomplete fallback over all 208 canonical_keys for
ambiguous / no-target cases. Two-stage commit (verdict=merge writes
only with merge_into) enforced — picker Cancel leaves state untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.12: Notes drawer + auto-surface (§8)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — replace `renderNotesDrawer` + `maybeAutoOpenNotesDrawer`)

**What:** One optional textarea per step, hidden behind `+ Add a note`. Auto-opens on override or new/drop. Cluster-mismatch trigger deferred (Batch 2 M2.2).

**Step 1: Implement drawer**

```javascript
function renderNotesDrawer(entry, forceOpen) {
  const key = entry.canonical_key;
  const cur = getEntryState(key).curriculum_notes || "";
  const open = forceOpen || autoOpenSet.has(key) || cur.length > 0;
  const drawer = el("details", { className: "notes-drawer", open });
  drawer.appendChild(el("summary", {}, cur ? "✎ Note added (click to edit)" : "+ Add a note"));

  const prompt = autoOpenPrompts.get(key);
  if (prompt) {
    drawer.appendChild(el("p", { className: "drawer-prompt" }, prompt));
  }

  const textarea = el("textarea", {
    className: "notes-input",
    placeholder: "Optional. Capture your thinking, especially for ambiguous calls.",
    value: cur,
    oninput: (ev) => onNotesChange(key, "curriculum_notes", ev.target.value),
  });
  drawer.appendChild(textarea);
  return drawer;
}

// UI-only sets (not in state) tracking which entries should have the drawer
// auto-opened on next render.
const autoOpenSet = new Set();
const autoOpenPrompts = new Map();

function maybeAutoOpenNotesDrawer(entry, verdict, trigger) {
  const key = entry.canonical_key;
  let prompt = null;
  if (trigger === "override") {
    prompt = "Worth noting why?";
  } else if (trigger === "new-or-drop") {
    prompt = "Optional rationale for the team.";
  } else if (trigger === "cluster-mismatch") {
    // Batch 2 only
    prompt = "Heads up — this differs from the cluster shape you picked. Worth a quick note?";
  }
  if (prompt) {
    autoOpenSet.add(key);
    autoOpenPrompts.set(key, prompt);
  }
}

function onNotesChange(key, field, value) {
  setEntryState(key, { [field]: value });
  // Note: setEntryState already calls saveState (debounced)
}
```

**Step 2: Build + smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Test cases:
- Navigate to a Confirm step where suggested_verdict = "keep". Click "Pick something else ▾" → "Remove" radio → drawer opens with "Worth noting why?" prompt
- Navigate to a Decide step. Pick "Remove" → drawer opens with "Optional rationale for the team."
- Navigate to a Confirm where you "Agree" with the recommendation → drawer stays closed (no override trigger)
- Type in the drawer textarea → state.entries[key].curriculum_notes updates (probe in console)
- Reload page → drawer is open if curriculum_notes is non-empty; closed otherwise

**Step 3: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): notes drawer with auto-surface (§8)

One drawer per step, hidden behind "+ Add a note". Auto-opens on
override of Claude's recommendation or on new/drop verdict, with
trigger-specific prompt copy. Cluster-mismatch trigger deferred
to Batch 2 (M2.2). Maps to worksheet's curriculum_notes field;
reviewer_note channel stays removed (W5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.13: Linear nav + keyboard shortcuts

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — implement `navStep` / `navDefer` + keydown handler)

**What:** Wire the Previous / Decide later / Save · Next buttons to step navigation. Add keyboard shortcuts per Design §14: K/M/N/D for verdict select (Decide mode), Enter for commit / advance, Left for Previous, L for Decide later.

**Step 1: Implement navigation handlers**

```javascript
function navStep(delta) {
  const newIndex = state.wizard.step_index + delta;
  if (newIndex < 0 || newIndex >= stepSequence.length) {
    // End of sequence: render end screen
    if (newIndex === stepSequence.length) {
      state.wizard.step_index = newIndex;
      saveState();
      renderCurrentStep();
    }
    return;
  }
  state.wizard.step_index = newIndex;
  saveState();
  renderCurrentStep();
}

function navDefer() {
  // Mark current step as deferred in UI-only set; advance without writing entry state.
  const step = currentStep();
  if (!step) return;
  const stepId = step.kind === "entry" ? step.id : step.id;  // both unique
  if (!state.wizard.deferred.includes(stepId)) {
    state.wizard.deferred.push(stepId);
    saveState();
  }
  navStep(+1);
}
```

**Step 2: Replace `nextBtn` click handler with mode-aware logic**

The "Save · Next →" button serves multiple roles:
- **Confirm step, displayed pre-fill present, not yet committed**: act as primary commit (same as "✓ Agree")
- **Confirm step, already committed**: advance to next step
- **Decide step, verdict not yet picked**: disabled (cannot advance until commit)
- **Decide step, verdict picked**: advance to next step
- **Cluster step, no option picked**: disabled
- **Cluster step, option picked**: advance

Update `updateNavButtonState()`:

```javascript
function updateNavButtonState() {
  const step = currentStep();
  document.getElementById("prevBtn").disabled = state.wizard.step_index <= 0;
  if (!step) {
    document.getElementById("nextBtn").disabled = true;
    document.getElementById("deferBtn").disabled = true;
    return;
  }
  if (step.kind === "cluster") {
    const answered = getClusterState(step.id) !== undefined;
    document.getElementById("nextBtn").disabled = !answered;
    document.getElementById("deferBtn").disabled = false;
    return;
  }
  // Entry step
  const filled = entryFilled(step.id);
  const mode = entryMode(step.entry);
  if (mode === "Decide") {
    document.getElementById("nextBtn").disabled = !filled;
  } else {
    // Confirm: Next is always enabled (commits the displayed pre-fill if not yet committed)
    document.getElementById("nextBtn").disabled = false;
  }
  document.getElementById("deferBtn").disabled = false;
}
```

Update nextBtn click handler in `init()`:

```javascript
  document.getElementById("nextBtn").addEventListener("click", () => {
    const step = currentStep();
    if (!step) return;
    if (step.kind === "entry") {
      const mode = entryMode(step.entry);
      if (mode === "Confirm" && !entryFilled(step.id)) {
        // Commit the displayed pre-fill before advancing.
        // Use the same helper as the renderer so render and commit can't drift.
        const prefill = displayedPrefillForEntry(step.entry);
        if (!prefill) { navStep(+1); return; }
        if (prefill.verdict === "merge" && !prefill.merge_into) {
          openMergePicker(step.entry, null);
          return;
        }
        const patch = { verdict: prefill.verdict };
        if (prefill.verdict === "merge") patch.merge_into = prefill.merge_into;
        setEntryState(step.id, patch);
        onCommit(step.id);
      }
    }
    navStep(+1);
  });
```

**Step 3: Keyboard shortcuts**

In `init()`, add:

```javascript
  document.addEventListener("keydown", (ev) => {
    // Don't intercept when typing in inputs/textareas
    const tag = (ev.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || ev.target.isContentEditable) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const step = currentStep();
    if (!step) return;
    switch (ev.key.toLowerCase()) {
      case "arrowleft":
        ev.preventDefault();
        navStep(-1);
        break;
      case "enter":
        ev.preventDefault();
        document.getElementById("nextBtn").click();
        break;
      case "l":
        ev.preventDefault();
        navDefer();
        break;
      case "k":
      case "m":
      case "n":
      case "d":
        if (step.kind === "entry") {
          ev.preventDefault();
          const map = { k: "keep", m: "merge", n: "new", d: "drop" };
          const v = map[ev.key.toLowerCase()];
          if (entryMode(step.entry) === "Confirm") {
            onPickOtherVerdict(step.entry, v);
          } else {
            onDecideVerdict(step.entry, v);
          }
        }
        break;
    }
  });
```

**Step 4: Build + smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Test:
- Click Previous → step decrements; step 0 → button disabled
- Click Save · Next → on a Confirm step, commits displayed pre-fill + advances
- Click Decide later on a Confirm → no state write to entries; advance
- Press K on a Decide step → commits keep
- Press Left arrow → goes back
- Press Enter → equivalent to Next

**Step 5: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): linear nav + keyboard shortcuts

Previous / Decide later / Save · Next wired with mode-aware
button-state. Next on a Confirm step commits the displayed
pre-fill atomically. Keyboard: K/M/N/D verdict select,
Enter for commit/advance, ← for Previous, L for Decide later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.14: Top-bar jump-to-entry + Advanced menu polish

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — implement `onJumpToEntry`)

**What:** Wire the jump-input to navigate by canonical_key/label. Confirm Advanced menu items work in the wizard (import, JSON download, show intro, clear).

**Step 1: Implement jump**

```javascript
function onJumpToEntry(value) {
  if (!value) return;
  // Match by canonical_key first; fall back to label.
  let foundIndex = -1;
  for (let i = 0; i < stepSequence.length; i++) {
    const s = stepSequence[i];
    if (s.kind === "entry" && (s.id === value || s.entry.parsed.canonical_label === value)) {
      foundIndex = i;
      break;
    }
    if (s.kind === "cluster" && s.id === value) {
      foundIndex = i;
      break;
    }
  }
  if (foundIndex < 0) {
    alert(`No entry/cluster found for \`${value}\``);
    return;
  }
  state.wizard.step_index = foundIndex;
  saveState();
  renderCurrentStep();
}
```

**Step 2: Confirm Advanced menu wiring**

Already wired in M1.4. Quick re-verify after build:
- Import a saved markdown → restores per-entry verdicts + cluster signals
- Download JSON → downloads progress JSON
- Show wizard intro → opens the placeholder modal
- Clear all progress → confirms, then resets state

**Step 3: Build + smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Test jump:
- Type `plant_parts` → jumps to that entry's Decide step
- Type `CON-23` → jumps to the cluster Resolve step
- Type junk → alert

Test menu items: each acts correctly.

**Step 4: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): jump-to-entry + advanced menu wired

Top-bar search jumps to any entry by canonical_key or label, or
to a cluster step by CON-id. Advanced menu (import / download
JSON / show intro / clear) re-verified against the wizard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.15: End screen — "Done — Save & Export"

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (JS — implement `renderEndScreen()`)

**What:** When the user advances past the last step (step index === stepSequence.length), render a minimal end screen. Review summary is Batch 2; for Batch 1, just count committed/deferred entries and show a prominent Save & Export button.

**Step 1: Implement end screen**

```javascript
function renderEndScreen() {
  const card = el("article", { className: "wizard-step end-screen" });
  card.appendChild(el("h2", {}, "Done — Save & Export"));

  // Summary line
  let committedEntries = 0, deferredEntries = 0, blankEntries = 0;
  for (const entry of ENTRIES) {
    if (entryFilled(entry.canonical_key)) committedEntries++;
    else if (state.wizard.deferred.includes(entry.canonical_key)) deferredEntries++;
    else blankEntries++;
  }
  const committedClusters = CLUSTER_SIGNALS.filter((s) => getClusterState(s.id) !== undefined).length;

  const summary = el("div", { className: "end-summary" });
  summary.appendChild(el("p", {}, `${committedEntries} of ${ENTRIES.length} entries committed.`));
  if (deferredEntries > 0) summary.appendChild(el("p", {}, `${deferredEntries} marked "Decide later" (export as <to_fill>).`));
  if (blankEntries > 0) summary.appendChild(el("p", {}, `${blankEntries} entries not yet visited (export as <to_fill>).`));
  summary.appendChild(el("p", {}, `${committedClusters} of ${CLUSTER_SIGNALS.length} cluster shapes resolved.`));
  card.appendChild(summary);

  // Primary export button
  const btnRow = el("div", { className: "end-actions" });
  btnRow.appendChild(el("button", {
    type: "button",
    className: "btn primary",
    style: "font-size: 16px; padding: 12px 24px;",
    onclick: onExport,
  }, "Save & Export ↓"));
  btnRow.appendChild(el("button", {
    type: "button",
    className: "btn ghost",
    onclick: () => { state.wizard.step_index = stepSequence.length - 1; saveState(); renderCurrentStep(); },
  }, "← Back to wizard"));
  card.appendChild(btnRow);

  card.appendChild(el("p", { className: "muted", style: "margin-top: 24px;" },
    "Review summary screen with grouped verdicts + mismatch detection lands in Batch 2."));

  return card;
}
```

**Step 2: Update navStep to clamp at stepSequence.length (end-screen index) + hide bottom nav on end screen**

Update `navStep`:

```javascript
function navStep(delta) {
  const newIndex = state.wizard.step_index + delta;
  if (newIndex < 0) return;
  if (newIndex > stepSequence.length) return;
  state.wizard.step_index = newIndex;
  saveState();
  renderCurrentStep();
}
```

Update `renderCurrentStep` to hide the wizard nav when on the end screen (the end screen has its own ← Back / Save & Export buttons; leaving Previous/Decide-later/Next visible would be confusing and risks stale button state from the last real step). Replace the M1.6 body with:

```javascript
function renderCurrentStep() {
  const card = document.getElementById("wizardCard");
  const nav = document.getElementById("wizardNav");
  card.innerHTML = "";
  const step = currentStep();
  if (!step) {
    // End screen: step_index === stepSequence.length
    card.appendChild(renderEndScreen());
    nav.classList.add("hidden");
    return;
  }
  nav.classList.remove("hidden");
  if (step.kind === "entry") {
    const mode = entryMode(step.entry);
    card.appendChild(renderEntryStep(step.entry, mode));
  } else if (step.kind === "cluster") {
    card.appendChild(renderClusterStep(step.signal));
  }
  updateNavButtonState();
}
```

The end screen renders when `state.wizard.step_index === stepSequence.length` (one past the last step). The "← Back to wizard" button in the end screen sets `step_index = stepSequence.length - 1` which unhides the bottom nav on the next render.

**Step 3: Build + smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Test:
- Navigate to last step (e.g., set `state.wizard.step_index = stepSequence.length - 1` via console; reload)
- Click Save · Next → end screen renders with counts
- Click Save & Export ↓ → downloads markdown
- Click ← Back to wizard → returns to step 213

**Step 4: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): simple end-screen + Save & Export

After step 213 (last cluster or entry), end screen shows committed
/ deferred / blank counts and the prominent Save & Export button.
Full review summary with grouped verdicts + mismatch detection
lands in Batch 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.16: CSS polish + visual pass

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` (CSS in `<style>` block)

**What:** Tighten the CSS now that all renderers exist. Focus on: mode-chip colors, tier-strip backgrounds, primary action button prominence, picker/drawer overlays, end-screen layout, mobile/tablet behavior. Visual milestone — no logic changes.

**Step 1: Iterate CSS**

Specific items to confirm visually:
- Card max-width 720 px, centered, ~24 px padding
- Mode chip: `Confirm` = muted gray-blue; `Resolve` = amber; `Decide` = red-orange
- Tier strip: `§11` red-orange tint; `§12` amber tint; `§13` muted green tint
- Primary action button: prominent, full-width inside card, visible verdict label
- Pick-other expand: muted, low contrast
- Notes drawer: light shaded background when open, "Note added" indicator when filled
- End screen: centered card, large Save & Export
- Top bar: counters with visual hierarchy (decide bigger than confirm)

**Step 2: Build + visual smoke via chrome-devtools-mcp screenshot**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Open multiple steps via the wizard and take screenshots; share with user for sign-off.

**Step 3: Commit**

```bash
git add scripts/concepts-worksheet-tool.template.html
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): CSS polish for wizard layout

Mode-chip colors, tier-strip backgrounds, primary action prominence,
notes-drawer visual states, end-screen centering. No logic changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 1.17: Batch 1 smoke check gate

**Files:**
- Modify: `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md` (record smoke check results)

**What:** Run the full smoke check matrix from Design §15 (#1–5, #8). All must pass before Batch 1 is declared shipped.

**Step 1: Smoke #1 — Empty-export SHA invariant**

1. `python3 scripts/build-concepts-tool.py --build-html`
2. `shasum -a 256 docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` — record SHA-A
3. Open the built HTML in a private browser window (no prior localStorage)
4. Click `Save & Export ↓` from the Advanced menu or end screen — but **without committing any step**
5. `shasum -a 256 ~/Downloads/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` — record SHA-B
6. **Expected: SHA-A === SHA-B.** If not, debug (likely a stray `lineEdits.set` call somewhere).

**Step 2: Smoke #2 — Decide-later semantics**

1. Open a Confirm step (e.g., navigate to `plant_id`)
2. Click "Decide later" → advance
3. Probe console: `JSON.stringify(state.entries['plant_id'])` → should be `undefined` or empty `{}`
4. Probe: `state.wizard.deferred` includes `plant_id`
5. `Save & Export` → exported `- verdict:` line for `plant_id` is the original `<to_fill>` (or whatever the source had)

**Step 3: Smoke #3 — Pre-fill non-commit**

1. Open a §13 Confirm step
2. Note the pre-fill displayed (e.g., "✓ Agree — Fold into `X`")
3. Click "← Previous" (no commit)
4. Probe console: `state.entries[<key>]` → undefined
5. `Save & Export` → that entry's verdict line is `<to_fill>`

**Step 4: Smoke #4 — Commit roundtrip**

1. Commit 5 entries (3 Confirms via "Agree", 2 Decides via radio + commit)
2. `Save & Export` → save to `/tmp/round1.md`
3. Clear all progress
4. Use Import → import `/tmp/round1.md`
5. Verify all 5 entries' state restored (probe `state.entries`)
6. `Save & Export` again → save to `/tmp/round2.md`
7. `diff /tmp/round1.md /tmp/round2.md` → no differences (byte-identical roundtrip)

**Step 5: Smoke #5 — Merge picker high-confidence shortcut**

1. Navigate to a Confirm step with `suggested_merge_target` populated (e.g., `plant_id` → `plant_identification`)
2. Click `✓ Agree — Fold into \`plant_identification\`` (or press Enter)
3. State writes verdict + merge_into atomically — probe: `state.entries['plant_id']` has both fields
4. Mode chip flips to "Saved" caption

Now a low-confidence case:
1. Navigate to a Confirm where suggested_verdict=merge but suggested_merge_target is null
2. Click "Save · Next →" → picker opens (no shortcut button)
3. Type a non-canonical key (e.g., "asdfasdf") → Confirm stays disabled
4. Type a valid canonical_key → Confirm enables → click → commits

**Step 6: Smoke #8 — Merge-target extraction rate**

Already verified in M1.3. Re-run and capture the line for the status doc:

```bash
python3 scripts/build-concepts-tool.py --verify-only 2>&1 | grep "merge-target"
```

Expected: `merge-target extraction: 53 of 78 merge recommendations (68%) — 25 fall through to picker` (modulo ±2).

**Step 7: Update status doc + commit**

In `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md`, fill in the smoke check matrix:

```markdown
| # | Check | M1.17 result |
|---|---|---|
| 1 | Empty-export SHA invariant | ✅ PASS — SHA `<copy here>` |
| 2 | Decide-later semantics | ✅ PASS |
| 3 | Pre-fill non-commit | ✅ PASS |
| 4 | Commit roundtrip | ✅ PASS — diff empty |
| 5 | Merge picker high-confidence shortcut | ✅ PASS |
| 8 | Merge-target extraction rate | ✅ PASS — 53/78 (68%) |
| 6 | Cluster Resolve + member walk (Batch 2) | DEFERRED |
| 7 | Mismatch flag (Batch 2) | DEFERRED |
```

Update "Current state" section to mark Batch 1 SHIPPED.

```bash
git add docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
docs(concepts-worksheet): Batch 1 smoke checks PASS — wizard MVP shipped

All 6 Batch-1-relevant checks from design §15 pass:
empty-export hash invariant, Decide-later semantics, pre-fill
non-commit, commit roundtrip, merge picker high-confidence
shortcut, merge-target extraction rate (53/78, 68%).

Cluster Resolve + member walk (#6) and Mismatch flag (#7)
deferred to Batch 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Batch 2 — Hand-holdy polish (later session)

Outlined at lower fidelity; detailed task breakdown happens at Batch 2 session start.

### Milestone 2.1: Cluster auto-prefill matrix (§17)

Implement `clusterPrefillCandidate(entry)` to return `{verdict, merge_into?, from}` based on the resolved cluster Resolve answer per the matrix in design §17 (all 5 clusters: CON-12, CON-16, CON-22, CON-23, CON-24). §11 members get the suggestion shown as text but never as a radio pre-fill (per W17).

Files: `scripts/concepts-worksheet-tool.template.html` (JS — replace the stub from M1.5).

### Milestone 2.2: Cluster-mismatch detection

When a committed per-entry verdict diverges from the cluster-derivation, set `state.entries[key].cluster_mismatch = "CON-XX"` and trigger the notes drawer auto-open with the "Heads up …" prompt. Surface in review summary under "Differs from cluster decision."

Files: `scripts/concepts-worksheet-tool.template.html` (JS — extend onCommit + render the mismatch indicator on entry steps).

### Milestone 2.3: Review summary screen (§11)

Replace the simple end screen with the grouped Review summary: KEEP / FOLD / NEW / REMOVE buckets, cluster choices, decide-later list, mismatch highlights, edit/resume links. "Review so far" button in top bar opens this screen mid-flow.

Files: `scripts/concepts-worksheet-tool.template.html` (JS — replace `renderEndScreen()` + add `renderReviewSummary()`).

### Milestone 2.4: Wizard intro rewrite

3-step intro modal: "What you're doing" → "Three work types" → "Save your work". Replaces the M1.4 stub modal.

Files: `scripts/concepts-worksheet-tool.template.html` (HTML+JS — replace `#onboardingModal` body).

### Milestone 2.5: Decision-debt counter polish

Recompute on mismatch flag changes; visually surface deferred count in summary; consider showing decide-now-debt and confirm-now-debt with different visual weight.

Files: `scripts/concepts-worksheet-tool.template.html` (JS — extend updateDecisionDebt).

### Milestone 2.6: Full smoke check pass (8/8)

Run all 8 smoke checks from design §15. Cluster Resolve + member walk (#6) and Mismatch flag (#7) now pass.

### Milestone 2.7: README + curriculum-team handoff doc update

If `docs/plans/concepts-worksheet-form/README.md` exists (it does per the file map), update it with the wizard's keyboard shortcuts, the Confirm/Resolve/Decide framing, and the review summary's escape-hatch role. Make sure the "double-click HTML file" delivery contract still holds.

Files: `docs/plans/concepts-worksheet-form/README.md`.

---

## Execution notes

- **No TodoWrite / Beads tracking** (kickoff rule + memory). This plan document is the task list; milestones are checked via commits + status doc updates.
- **Browser smoke after each milestone** via chrome-devtools-mcp where possible. The prior session used it successfully.
- **User reviews each milestone before commit** unless they explicitly waive review for a milestone.
- **Hard rule: don't push to `main`**. Branch stays on `tools/concepts-worksheet-form`. No PR without explicit direction.
- **Don't reopen W1–W21**. If any decision feels wrong during implementation, surface it to the user as a concern — don't unilaterally revise.

## Execution handoff

**Plan complete and saved to `docs/plans/2026-05-15-concepts-worksheet-wizard-plan.md`.** Once user signs off, Batch 1 executes in this session, incrementally (M1.0 → M1.17), with rebuild + browser smoke after each milestone.
