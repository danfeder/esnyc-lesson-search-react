# Shelf: docs-cleanup audit re-verification (FP1)

**Source:** `~/cCode/pr6-overnight-2026-06-12/overnight-review/docs-cleanup-audit.md` (2026-06-12)
**Re-checked:** 2026-07-03, read-only, against the current repo tree.

## Plain-language summary

Good news: most of this audit was already handled. The big "Wave 3 repo/docs hygiene" cleanup on June 22 archived 56 finished planning docs into `docs/plans/archive/` (with a manifest so nothing is lost), fixed the stale lesson counts, and added the missing `.gitignore` rules. What's still open is small: one file (`AGENTS.md`) and one README (`scripts/README.md`) still mention old search tooling (Algolia) that was removed long ago — following those instructions would fail; a few leftover untracked files sit in `docs/plans/` (two obsolete kickoff notes and the heritage worksheet folder that was never committed); an old local git branch can be deleted; and the archive-policy doc still doesn't mention the docs archives. All of these are quick, zero-risk tidy-ups.

## Table

| Audit item | Status | Evidence / notes | Severity · Effort · Confidence |
|---|---|---|---|
| F1 stale lesson counts (CLAUDE.md 831, ARCHITECTURE.md 1,098) | **Done** | `CLAUDE.md:171` now says "row count drifts — query the table"; `docs/ARCHITECTURE.md:7` carries a Wave-3 staleness banner | n/a · high |
| F2 Phase 8b status doc claims PR open | **Done** | Doc moved to `docs/plans/archive/2026-04-27-phase-8b-execution-status.md` with CLOSED banner (lines 3–4) | n/a · high |
| F3 Stage 1 concepts status doc stale | **Done** | Now at `docs/plans/archive/2026-05-12-metadata-rebuild-stage1-concepts-execution-status.md` | n/a · high |
| F4a `.tmp/` untracked, not ignored | **Mostly done** | `.gitignore:135` now has `.tmp/` (git-clean); dir still on disk at 18 MB — optional disk-only delete after the salvage check the audit suggested | P3 · S · high |
| F4b `heritage-worksheet-form/` inconsistent | **Still applies** | `docs/plans/heritage-worksheet-form/README.md` still untracked (`git status`); `heritage-worksheet-tool.html` (769 KB) not in `.gitignore` (no match for "heritage-worksheet"). Mirror the concepts pattern: track README, ignore HTML | P3 · S · high |
| F4c two obsolete kickoff docs untracked | **Still applies** | `docs/plans/2026-05-12-stage1-heritage-qa-session-kickoff.md` and `2026-05-15-concepts-tool-simplification-kickoff.md` still `??` in git status; both initiatives long closed — delete or archive | P3 · S · high |
| F4d `.beads/` cruft not ignored | **Done** | `.gitignore:130-132` covers `.beads/dolt/`, `export-state/`, `*.lock`; beads retired entirely (PR #518) | n/a · high |
| F5 two-wave archive plan (~23 + ~28 docs) | **Done (superseded)** | Wave 3 (2026-06-22) archived **56** docs to `docs/plans/archive/` with `docs/plans/ARCHIVAL_MANIFEST.md` as index; both waves effectively executed since PR 6 shipped | n/a · high |
| F6a `AGENTS.md:18` dead `sync-algolia` / `configure-synonyms` commands | **Still applies** | `AGENTS.md:18` verbatim unchanged; those scripts don't exist — running them fails | P3 · S · high |
| F6b `scripts/CLAUDE.md` stale sync-algolia block | **Done** | No `sync-algolia` block remains; only correct "(Legacy removed)" notes at lines 21/160 | n/a · high |
| F6c `scripts/README.md` self-contradictory Algolia section | **Still applies** | Lines 54–65: says scripts "have been removed", then gives `node scripts/remove-algolia.js` usage + `VITE_ALGOLIA_APP_ID` / `ALGOLIA_ADMIN_API_KEY` env vars — script doesn't exist | P3 · S · high |
| F6d `scripts/README.md` wrong test script name | **Still applies** | Line ~69 heading `### test-edge-function.ts`; actual files are `test-edge-functions.mjs` / `test-edge-function-detailed.mjs` (verify names before edit — 2026-06 changes may have touched scripts) | P3 · S · medium |
| F7 `docs/plans/archive/` missing + policy omits docs archives | **Half done** | Archive dir exists with README-equivalent (`ARCHIVAL_MANIFEST.md`); but `docs/ARCHIVE_POLICY.md` locations table still lists only `/archive/`, `/scripts/archive/`, `/supabase/migrations/archive/` — no `docs/archive/` or `docs/plans/archive/` rows | P3 · S · high |
| F8 stale local branch `tools/concepts-worksheet-form` | **Still applies** | `git branch --list` still shows it; audit verified content parity with main — safe to `git branch -D` after a quick log eyeball | P3 · S · high |
| F9 `data/vocab/*.vocab.json` undocumented in CLAUDE.md | **Still applies (low value)** | No "vocab" mention in root CLAUDE.md; but PR 6 shipped, so the load-bearing urgency is gone | P3 · S · medium |
| F10 heritage status doc "awaiting consumption" line | **Done/moot** | Heritage status docs archived; no live doc in `docs/plans/` root carries the stale claim | n/a · medium |
| F11 `tsconfig.scripts.json` convention undocumented | **Still applies (optional)** | No mention in CLAUDE.md or ARCHITECTURE.md | P3 · S · medium |
| F12 TECH_DEBT_AUDIT_2025-12 freshness spot-check | **Still applies** | `docs/TECH_DEBT_AUDIT_2025-12.md` exists (mtime Jun 21 — may have been banner-touched in Wave 3); 7 months old, pre-dates metadata rebuild + go-live sprint; spot-check or archive | P3 · S · medium |

## Net remaining work

One small docs PR would close everything still open: fix `AGENTS.md:18` + the two `scripts/README.md` sections (F6a/c/d), add the two docs-archive rows to `ARCHIVE_POLICY.md` (F7), track heritage README + ignore its HTML (F4b), delete the two obsolete kickoffs (F4c), delete the stale local branch (F8). Optional riders: F9/F11 one-liners, F12 archive-or-spot-check, disk-only `.tmp/` purge.
