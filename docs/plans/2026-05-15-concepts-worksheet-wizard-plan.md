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

### What the user reviews between Batch 1 milestones

- Batch 1 milestones M1.1–M1.3 (parser): I rebuild, run `--verify-only`, show the new fields in a payload sample, get a thumbs-up before committing.
- Batch 1 milestones M1.4–M1.16 (JS/template): I rebuild + open in browser via chrome-devtools-mcp, run the relevant smoke checks, show screenshots/state probes, get a thumbs-up before committing.
- Batch 1 milestone M1.17 (full smoke gate): All 6 Batch-1-relevant smoke checks (§15 #1–5, #8) pass before declaring Batch 1 done.

(Batch 2's equivalent subsection lives further down, just above the M2.1 milestone heading.)

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

## Batch 2 — Hand-holdy polish

Batch 1 SHIPPED 2026-05-15 (M1.0 → M1.17, smoke gate PASS, commit `5630a69` + cleanup `16a3b7f`). Batch 2 adds the cluster→member auto-prefill chain (W21), cluster-mismatch detection, the review summary screen (design §11), wizard intro rewrite, and the full 8/8 smoke gate. Each milestone leaves the tool **building, exporting, and reloadable** at every commit (data-safety floor unchanged from Batch 1).

> **Applies to every Batch 2 milestone below.** All template line numbers cited are post-M1.17 references and **drift as earlier milestones add code** — always `grep -n` for the function name or a nearby anchor string before editing; never trust a cited line number blind. (Stated once here so each milestone doesn't repeat it; M2.1's per-step `grep -n` commands model the pattern.)

> **Plain-language convention (design §4.1 / W22) — applies to every Batch 2 milestone that emits new reviewer-visible text.** M2.0 sweeps the existing Batch-1 strings to plain, curriculum-team language; from there, any new on-screen text — M2.1's cluster-prefill caption, M2.2's mismatch reason + callout, M2.3's review-summary labels, M2.4's intro, M2.5's counters, M2.7's README — must be **born plain**: no `§`-codes, `CON-xx` ids, "tier," "verdict," "metadata," "cluster," internal mode names, or `<to_fill>` shown to the reviewer. The export/markdown format is exempt and unchanged (it's the locked pipeline contract; the empty-export SHA invariant guards it). **Note:** the M2.1–M2.3 code blocks below were drafted before M2.0 and still show some pre-M0 strings (old mode/counter labels, "cluster shape," "CLUSTER CHOICES," `CON-xx` in user-facing rows) — replace them per each milestone's own plain-language note when you execute it. M2.1's caption probes and M2.5's counter code + probes are already reconciled.

### Files touched in Batch 2

| Path | Tracked? | Role |
|---|---|---|
| `scripts/concepts-worksheet-tool.template.html` | yes | All JS+CSS additions for M2.0–M2.6 land here |
| `docs/plans/concepts-worksheet-form/README.md` | yes | M2.7 — curriculum-team handoff text update |
| `docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html` | **no, generated — NEVER `git add`** | Built artifact (~1 MB); rebuild via `--build-html`; do not commit |
| `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md` | yes | Status doc — Batch 2 session log continues |
| `docs/plans/2026-05-15-concepts-worksheet-wizard-batch2-execution-kickoff.md` | yes | Durable per-milestone kickoff for Batch 2 (scaffolded after plan finalization) |

The parser (`scripts/build-concepts-tool.py`) is **untouched** in Batch 2 — all changes are wizard UI + curriculum-team docs. No new `claude_notes_summary`/`suggested_merge_target` fields, no `--verify-only` output changes; the existing `Parsed 208 entries (§11=32, §12=39, §13=137).` + `merge-target extraction: 53 of 78 …` lines remain the contract.

### Existing code worth reusing (post-M1.17 surface)

All line numbers are against the post-M1.17 template (`scripts/concepts-worksheet-tool.template.html`, after `5630a69` + `16a3b7f`; verify with `grep -n` before each edit — line numbers will drift as Batch 2 milestones add code).

**State helpers (extend, don't replace):**
- `setEntryState(key, patch)` at line 1051 — already merges patches; M2.2 will pass `{cluster_mismatch: "CON-XX"}` or `{cluster_mismatch: null}` through it
- `getClusterState(id)` / `setClusterState(id, optionIndex)` at lines 1057-1069 — kept as-is. M2.1b adds a **parallel** `state.cluster_parents` map with new helpers `getClusterParent(id)` / `setClusterParent(id, parent)` so the existing `cluster_signals[id] = optionIndex` shape doesn't churn
- `loadState()` at line 1059-area — already handles wizard-state migration from M1.6; M2.1b adds a one-liner default for `cluster_parents`

**Render helpers (extend or wire):**
- `clusterPrefillCandidate(entry)` at line 1188 — currently returns `null` (Batch 1 stub). **M2.1 replaces the body** with the matrix dispatch
- `displayedPrefillForEntry(entry)` at line 1201 — already has the cluster branch wired (lines 1211-1218); becomes hot path the moment M2.1's `clusterPrefillCandidate` returns non-null
- `renderConfirmStep(entry)` at line 1231 — displays `captionSource` (plain per M2.0) via `renderClaudeRecommendation`'s hardcoded `💡` headline; **no change required for M2.1**
- `renderDecideStep(entry)` at line 1259 — **M2.1 swap** of the inline `${REVIEWER_LABELS[v] || v}${targetSuffix}` (line 1298) → `reviewerLabelWithTarget(v, t)` (carry-over P2 fix from Session 16 review). Also gains an §11-cluster-member info caption branch when `clusterPrefillCandidate(entry)` is non-null
- `renderClusterStep(signal)` at line 2167 — **M2.1b extends** with the CON-24 option-3 inline-reveal sub-section
- `renderEndScreen()` at line 2257 — **M2.3 replaces** with a thin wrapper that dispatches to `renderReviewSummary()`; M2.3 also adds the `#review-so-far` button wiring in the top bar
- `maybeAutoOpenNotesDrawer(entry, verdict, trigger)` at line 1620 — already has the `"cluster-mismatch"` case dispatched (lines 1627-1629); **M2.2 wires the caller**

**Commit helpers (extend on M2.2):**
- `onCommit(entry)` (used by `renderPrimaryAgreeAction`, `onPickOtherVerdict`, `onDecideVerdict`, `commitMerge`) — M2.2 adds `recomputeMismatchForEntry(entry)` after every state write
- `setClusterState(id, optionIndex)` — M2.2 adds `recomputeMismatchForCluster(id)` because a Resolve answer change can flip mismatch flags for ALL members of that signal

**Decision-debt counters (extend, don't replace):**
- `updateDecisionDebt()` at line 2340 — already fires from every state-changing path; **M2.5 polish** is purely CSS (zero-state color via `data-zero` attribute) + a one-line read of `cluster_mismatch` if we ever surface the count (we won't — design §10/§441 keeps mismatch out of the top bar; see M2.5 spec)

**Helpers used by review summary:**
- `jumpToStepByEntryKey(key)` at line 2246 — already wires the entry→step lookup; **M2.3 reuses** for the [edit] / [resume] links
- `el()`, `escapeHtml()`, `renderInlineMarkdown()` — keep
- `REVIEWER_LABELS` at line 961, `reviewerLabelWithTarget` at line 968 — keep, **M2.1's P2 fix** wires `reviewerLabelWithTarget` into the Decide-mode render path

### Working tool constraint (Batch 2)

Identical to Batch 1: every commit leaves `--verify-only` exiting 0, `--build-html` producing a valid artifact, and `Save & Export` writing a valid markdown file. The cluster-prefill matrix is additive (Batch 1 reviewers see no behavior change because `state.cluster_signals` is empty until they answer a Resolve step); the mismatch detection runs as a no-op when no cluster is resolved. M2.3's review summary replaces the M1.15 simple end screen — the [← Back to wizard] button + [Save & Export ↓] button continue to work, so the data-safety floor holds.

### What the user reviews between Batch 2 milestones

- **M2.0** (plain-language pass): I rebuild, screenshot the Quick-check / Your-call / Group-decision / end-screen states, run the no-jargon `innerText` probe (no §-codes / `CON-` ids / `<to_fill>` / tier names visible; chips + counters read plain), and confirm the empty-export SHA is byte-identical to M1.17. Thumbs-up before commit.
- **M2.1** (matrix + carry-over): I rebuild, walk 3-4 cluster-member entries in browser via chrome-devtools-mcp showing the "based on your earlier group decision" caption + radio prefill, demonstrate the renderDecideStep label fix on a synthetic Decide+target case, get thumbs-up before commit.
- **M2.1b** (CON-24 inline reveal): I rebuild, exercise the CON-24 Resolve step picking option 3 → parent picker reveals → commit → walk to a sub-type member → confirm the suggestion text, thumbs-up.
- **M2.2** (mismatch detection + callout): I rebuild, exercise: (a) commit a member verdict that disagrees with a resolved cluster → yellow callout renders + notes drawer auto-opens + state has `cluster_mismatch:"CON-XX"`; (b) change the Resolve answer → mismatch flag flips on affected members; (c) commit matching verdict → flag clears. Thumbs-up.
- **M2.3** (review summary): I rebuild, walk: end-of-wizard summary renders all 7 sections; [edit] link jumps back + closes summary; [← Back to wizard] returns; mid-flow "Review so far" button opens summary; Save & Export from summary still writes a valid markdown. Thumbs-up.
- **M2.4** (intro rewrite): I rebuild, walk the 3-step intro flow (Next/Back/Skip), confirm the modal closes cleanly and the "Show wizard intro" Advanced menu re-opens it. Thumbs-up.
- **M2.5** (counter polish): I rebuild, drive counters to zero and confirm the zero-state color shift; confirm via probe that the mismatch recompute does **not** feed the top-bar counter (mismatch stays out of the top bar per design §10/§441).
- **M2.6** (smoke gate): I run all 8 design §15 smoke checks end-to-end, including the new #6 (cluster Resolve + member walk) and #7 (mismatch flag). All 8 must pass before declaring Batch 2 done.
- **M2.7** (README): I edit `docs/plans/concepts-worksheet-form/README.md` and walk the user through the rewritten "How to use" section.

### Suggested sequence & dependencies

Default order is linear — **M2.0 → M2.1 → M2.1b → M2.2 → M2.3 → M2.5 → M2.6 → M2.7** — because most milestones' verification leans on the prior one's code: **M2.0 (plain-language pass) goes first so every later milestone inherits the plain vocabulary** (M2.1's cluster caption is then born plain, not jargon-then-refixed); M2.2's mismatch detection needs M2.1's cluster prefills; M2.3's review summary surfaces M2.2's mismatch flags; M2.6 gates on everything. Those data-flow couplings are the only *binding* constraints. Two milestones are order-independent:

- **M2.4** (intro-modal rewrite) touches only onboarding copy + the modal — nothing depends on it and it depends on nothing. Ship it whenever convenient (a good low-risk "warm-up" or filler milestone).
- **M2.7** (README) needs the UI behaviorally stable but no specific milestone — do it last, or any time after M2.3.

The numbering is sequence-suggestive, not a hard chain beyond the couplings above.

---

### Milestone 2.0: Plain-language UI pass (curriculum-team voice)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` — add a `MODE_CHIP_LABELS` map (~near line 961); swap mode-chip display text in `renderStepHead` (~line 1372) and `renderClusterStep` (~line 2176); relabel the three top-bar counters (~lines 891-893); rewrite the three `renderTierStrip` strings (~lines 1386-1388); plain-ify the Decide legend (~line 1318); plain-ify the `renderWhyAttention` reasons (~lines 1350/1356/1358); drop the raw `CON-xx` id + relabel "members" in `renderClusterStep` (~lines 2180-2181, 2207); soften the theme-overlap callout (~line 1278); plain-ify the end-screen summary (~lines 2272-2274).

**What this milestone does:**

Sweeps every reviewer-visible string in the shipped Batch-1 UI to plain, curriculum-team language per design §4.1 / W22. **Display-only**: no routing, state, CSS class, `dataset.mode`, or export/markdown change; parser untouched. Run **first** in Batch 2 so M2.1+ inherit the plain vocabulary (M2.1's cluster-prefill caption is then born plain — see M2.1 Step 4). Line numbers below are post-M1.17 references — **`grep -n` each anchor before editing** (per the Batch 2 convention note above).

**Step 1: Add the mode-chip label map.** Near `REVIEWER_LABELS` (grep `const REVIEWER_LABELS`):
```js
// Plain task labels shown on the mode chip (W22). Internal mode names
// (Confirm/Decide/Resolve) stay in routing, CSS classes, and dataset.mode.
const MODE_CHIP_LABELS = {
  Confirm: "Quick check",
  Decide: "Your call",
  Resolve: "Group decision",
};
```

**Step 2: Swap the mode-chip display text.** `renderStepHead` (grep `mode-chip mode-`):
```js
  head.appendChild(el("span", { className: `mode-chip mode-${mode.toLowerCase()}` }, mode));
```
→
```js
  head.appendChild(el("span", { className: `mode-chip mode-${mode.toLowerCase()}` }, MODE_CHIP_LABELS[mode] || mode));
```
`renderClusterStep` (grep `mode-chip mode-resolve`):
```js
  head.appendChild(el("span", { className: "mode-chip mode-resolve" }, "Resolve"));
```
→
```js
  head.appendChild(el("span", { className: "mode-chip mode-resolve" }, MODE_CHIP_LABELS.Resolve));
```

**Step 3: Relabel the top-bar counters** (grep `debtDecideCount`). Change only the trailing text after each `</b>`:
```html
<span class="debt-decide"><b id="debtDecideCount">0</b> to decide</span>
<span class="debt-confirm"><b id="debtConfirmCount">0</b> to confirm</span>
<span class="debt-resolve"><b id="debtResolveCount">0</b> cluster shapes</span>
```
→
```html
<span class="debt-decide"><b id="debtDecideCount">0</b> your call</span>
<span class="debt-confirm"><b id="debtConfirmCount">0</b> to check</span>
<span class="debt-resolve"><b id="debtResolveCount">0</b> group decisions</span>
```

**Step 4: Rewrite the tier-strip guidance** in `renderTierStrip` (grep `High-impact: review carefully`):
```js
  if (tier === "11") strip.textContent = "§11 High-impact: review carefully.";
  else if (tier === "12") strip.textContent = "§12 Mid-tier: confirm or adjust.";
  else strip.textContent = "§13 Long-tail: quick pass; pause when unsure.";
```
→
```js
  if (tier === "11") strip.textContent = "Worth a careful look.";
  else if (tier === "12") strip.textContent = "A quick confirm or adjust.";
  else strip.textContent = "Quick pass — pause if something seems off.";
```

**Step 5: Plain-ify the Decide legend** (grep `no default`):
```js
    "Your call (no default", entry.tier === "11" ? " — high-impact tier" : "", "):"
```
→
```js
    "Your call — there's no suggested answer here:"
```

**Step 6: Plain-ify the `renderWhyAttention` reasons** (grep `themes worksheet`):
```js
    reason = "Theme overlap with themes worksheet.";
```
→ `reason = "Also shows up as a theme — double-check it belongs here as a concept.";`
```js
    reason = "§11 High-impact concept.";
```
→ `reason = "A foundational concept — worth a careful look.";`
```js
    reason = "No confident recommendation.";
```
→ `reason = "No suggested answer — your judgment needed.";`

> Leave the `"(Cluster reason — Batch 2.)"` placeholder (~line 1354) alone — it's unreachable until M2.1 and **M2.2 replaces it** (and must write it plain per the convention).

**Step 7: De-jargon the group (Resolve) step** in `renderClusterStep`. Header key-row (grep `el("code", {}, signal.id)`):
```js
  head.appendChild(el("div", { className: "step-key-row" },
    el("code", {}, signal.id),
    el("span", { className: "step-meta" }, `${signal.members.length} members`),
  ));
```
→ (drop the raw id; relabel members)
```js
  head.appendChild(el("div", { className: "step-key-row" },
    el("span", { className: "step-meta" }, `${signal.members.length} concepts in this group`),
  ));
```
Members block heading (grep `Members (`):
```js
  membersBlock.appendChild(el("h3", {}, `Members (${signal.members.length})`));
```
→ `membersBlock.appendChild(el("h3", {}, \`Concepts in this group (${signal.members.length})\`));`

Verify each `signal.label` reads as a plain group name (it's verbatim worksheet text); if any embeds a code or the word "cluster," flag it — labels are data, not template strings, so a label fix would be a worksheet edit, not a code edit.

**Step 8: Soften the theme-overlap callout** (grep `⚠ Theme overlap`):
```js
    cb.innerHTML = `<strong>⚠ Theme overlap.</strong> ${renderInlineMarkdown(entry.parsed.theme_overlap.note)}`;
```
→
```js
    cb.innerHTML = `<strong>⚠ Also appears as a theme.</strong> ${renderInlineMarkdown(entry.parsed.theme_overlap.note)}`;
```

**Step 9: Plain-ify the end-screen summary** (grep `export as <to_fill>`):
```js
  if (deferredEntries > 0) summary.appendChild(el("p", {}, `${deferredEntries} marked "Decide later" (export as <to_fill>).`));
  if (blankEntries > 0) summary.appendChild(el("p", {}, `${blankEntries} entries not yet visited (export as <to_fill>).`));
  summary.appendChild(el("p", {}, `${committedClusters} of ${CLUSTER_SIGNALS.length} cluster shapes resolved.`));
```
→
```js
  if (deferredEntries > 0) summary.appendChild(el("p", {}, `${deferredEntries} marked "Decide later" (left blank for now).`));
  if (blankEntries > 0) summary.appendChild(el("p", {}, `${blankEntries} not yet reviewed (left blank for now).`));
  summary.appendChild(el("p", {}, `${committedClusters} of ${CLUSTER_SIGNALS.length} group decisions made.`));
```
> **Do NOT touch the export `<to_fill>` token itself** (parser / `buildExportMarkdown`, grep `"<to_fill>"` ~lines 1139/1696/1840). That token is the locked pipeline contract; only its *on-screen mention* changes here. M2.3 later replaces this end screen with the review summary — it must carry these plain strings forward.

**Step 10: Build.**
```bash
python3 scripts/build-concepts-tool.py --verify-only
python3 scripts/build-concepts-tool.py --build-html
```
Expected stderr unchanged: `Parsed 208 entries (§11=32, §12=39, §13=137).` + `merge-target extraction: 53 of 78 …`.

**Step 11: Browser smoke via chrome-devtools-mcp.**
- **Empty-export SHA invariant (THE acceptance test):** `buildExportMarkdown()` SHA-256 === `0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03` (unchanged from M1.17). Proves the pass was display-only. If it changed, a string edit leaked into the export path — revert and find it.
- **No-jargon sweep:** walk a Quick-check step, a Your-call step, a Group-decision step, and the end screen. Check the **chrome elements only** — NOT `document.body.innerText`, because a concept's `claude_notes` body may legitimately mention a section number or the words "high-impact," which would false-positive. Assert: `.mode-chip` textContent ∈ {"Quick check","Your call","Group decision"}; the `.tier-strip` text contains no `§`/"High-impact"/"Mid-tier"/"Long-tail"; the `.debt-decide`/`.debt-confirm`/`.debt-resolve` spans read "N your call" / "N to check" / "N group decisions"; the Group-decision step header shows the plain group label with **no `CON-` code**; the end-screen summary contains no `<to_fill>` or "cluster shape"; and the theme-overlap callout (if shown) reads "Also appears as a theme."
- **Zero console errors.**

**Step 12: Status doc + commit.** Update status doc (Last milestone → M2.0; Next → M2.1; append Session log with the SHA + no-jargon probe results; matrix unchanged). Then:
```bash
git add scripts/concepts-worksheet-tool.template.html docs/plans/2026-05-15-concepts-worksheet-wizard-plan.md docs/plans/2026-05-15-concepts-worksheet-wizard-design.md docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): plain-language UI pass (curriculum-team voice)

M2.0 (Batch 2). Display-only — routing/state/export format unchanged.

- Mode chips → Quick check / Your call / Group decision (MODE_CHIP_LABELS)
- Top-bar counters, tier strips, Decide legend, why-attention reasons
- Drop raw CON-xx ids from the Resolve step; "members" → "concepts in this group"
- Soften theme-overlap callout; plain end-screen summary
- Export <to_fill> token + keep/merge/new/drop vocab untouched
  (empty-export SHA invariant 0c49a7a7… verified byte-identical)

Implements design §4.1 / W22.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 2.1: Cluster auto-prefill matrix (§17) + carry-over P2 fix

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` — replace `clusterPrefillCandidate(entry)` body (~line 1188); add `CLUSTER_DERIVATIONS` constant + helper `computeMemberDerivation(signalId, optionIndex, memberKey)`; swap merge-label builder in `renderDecideStep` (~line 1298); add §11-cluster-member info caption branch in `renderDecideStep`.

**What this milestone does:**

1. **Wires the design §17 matrix** as a pure-data structure (`CLUSTER_DERIVATIONS`) keyed by cluster signal ID. Each cluster option maps to a `(memberKey) → derivation` lookup. Three derivation shapes:
   - **Actionable prefill:** `{ verdict, merge_into? }` — flows through `displayedPrefillForEntry` as a "Based on your earlier group decision" caption + radio prefill (W21).
   - **Info-only caption:** `{ info_only: true, caption_text }` — surfaces a small notice on the entry step but doesn't pre-fill any radio. Used by CON-16 option 2 (heritage reframe) and CON-24 option 3 pre-parent-pick.
   - **No derivation:** absent from the table — entry walks with its own AI prefill (or none).
2. **Carry-over P2 fix from Session 16:** `renderDecideStep`'s Claude-recommendation merge-label inline `${REVIEWER_LABELS[v] || v}${targetSuffix}` produces "Fold into another `target`" copy when a target is named — design §6.1 wants "Fold into `target`" (no "another") when target is known. The Confirm-step renderer already uses `reviewerLabelWithTarget(v, t)` correctly (line 1395 / 1424). This milestone swaps the Decide path to match. Dormant in Batch 1 (no Decide-mode entry has `suggested_merge_target`); becomes hot the moment M2.1's matrix feeds `{verdict:"merge", merge_into:"writing"}` to a CON-12 sub-type that's Decide-routed.
3. **W17 enforcement:** §11 entries stay Decide regardless of cluster prefill source. The matrix produces the prefill, but `entryMode()` (line 1180-area, unchanged) keeps tier-11 → Decide. `renderDecideStep` reads `displayedPrefillForEntry` and surfaces a "Based on your earlier group decision: …" caption block above the blank radios. No radio pre-selection.

**Step 1: Read current state of relevant code blocks**

```bash
grep -n "function clusterPrefillCandidate\|function displayedPrefillForEntry\|function renderConfirmStep\|function renderDecideStep\|REVIEWER_LABELS\[v\] || v" scripts/concepts-worksheet-tool.template.html
```

Expected output (line numbers approximate):

```
961:const REVIEWER_LABELS = {
1188:function clusterPrefillCandidate(entry) {
1201:function displayedPrefillForEntry(entry) {
1231:function renderConfirmStep(entry) {
1259:function renderDecideStep(entry) {
1298:      document.createTextNode(`${REVIEWER_LABELS[v] || v}${targetSuffix}`),
```

The grep is a sanity check that the post-M1.17 surface matches what this plan assumes. If line numbers drift by more than ±10, stop and re-anchor before editing.

**Step 2: Add `CLUSTER_DERIVATIONS` constant + `computeMemberDerivation` helper**

Insert immediately above `function clusterPrefillCandidate(entry) {` (so the table is visually adjacent to the function that reads it). The table is the verbatim encoding of design §17.

```js
// ---------- Cluster auto-prefill matrix (design §17 / W20) ----------
//
// Per-cluster, per-option mapping from a resolved Resolve answer to its
// derived member prefills. Three shapes:
//   { verdict: "keep"|"merge"|"drop"|"new", merge_into?: <canonical_key> }
//       → actionable prefill; W21 routes through displayedPrefillForEntry
//   { info_only: true, caption_text: "..." }
//       → caption-only notice on the entry step; no radio prefill
//   (absent)
//       → no derivation; member walks with its own AI prefill (or none)
//
// §11 members never receive a radio prefill (W17). The caption surfaces
// in Decide mode regardless of derivation shape.
const CLUSTER_DERIVATIONS = {
  // CON-12 — Writing-cluster canonical shape
  // Members: writing, narrative_writing, opinion_writing, descriptive_writing,
  //          how_to_writing, recipe_writing, informational_writing
  "CON-12": {
    // 0: Keep `writing` 8 as catch-all + sub-types stay canonical — no prefill
    0: {},
    // 1: Drop `writing` 8 + sub-types are the only canonicals
    1: {
      writing: { verdict: "drop" },
    },
    // 2: Merge sub-types into `writing` 8 catch-all
    2: {
      writing: { verdict: "keep" },
      narrative_writing: { verdict: "merge", merge_into: "writing" },
      opinion_writing: { verdict: "merge", merge_into: "writing" },
      descriptive_writing: { verdict: "merge", merge_into: "writing" },
      how_to_writing: { verdict: "merge", merge_into: "writing" },
      recipe_writing: { verdict: "merge", merge_into: "writing" },
      informational_writing: { verdict: "merge", merge_into: "writing" },
    },
  },
  // CON-16 — Indigenous cross-field overlap
  // Members: indigenous_knowledge, indigenous_stories, native_american_history
  "CON-16": {
    0: {}, // Keep concepts-side as separate singleton canonicals — no prefill
    // 1: Reframe under heritage cluster — cross-field, no prefill but caption
    1: {
      indigenous_knowledge: {
        info_only: true,
        caption_text: "CON-16: cross-field reframe under heritage; verdict here pending heritage-side outcome.",
      },
      indigenous_stories: {
        info_only: true,
        caption_text: "CON-16: cross-field reframe under heritage; verdict here pending heritage-side outcome.",
      },
      native_american_history: {
        info_only: true,
        caption_text: "CON-16: cross-field reframe under heritage; verdict here pending heritage-side outcome.",
      },
    },
    // 2: Drop concepts-side and rely on heritage-side tagging
    2: {
      indigenous_knowledge: { verdict: "drop" },
      indigenous_stories: { verdict: "drop" },
      native_american_history: { verdict: "drop" },
    },
  },
  // CON-22 — Reading-cluster boundary
  // Members: reading, reading_comprehension, narrative_reading, biography_reading,
  //          informational_text, biography
  "CON-22": {
    0: {}, // Keep all 6 as distinct canonicals
    // 1: Merge specific reading sub-types into `reading`
    1: {
      reading: { verdict: "keep" },
      reading_comprehension: { verdict: "merge", merge_into: "reading" },
      narrative_reading: { verdict: "merge", merge_into: "reading" },
      biography_reading: { verdict: "merge", merge_into: "reading" },
      informational_text: { verdict: "merge", merge_into: "reading" },
      biography: { verdict: "merge", merge_into: "reading" },
    },
    // 2: Drop generic `reading` and keep specific sub-types
    2: {
      reading: { verdict: "drop" },
    },
  },
  // CON-23 — Measurement-cluster boundary
  // Members: measurement, volume, area, weight, perimeter
  "CON-23": {
    0: {}, // Keep parent + 4 specifics as canonicals
    // 1: Merge specific sub-types into `measurement` parent
    1: {
      measurement: { verdict: "keep" },
      volume: { verdict: "merge", merge_into: "measurement" },
      area: { verdict: "merge", merge_into: "measurement" },
      weight: { verdict: "merge", merge_into: "measurement" },
      perimeter: { verdict: "merge", merge_into: "measurement" },
    },
  },
  // CON-24 — Figurative-language cluster
  // Members: figurative_language, similes, descriptive_language, sensory_details
  "CON-24": {
    0: {}, // Keep parent + 3 specifics
    // 1: Merge specifics into figurative_language
    1: {
      figurative_language: { verdict: "keep" },
      similes: { verdict: "merge", merge_into: "figurative_language" },
      descriptive_language: { verdict: "merge", merge_into: "figurative_language" },
      sensory_details: { verdict: "merge", merge_into: "figurative_language" },
    },
    // 2: Pick one canonical — derivations depend on which parent was picked.
    //    Pre-parent-pick: caption-only on every member.
    //    Post-parent-pick: see clusterPrefillCandidate's CON-24 special-case
    //    (it reads state.cluster_parents["CON-24"] and computes derivations
    //    based on the picked parent).
    2: "CON-24_PICK_ONE",  // sentinel; computeMemberDerivation handles
  },
};

function computeMemberDerivation(signalId, optionIndex, memberKey) {
  const table = CLUSTER_DERIVATIONS[signalId];
  if (!table) return null;
  const optionMap = table[optionIndex];
  if (!optionMap) return null;
  // CON-24 option 2 special case (pick-one canonical with deferred parent)
  if (optionMap === "CON-24_PICK_ONE") {
    const parent = getClusterParent(signalId); // M2.1b adds this helper
    if (!parent) {
      // Pre-parent-pick: caption-only on every member
      return {
        info_only: true,
        caption_text: "CON-24: pick-one outcome — verdict here pending the parent canonical.",
      };
    }
    // Post-parent-pick: parent gets keep; others merge into parent
    if (memberKey === parent) return { verdict: "keep" };
    return { verdict: "merge", merge_into: parent };
  }
  return optionMap[memberKey] || null;
}
```

**Note for M2.1 execution:** `getClusterParent` is added by M2.1b. In M2.1 alone, CON-24 option 2 reads as "no parent yet → info_only caption." That's correct behavior pre-M2.1b. M2.1b's inline reveal wires `setClusterParent` so the second branch fires.

**Step 3: Replace `clusterPrefillCandidate` body**

Replace lines 1188-1192 (currently the stub that returns `null`):

```js
function clusterPrefillCandidate(entry) {
  // Walks CLUSTER_SIGNALS to find the signal whose member list contains
  // this entry. If found and the cluster has a committed answer, returns
  // either an actionable prefill or an info-only caption per design §17.
  // Returns null when: no enclosing cluster, cluster unanswered, or no
  // derivation for this member under the committed option.
  for (const sig of CLUSTER_SIGNALS) {
    if (!sig.members || !sig.members.includes(entry.canonical_key)) continue;
    const cs = getClusterState(sig.id);
    if (cs === undefined) return null;
    const derivation = computeMemberDerivation(sig.id, cs, entry.canonical_key);
    if (!derivation) return null;
    return { from: sig.id, ...derivation };
  }
  return null;
}
```

**Step 4: Extend `displayedPrefillForEntry` to carry info-only captions**

Currently (lines 1211-1218) it short-circuits when cluster prefill exists and treats it as an actionable prefill. Update so an `info_only` cluster prefill falls through to the AI prefill (the AI prefill keeps its normal role) but the caller can still read the info caption. Replace lines 1211-1218 with:

```js
  const clusterPrefill = clusterPrefillCandidate(entry);
  let clusterInfoCaption = null;
  if (clusterPrefill) {
    if (clusterPrefill.info_only) {
      // Info-only — surface caption separately; fall through to AI prefill
      clusterInfoCaption = clusterPrefill.caption_text;
    } else if (clusterPrefill.verdict) {
      return {
        verdict: clusterPrefill.verdict,
        merge_into: clusterPrefill.merge_into || null,
        captionSource: "Based on your earlier group decision",  // plain (W22) — NOT "Suggested from CON-xx"; source shown via this text, not an emoji
        isCommitted: false,
        clusterInfoCaption: null,
      };
    }
  }
```

Then extend the AI-prefill branch (lines 1220-1227) to carry the caption through:

```js
  if (entry.parsed.suggested_verdict) {
    return {
      verdict: entry.parsed.suggested_verdict,
      merge_into: entry.parsed.suggested_merge_target || null,
      captionSource: "Claude recommends",
      isCommitted: false,
      clusterInfoCaption,
    };
  }
```

And the terminal `null` return at the bottom of `displayedPrefillForEntry` (currently a bare `return null;` — verify with grep):

```js
  if (clusterInfoCaption) {
    return {
      verdict: null,
      merge_into: null,
      captionSource: null,
      isCommitted: false,
      clusterInfoCaption,
    };
  }
  return null;
```

**Step 5: Wire info-caption render in `renderDecideStep`**

Find the line where `renderDecideStep` reads `displayedPrefillForEntry` (or builds the equivalent — Decide mode currently reads `clusterPrefillCandidate(entry)` directly at line 1264). Refactor to use `displayedPrefillForEntry` so the info caption is consistent across modes, then add the info-caption render block.

Concrete edit at line 1264 (Decide mode body — verify with grep first):

Locate:
```js
  const clusterSuggestion = clusterPrefillCandidate(entry); // null in Batch 1
```

Replace with:
```js
  const prefill = displayedPrefillForEntry(entry);
  const clusterInfo = prefill?.clusterInfoCaption || null;
```

Then, immediately above the existing "Why this needs attention" row (find via grep `renderWhyAttention`), insert:

```js
  if (clusterInfo) {
    card.appendChild(
      el("p", { className: "cluster-info-caption" },
        document.createTextNode(clusterInfo)
      )
    );
  }
```

**Finally, rewrite the recommendation-headline block** so it reads off the unified `prefill` object. The line-1264 swap above removed the `clusterSuggestion` local, so the old block (which references `clusterSuggestion`/`aiSuggestion`) no longer compiles — it must be rewritten, not patched. This single rewrite folds in two things: (1) the **carry-over P2 fix** (Step 6) — merge label via `reviewerLabelWithTarget` so it reads "Fold into `writing`", not "Fold into another `writing`"; (2) info-only handling — when `prefill.verdict` is null (e.g. CON-16 heritage reframe, CON-24 pre-parent-pick) the headline is skipped and the `.cluster-info-caption` inserted above carries the explanation. The `💡` source-label headline is otherwise unchanged — the **plain caption text** (set in Step 4 per M2.0/W22) is what tells the reviewer whether a suggestion came from their earlier group decision or from the AI, so no source-emoji distinction is needed (and Confirm mode's `renderClaudeRecommendation` already uses the same `💡`).

Before (template lines 1286-1306 — verify via `grep -n 'aiSuggestion || clusterSuggestion'`):
```js
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
```

After (driven by `prefill`; emoji from source; merge label via `reviewerLabelWithTarget`):
```js
  // Claude / cluster recommendation if any — shown but radio stays blank.
  // (info-only prefills have verdict === null → fall to the notes branch; the
  //  .cluster-info-caption inserted above already carries their explanation.)
  if (prefill && prefill.verdict) {
    const v = prefill.verdict;
    const t = prefill.merge_into;
    const source = prefill.captionSource;                 // plain caption (W22) | "Claude recommends"
    const wrap = el("div", { className: "claude-rec" });
    wrap.appendChild(el("p", { className: "claude-rec-headline" },
      el("span", {}, "💡 "),
      el("strong", {}, `${source}: `),
      document.createTextNode(reviewerLabelWithTarget(v, v === "merge" ? (t || null) : null)),
    ));
    if (entry.parsed.claude_notes) {
      const body = el("div", { className: "claude-rec-body-expanded" });
      body.innerHTML = renderInlineMarkdown(entry.parsed.claude_notes);
      wrap.appendChild(body);
    }
    card.appendChild(wrap);
  } else if (entry.parsed.claude_notes) {
```

The trailing `} else if (entry.parsed.claude_notes) {` is shown as the anchor so you can see where the rewritten block ends — leave that branch and what follows it intact. `aiSuggestion` (line 1263) is now only referenced by the old block; after this rewrite it is unused — remove it or leave it (harmless dead `const`).

**Step 6: Carry-over P2 fix — already folded into the Step 5 headline rewrite**

The Session-16 P2 fix (Decide-mode merge label reading "Fold into another `target`" instead of "Fold into `target`") is **resolved by the Step 5 rewrite above** — its headline builds the label via `reviewerLabelWithTarget(v, v === "merge" ? (t || null) : null)` in place of the old inline `${REVIEWER_LABELS[v] || v}${targetSuffix}` (and `targetSuffix` is dropped). Nothing further to edit here.

> Heads-up for the implementer: an earlier draft of this step used `displayed`/`target` as the locals to pass into `reviewerLabelWithTarget`. Those are the **Confirm**-step names (`renderConfirmStep`); `renderDecideStep`'s locals are `v`/`t`. Dropped in verbatim, `displayed`/`target` would throw `ReferenceError`. The Step 5 block uses the correct `v`/`t`.

Browser-smoke contract: a Decide-mode merge suggestion must read "Fold into `writing`" (no "another"); the non-merge verdicts (`keep`/`drop`/`new`) fall through `reviewerLabelWithTarget` to the bare `REVIEWER_LABELS[verdict]` (helper at template ~line 968).

**Step 7: Build + browser smoke via chrome-devtools-mcp**

```bash
python3 scripts/build-concepts-tool.py --verify-only
python3 scripts/build-concepts-tool.py --build-html
```

Expected stderr line 1: `Parsed 208 entries (§11=32, §12=39, §13=137).`
Expected stderr line 2: `merge-target extraction: 53 of 78 merge recommendations (68%) — 25 fall through to picker`

Then open the built artifact:

```bash
open docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html
```

Browser smoke probes (run via chrome-devtools-mcp `evaluate_script`):

**Probe 1 — CON-12 option 2 (merge sub-types) propagation:**

```js
// Resolve CON-12 with option 2 (merge sub-types into writing)
window.__test_setClusterState("CON-12", 2);
// Jump to a sub-type member (§12 Confirm-mode candidate)
window.__test_jumpToEntryByKey("narrative_writing");
// Read displayed prefill
const e = window.__test_currentEntry();
const p = window.__test_displayedPrefill(e);
return {
  verdict: p?.verdict,
  merge_into: p?.merge_into,
  captionSource: p?.captionSource,
};
```

Expected:
```js
{
  verdict: "merge",
  merge_into: "writing",
  captionSource: "Based on your earlier group decision"
}
```

(The `window.__test_*` helpers are temporary probe injections via `evaluate_script` — define inline or use the existing `state` / `ENTRIES_BY_KEY` / `stepSequence` globals directly.)

**Probe 2 — §11 member (`writing`) gets caption text but no radio prefill (W17):**

```js
// CON-12 still resolved with option 2
window.__test_jumpToEntryByKey("writing");
// `writing` is §11 → entryMode returns "decide"; renderDecideStep runs
const card = document.getElementById("wizardCard");
const captionEl = card.querySelector(".cluster-info-caption, .claude-rec");
const radios = card.querySelectorAll('input[type="radio"][name="verdict"]');
return {
  cardClass: card.className,
  captionTextSnippet: captionEl?.textContent?.slice(0, 80),
  radiosChecked: Array.from(radios).filter(r => r.checked).map(r => r.value),
};
```

Expected: `cardClass` includes `decide-mode`; `captionTextSnippet` contains "Based on your earlier group decision" (because option 2 maps `writing → keep` which is actionable, not info-only); `radiosChecked` is `[]` (no pre-fill on §11 per W17).

**Probe 3 — CON-16 option 1 (heritage reframe) info-only caption:**

```js
window.__test_setClusterState("CON-16", 1);
window.__test_jumpToEntryByKey("indigenous_knowledge");
const card = document.getElementById("wizardCard");
const info = card.querySelector(".cluster-info-caption");
return {
  hasInfoCaption: !!info,
  text: info?.textContent,
};
```

Expected: `hasInfoCaption: true`, `text` contains "CON-16: cross-field reframe under heritage".

**Probe 4 — Carry-over P2 fix (renderDecideStep merge label):**

The default corpus has no Decide-mode entry with `suggested_merge_target`, so the fix is not visible via natural reviewer flow. Probe directly by faking a synthetic prefill on plant_parts (§11 Decide):

```js
// Resolve CON-12 with option 2 to inject a merge prefill into a §11 member
// — but `writing` is the §11 there. Use writing instead of plant_parts for fidelity.
window.__test_setClusterState("CON-12", 2);
window.__test_jumpToEntryByKey("writing");  // §11 + merge prefill
const card = document.getElementById("wizardCard");
const recHeadline = card.querySelector(".claude-rec h3, .rec-headline")?.textContent;
return { recHeadline };
```

Expected: `recHeadline` reads "💡 Based on your earlier group decision: Keep as concept" (CON-12 option 2 maps `writing → keep`, not merge). For an actual merge-into-target Decide case, walk to `narrative_writing` (§12 — Confirm by default, but if any factor flips it to Decide, e.g. theme_overlap, the label should read "💡 Based on your earlier group decision: Fold into `writing`" not "Fold into another `writing`").

Pragmatic test: write a one-off `<entry-injection>` probe that constructs a synthetic `displayed="merge", target="writing"` and runs `reviewerLabelWithTarget("merge", "writing")` directly. Expected return: `"Fold into \`writing\`"`. This is the carry-over fix's contract.

**Probe 5 — Console error check:**

```js
return window.__test_collectErrors().length;
```

Expected: `0`.

**Step 8: Status doc + commit**

Update `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md`:
- Bump "Last milestone completed" to M2.1
- Bump "Next milestone" to M2.1b
- Append Session log entry for M2.1 with the probe results
- Smoke check matrix row #6 (Cluster Resolve + member walk) — fill partially: "PASS for CON-12 option 2 + CON-16 option 1; CON-24 pick-one deferred to M2.1b."

```bash
git add scripts/concepts-worksheet-tool.template.html docs/plans/2026-05-15-concepts-worksheet-wizard-plan.md docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): cluster auto-prefill matrix (§17) + Decide-mode merge label fix

M2.1 (Batch 2).

Replaces clusterPrefillCandidate stub with the full design §17 derivation
matrix for all 5 clusters (CON-12, CON-16, CON-22, CON-23, CON-24). Member
entries on cluster-resolved steps now receive a 'Based on your earlier group decision'
caption + radio prefill per W21, while §11 members get the caption text
only (no radio prefill — W17).

CON-16 option 2 (heritage reframe) and CON-24 option 2 (pick-one, pre-
parent) surface as info-only captions per design §591 / §621. CON-24's
post-parent-pick branch reads getClusterParent (added by M2.1b) and is a
no-op until then.

Also folds in the Session 16 review's P2 carry-over: renderDecideStep's
merge-label builder swaps from inline ${REVIEWER_LABELS[v]||v}${suffix}
('Fold into another \`target\`') to reviewerLabelWithTarget(v,t) ('Fold
into \`target\`'). Now reachable because the matrix can feed merge+target
into a §12/§13 sub-type that's Decide-routed (theme_overlap or no-rec).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 2.1b: CON-24 pick-one canonical Resolve UI (inline reveal)

> **SCOPE ADDITION (user decision 2026-05-28, surfaced by M2.1 calibration):** ALSO wire the `.cluster-info-caption` render into `renderConfirmStep`. M2.1 wired it only into `renderDecideStep`, but every info-only cluster member (CON-16 opt-1, CON-24 opt-2 pre-parent-pick) is §13/Confirm-routed in the real corpus, so the "pending another decision" notice is currently invisible. `renderConfirmStep` already calls `displayedPrefillForEntry` (which carries `clusterInfoCaption` from M2.1) — render it the same ~6-line way `renderDecideStep` does. **De-jargon the caption text when surfacing it:** the `caption_text` values in `CLUSTER_DERIVATIONS` carry `CON-16:`/`CON-24:` prefixes (fine while Decide-only/unseen, but reviewer-visible once shown in Confirm) → strip the `CON-xx:` prefix + plain wording per W22 (e.g. "Hold off — this is pending the heritage review."). See status-doc "RESOLVED DECISION" note.

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` — extend `renderClusterStep(signal)` at ~line 2167 with a CON-24-specific inline reveal; add `state.cluster_parents` map + `getClusterParent` / `setClusterParent` helpers + `loadState` migration. **Plus** the scope-addition above: `.cluster-info-caption` render in `renderConfirmStep` + de-jargoned `caption_text` in `CLUSTER_DERIVATIONS`.

**What this milestone does:**

When a reviewer picks CON-24's option 3 ("Pick one canonical — figurative_language OR descriptive_language"), the Resolve card reveals an inline "Now pick the parent canonical:" sub-section below the option radios. Picking a parent + clicking Confirm writes the cluster state (option_index=2) AND the parent into a parallel `state.cluster_parents` map. The M2.1 matrix's CON-24 special-case (already coded as the `"CON-24_PICK_ONE"` sentinel) then derives member prefills using the picked parent.

State shape extension:

```js
// state.cluster_parents = {} (new in M2.1b)
// state.cluster_signals[id] = optionIndex (unchanged; M1.6 shape)
// state.cluster_parents[id] = "<canonical_key>" (only set for CON-24 option 3)
```

**Step 1: Add `cluster_parents` to `defaultState()` + `loadState` migration**

Find `defaultState()` (grep `function defaultState`):

```js
function defaultState() {
  return {
    schema: 2,
    entries: {},
    cluster_signals: {},
    cluster_parents: {},  // NEW M2.1b
    wizard: { step_index: 0, deferred: [] },
  };
}
```

Find `loadState()` migration block (grep `function loadState`):

```js
// Inside loadState(), after the existing migrations:
if (!parsed.cluster_parents) parsed.cluster_parents = {};
```

**Step 2: Add `getClusterParent` / `setClusterParent` helpers**

Insert immediately after `setClusterState` (~line 1069):

```js
function getClusterParent(id) {
  return state.cluster_parents[id] || null;
}

function setClusterParent(id, parent) {
  if (!parent) {
    delete state.cluster_parents[id];
  } else {
    state.cluster_parents[id] = parent;
  }
  saveState();
}
```

**Step 3: Add CON-24-aware reveal block to `renderClusterStep`**

`renderClusterStep` already renders the option radios + Confirm button per M1.10. M2.1b extends the option-radio render to: when `signal.id === "CON-24"` AND the currently-selected option index is 2, append a parent-picker sub-section below the radios. Picking a parent stores it in `state.cluster_parents["CON-24"]`. The existing Confirm button validates: for CON-24 option 2, the parent must be set before commit.

Concrete edit — locate the option-radio loop in `renderClusterStep` (grep `option-radio\|cluster-option\|signal\.options`):

```js
// Inside renderClusterStep, after building option radios but before the
// Confirm button (verify exact location via Read after grep):

if (signal.id === "CON-24") {
  const selectedOption = getClusterState(signal.id);
  // Show the inline reveal for option 2 (pick-one canonical)
  // OR for the radio-staged option 2 (user clicked but hasn't confirmed)
  const stagedOption = currentStagedOption();  // NEW: reads the radio group's currently-selected value
  const showReveal = selectedOption === 2 || stagedOption === 2;
  if (showReveal) {
    const reveal = el("div", { className: "con24-parent-picker" });
    reveal.appendChild(
      el("p", { className: "reveal-prompt" },
        document.createTextNode("Now pick the parent canonical:")
      )
    );
    const currentParent = getClusterParent("CON-24");
    for (const parentKey of ["figurative_language", "descriptive_language"]) {
      const radio = el("input", {
        type: "radio",
        name: "con24-parent",
        value: parentKey,
        checked: currentParent === parentKey,
        onchange: () => {
          setClusterParent("CON-24", parentKey);
          // Re-render so the Confirm-button enabled state updates
          renderCurrentStep();
        },
      });
      const label = el("label", { className: "con24-parent-label" },
        radio,
        el("code", {}, parentKey)
      );
      reveal.appendChild(label);
    }
    optionsContainer.appendChild(reveal);
  }
}
```

The `currentStagedOption()` helper is a tiny utility that reads the option radios in the current cluster card to determine which option the reviewer has CLICKED (not yet committed via Confirm). Add it near the top of the cluster-render block:

```js
function currentStagedOption() {
  const optRadios = document.querySelectorAll(
    '#wizardCard input[type="radio"][name^="cluster-option-"]'
  );
  for (const r of optRadios) {
    if (r.checked) return parseInt(r.value, 10);
  }
  return null;
}
```

**Step 4: Gate Confirm button for CON-24 option 2 on parent-picked**

In the existing Confirm-button render (grep `cluster-confirm\|onClusterCommit`), extend the disabled-state logic:

```js
const confirmDisabled = (() => {
  const staged = currentStagedOption();
  if (staged === null) return true; // no option picked yet
  if (signal.id === "CON-24" && staged === 2) {
    // option 3 → parent must be picked
    if (!getClusterParent("CON-24")) return true;
  }
  return false;
})();
const confirmBtn = el("button", {
  className: "btn primary cluster-confirm",
  disabled: confirmDisabled,
  // ... rest unchanged
});
```

**Step 5: Validate `onClusterCommit` clears stale parent on option change**

When the user re-resolves CON-24 with a non-2 option after previously setting option 2 + a parent, the stale parent should be cleared. Extend `onClusterCommit` (grep `function onClusterCommit`):

```js
function onClusterCommit(signalId) {
  // ... existing code that reads the staged option and calls setClusterState
  // After setClusterState fires, clear stale parent if not CON-24-option-2:
  if (signalId === "CON-24") {
    const newOption = getClusterState("CON-24");
    if (newOption !== 2) {
      setClusterParent("CON-24", null);
    }
  }
  // ... existing renderCurrentStep / updateDecisionDebt calls
}
```

**Step 6: Add minimal CSS for the reveal**

Append to the existing CSS block (grep `con24-parent-picker` to confirm it doesn't already exist):

```css
.con24-parent-picker {
  margin-top: 12px;
  padding: 12px 14px;
  border-left: 3px solid var(--warn-border);
  background: var(--warn-soft);
  border-radius: 4px;
}

.con24-parent-picker .reveal-prompt {
  margin: 0 0 8px;
  font-weight: 600;
  color: var(--text-strong);
}

.con24-parent-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  cursor: pointer;
}

.con24-parent-label input[type="radio"] {
  margin: 0;
}
```

**Step 7: Build + browser smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Probes via chrome-devtools-mcp:

**Probe 1 — Option 0/1 don't reveal parent picker:**

```js
window.__test_jumpToStep_byId("cluster:CON-24");
// Click option 0 radio
const opts = document.querySelectorAll('#wizardCard input[type="radio"][name^="cluster-option-"]');
opts[0].click();
const reveal = document.querySelector(".con24-parent-picker");
return { revealVisible: !!reveal };
```

Expected: `revealVisible: false`.

**Probe 2 — Option 2 reveals parent picker; Confirm disabled until parent picked:**

```js
// Continue from CON-24 step
const opts = document.querySelectorAll('#wizardCard input[type="radio"][name^="cluster-option-"]');
opts[2].click();
const reveal = document.querySelector(".con24-parent-picker");
const confirmBtn = document.querySelector(".cluster-confirm");
return {
  revealVisible: !!reveal,
  confirmDisabled: confirmBtn.disabled,
};
```

Expected: `revealVisible: true`, `confirmDisabled: true`.

**Probe 3 — Pick parent → Confirm enables → Commit → member prefills derive:**

```js
const parents = document.querySelectorAll('.con24-parent-label input');
parents[0].click(); // figurative_language
const confirmBtn = document.querySelector(".cluster-confirm");
const confirmEnabled = !confirmBtn.disabled;
confirmBtn.click();
// State should now have option_index=2 and parent="figurative_language"
const cs = state.cluster_signals["CON-24"];
const cp = state.cluster_parents["CON-24"];
// Walk to a member entry
window.__test_jumpToEntryByKey("similes");
const e = window.__test_currentEntry();
const p = window.__test_displayedPrefill(e);
return {
  confirmEnabled,
  clusterState: cs,
  clusterParent: cp,
  similesVerdict: p?.verdict,
  similesMergeInto: p?.merge_into,
};
```

Expected:
```js
{
  confirmEnabled: true,
  clusterState: 2,
  clusterParent: "figurative_language",
  similesVerdict: "merge",
  similesMergeInto: "figurative_language"
}
```

**Probe 4 — Reload preserves cluster_parents:**

```js
location.reload();
// (After reload, read state)
return {
  clusterState: state.cluster_signals["CON-24"],
  clusterParent: state.cluster_parents["CON-24"],
};
```

Expected: same as before reload (state hydrates via `loadState`).

**Probe 5 — Change option back to 0 clears stale parent:**

```js
window.__test_jumpToStep_byId("cluster:CON-24");
const opts = document.querySelectorAll('#wizardCard input[type="radio"][name^="cluster-option-"]');
opts[0].click();
const confirmBtn = document.querySelector(".cluster-confirm");
confirmBtn.click();
return {
  clusterState: state.cluster_signals["CON-24"],
  clusterParent: state.cluster_parents["CON-24"],
};
```

Expected: `clusterState: 0`, `clusterParent: null` (or undefined — deleted).

**Step 8: Status doc + commit**

```bash
git add scripts/concepts-worksheet-tool.template.html docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): CON-24 pick-one canonical Resolve UI (inline reveal)

M2.1b (Batch 2).

Extends renderClusterStep with a CON-24-specific inline reveal: picking
option 3 ('Pick one canonical (figurative_language OR descriptive_language)')
expands an inline parent-picker below the option radios. Picking a parent
enables Confirm; committing writes both state.cluster_signals['CON-24']=2
and state.cluster_parents['CON-24']=<key>.

New state field: state.cluster_parents (kept parallel to cluster_signals
so the M1.6 helpers stay scalar). loadState gains a one-liner migration
to default cluster_parents to {} on pre-M2.1b state.

Helpers: getClusterParent / setClusterParent. The M2.1 matrix's CON-24
special-case (CLUSTER_DERIVATIONS['CON-24'][2] = sentinel) now resolves
to member prefills via getClusterParent, so similes/descriptive_language/
sensory_details receive merge prefills toward the chosen parent.

onClusterCommit clears stale parent when CON-24 option flips from 2 to
a non-2 option (prevents zombie state).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 2.2: Cluster-mismatch detection + entry-step callout

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` — add `checkClusterMismatch`, `recomputeMismatchForEntry`, `recomputeMismatchForCluster` helpers; extend commit paths to fire recomputeMismatchForEntry; extend setClusterState to fire recomputeMismatchForCluster; add yellow callout render in renderEntryStep (both Confirm + Decide modes); wire `"cluster-mismatch"` trigger to `maybeAutoOpenNotesDrawer`.

**What this milestone does:**

> **Plain-language constraint (design §4.1 / W22) — the callout, auto-open prompt, and any reason text are reviewer-facing.** Write them plain: say "the group decision you made for these related concepts," never "the cluster shape," and never show a raw `CON-xx` id. The callout should read "⚠ Heads up — your verdict differs from the group decision you made for these related concepts." (The code blocks below were drafted pre-M2.0 and still say "cluster shape" — replace per this note.)

When a reviewer commits a per-entry verdict that disagrees with the cluster-derivation (e.g., committed `keep` on `narrative_writing` while CON-12 was resolved as option 2 = merge sub-types into writing), the wizard:
1. Writes `state.entries[key].cluster_mismatch = "CON-XX"` (M2.1's derivation map drives this).
2. Renders a yellow callout above the Claude-rec block on every subsequent visit to the entry step (matches Session 16-screenshot theme-overlap callout pattern).
3. Auto-opens the notes drawer with "Heads up — this differs from the cluster shape you picked. Worth a quick note?" (existing `"cluster-mismatch"` dispatch in `maybeAutoOpenNotesDrawer`; M1.12 already coded this — M2.2 just wires the caller).

When the cluster Resolve answer changes (`setClusterState`), all members get their mismatch flag recomputed (a Resolve change can either fire NEW mismatches or clear stale ones).

Mismatch is purely UI state — `buildExportMarkdown` ignores it; `parseEntryEditsFromMarkdown` doesn't read it from imports. The empty-export SHA invariant is unaffected.

**Step 1: Add mismatch-detection helpers**

Insert immediately after the M2.1 `clusterPrefillCandidate` (~line 1188 + matrix block, verify with grep):

```js
// ---------- Cluster-mismatch detection (M2.2) ----------

// Returns the cluster signal ID (e.g. "CON-12") if entry's committed
// verdict disagrees with the cluster-derivation; null otherwise.
// Info-only cluster prefills (CON-16 option 1, CON-24 pre-parent) are
// not considered mismatches — they're informational, not commitments.
function checkClusterMismatch(entry) {
  const ev = state.entries[entry.canonical_key];
  if (!ev || !ev.verdict) return null;
  const cp = clusterPrefillCandidate(entry);
  if (!cp || cp.info_only || !cp.verdict) return null;
  // Disagreement: different verdict, or same merge verdict but different target
  if (ev.verdict !== cp.verdict) return cp.from;
  if (ev.verdict === "merge" && (ev.merge_into || "") !== (cp.merge_into || "")) return cp.from;
  return null;
}

function recomputeMismatchForEntry(entry) {
  const key = entry.canonical_key;
  const cm = checkClusterMismatch(entry);
  const ev = state.entries[key] || {};
  if (cm && ev.cluster_mismatch !== cm) {
    // New mismatch (or different signal) — set flag + queue auto-open
    state.entries[key] = { ...ev, cluster_mismatch: cm };
    saveState();
    maybeAutoOpenNotesDrawer(entry, ev.verdict, "cluster-mismatch");
  } else if (!cm && ev.cluster_mismatch) {
    // Stale mismatch — clear flag
    const cleaned = { ...ev };
    delete cleaned.cluster_mismatch;
    state.entries[key] = cleaned;
    saveState();
  }
}

function recomputeMismatchForCluster(signalId) {
  const sig = CLUSTER_SIGNALS.find((s) => s.id === signalId);
  if (!sig || !sig.members) return;
  for (const memberKey of sig.members) {
    const entry = ENTRIES_BY_KEY.get(memberKey);
    if (entry) recomputeMismatchForEntry(entry);
  }
}
```

**Step 2: Wire `recomputeMismatchForEntry` into every commit path**

Find `onCommit(entry)` (grep `function onCommit`). Append at the end (after `updateDecisionDebt()`):

```js
function onCommit(entry) {
  // ... existing body (re-renders + updateDecisionDebt)
  recomputeMismatchForEntry(entry);  // NEW M2.2
}
```

Find `commitMerge(entry, target, pickerEl)` (grep `function commitMerge`). It already writes state then calls `maybeAutoOpenNotesDrawer` before `onCommit`. Since `onCommit` now calls `recomputeMismatchForEntry`, and the recompute itself calls `maybeAutoOpenNotesDrawer` when a NEW mismatch is detected, the order matters. Reorder so `recomputeMismatchForEntry` fires AFTER `setEntryState` but BEFORE the override-trigger `maybeAutoOpenNotesDrawer` call. Concrete edit:

Locate the block (grep `commitMerge` for the existing `maybeAutoOpenNotesDrawer` call):

```js
setEntryState(key, { verdict: "merge", merge_into: target });
// Existing override-trigger auto-open
if (isOverride) {
  maybeAutoOpenNotesDrawer(entry, "merge", "override");
}
onCommit(entry);
```

Change to:

```js
setEntryState(key, { verdict: "merge", merge_into: target });
// NEW M2.2: detect mismatch first; the recompute may queue cluster-mismatch
// auto-open which takes precedence over override (different prompt text)
recomputeMismatchForEntry(entry);
// Override-trigger auto-open fires only if no mismatch flag was just set
if (isOverride && !state.entries[key]?.cluster_mismatch) {
  maybeAutoOpenNotesDrawer(entry, "merge", "override");
}
onCommit(entry);
```

(`onCommit` will call `recomputeMismatchForEntry` again — that's idempotent: the second call sees the flag already matches and does nothing. Acceptable redundancy for clarity. Alternative: skip the explicit call here and rely on onCommit; but then the `if (isOverride && !state.entries[key]?.cluster_mismatch)` check fires BEFORE the recompute, which mis-orders. Keep the explicit call.)

**Step 3: Wire `recomputeMismatchForCluster` into `setClusterState`**

Extend `setClusterState` (line 1061):

```js
function setClusterState(id, optionIndex) {
  if (optionIndex === null || optionIndex === undefined) {
    delete state.cluster_signals[id];
  } else {
    state.cluster_signals[id] = optionIndex;
  }
  saveState();
  updateDecisionDebt();
  recomputeMismatchForCluster(id);  // NEW M2.2
}
```

Also extend `setClusterParent` (M2.1b) similarly, since changing the CON-24 parent shifts derivations for all CON-24 members:

```js
function setClusterParent(id, parent) {
  if (!parent) {
    delete state.cluster_parents[id];
  } else {
    state.cluster_parents[id] = parent;
  }
  saveState();
  recomputeMismatchForCluster(id);  // NEW M2.2
}
```

**Step 4: Add yellow-callout render in `renderEntryStep`**

Both Confirm and Decide need the callout when `state.entries[key].cluster_mismatch` is set. Add a render helper near the existing `renderWhyAttention` or similar (grep `function renderWhyAttention`):

```js
function renderClusterMismatchCallout(entry) {
  const ev = state.entries[entry.canonical_key];
  if (!ev || !ev.cluster_mismatch) return null;
  const signalId = ev.cluster_mismatch;
  const cp = clusterPrefillCandidate(entry);
  // Build readable shape description
  let shapeText = "cluster suggestion";
  if (cp && cp.verdict) {
    shapeText = reviewerLabelWithTarget(cp.verdict, cp.merge_into || null);
  }
  return el("div", { className: "cluster-mismatch-callout warn-tinted" },
    el("p", { className: "callout-headline" },
      document.createTextNode("⚠ Heads up — your verdict differs from the cluster shape you picked.")
    ),
    el("p", { className: "callout-detail" },
      document.createTextNode(`Cluster ${signalId} suggests: ${shapeText}. See note in drawer below.`)
    )
  );
}
```

Wire into both render paths. Inside `renderConfirmStep(entry)` (grep `function renderConfirmStep`), after the step head + tier strip render but before the Claude recommendation block, insert:

```js
const mismatchCallout = renderClusterMismatchCallout(entry);
if (mismatchCallout) card.appendChild(mismatchCallout);
```

Inside `renderDecideStep(entry)` (grep `function renderDecideStep`), insert the same line at the equivalent position — after the tier strip + theme-overlap-callout render (if present) and before the Claude-rec block.

**Step 5: Add CSS for the callout**

Append to the existing CSS block (grep `cluster-mismatch-callout` to verify it doesn't exist):

```css
.cluster-mismatch-callout {
  margin: 12px 0;
  padding: 12px 16px;
  border-left: 3px solid var(--warn-border);
  background: var(--warn-soft);
  border-radius: 4px;
}

.cluster-mismatch-callout .callout-headline {
  margin: 0;
  font-weight: 600;
  color: var(--text-strong);
}

.cluster-mismatch-callout .callout-detail {
  margin: 6px 0 0;
  font-size: 13.5px;
  color: var(--muted);
}
```

**Step 6: Build + browser smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Probes:

**Probe 1 — Commit-mismatch detection fires:**

```js
// Resolve CON-12 with option 2 (merge sub-types into writing)
window.__test_setClusterState("CON-12", 2);
// Jump to narrative_writing; CON-12 option 2 suggests merge→writing
window.__test_jumpToEntryByKey("narrative_writing");
// Pick "Keep as concept" via Pick Something Else → commits keep
const otherToggle = document.querySelector("details.pick-other summary");
otherToggle.click();
const radios = document.querySelectorAll('details.pick-other input[type="radio"]');
// Find the keep radio
const keepRadio = Array.from(radios).find(r => r.value === "keep");
keepRadio.click();
return {
  entryState: state.entries["narrative_writing"],
  autoOpenPrompt: autoOpenPrompts.get("narrative_writing"),
  calloutVisible: !!document.querySelector(".cluster-mismatch-callout"),
};
```

Expected:
```js
{
  entryState: { verdict: "keep", cluster_mismatch: "CON-12" },
  autoOpenPrompt: "Heads up — this differs from the cluster shape you picked. Worth a quick note?",
  calloutVisible: true
}
```

**Probe 2 — Cluster-answer change recomputes mismatch:**

```js
// Continue from probe 1: narrative_writing has cluster_mismatch="CON-12"
// Now change CON-12 to option 0 (no derivation)
window.__test_setClusterState("CON-12", 0);
// narrative_writing's mismatch flag should clear (cluster_prefill is now null)
return {
  entryState: state.entries["narrative_writing"],
};
```

Expected: `entryState` is `{ verdict: "keep" }` (cluster_mismatch field removed).

**Probe 3 — Commit matching cluster shape doesn't flag:**

```js
// Resolve CON-23 with option 1 (merge specifics into measurement)
window.__test_setClusterState("CON-23", 1);
window.__test_jumpToEntryByKey("volume");
// Pick "✓ Agree — Fold into measurement" (matches cluster derivation)
const agreeBtn = document.querySelector(".primary-agree");
agreeBtn.click();
return {
  entryState: state.entries["volume"],
  calloutVisible: !!document.querySelector(".cluster-mismatch-callout"),
};
```

Expected: `entryState: { verdict: "merge", merge_into: "measurement" }` (no `cluster_mismatch`); `calloutVisible: false`.

**Probe 4 — Mismatch persists across reload:**

```js
// Set up a mismatch
window.__test_setClusterState("CON-12", 2);
state.entries["opinion_writing"] = { verdict: "keep" };
saveState();
recomputeMismatchForEntry(ENTRIES_BY_KEY.get("opinion_writing"));
location.reload();
// After reload
return { entryState: state.entries["opinion_writing"] };
```

Expected: `entryState: { verdict: "keep", cluster_mismatch: "CON-12" }`.

**Probe 5 — Empty-export SHA invariant unchanged:**

```js
// Wipe state, export, hash
state = defaultState();
saveState();
const md = buildExportMarkdown();
return await sha256(md);
```

Expected: `0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03` (Batch 1 baseline).

**Step 7: Status doc + commit**

```bash
git add scripts/concepts-worksheet-tool.template.html docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): cluster-mismatch detection + yellow entry-step callout

M2.2 (Batch 2).

Adds checkClusterMismatch / recomputeMismatchForEntry /
recomputeMismatchForCluster helpers. Every per-entry commit path now
fires recomputeMismatchForEntry (idempotent re-run inside onCommit is
acceptable for clarity). setClusterState + setClusterParent fire
recomputeMismatchForCluster so a Resolve-answer change flips/clears
flags for all affected members.

When a mismatch is set:
- state.entries[key].cluster_mismatch = 'CON-XX' (UI-only field; not
  exported)
- Notes drawer auto-opens with the cluster-mismatch prompt (M1.12
  already wired the dispatch case)
- Yellow callout renders above the Claude-rec block on every visit to
  the entry step (both Confirm + Decide modes)

Mismatch flag clears when verdict matches cluster shape OR cluster
prefill goes away (option change clears flag without reopening
drawer — drawer auto-open only fires on the NEW-mismatch transition).

Info-only cluster prefills (CON-16 option 1, CON-24 pre-parent-pick)
are not treated as mismatches — they're informational, not commitments.

Empty-export SHA invariant unchanged: cluster_mismatch is not exported.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

---

### Milestone 2.3: Review summary screen (§11)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` — replace `renderEndScreen()` body with a dispatch to `renderReviewSummary()`; add `renderReviewSummary()` + its sub-renderers (`renderVerdictBucket`, `renderClusterBucket`, `renderDeferredBucket`, `renderMismatchBucket`); wire the top-bar "Review so far" button to open the summary mid-flow; add CSS.

**What this milestone does:**

> **Plain-language constraint (design §4.1 / W22) — every summary section label and row is reviewer-facing.** De-jargon per M2.0: `cluster` → `group` ("CLUSTER CHOICES" → "GROUP DECISIONS"; "⚠ DIFFERS FROM CLUSTER DECISION" → "⚠ DIFFERS FROM A GROUP DECISION"; "No cluster shapes resolved yet." → "No group decisions made yet."), and **drop raw `CON-xx` ids from rows** — name the group or say "a group decision" instead. The `§11/§12/§13` references in the *sort order* are internal logic and stay; only on-screen text changes. Read the design §11 mock labels through this lens. (The code blocks below were drafted pre-M2.0 and still show the old strings.)

Replaces M1.15's simple end screen (one paragraph + Save & Export + Back-to-wizard) with the full design §11 review summary. Sections in design §11 mock order:

1. **KEEP AS CONCEPT** (collapsible) — entries grouped, sort by tier (§11 → §12 → §13) then canonical_key
2. **FOLD INTO ANOTHER** (collapsible) — entries grouped by merge target; within a target group, sort by tier then canonical_key; each row shows `key → target` with [edit ↗] link
3. **ADD NEW CONCEPT** (collapsible) — flat list
4. **REMOVE** (collapsible) — flat list
5. **CLUSTER CHOICES** (collapsible) — `CON-XX — <short option description>` rows
6. **⚠ DECIDE LATER** (collapsible, **default-open if count > 0**) — entries from `state.wizard.deferred`; each row has [resume] link
7. **⚠ DIFFERS FROM CLUSTER DECISION** (collapsible, **default-open if count > 0**) — entries with `cluster_mismatch` flag; rows show "key — your verdict `X`, CON-YY suggests `Z`"

Header strip: "REVIEW YOUR DECISIONS — N of 208 committed" + saved badge. Footer row: [← Back to wizard] + [Save & Export ↓].

The "Review so far" top-bar button (already a static element from M1.4; currently disabled per the M1.4 status doc) now wires to a dedicated `openReviewSummary()` function: sets a UI-only flag `state.ui = { summaryOpen: true }`, calls `renderCurrentStep()` (which dispatches to summary when the flag is set), and pushes the current step_index onto a small `summaryReturnStack` so [← Back to wizard] can pop and resume.

**Step 1: Add `renderReviewSummary` + sub-renderers**

Insert near the existing `renderEndScreen` (~line 2257):

```js
function renderReviewSummary() {
  const card = el("section", { id: "wizardCard", className: "wizard-step review-summary" });

  // ---- Header ----
  const committedCount = ENTRIES.filter((e) => entryFilled(e.canonical_key)).length;
  const totalCount = ENTRIES.length;
  card.appendChild(
    el("header", { className: "summary-header" },
      el("h2", {}, document.createTextNode("Review your decisions")),
      el("p", { className: "summary-counts" },
        document.createTextNode(`${committedCount} of ${totalCount} entries committed.`)
      )
    )
  );

  // ---- Buckets in design §11 mock order ----
  const keepEntries = collectByVerdict("keep");
  const foldEntries = collectByVerdict("merge");
  const newEntries = collectByVerdict("new");
  const dropEntries = collectByVerdict("drop");
  // `state.wizard.deferred` holds BARE step ids — entry canonical_keys (e.g. "plant_parts")
  // and cluster CON-ids (e.g. "CON-23"). navDefer pushes `step.id` verbatim (template ~line 2310),
  // and step ids are never prefixed (entry steps use the bare canonical_key; see buildStepSequence
  // `{ kind: "entry", id: entry.canonical_key }`). A deferred cluster id simply misses ENTRIES_BY_KEY
  // and drops out, so a straight lookup is correct — no "entry:" prefix parsing. (Verified against
  // navDefer + the M1.15 end-screen counts, which already use `deferred.includes(entry.canonical_key)`.)
  const deferredEntries = (state.wizard.deferred || [])
    .map((id) => ENTRIES_BY_KEY.get(id))
    .filter(Boolean);
  const mismatchEntries = ENTRIES.filter((e) => state.entries[e.canonical_key]?.cluster_mismatch);

  card.appendChild(renderVerdictBucket("KEEP AS CONCEPT", "keep", keepEntries, /*defaultOpen*/ false));
  card.appendChild(renderFoldBucket(foldEntries, /*defaultOpen*/ false));
  card.appendChild(renderVerdictBucket("ADD NEW CONCEPT", "new", newEntries, /*defaultOpen*/ false));
  card.appendChild(renderVerdictBucket("REMOVE", "drop", dropEntries, /*defaultOpen*/ false));
  card.appendChild(renderClusterBucket(/*defaultOpen*/ false));
  card.appendChild(renderDeferredBucket(deferredEntries, /*defaultOpen*/ deferredEntries.length > 0));
  card.appendChild(renderMismatchBucket(mismatchEntries, /*defaultOpen*/ mismatchEntries.length > 0));

  // ---- Footer actions ----
  card.appendChild(
    el("div", { className: "summary-footer" },
      el("button", {
        className: "btn ghost back-to-wizard",
        onclick: closeReviewSummary,
      }, document.createTextNode("← Back to wizard")),
      el("button", {
        className: "btn primary save-export",
        onclick: onExport,
      }, document.createTextNode("Save & Export ↓"))
    )
  );

  return card;
}

// Helper: collect entries with a given committed verdict, sorted by tier
// then canonical_key.
function collectByVerdict(verdict) {
  const matches = ENTRIES.filter((e) => state.entries[e.canonical_key]?.verdict === verdict);
  matches.sort(sortByTierThenKey);
  return matches;
}

function sortByTierThenKey(a, b) {
  const tierA = a.parsed.tier || "";
  const tierB = b.parsed.tier || "";
  if (tierA !== tierB) {
    // §11 < §12 < §13 per TIER_ORDER
    const order = { "§11": 0, "§12": 1, "§13": 2 };
    return (order[tierA] ?? 99) - (order[tierB] ?? 99);
  }
  return a.canonical_key.localeCompare(b.canonical_key);
}

function renderVerdictBucket(title, verdict, entries, defaultOpen) {
  const details = el("details", { className: "summary-bucket", open: defaultOpen || entries.length === 0 ? null : null });
  // (Open semantics: default-open follows the parameter; HTML <details> open
  // attribute is presence-based — set via .open = boolean after creation.)
  details.open = !!defaultOpen;
  const summary = el("summary", { className: "bucket-summary" },
    document.createTextNode(`${title} (${entries.length})`)
  );
  details.appendChild(summary);

  if (entries.length === 0) {
    details.appendChild(el("p", { className: "bucket-empty" },
      document.createTextNode("None.")
    ));
    return details;
  }

  const list = el("ul", { className: "bucket-list" });
  for (const e of entries) {
    const row = el("li", { className: "bucket-row" },
      el("code", { className: "key" }, document.createTextNode(e.canonical_key)),
      el("span", { className: "tier-tag" }, document.createTextNode(e.parsed.tier)),
      el("button", {
        className: "btn link edit-link",
        onclick: () => {
          closeReviewSummary();
          jumpToStepByEntryKey(e.canonical_key);
        },
      }, document.createTextNode("edit ↗"))
    );
    list.appendChild(row);
  }
  details.appendChild(list);
  return details;
}

function renderFoldBucket(entries, defaultOpen) {
  const details = el("details", { className: "summary-bucket fold-bucket" });
  details.open = !!defaultOpen;
  details.appendChild(el("summary", { className: "bucket-summary" },
    document.createTextNode(`FOLD INTO ANOTHER (${entries.length})`)
  ));

  if (entries.length === 0) {
    details.appendChild(el("p", { className: "bucket-empty" },
      document.createTextNode("None.")
    ));
    return details;
  }

  // Group by merge target
  const byTarget = {};
  for (const e of entries) {
    const target = state.entries[e.canonical_key].merge_into;
    if (!byTarget[target]) byTarget[target] = [];
    byTarget[target].push(e);
  }
  // Sort target groups alphabetically by target, members within by tier+key
  const targets = Object.keys(byTarget).sort();
  for (const target of targets) {
    const group = el("div", { className: "fold-target-group" });
    group.appendChild(
      el("p", { className: "fold-target-header" },
        document.createTextNode("Folding into "),
        el("code", {}, document.createTextNode(target)),
        document.createTextNode(` (${byTarget[target].length}):`)
      )
    );
    const list = el("ul", { className: "bucket-list" });
    byTarget[target].sort(sortByTierThenKey);
    for (const e of byTarget[target]) {
      const row = el("li", { className: "bucket-row" },
        el("code", { className: "key" }, document.createTextNode(e.canonical_key)),
        document.createTextNode(" → "),
        el("code", { className: "target" }, document.createTextNode(target)),
        el("span", { className: "tier-tag" }, document.createTextNode(e.parsed.tier)),
        el("button", {
          className: "btn link edit-link",
          onclick: () => {
            closeReviewSummary();
            jumpToStepByEntryKey(e.canonical_key);
          },
        }, document.createTextNode("edit ↗"))
      );
      list.appendChild(row);
    }
    group.appendChild(list);
    details.appendChild(group);
  }
  return details;
}

function renderClusterBucket(defaultOpen) {
  const details = el("details", { className: "summary-bucket cluster-bucket" });
  details.open = !!defaultOpen;
  const answered = CLUSTER_SIGNALS.filter((s) => getClusterState(s.id) !== undefined);
  details.appendChild(el("summary", { className: "bucket-summary" },
    document.createTextNode(`CLUSTER CHOICES (${answered.length} of ${CLUSTER_SIGNALS.length})`)
  ));

  if (answered.length === 0) {
    details.appendChild(el("p", { className: "bucket-empty" },
      document.createTextNode("No cluster shapes resolved yet.")
    ));
    return details;
  }

  const list = el("ul", { className: "bucket-list" });
  for (const s of answered) {
    const idx = getClusterState(s.id);
    const optLabel = s.options[idx] || `Option ${idx}`;
    // For CON-24 option 2, also surface the picked parent
    let extra = "";
    if (s.id === "CON-24" && idx === 2) {
      const p = getClusterParent("CON-24");
      if (p) extra = ` — parent: ${p}`;
    }
    const row = el("li", { className: "bucket-row" },
      el("code", { className: "cluster-id" }, document.createTextNode(s.id)),
      document.createTextNode(` — ${optLabel}${extra}`),
      el("button", {
        className: "btn link edit-link",
        onclick: () => {
          closeReviewSummary();
          jumpToStepByClusterId(s.id);
        },
      }, document.createTextNode("edit ↗"))
    );
    list.appendChild(row);
  }
  details.appendChild(list);
  return details;
}

function renderDeferredBucket(entries, defaultOpen) {
  const details = el("details", { className: "summary-bucket deferred-bucket" });
  details.open = !!defaultOpen;
  details.appendChild(el("summary", { className: "bucket-summary" },
    document.createTextNode(`⚠ DECIDE LATER (${entries.length})`)
  ));
  if (entries.length === 0) {
    details.appendChild(el("p", { className: "bucket-empty" },
      document.createTextNode("None.")
    ));
    return details;
  }
  const list = el("ul", { className: "bucket-list" });
  entries.sort(sortByTierThenKey);
  for (const e of entries) {
    const row = el("li", { className: "bucket-row" },
      el("code", { className: "key" }, document.createTextNode(e.canonical_key)),
      el("span", { className: "tier-tag" }, document.createTextNode(e.parsed.tier)),
      el("button", {
        className: "btn link resume-link",
        onclick: () => {
          closeReviewSummary();
          jumpToStepByEntryKey(e.canonical_key);
        },
      }, document.createTextNode("resume ↗"))
    );
    list.appendChild(row);
  }
  details.appendChild(list);
  return details;
}

function renderMismatchBucket(entries, defaultOpen) {
  const details = el("details", { className: "summary-bucket mismatch-bucket" });
  details.open = !!defaultOpen;
  details.appendChild(el("summary", { className: "bucket-summary" },
    document.createTextNode(`⚠ DIFFERS FROM CLUSTER DECISION (${entries.length})`)
  ));
  if (entries.length === 0) {
    details.appendChild(el("p", { className: "bucket-empty" },
      document.createTextNode("None.")
    ));
    return details;
  }
  const list = el("ul", { className: "bucket-list" });
  entries.sort(sortByTierThenKey);
  for (const e of entries) {
    const ev = state.entries[e.canonical_key];
    const cp = clusterPrefillCandidate(e);
    const yourVerdict = ev.verdict + (ev.merge_into ? ` → ${ev.merge_into}` : "");
    const clusterShape = cp && !cp.info_only && cp.verdict
      ? cp.verdict + (cp.merge_into ? ` → ${cp.merge_into}` : "")
      : "(no current suggestion)";
    const row = el("li", { className: "bucket-row" },
      el("code", { className: "key" }, document.createTextNode(e.canonical_key)),
      document.createTextNode(` — your verdict `),
      el("code", {}, document.createTextNode(yourVerdict)),
      document.createTextNode(`, ${ev.cluster_mismatch} suggests `),
      el("code", {}, document.createTextNode(clusterShape)),
      el("button", {
        className: "btn link edit-link",
        onclick: () => {
          closeReviewSummary();
          jumpToStepByEntryKey(e.canonical_key);
        },
      }, document.createTextNode("edit ↗"))
    );
    list.appendChild(row);
  }
  details.appendChild(list);
  return details;
}
```

**Step 2: Add `openReviewSummary` / `closeReviewSummary` + state for summary mode**

```js
// UI-only state for whether the summary is currently open (not persisted)
let summaryOpen = false;

function openReviewSummary() {
  summaryOpen = true;
  renderCurrentStep();
}

function closeReviewSummary() {
  summaryOpen = false;
  renderCurrentStep();
}

// Helper for cluster-row [edit] link
function jumpToStepByClusterId(signalId) {
  const idx = stepSequence.findIndex((s) => s.kind === "cluster" && s.id === signalId);
  if (idx >= 0) {
    state.wizard.step_index = idx;
    saveState();
    renderCurrentStep();
  }
}
```

**Step 3: Wire summary into `renderCurrentStep` dispatch**

Find `renderCurrentStep` (grep `function renderCurrentStep`). Add the summary branch at the top of the dispatch:

```js
function renderCurrentStep() {
  // ... existing element setup
  if (summaryOpen) {
    card.replaceWith(renderReviewSummary());
    // Hide bottom nav while summary is open
    document.getElementById("wizardNav")?.classList.add("hidden");
    return;
  }
  // ... rest of existing dispatch (entry / cluster / end-screen)
}
```

Also ensure the existing nav-show path runs (`document.getElementById("wizardNav").classList.remove("hidden")`) when transitioning back from summary.

**Step 4: Replace `renderEndScreen` to use summary**

Find `renderEndScreen()` (~line 2257). Replace its body with:

```js
function renderEndScreen() {
  // M2.3: at the natural end of the wizard, render the full review summary
  // rather than the M1.15 simple end screen. The summary's "Save & Export"
  // button is the primary CTA from here.
  return renderReviewSummary();
}
```

**Step 5: Wire the top-bar "Review so far" button**

Find the M1.4 `#reviewSoFarBtn` (grep `reviewSoFarBtn\|Review so far`). It's currently disabled. In `init()` (grep `function init`), add:

```js
const reviewBtn = document.getElementById("reviewSoFarBtn");
if (reviewBtn) {
  reviewBtn.disabled = false;
  reviewBtn.addEventListener("click", openReviewSummary);
}
```

**Step 6: Add CSS for the summary**

Append to the CSS block:

```css
.review-summary {
  max-width: 760px;
}

.summary-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: var(--text-strong);
}

.summary-counts {
  margin: 0 0 16px;
  color: var(--muted);
}

.summary-bucket {
  margin: 12px 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--panel);
}

.summary-bucket > .bucket-summary {
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
  user-select: none;
}

.summary-bucket[open] > .bucket-summary {
  border-bottom: 1px solid var(--border);
}

.deferred-bucket > .bucket-summary,
.mismatch-bucket > .bucket-summary {
  color: var(--warn);
}

.bucket-list {
  margin: 0;
  padding: 8px 14px 14px;
  list-style: none;
}

.bucket-row {
  padding: 6px 0;
  border-bottom: 1px dotted var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.bucket-row:last-child {
  border-bottom: none;
}

.bucket-row .tier-tag {
  font-size: 12px;
  color: var(--hint);
  margin-left: auto;
}

.bucket-row .btn.link.edit-link,
.bucket-row .btn.link.resume-link {
  padding: 0;
  font-size: 13px;
  color: var(--accent);
  background: none;
  border: none;
  text-decoration: underline dotted;
  cursor: pointer;
}

.bucket-empty {
  margin: 0;
  padding: 10px 14px;
  color: var(--hint);
  font-style: italic;
}

.fold-target-group {
  border-top: 1px dotted var(--border);
  padding: 10px 14px;
}

.fold-target-group:first-of-type {
  border-top: none;
}

.fold-target-header {
  margin: 0 0 6px;
  font-size: 13.5px;
  color: var(--muted);
}

.summary-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.summary-footer .btn.primary {
  font-size: 15px;
  padding: 10px 20px;
}
```

**Step 7: Build + browser smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Probes:

**Probe 1 — End-of-wizard summary renders all 7 sections:**

```js
// Drive to end-screen sentinel
state.wizard.step_index = stepSequence.length;
renderCurrentStep();
const sections = Array.from(document.querySelectorAll(".summary-bucket > summary")).map((s) => s.textContent);
return sections;
```

Expected:
```js
[
  "KEEP AS CONCEPT (N)",
  "FOLD INTO ANOTHER (N)",
  "ADD NEW CONCEPT (0)",
  "REMOVE (N)",
  "CLUSTER CHOICES (N of 5)",
  "⚠ DECIDE LATER (N)",
  "⚠ DIFFERS FROM CLUSTER DECISION (N)"
]
```

**Probe 2 — Attention-needer sections default-open when non-zero:**

```js
// Set up: 1 deferred + 1 mismatch entry, walk to summary
state.wizard.deferred = ["plant_parts"];  // bare canonical_key — matches what navDefer actually writes (NOT "entry:"-prefixed)
state.entries["narrative_writing"] = { verdict: "keep", cluster_mismatch: "CON-12" };
state.cluster_signals["CON-12"] = 2;
saveState();
state.wizard.step_index = stepSequence.length;
renderCurrentStep();
const buckets = document.querySelectorAll(".summary-bucket");
const openStates = Array.from(buckets).map((b) => ({
  title: b.querySelector("summary").textContent,
  open: b.open,
}));
return openStates;
```

Expected: KEEP/FOLD/NEW/REMOVE/CLUSTER all `open: false`; DECIDE LATER `open: true` (1 deferred); DIFFERS `open: true` (1 mismatch).

**Probe 3 — [edit ↗] link jumps + closes summary:**

```js
// Click the first edit link on the FOLD section
const editLinks = document.querySelectorAll(".fold-bucket .edit-link");
const firstKey = state.entries[Object.keys(state.entries).find((k) => state.entries[k].verdict === "merge")]?.merge_into; // approximate
editLinks[0]?.click();
return {
  summaryClosed: !document.querySelector(".review-summary"),
  cardKind: stepSequence[state.wizard.step_index]?.kind,
};
```

Expected: `summaryClosed: true`; `cardKind: "entry"`.

**Probe 4 — Mid-flow "Review so far" button:**

```js
// Reset to step 0
state.wizard.step_index = 0;
renderCurrentStep();
const btn = document.getElementById("reviewSoFarBtn");
btn.click();
return { summaryOpen: !!document.querySelector(".review-summary") };
```

Expected: `summaryOpen: true`. (Click [← Back to wizard] returns to step 0.)

**Probe 5 — Save & Export still works from summary:**

```js
// Stub onExport to record the call
const origOnExport = window.onExport;
let exportCalled = 0;
window.onExport = () => { exportCalled++; };
document.querySelector(".save-export").click();
window.onExport = origOnExport;
return { exportCalled };
```

Expected: `exportCalled: 1`.

**Probe 6 — Empty-export SHA invariant unchanged:**

```js
state = defaultState();
saveState();
const md = buildExportMarkdown();
return await sha256(md);
```

Expected: `0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03`.

**Step 8: Status doc + commit**

```bash
git add scripts/concepts-worksheet-tool.template.html docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): review summary screen (§11)

M2.3 (Batch 2).

Replaces M1.15's simple end screen with the full design §11 review
summary: 7 collapsible sections per the design mock — KEEP / FOLD /
NEW / REMOVE / CLUSTER CHOICES / DECIDE LATER / DIFFERS FROM CLUSTER.

Attention-needers (DECIDE LATER, DIFFERS) default-open when count > 0
so reviewers see them without expanding. Other sections default-closed.

FOLD bucket groups entries by merge target with a 'Folding into <code>X
</code> (N):' sub-header per target; sort within group by tier (§11 →
§12 → §13) then canonical_key.

Each row has an [edit ↗] / [resume ↗] link that closes the summary +
calls jumpToStepByEntryKey (M1.10 helper). Cluster rows use a new
jumpToStepByClusterId helper.

Mid-flow access: the M1.4-stubbed top-bar 'Review so far' button now
wires to openReviewSummary; [← Back to wizard] returns to the step
that was open when summary was launched (preserved via the existing
state.wizard.step_index — no separate stack needed since renderCurrent
Step is single-source-of-truth for the step).

Save & Export from the summary footer works (same onExport handler as
the Advanced menu).

Empty-export SHA invariant unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 2.4: Wizard intro rewrite (3-step modal)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` — replace the contents of `#onboardingModal` (lines ~993-1010, M1.4 stub) with the 3-step intro flow; extend the onboarding-modal JS helpers (`showOnboarding`, `dismissOnboarding`); add CSS for the step indicator and Next/Back/Skip buttons.

**What this milestone does:**

Replaces the M1.4 single-paragraph onboarding stub with a 3-step intro modal per design §14 list. The 3 steps:

1. **"What you're doing"** — frames the task: 208 worksheet entries; each is a "concept" candidate; goal is to commit a verdict for each so the curriculum team can re-tag lessons confidently.
2. **"Three work types"** — explains the Confirm / Resolve / Decide modes in plain language: most entries are quick confirmations, a few clusters need a shape decision, and the §11 high-impact entries need conscious calls.
3. **"Save your work"** — explains the auto-save badge + Advanced menu's Save & Export + Import path. Closes the intro.

Navigation: Back / Next buttons (Back disabled on step 1; Next is "Get started" on step 3). A small "Skip intro" link at top-right. Step indicator dots (●○○ / ○●○ / ○○●). Modal persists across navigation; closing via Skip or step-3 Get-started sets `localStorage.intro_shown = "1"` so the modal doesn't auto-reopen on next session reload.

Re-openable via Advanced menu's "Show wizard intro" item (already wired in M1.14).

> **Plain-language constraint (curriculum-team audience) — applies to ALL copy in this milestone; the provisional draft copy below must be reconciled to it.** The reader is a curriculum reviewer, not a developer. Keep their attention on **the concepts themselves and whether/how each applies to the curriculum** — never on the machinery we built underneath. Do **not** make them learn our internal vocabulary: avoid `§11`/`§12`/`§13`, "tier"/"high-impact tier," `CON-xx`, "cluster signal," "verdict," "merge_into"/"canonical key," "metadata," "the corpus," and don't teach "Confirm/Resolve/Decide" as named modes. Prefer plain outcomes — *keep it · it's the same as another concept · give it a clearer name · it doesn't belong* — and plain framing of the work ("most are quick confirmations; a few groups of closely-related concepts need one shared decision; a handful are worth a careful call"). Where the shipped UI still shows internal shorthand the reader will see (the `§11`-style strip, raw `CON-xx` ids, the mode chips), either gloss it in plain words here or leave it for the separate "soften in-UI shorthand" decision — do not silently present the jargon as expected knowledge. (User directive, 2026-05-28.)

**Step 1: Replace `#onboardingModal` body**

Find the modal body (grep `id="onboardingModal"`). Replace its contents (the inner HTML) with the 3-step shell:

```html
<dialog id="onboardingModal" class="wizard-intro">
  <div class="intro-step" data-step="1">
    <h2>Reviewing concepts together</h2>
    <p>You're walking through <strong>208 concept candidates</strong> from our lesson library worksheet. Each one is something we might use to tag and find lessons by — your decisions decide which stay, which fold into other concepts, and which we drop.</p>
    <p>Don't worry about reading every prose note. Claude has pre-filled suggestions where it can. Your job is to confirm or adjust.</p>
  </div>
  <div class="intro-step" data-step="2" hidden>
    <h2>Three kinds of work</h2>
    <ul class="intro-modes">
      <li><strong>Confirm</strong> — most entries (§12 / §13). Claude suggested a verdict; just click <em>Agree</em> or pick something else.</li>
      <li><strong>Resolve</strong> — 5 clusters of related concepts where one decision sets the shape for several members at once.</li>
      <li><strong>Decide</strong> — 32 high-impact concepts (§11) that need your conscious call. No pre-filled radio; pick from a blank slate.</li>
    </ul>
    <p>The wizard routes each entry to the right mode automatically.</p>
  </div>
  <div class="intro-step" data-step="3" hidden>
    <h2>Saving your work</h2>
    <p>Your decisions auto-save to this browser <strong>every few seconds</strong> — the "Saved locally" badge at the top right confirms it.</p>
    <p>When you're done (or want to take a break), open the Advanced menu and click <strong>Save &amp; Export markdown ↓</strong>. You'll get a file you can email to the team. You can also re-import it later to pick up where you left off.</p>
    <p>That's it — let's go.</p>
  </div>

  <footer class="intro-footer">
    <div class="step-indicator" aria-label="Step indicator">
      <span class="dot" data-step="1"></span>
      <span class="dot" data-step="2"></span>
      <span class="dot" data-step="3"></span>
    </div>
    <div class="intro-actions">
      <button type="button" class="btn ghost" id="introSkip">Skip intro</button>
      <button type="button" class="btn ghost" id="introBack" disabled>← Back</button>
      <button type="button" class="btn primary" id="introNext">Next →</button>
    </div>
  </footer>
</dialog>
```

**Step 2: Extend onboarding JS helpers**

Find `showOnboarding` / `dismissOnboarding` (grep `function showOnboarding\|function dismissOnboarding`). Replace with multi-step versions:

```js
let introStep = 1;

function showOnboarding() {
  const dlg = document.getElementById("onboardingModal");
  if (!dlg) return;
  introStep = 1;
  syncIntroStep();
  if (typeof dlg.showModal === "function") {
    dlg.showModal();
  } else {
    dlg.setAttribute("open", "");
  }
}

function dismissOnboarding(markAsSeen) {
  const dlg = document.getElementById("onboardingModal");
  if (!dlg) return;
  if (typeof dlg.close === "function") {
    dlg.close();
  } else {
    dlg.removeAttribute("open");
  }
  if (markAsSeen) {
    try {
      localStorage.setItem("intro_shown", "1");
    } catch (_e) { /* localStorage may be unavailable */ }
  }
}

function syncIntroStep() {
  const dlg = document.getElementById("onboardingModal");
  if (!dlg) return;
  dlg.querySelectorAll(".intro-step").forEach((el) => {
    const step = parseInt(el.dataset.step, 10);
    if (step === introStep) {
      el.removeAttribute("hidden");
    } else {
      el.setAttribute("hidden", "");
    }
  });
  dlg.querySelectorAll(".step-indicator .dot").forEach((dot) => {
    const step = parseInt(dot.dataset.step, 10);
    dot.classList.toggle("active", step === introStep);
  });
  const backBtn = dlg.querySelector("#introBack");
  const nextBtn = dlg.querySelector("#introNext");
  backBtn.disabled = introStep === 1;
  nextBtn.textContent = introStep === 3 ? "Get started" : "Next →";
}

function introNext() {
  if (introStep === 3) {
    dismissOnboarding(true);
    return;
  }
  introStep += 1;
  syncIntroStep();
}

function introBack() {
  if (introStep === 1) return;
  introStep -= 1;
  syncIntroStep();
}

function maybeShowOnboarding() {
  let shown = null;
  try {
    shown = localStorage.getItem("intro_shown");
  } catch (_e) { shown = null; }
  if (!shown) showOnboarding();
}
```

Wire the button handlers in `init()`:

```js
document.getElementById("introNext")?.addEventListener("click", introNext);
document.getElementById("introBack")?.addEventListener("click", introBack);
document.getElementById("introSkip")?.addEventListener("click", () => dismissOnboarding(true));
```

**Step 3: Add CSS for the intro modal**

Append to the CSS block:

```css
dialog.wizard-intro {
  max-width: 560px;
  padding: 24px 28px 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  color: var(--text);
}

dialog.wizard-intro::backdrop {
  background: rgba(20, 20, 20, 0.5);
}

dialog.wizard-intro h2 {
  margin: 0 0 14px;
  font-size: 20px;
  color: var(--text-strong);
}

dialog.wizard-intro p,
dialog.wizard-intro li {
  font-size: 14.5px;
  line-height: 1.5;
}

dialog.wizard-intro .intro-modes {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}

dialog.wizard-intro .intro-modes li {
  margin: 8px 0;
  padding: 8px 12px;
  background: var(--panel-soft);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
}

dialog.wizard-intro .intro-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.step-indicator {
  display: flex;
  gap: 6px;
}

.step-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-strong);
  transition: background 120ms ease;
}

.step-indicator .dot.active {
  background: var(--accent);
}

.intro-actions {
  display: flex;
  gap: 10px;
}
```

**Step 4: Build + browser smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Probes:

**Probe 1 — Intro auto-opens on first session (no localStorage `intro_shown` key):**

```js
localStorage.removeItem("intro_shown");
location.reload();
// After reload
const dlg = document.getElementById("onboardingModal");
return { isOpen: dlg?.hasAttribute("open") || dlg?.open };
```

Expected: `isOpen: true`.

**Probe 2 — Step navigation:**

```js
// Modal is open at step 1
const step1 = document.querySelector(".intro-step[data-step='1']");
const back = document.getElementById("introBack");
const next = document.getElementById("introNext");
const initial = {
  step1Visible: !step1.hasAttribute("hidden"),
  backDisabled: back.disabled,
  nextText: next.textContent,
};
next.click();
const step2 = document.querySelector(".intro-step[data-step='2']");
const afterNext = {
  step2Visible: !step2.hasAttribute("hidden"),
  backDisabled: back.disabled,
  nextText: next.textContent,
};
next.click();
const step3 = document.querySelector(".intro-step[data-step='3']");
const afterNext2 = {
  step3Visible: !step3.hasAttribute("hidden"),
  nextText: next.textContent,
};
return { initial, afterNext, afterNext2 };
```

Expected:
```js
{
  initial: { step1Visible: true, backDisabled: true, nextText: "Next →" },
  afterNext: { step2Visible: true, backDisabled: false, nextText: "Next →" },
  afterNext2: { step3Visible: true, nextText: "Get started" }
}
```

**Probe 3 — "Get started" on step 3 dismisses + marks shown:**

```js
document.getElementById("introNext").click();
const dlg = document.getElementById("onboardingModal");
return {
  isOpen: dlg?.hasAttribute("open") || dlg?.open,
  introShown: localStorage.getItem("intro_shown"),
};
```

Expected: `isOpen: false`, `introShown: "1"`.

**Probe 4 — Skip works:**

```js
localStorage.removeItem("intro_shown");
showOnboarding();
document.getElementById("introSkip").click();
return {
  isOpen: document.getElementById("onboardingModal").hasAttribute("open"),
  introShown: localStorage.getItem("intro_shown"),
};
```

Expected: `isOpen: false`, `introShown: "1"`.

**Probe 5 — Advanced menu "Show wizard intro" re-opens regardless of localStorage:**

```js
// intro_shown is "1" from probe 3
showOnboarding();
return { isOpen: document.getElementById("onboardingModal").hasAttribute("open") };
```

Expected: `isOpen: true`.

**Step 5: Status doc + commit**

```bash
git add scripts/concepts-worksheet-tool.template.html docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): wizard intro rewrite (3-step modal)

M2.4 (Batch 2).

Replaces the M1.4 single-paragraph onboarding stub with a 3-step intro
modal per design §14:

  1. 'What you're doing' — frames the 208-entry task in plain language
  2. 'Three work types' — explains Confirm / Resolve / Decide in
     plain language with a 1-2 line description each
  3. 'Save your work' — explains auto-save, Save & Export, and Import

Navigation: Back / Next / Skip buttons + step indicator dots. Modal
auto-opens on first session (no localStorage 'intro_shown' key); Skip
and step-3 'Get started' both mark intro as seen. Advanced menu's
'Show wizard intro' re-opens regardless of state.

CSS additions: dialog.wizard-intro layout + step-indicator dots +
intro-modes left-bordered cards for the 3 modes.

Copy is plain-language draft; user reviews before this commit lands
(per user preference for plain language and active review).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 2.5: Decision-debt counter polish (zero-state color)

**Files:**
- Modify: `scripts/concepts-worksheet-tool.template.html` — extend `updateDecisionDebt()` to tag the top-bar counter elements with `data-zero` when count drops to 0; add CSS for the zero-state color shift.

**What this milestone does:**

Two pieces:

1. **Mismatch-recompute trigger verification** — M2.2 already wires `recomputeMismatchForEntry` into `onCommit`, which in turn fires `updateDecisionDebt`. M2.5 just verifies this chain via a probe (no new code unless the verification surfaces a gap).
2. **Zero-state color shift** — when a counter (your call / to check / group decisions) hits 0, the corresponding `.debt-decide` / `.debt-confirm` / `.debt-resolve` counter span gets `data-zero="true"` set. CSS shifts the color from the current accent-red / muted-gray to a muted-green (`var(--keep)` token from existing palette) to give a low-key "this bucket is done" cue.

The top-bar mismatch count stays OUT of the top bar per design §10/§441 (decide-later count is similarly kept out — same rationale for mismatch).

**Step 1: Extend `updateDecisionDebt`**

Find `updateDecisionDebt()` (~line 2340). It currently writes counts to the three counter elements. Add a `data-zero` toggle per element:

```js
function updateDecisionDebt() {
  // ... existing count logic: locals `toDecide`, `toConfirm`, `unresolvedClusters` ...
  document.getElementById("debtDecideCount").textContent = toDecide.toString();
  document.getElementById("debtConfirmCount").textContent = toConfirm.toString();
  document.getElementById("debtResolveCount").textContent = unresolvedClusters.toString();

  // M2.5: zero-state color cue. Tag the counter SPAN (top-bar HTML classes:
  // debt-decide / debt-confirm / debt-resolve). Do NOT rewrite the span's
  // textContent — the plain labels are static HTML (set in M2.0) and the count
  // lives in the inner <b id="debt*Count">; setting span.textContent would
  // clobber that <b>.
  document.querySelector(".debt-decide").dataset.zero  = toDecide === 0 ? "true" : "false";
  document.querySelector(".debt-confirm").dataset.zero = toConfirm === 0 ? "true" : "false";
  document.querySelector(".debt-resolve").dataset.zero = unresolvedClusters === 0 ? "true" : "false";
  // ... existing progress-bar logic stays unchanged ...
}
```

(The post-M1.17 `updateDecisionDebt` uses locals `toDecide` / `toConfirm` / `unresolvedClusters` and writes counts into the `<b id="debt*Count">` elements — verified against the template. The counter SPANs carry classes `debt-decide` / `debt-confirm` / `debt-resolve`; their plain labels are static HTML set in M2.0, so M2.5 adds only the `data-zero` tags.)

**Step 2: Add zero-state CSS**

Append to the CSS block:

```css
.debt-decide[data-zero="true"],
.debt-confirm[data-zero="true"],
.debt-resolve[data-zero="true"] {
  color: var(--keep);
  opacity: 0.7;
}
```

**Step 3: Build + browser smoke**

```bash
python3 scripts/build-concepts-tool.py --build-html
```

Probes:

**Probe 1 — Baseline: decide non-zero, no zero-state:**

```js
// Wipe state
state = defaultState();
saveState();
updateDecisionDebt();
const decideEl = document.querySelector(".debt-decide");
return {
  text: decideEl.textContent,
  dataZero: decideEl.dataset.zero,
  computedColor: getComputedStyle(decideEl).color,
};
```

Expected: `text` contains "your call" with a non-zero count (e.g. "46 your call"); `dataZero: "false"`.

**Probe 2 — Drive decide to zero:**

```js
// Mark every Decide-mode entry as committed (entryMode returns "Decide", capitalized)
ENTRIES.forEach((e) => {
  if (entryMode(e) === "Decide") {
    state.entries[e.canonical_key] = { verdict: "keep" };
  }
});
saveState();
updateDecisionDebt();
const decideEl = document.querySelector(".debt-decide");
return {
  text: decideEl.textContent,
  dataZero: decideEl.dataset.zero,
  computedColor: getComputedStyle(decideEl).color,
};
```

Expected: `text: "0 your call"`, `dataZero: "true"`, computedColor different from probe 1 (greener / lower opacity).

**Probe 3 — Mismatch recompute fires updateDecisionDebt:**

```js
// Set up: resolve CON-12 to option 2 (causes mismatches for non-merge committers)
state.cluster_signals["CON-12"] = 2;
// Commit narrative_writing with verdict=keep (will mismatch)
const e = ENTRIES_BY_KEY.get("narrative_writing");
const beforeCallCount = window.__updateDecisionDebtCalls || 0;
window.__updateDecisionDebtCalls = beforeCallCount;
// Patch updateDecisionDebt to record calls
const _orig = updateDecisionDebt;
window.updateDecisionDebt = function () {
  window.__updateDecisionDebtCalls += 1;
  return _orig.apply(this, arguments);
};
// Drive commit
setEntryState("narrative_writing", { verdict: "keep" });
recomputeMismatchForEntry(e);
window.updateDecisionDebt = _orig;
return { delta: window.__updateDecisionDebtCalls - beforeCallCount };
```

Expected: `delta` >= 1 (at minimum the `setEntryState` → `saveState` chain... but `setEntryState` doesn't call updateDecisionDebt directly. The `onCommit` call path does. So this probe specifically tests the recompute chain by NOT using onCommit. The recompute itself shouldn't call updateDecisionDebt directly per M2.2's code).

Adjust: M2.5 doesn't add an updateDecisionDebt call to the mismatch path because counters don't surface mismatch. So this probe just confirms M2.2's contract (no surprise updateDecisionDebt firing). Expected: `delta: 0`. The verification is that `recomputeMismatchForEntry` does NOT trigger `updateDecisionDebt` — mismatch is invisible to the top-bar counters.

If the user later wants mismatch surfaced in the top bar (despite design §10), that's a separate decision.

**Step 4: Status doc + commit**

```bash
git add scripts/concepts-worksheet-tool.template.html docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
tools(concepts-worksheet): zero-state color for decision-debt counters

M2.5 (Batch 2).

Top-bar counters (your call / to check / group decisions) now toggle a
data-zero attribute on their elements when the count reaches 0. CSS
shifts color from accent-red / muted-gray to the muted-green keep
token + slight opacity so the 'done' state reads as a low-key 'this
bucket is empty' cue.

Mismatch is intentionally NOT surfaced in the top bar: design §10 +
§441 keep both decide-later and mismatch out of the calm top-bar
strip (mismatch is highlighted in the review summary instead).

Verified via probe that recomputeMismatchForEntry does not fire
updateDecisionDebt — the mismatch flag and the top-bar counts are
distinct concerns.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 2.6: Full smoke check gate (8/8)

This is a verification milestone — only commits the status doc update. No code changes unless smoke surfaces a regression.

**Run all 8 design §15 smoke checks** end-to-end against the M2.5 build:

| # | Check | Batch-1 status | M2.6 expectation |
|---|---|---|---|
| 1 | Empty-export SHA invariant | PASS (M1.17) | PASS (no regressions) |
| 2 | Decide-later semantics | PASS (M1.17) | PASS |
| 3 | Pre-fill non-commit | PASS (M1.17) | PASS |
| 4 | Commit roundtrip | PASS (M1.17) | PASS (now includes cluster_mismatch which is local-only — should NOT appear in roundtrip) |
| 5 | Merge picker high-confidence shortcut | PASS (M1.17, but data-unreachable in Batch 1) | PASS + **now reachable** via cluster-derived prefill on Decide-mode members |
| 6 | Cluster Resolve + member walk | DEFERRED | PASS — pick CON-12 option 2 → walk to narrative_writing → "Based on your earlier group decision: Fold into `writing`" → Agree → state writes merge+target atomically |
| 7 | Mismatch flag | DEFERRED | PASS — pick CON-12 option 2 → commit narrative_writing with verdict=keep → callout renders + drawer auto-opens + state has cluster_mismatch="CON-12"; change CON-12 to option 0 → flag clears |
| 8 | Merge-target extraction rate | PASS (M1.17) | PASS — parser untouched; baseline 53/78 (68%) unchanged |

**Step 1: Run each check**

For each check, the verification probe is identical to the Batch 1 M1.17 gate (smoke #1–5, #8) with the addition of two NEW checks:

**#6 — Cluster Resolve + member walk:**

```js
state = defaultState();
saveState();
// Pick CON-12 option 2 (merge sub-types into writing)
window.__test_setClusterState("CON-12", 2);
// Walk to narrative_writing (§12, sub-type — should be Confirm-mode with cluster prefill)
window.__test_jumpToEntryByKey("narrative_writing");
const card = document.getElementById("wizardCard");
const recHeadline = card.querySelector(".claude-rec h3, .rec-headline")?.textContent;
const primaryBtn = card.querySelector(".primary-agree");
return {
  recHeadlineContains: recHeadline?.includes("Based on your earlier group decision"),
  primaryBtnText: primaryBtn?.textContent,
};
```

Expected:
```js
{
  recHeadlineContains: true,
  primaryBtnText: "✓ Agree — Fold into `writing`"
}
```

Click the primary button and confirm `state.entries.narrative_writing` is `{ verdict: "merge", merge_into: "writing" }`. Also walk to `writing` (§11) and confirm it gets the "Based on your earlier group decision: Keep as concept" caption but no radio prefill (W17).

**#7 — Mismatch flag:**

```js
state = defaultState();
saveState();
window.__test_setClusterState("CON-12", 2);
window.__test_jumpToEntryByKey("narrative_writing");
// Click "Pick something else" → "Keep as concept" (override cluster suggestion)
document.querySelector("details.pick-other summary").click();
Array.from(document.querySelectorAll('details.pick-other input[type="radio"]'))
  .find(r => r.value === "keep").click();
const ev = state.entries.narrative_writing;
const calloutVisible = !!document.querySelector(".cluster-mismatch-callout");
const drawerAutoOpen = autoOpenSet.has("narrative_writing");
return { ev, calloutVisible, drawerAutoOpen };
```

Expected: `ev.verdict: "keep"`, `ev.cluster_mismatch: "CON-12"`, `calloutVisible: true`, `drawerAutoOpen: true`.

Then change cluster answer to option 0 and confirm:

```js
window.__test_setClusterState("CON-12", 0);
return { ev: state.entries.narrative_writing };
```

Expected: `ev: { verdict: "keep" }` (no cluster_mismatch field — recompute cleared it).

**Step 2: Smoke check matrix fill**

Update `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md` smoke matrix to PASS for #1–8.

**Step 3: Status doc + commit**

```bash
git add docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
docs(concepts-worksheet): M2.6 — full smoke gate 8/8 PASS

M2.6 (Batch 2).

All 8 design §15 smoke checks PASS against the M2.5 build. New checks
#6 (cluster Resolve + member walk) and #7 (mismatch flag) both
verified end-to-end via chrome-devtools-mcp probes. Other checks
(#1–5, #8) re-verified with no regressions.

Batch 2 SHIPPED.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Milestone 2.7: README + curriculum-team handoff doc update

**Files:**
- Modify: `docs/plans/concepts-worksheet-form/README.md` — rewrite the "How to use" section for the wizard flow; document keyboard shortcuts (M1.13: K/M/N/D/L/Enter/←); document the Confirm/Resolve/Decide framing; document the review summary's role as the escape hatch.

**What this milestone does:**

Replaces the Batch 1 README content (which describes the long-scroll tool) with curriculum-team-facing docs for the wizard. Audience: a non-technical reviewer who's about to open the HTML file and start reviewing 208 entries.

> **Plain-language constraint (same directive as M2.4) — applies to ALL README copy.** Keep the reader on **the concepts and whether/how each applies to the curriculum**, never on our build machinery. Avoid `§11`/`§12`/`§13`, "tier," `CON-xx`, "cluster signal," "verdict," "merge_into"/"canonical key," "metadata," "the corpus"; don't teach "Confirm/Resolve/Decide" as named modes. Describe what the reviewer *does* in plain outcomes — *keep it · it's the same as another concept · give it a clearer name · it doesn't belong*. Where the UI shows internal shorthand the reader can't avoid (the `§`-number strip, raw `CON-xx` ids, mode chips), translate it to plain words or flag it for the separate "soften in-UI shorthand" decision rather than teaching the jargon. (User directive, 2026-05-28.)

**Step 1: Inspect current README**

```bash
ls -la docs/plans/concepts-worksheet-form/README.md 2>&1 || echo "MISSING"
wc -l docs/plans/concepts-worksheet-form/README.md 2>&1 || echo "n/a"
```

If missing, create new. If present, Read to understand current content before rewriting.

**Step 2: Write the new README**

Target content (sections — adjust per current README baseline):

```markdown
# Concepts Worksheet Wizard — How to Use

> A self-contained HTML tool for the curriculum team to review 208 concept candidates from the Stage 1 worksheet. Open the file in any modern browser; no install required.

## Opening the tool

Double-click `concepts-worksheet-tool.html`. It opens in your default browser. Everything runs locally — no network, no server.

## What you're doing

You're walking through 208 concept candidates one entry at a time. For each, you commit a verdict:

- **Keep as concept** — yes, this is a concept worth using
- **Fold into another** — this overlaps with another concept; merge them
- **Add new concept** — this isn't on the list but should be (rare)
- **Remove** — drop this; not useful for tagging

Your decisions auto-save to this browser. When you're done (or want to take a break), click **Save & Export markdown ↓** in the Advanced menu to download a file you can email to the team.

## Three modes the wizard routes you through

The wizard automatically picks the right mode for each entry:

- **Confirm** (most entries) — Claude has pre-filled a verdict; just click Agree or pick something else
- **Resolve** (5 clusters) — a group of related concepts where one decision sets the shape for the whole group
- **Decide** (32 high-impact entries) — high-stakes calls where you start from a blank radio

## Keyboard shortcuts

- **Enter** — confirm + advance (same as clicking Save·Next)
- **←** — Previous step
- **L** — Decide later (defer this entry; come back to it via the review summary)
- **K** — Keep
- **M** — Fold (Merge)
- **N** — New
- **D** — Drop

## Review summary

Click **Review so far** in the top bar at any time to see everything you've committed, grouped by verdict. The summary highlights:

- ⚠ **Decide later** entries (you can resume these)
- ⚠ **Differs from cluster decision** (places where your verdict disagrees with the cluster shape you picked — usually you have a reason, but worth a glance)

Use **Save & Export markdown ↓** from the summary footer when ready.

## Sharing your work

The exported markdown file can be emailed to the team. If you want to resume later, open the tool again and click Advanced → **Import a saved markdown file…** to load your previous state.
```

**Step 3: Build (verify nothing else broke) + commit**

```bash
python3 scripts/build-concepts-tool.py --verify-only
```

Expected: existing parser output, no changes.

```bash
git add docs/plans/concepts-worksheet-form/README.md docs/plans/2026-05-15-concepts-worksheet-wizard-status.md
git commit -m "$(cat <<'EOF'
docs(concepts-worksheet): rewrite curriculum-team README for the wizard

M2.7 (Batch 2).

Replaces the Batch 1 long-scroll README with curriculum-team-facing
docs for the wizard:
- Opening the tool (double-click HTML file; local-only)
- The 4 verdict choices in plain language
- Confirm / Resolve / Decide framing (3 modes)
- Keyboard shortcuts (K/M/N/D/L/Enter/←)
- Review summary as the escape-hatch + Save & Export pattern
- Import-a-saved-file workflow for resuming work

Audience: non-technical reviewer about to open the file for the first
time. No jargon; matches the user's plain-language preference and the
Batch 1 wizard's calm-UI framing.

Batch 2 fully closed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Batch 3 — tool polish (from the 2026-05-28 pre-handoff dry run)

A pre-handoff dry run (two role-play agents in a real browser — a non-technical first-time reviewer + a curriculum domain skeptic) validated the wizard's structure (intro, group cards, review summary, auto-save, export fidelity, carry-down) but surfaced real issues the 8/8 smoke gate couldn't. **Batch 3 fixes the bounded, display-layer ones.** Two findings are out of Batch-3 scope and tracked separately:
- **B2 — internal jargon in the per-concept reasoning** (`claude_notes` cite code paths, `D-Cx`/`CON-xx` codes, `§`-numbers, raw field names, lesson-id hashes). The dominant usability risk; the known deliberate M2.0 deferral. Its own initiative — see the `concepts-reasoning-rewrite` kickoff scaffold. The B2 rewrite absorbs the W3 jargon cleanup.
- **W3 — content errors in the worksheet data** (e.g. `measurement`'s "anatomically more specific" copy-paste artifact from `plant_parts`). Lives in the source worksheet → owned by the metadata-rebuild track; folded into the B2 design (a rewrite pass surfaces + fixes them; genuine factual errors that ride into the export get a targeted source correction).

**Carryover rules (same as Batch 2, never relaxed):** every fix is **display-only** — the empty-export SHA invariant (`0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03`) must stay byte-identical; **parser untouched**; **plain-language locked** (curriculum-team voice, no `§`/`CON-xx`/tier/verdict/cluster/canonical-key on screen); export vocab unchanged; stay on `tools/concepts-worksheet-form`, no push/PR; **never stage the generated HTML**. Reviewer-facing copy (M3.1 legend, M3.6 hint, M3.7 labels) is prose → show the user. Orchestrate substantive milestones via the workflow → main-loop-verify cadence; trivially small copy tweaks may run inline + main-loop browser-verified. All cited line numbers drift — `grep -n` the anchor first.

| # | Fix | Dry-run finding | Severity |
|---|---|---|---|
| **M3.1** | Decide-mode ("Your call") legend made conditional — stop claiming "there's no suggested answer here" when a recommendation IS shown | "Your call" cards contradict themselves | blocker |
| **M3.2** | Verdict ↔ "Decide later" mutually exclusive — each concept in exactly one review-summary bucket | one concept showed as both Removed + Decide-later | should-fix |
| **M3.3** | Group ("Resolve") page member rows reflect the carry-down (e.g. "Volume → folds into Measurement") instead of "(no decision yet)" | group page contradicts the "carries down" promise | should-fix |
| **M3.4** | When a group decision overrides a per-concept suggestion, suppress/reframe the now-stale per-concept note + the CON-24 "hold off" stale headline | "Fold into writing" headline over a "Recommend keep" note | should-fix |
| **M3.5** | Confirmation after Save & Export (mirror the import alert) | silent export → duplicate downloads, no reassurance | should-fix |
| **M3.6** | Keyboard-shortcut footgun — gate the verdict letter-keys (k/m/n/d) and/or add a discoverable hint so an accidental keypress can't silently override + flip card type with no undo | hidden destructive shortcuts | should-fix |
| **M3.7** | Friendly labels over `snake_case` keys in reviewer-facing spots (review summary, group member rows, Agree buttons, fold-picker placeholder, jump search) | raw keys shown inconsistently | should-fix |
| **M3.8** | Nits bundle — "▸ ▸ more" double-arrow, "Agree — Fold into another" (unnamed target), "1 appearance(s)" plural (display only), "Download progress as JSON" clarity, 208-vs-213 step-count | nits | nit |
| **M3.9** | Re-gate: full smoke (#1 SHA invariant MUST hold — all display-only) + a focused re-check of B1 (the legend) and the M3.2/M3.3/M3.4 fixes | regression guard | — |

### Milestone 3.1: "Your call" legend contradiction

On Decide ("Your call") cards the radio legend (template ~line 1917) renders unconditionally as `"Your call — there's no suggested answer here:"` — but when the entry has a recommendation, the card ALSO renders a `💡 {source}: {label}` block right above it (`renderDecideStep`, the `if (prefill && prefill.verdict)` branch ~line 1889). The two flatly contradict. Root cause: M2.0 rewrote the original "no default" legend (which meant "no pre-filled radio — you must actively choose") into "there's no suggested answer here," which is false whenever a recommendation is shown. **Fix:** make the legend conditional on `prefill && prefill.verdict` — when a recommendation is shown, `"Your call — confirm the suggestion above, or choose differently:"`; otherwise keep `"Your call — there's no suggested answer here:"`. Display-only; SHA-safe. Verify on a §11 entry WITH a rec (e.g. `plant_parts`) and one without (a no-rec Decide entry, e.g. `biodiversity`).

### Milestone 3.2: Verdict ↔ Decide-later mutual exclusivity

`navDefer()` adds the step id to `state.wizard.deferred` without clearing any committed verdict, and committing a verdict doesn't remove the entry from `deferred` — so a concept can be both "decided" and "decide later," and the review summary lists it in two buckets. **Fix:** make the two states mutually exclusive (committing a verdict clears the deferred flag; deferring clears/!is-disallowed-on a committed verdict — pick the least-surprising rule) and ensure the review summary lists each concept in exactly one bucket. UI-state only; SHA-safe.

### Milestone 3.3: Group page reflects carry-down

The cluster ("Group decision") step's member list (`renderClusterStep` / the members block, M1.10) shows each member's own committed state, so after a group choice it still reads "(no decision yet)" even though the choice DID carry down (member cards show "Based on your earlier group decision: …"). **Fix:** render the derived suggestion on each member row (e.g. "Volume → folds into Measurement", "Measurement → kept") via `computeMemberDerivation`/`displayedPrefillForEntry`, so the group page matches the intro's promise. Display-only; SHA-safe.

### Milestone 3.4: Group-override stale rationale

When a group decision overrides a per-concept suggestion, the per-concept expanded note is unchanged — so a "Fold into `writing`" headline can sit above a "Recommend keep…" rationale (e.g. `how_to_writing` under CON-12 opt 2), and the CON-24 "Hold off — pending the main-concept pick" state still shows a concrete stale fold headline. **Fix:** when a cluster derivation overrides the entry's own suggestion, suppress or reframe the now-stale per-concept reasoning (e.g. "This is one of the writing concepts you chose to fold into the general Writing") and, during the CON-24 hold-off state, suppress the per-concept fold headline. Display-only; SHA-safe. (Note: this interacts with B2 — when the notes are rewritten plainly, the reframe logic still applies to whatever text is shown.)

### Milestone 3.5: Export confirmation

`onExport()` downloads silently (the menu just closes), so reviewers can't tell it worked and re-click → duplicate downloads. **Fix:** show a brief confirmation after export (mirror the existing import `alert`, or a toast), naming the downloaded file and reminding them to attach it to their email to the team. Display-only; SHA-safe.

### Milestone 3.6: Keyboard-shortcut footgun

The single-key verdict shortcuts (k/m/n/d) fire on entry steps with no on-screen hint and no undo — an accidental keypress silently overrides a Quick-check suggestion, flips the card type, and decrements a counter; `n` even assigned "add new concept" to an existing concept. **Fix (decision to surface):** for this non-technical audience either (a) gate the verdict letter-keys (require focus on the answer area, or drop k/m/n/d and keep only Enter/←/Decide-later), and/or (b) add a small discoverable "keyboard shortcuts" hint/legend. Recommend erring toward safety (gate or drop the destructive letter-keys) since accidental silent overrides are the hazard. Behavior + reviewer-facing copy.

### Milestone 3.7: Friendly labels over snake_case keys

Raw `snake_case` keys appear in reviewer-facing spots — the Review summary rows (`cultural_traditions` vs the friendly "Cultural Traditions" on cards), group member rows, Agree-button targets ("Fold into `microorganisms`"), the fold-picker placeholder ("Type canonical_key…"), and jump-search (matches keys only). The friendly `canonical_label` already exists. **Fix:** show the human label as primary in those spots (demote/drop the raw key), relabel the picker placeholder "Type a concept name…", and let jump-search match labels too. Display-only; SHA-safe (export still writes canonical_key). Several render sites → workflow-orchestrate.

### Milestone 3.8: Nits bundle

(a) the collapsed-rationale toggle renders "▸ ▸ more" (CSS `::before` arrow + literal "▸ more") — drop the stray arrow; (b) a Quick-check "Agree — Fold into another" with no named target — route to the picker or name the target rather than one-click-agreeing to an unnamed destination; (c) "1 appearances" → "1 appearance" (display only — the export keeps the source string, SHA-safe); (d) "Download progress as JSON" — clarify it's a technical/backup option, not the handoff file; (e) reconcile the 208-counters-vs-213-steps confusion (tooltip or label). Display-only; SHA-safe.

### Milestone 3.9: Re-gate

Re-run the full smoke gate — **#1 empty-export SHA invariant MUST still be `0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03`** (all Batch 3 fixes are display-only) — plus a focused re-check of B1 (the legend, both with-rec and no-rec) and the M3.2/M3.3/M3.4 behaviors. Update the smoke matrix + status doc; consider a second mini dry-run before handoff.

---

## Execution notes

- **No TodoWrite / Beads tracking** (kickoff rule + memory). This plan document is the task list; milestones are checked via commits + status doc updates.
- **Browser smoke after each milestone** via chrome-devtools-mcp where possible. The prior session used it successfully.
- **User reviews each milestone before commit** unless they explicitly waive review for a milestone.
- **Hard rule: don't push to `main`**. Branch stays on `tools/concepts-worksheet-form`. No PR without explicit direction.
- **Don't reopen W1–W21**. If any decision feels wrong during implementation, surface it to the user as a concern — don't unilaterally revise.
- **Batch 2 gap resolutions** (resolved up-front before plan-writing, 2026-05-15):
  - **M2.2 mismatch indicator** = yellow callout above Claude rec (mirrors theme-overlap callout from M1.8).
  - **M2.3 review summary layout** = design §11 mock order; attention-needers (DECIDE LATER + DIFFERS) default-open when count > 0; FOLD grouped by merge target; sort by tier then canonical_key.
  - **M2.5 counter polish** = minimal scope (recompute on mismatch verified + zero-state color shift); mismatch stays out of top bar per design §10/§441.
  - **M2.1b CON-24 pick-one** = inline reveal in Resolve card; `state.cluster_parents` parallel map keeps `getClusterState`/`setClusterState` unchanged.

## Execution handoff

**Batch 1 SHIPPED 2026-05-15** (M1.0 → M1.17, smoke gate PASS, commit `5630a69` + cleanup `16a3b7f`). Status doc at `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md` is the source of truth for per-session progress; the Batch 1 execution kickoff at `docs/plans/2026-05-15-concepts-worksheet-wizard-execution-kickoff.md` (Batch 1-scoped) closed on M1.17.

**Batch 2 plan finalized 2026-05-15** (M2.1 → M2.7 above). Execution will happen across multiple future sessions, one milestone per session in the kickoff-prompt pattern Batch 1 used. The durable Batch 2 per-milestone kickoff lives at `docs/plans/2026-05-15-concepts-worksheet-wizard-batch2-execution-kickoff.md` (parallel to the Batch 1 one); paste it at the start of each fresh session. Status doc continues; Batch 2 session log appends under the existing Session log heading.
