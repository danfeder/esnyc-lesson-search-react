# `docs/plans/` Archival Manifest

**Created:** 2026-06-22 (Wave 3 — Repo/Docs Hygiene, PR B).
**What this is:** a navigation aid so archived ≠ lost. Wave 3 relocated **56 shipped/closed plan docs** from the working `docs/plans/` root into `docs/plans/archive/` so the root shows only **live / in-flight** work. History is preserved (`git mv`); every archived file is still in the repo at `docs/plans/archive/<same-filename>`. A second pass (2026-10, refactor-audit group 10) moved 97 more (60 root docs + the `rung8-morning-burn/`, `fp3-briefs/`, `fp4-briefs/`, `fp4-discovery/` and `t4-dedup/` dirs); see [§ Archived 2026-10](#archived-2026-10-refactor-audit-pass--grouped-by-initiative).

**How to find an archived doc:** it kept its exact filename — look in `docs/plans/archive/`, or `git log --follow docs/plans/archive/<name>` for full history across the move. (Paths in the archived list below are written relative to `docs/plans/`, i.e. `archive/<name>` = `docs/plans/archive/<name>`.)

**Why some shipped docs were NOT archived:** see [§ Kept in place](#kept-in-place) below. In short: a doc stays in the root if a script reads it at runtime, a live slash-command points at it, it feeds deferred future work, or it's a live campaign doc. Docs cited only in **comments** were archived when the only citation is a frozen (immutable, already-applied) migration `.sql` and kept when cited in editable live source — the "Tier-4 / Option B" rule locked with the user 2026-06-22.

**Stale cross-links:** archived docs contain ~150 intra-`docs/plans/` links to each other; these now resolve to the old root path. Left as-is by design — these are closed historical docs, not a browsed wiki, and this manifest is the source of truth for where things went. The one live navigational pointer (the roadmap's "see …theme-b…-execution-status.md") was updated to the archive path. The 2026-10 pass did the same for every pointer from a kept doc into the move set (`fp5-briefs/` ×4 and `2026-07-04-pre-wave-plan.md` ×3 → `archive/fp4-briefs/`; the Related-links in the kept `theme-b` and `c02` design docs) and for the one live test comment (`e2e/authenticated/review-journey.spec.ts` → `archive/2026-07-03-t5-launch-smoke.md`).

---

## Archived (56 docs — 54 `.md` + 2 `.sql` verification-probe artifacts) — grouped by initiative

### Deduplication revamp + review/resolution interface — SHIPPED (duplicate detection + resolution live)
- `archive/2025-12-01-deduplication-revamp-design.md`
- `archive/2025-12-02-phase2-review-interface-design.md`
- `archive/2025-12-04-phase3-resolution-backend-design.md`
- `archive/2026-04-23-phase-3-internal-design.md`

### Phase 7c — submission emails — SHIPPED (Lesson Submission Tier-1, PROD-applied)
- `archive/2026-04-27-phase-7c-submission-emails-design.md`
- `archive/2026-04-27-phase-7c-submission-emails-implementation.md`

### Phase 8b — approve-update redesign — SHIPPED (reviewer-flow landed on `main` via rebased/patch-equivalent commits; not a #470 merge commit — banner at `src/pages/ReviewDetail.tsx`)
- `archive/2026-04-27-phase-8b-approve-update-redesign-design.md`
- `archive/2026-04-27-phase-8b-approve-update-redesign-implementation.md`
- `archive/2026-04-27-phase-8b-execution-kickoff.md`
- `archive/2026-04-27-phase-8b-execution-status.md` (closure banner added in PR A #532)

### Filter metadata-drift repair — SHIPPED (migrations `20260505*`; later superseded by the metadata rebuild)
- `archive/2026-04-28-filter-metadata-drift-repair-design-v1-jsonb.md`
- `archive/2026-04-28-filter-metadata-drift-repair-design.md` *(cited in `20260505*` migration comments — frozen)*
- `archive/2026-04-28-filter-metadata-drift-repair-execution-status.md`
- `archive/2026-04-28-filter-metadata-drift-repair-implementation.md` *(cited in `20260505000000` migration comment — frozen)*
- `archive/2026-04-28-filter-metadata-drift-repair-kickoff.md`

### Metadata rebuild — stakeholder + foundation — COMPLETE (initiative closed; final PR E #516 `847bf49`)
- `archive/2026-04-30-metadata-rebuild-foundational-report.md`
- `archive/2026-04-30-metadata-rebuild-stakeholder-brief.md`
- `archive/2026-04-30-metadata-rebuild-stakeholder-decisions-kickoff.md`
- `archive/2026-04-30-metadata-rebuild-stakeholder-decisions.md`
- `archive/2026-05-03-metadata-rebuild-foundation-execution-status.md` *(cited in foundation-era migration comments — frozen)*
- `archive/2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` *(cited in `20260519000000` migration comment — frozen)*
- `archive/2026-05-03-metadata-rebuild-foundation-kickoff.md`
- `archive/2026-05-03-metadata-rebuild-foundation-validator-architecture.md` *(cited in `20260515000000` migration comment — frozen)*

### Metadata rebuild — Stage 1 heritage — COMPLETE (PR5a heritage canonicalization, `20260611000000`)
- `archive/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md`
- `archive/2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md`
- `archive/2026-05-12-stage1-heritage-handoff-kickoff.md`

### Metadata rebuild — Stage 1 concepts (shape + status) — COMPLETE (PR5b concepts canonicalization, `20260612000000`)
- `archive/2026-05-12-academic-concepts-shape-investigation.md`
- `archive/2026-05-12-academic-concepts-shape-simplification-report.md`
- `archive/2026-05-12-metadata-rebuild-stage1-concepts-execution-status.md` (closure banner added in PR A #532)

### Stage 2 re-tag mechanism — RESOLVED (TS+Zod harness chosen; `scripts/stage2-retag/`)
- `archive/2026-05-13-stage2-retag-mechanism-exploration.md` *(contains non-UTF8 bytes — use `grep -a` if searching content)*

### Concepts worksheet wizard — DONE (tool shipped; team review 208/208 returned + integrated, PR #503 / PR #496 `6b2fac2`)
- `archive/2026-05-15-concepts-worksheet-wizard-batch2-execution-kickoff.md`
- `archive/2026-05-15-concepts-worksheet-wizard-design.md`
- `archive/2026-05-15-concepts-worksheet-wizard-execution-kickoff.md`
- `archive/2026-05-15-concepts-worksheet-wizard-plan.md`
- `archive/2026-05-15-concepts-worksheet-wizard-status.md`

### Metadata rebuild — PR5 canonicalization (+ rehearsal evidence) — SHIPPED
- `archive/2026-06-11-metadata-rebuild-pr5-canonicalization-design.md`
- `archive/2026-06-11-metadata-rebuild-pr5-canonicalization-execution-status.md`
- `archive/2026-06-11-metadata-rebuild-pr5-canonicalization-implementation.md`
- `archive/2026-06-11-metadata-rebuild-pr5-canonicalization-kickoff.md`
- `archive/2026-06-11-pr5a-heritage-rehearsal-evidence.md`
- `archive/2026-06-11-pr5b-concepts-rehearsal-evidence.md`
- `archive/pr5a-heritage-verification-probes.sql`
- `archive/pr5b-concepts-verification-probes.sql`

### Metadata rebuild — PR6 Stage 2 re-tag — SHIPPED/RESOLVED
- `archive/2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status.md`
- `archive/2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status-archive.md`
- `archive/2026-06-11-metadata-rebuild-pr6-stage2-retag-implementation.md`
- `archive/2026-06-11-metadata-rebuild-pr6-stage2-retag-kickoff.md`

### Search modernization (Medium track) — SHIPPED (public search = `search_lessons` RPC)
- `archive/2026-06-17-search-modernization-medium-design.md`
- `archive/2026-06-17-search-modernization-medium-execution-status.md`
- `archive/2026-06-17-search-modernization-medium-execution-status-archive.md`
- `archive/2026-06-17-search-modernization-medium-implementation.md`
- `archive/2026-06-17-search-modernization-medium-kickoff.md`

### Theme B — public "broken-windows" UX (Wave 1) — SHIPPED (PRs #522–#526)
- `archive/2026-06-20-theme-b-public-ux-execution-status.md`
- `archive/2026-06-20-theme-b-public-ux-execution-status-archive.md`
- `archive/2026-06-20-theme-b-public-ux-implementation.md` *(cited in `20260620000000` migration comment — frozen)*
- `archive/2026-06-20-theme-b-public-ux-kickoff.md`

---

## Archived 2026-10 (refactor-audit pass) — grouped by initiative

Same rules as above: `git mv`, exact filename kept, `archive/<name>` = `docs/plans/archive/<name>`. *(frozen)* = cited only from an already-applied migration `.sql` comment (Tier-4 / Option B: movable).

### Deferred-work campaign W2–W6 — CLOSED (W1–W6 shipped; W7 = the 2026-10 refactor-audit burn)
- `archive/2026-06-19-deferred-backlog-fanout-kickoff.md`
- `archive/2026-06-19-working-efficiency-axe-sharpening-kickoff.md`
- `archive/2026-06-20-deferred-work-roadmap.md` *(was cited from `docs/TECH_DEBT_AUDIT_2025-12.md`, archived in the same pass, and from the kept `2026-06-20-theme-b-public-ux-design.md`, re-pointed)*
- `archive/2026-06-21-deferred-campaign-status.md`
- `archive/2026-06-21-wave2-email-security-execution.md`
- `archive/2026-06-22-c169-dependabot-phase2-kickoff.md`
- `archive/2026-06-22-c33-c40-wave3-tail-kickoff.md`
- `archive/2026-06-22-wave3-repo-docs-hygiene-execution.md`
- `archive/2026-06-22-wave3-repo-docs-hygiene-kickoff.md`
- `archive/2026-06-22-wave4-data-corpus-cleanup-design.md` *(cited in `20260622000000` / `20260622010000` migration comments — frozen; also from the kept `2026-06-22-c02-cooking-ingredients-retag-design.md`, re-pointed)*
- `archive/2026-06-22-wave4-data-corpus-cleanup-execution-status.md`
- `archive/2026-06-22-wave4-data-corpus-cleanup-implementation.md` *(cited in `20260622000000` / `20260622010000` migration comments — frozen)*
- `archive/2026-06-22-wave4-data-corpus-cleanup-kickoff.md`
- `archive/2026-06-22-wave4-kickoff.md`
- `archive/2026-06-26-wave5-reviewer-admin-design.md`
- `archive/2026-06-26-wave5-reviewer-admin-execution-status.md`
- `archive/2026-06-26-wave5-reviewer-admin-execution-status-archive.md`
- `archive/2026-06-26-wave5-reviewer-admin-implementation.md`
- `archive/2026-06-26-wave5-reviewer-admin-kickoff.md`
- `archive/2026-06-28-reviewdetail-followup-design.md`
- `archive/2026-06-28-reviewdetail-followup-implementation.md`
- `archive/2026-06-28-reviewdetail-followup-status.md`
- `archive/2026-06-29-wave6-search-depth-design.md` *(cited in `20260629000000` / `20260629010000` migration comments — frozen)*
- `archive/2026-06-29-wave6-search-depth-execution-status.md` *(cited in `20260629010000` migration comment — frozen)*
- `archive/2026-06-29-wave6-search-depth-implementation.md`
- `archive/2026-06-29-wave6-search-depth-kickoff.md`

### C02 cooking-skills / ingredients re-tag — SHIPPED 2026-06-26 (do not re-run)
- `archive/2026-06-22-c02-cooking-ingredients-retag-implementation.md` *(cited in `20260626000000` migration comment — frozen)*
- `archive/2026-06-22-c02-vocab-retag-discussion-kickoff.md` *(was cited from the kept C02 design doc, re-pointed)*
- `archive/2026-06-22-c02-cooking-ingredients-retag-execution-status.md` *(moved 2026-10-25 once PR #550 was closed unmerged)*
- `archive/2026-06-22-c02-cooking-ingredients-retag-execution-status-archive.md` *(sister split; moved 2026-10-25)*
- `archive/2026-06-22-c02-cooking-ingredients-retag-kickoff.md` *(moved 2026-10-25; its status-doc links re-pointed to `archive/`)*
- The design doc stays for good (see Kept in place).

### Go-live sprint T1–T5 — COMPLETE 2026-07-03
- `archive/2026-07-01-brief-edge-auth-gate-fix.md`
- `archive/2026-07-01-brief-quickwins-patch.md` *(cited in `20260702000000` migration comment — frozen)*
- `archive/2026-07-01-brief-t1-taste-test-collocation.md` *(cited in `20260701000000` migration comment — frozen)*
- `archive/2026-07-01-brief-t1-taste-test-synonym.md` *(cited in `20260701000000` migration comment — frozen)*
- `archive/2026-07-01-brief-t3-auth-email.md`
- `archive/2026-07-01-fable-catchup-and-drift-retrospective.md`
- `archive/2026-07-01-go-live-tracker.md`
- `archive/2026-07-01-t1-redesign-handoff-for-fable.md` *(cited in `20260701000000` migration comment — frozen)*
- `archive/2026-07-01-t2-walkthrough.md`
- `archive/2026-07-02-brief-t3b-resubmit.md`
- `archive/2026-07-02-brief-t4a-candidate-sweep.md`
- `archive/2026-07-02-brief-t4b-review-reshape.md`
- `archive/2026-07-02-brief-t4c-retire-migration.md` *(cited only from the archived `scripts/archive/dedup-sweep/`)*
- `archive/2026-07-02-t3-security-findings-handoff-for-fable.md` *(cited in `20260702150000` migration comment — frozen)*
- `archive/2026-07-02-t4-dedup-design-decisions.md`
- `archive/2026-07-02-t4-dedup-design-handoff-for-fable.md`
- `archive/2026-07-02-t4-status.md`
- `archive/2026-07-02-t4c-fable-review-handoff.md`
- `archive/2026-07-03-brief-t5b-auth-e2e.md`
- `archive/2026-07-03-t5-launch-smoke.md` *(its live citation in `e2e/authenticated/review-journey.spec.ts` was re-pointed to the archive path in the same PR)*
- *2026-10 note on the T4 docs above (`t4-status`, `t4c-fable-review-handoff`, `go-live-tracker`): their `scripts/dedup-sweep/...` paths now resolve to `scripts/archive/dedup-sweep/...` (archived in PR #643). Left as written — historical record.*

### Frontend polish FP1–FP4 — FP4 queue COMPLETE 2026-07-04
- `archive/2026-07-03-brief-fp-overnight.md`
- `archive/2026-07-03-brief-fp1-discovery.md`
- `archive/2026-07-03-fable-design-kickoff.md`
- `archive/2026-07-03-fable-design-session.md` *(cited in `20260704000000` migration comment — frozen)*
- `archive/2026-07-03-fp2-handoff.md`
- `archive/2026-07-03-fp2-opus-kickoff.md`
- `archive/2026-07-03-fp2-walkthrough-script.md`
- `archive/2026-07-03-frontend-polish-tracker.md` *(cited in `20260703030000` migration comment — frozen; its script citer `fp02-theme-normalize/` is archived under `scripts/archive/`)*
- `archive/2026-07-03-morning-kickoff.md`
- `archive/fp03-submission-gate-investigation.md`

### Pre-wave prompts — chain COMPLETE
- `archive/2026-07-04-prewave-kickoff-prompts.md` *(the plan and runbook it points at stay in the root)*

### PR6b answer-key verification rulings — re-decided 2026-10
- `archive/2026-06-12-pr6b-answer-key-verification-rulings.md` *(Wave 3 kept it as "cited in editable live source"; its only citers — `answer-key-exclusions.json`, `corpus-exclusions.json`, `doc-surfaces.json` under `scripts/stage2-retag/data/` — were deleted in PR #645 with the retired pipeline. Zero citations remain, so it moves under the Option-B rule. One `git mv` back if the owner prefers it in the root.)*

### Subdirectories
- `archive/rung8-morning-burn/` (11 files) — rung-8 burn complete; no path citations outside `docs/plans/` (the "rung8-…" strings in `src/`/`e2e/` are finding IDs, not paths)
- `archive/fp3-briefs/` (9 files) *(cited in `20260704000000` / `20260707000000` migration comments — frozen)*; the Fable addendum (§9, 2026-10-21 census) landed in `brief-5-INVARIANT-FORK-for-fable.md` before the move
- `archive/fp4-briefs/` (12 files, incl. its README) *(cited in `20260707000000` / `20260708000000` / `20260709000000` migration comments — frozen; its seven live pointers in `fp5-briefs/` and `2026-07-04-pre-wave-plan.md` were re-pointed to the archive path in the same PR)*
- `archive/fp4-discovery/` (1 file) *(cited in `20260709000000` migration comment — frozen)*
- `archive/t4-dedup/` (4 files, 822 KB) — its only runtime readers (`scripts/dedup-sweep/*`) were archived in PR #643; remaining citations are `20260702160000_t4_dedup_retire.sql` (frozen) and archived-script comments (stale by policy)

---

## Kept in place

**25 docs + 7 dirs** (re-audited 2026-10-23; evidence lines re-proven with `git grep`). A doc stays in the root if live source, a live data file, a live script, a live slash-command or an in-flight initiative points at it, or if it is a frozen worksheet that a live generator reads.

**Functional runtime inputs** — a script or a live data file reads it:
- `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` → `scripts/build-concepts-tool.py` (runtime input)
- `2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` → `scripts/build-concepts-tool.py` (documented input; `/concepts-batch2` reopen path)
- `2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` → `data/vocab/cultural-heritage.vocab.json` (`"source"` provenance); its reader `scripts/archive/parse-heritage-worksheet.py` was archived 2026-10 — candidate for a later pass
- `2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md` → `data/vocab/academic-concepts.vocab.json` (`"source"` provenance); its reader `scripts/archive/emit-concepts-vocab.py` was archived 2026-10 — candidate for a later pass

**Referenced by a live slash-command:**
- `2024-12-04-periodic-baselining-design.md` → `.claude/commands/baseline-db.md`; `supabase/migrations/CLAUDE.md`
- `2026-06-10-concepts-wizard-finish-plan.md` → `.claude/commands/concepts-batch2.md`

**Cited in editable live source, data or edge functions (Tier-4 / Option B):**
- `2026-05-03-metadata-rebuild-foundation-design.md` → `src/types/lessonMetadata.zod.ts`
- `2026-05-03-metadata-rebuild-foundation-implementation.md` → foundation-era pair of the design doc; five frozen migrations cite it (no live source citation remains)
- `2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` → `20260518000000` migration (frozen); its script citer was deleted 2026-10 — keep-reason is now "foundation-era decision record"; candidate for a later pass
- `2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md` → `scripts/stage2-retag/data/smaller-fields.vocab.json`
- `2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md` → `scripts/stage2-retag/data/c02-vocab.json`
- `2026-06-22-c02-cooking-ingredients-retag-design.md` → `scripts/stage2-retag/data/c02-vocab.json` (`"design"`)
- `2026-06-20-theme-b-public-ux-design.md` → `src/utils/urlParams.ts`
- `2026-07-17-drive-provenance-rollout.md` → `supabase/functions/sync-drive-metadata/index.ts`

**Inputs to deferred or in-flight work:**
- `2026-06-16-heritage-filter-rebuild-design.md` → heritage filter rebuild (PR C1/C2)
- `2026-06-29-c42-search-engine-options-notes.md` → input to the deferred C42 semantic-tier spike (judgment keep; the spike doc it names at line 3 was never written)
- `2026-07-04-pre-wave-plan.md`, `2026-07-04-wave-reviewer-runbook.md`, `2026-07-04-owner-uiux-candidates.md` → the still-pending spreadsheet wave (`fp5-briefs/`); also cited by frozen `20260707000000` / `20260708000000` migrations
- `2026-07-17-backfill-session-runbook.md` → Drive-provenance initiative still open (Gate 3 pending); judgment keep
- `2026-10-21-row-labels-brief.md` → locked design for PR #642, shipped 2026-10-22 (recent; archive in a later pass)

**Navigation:**
- `ARCHIVAL_MANIFEST.md` — this file

**Subdirectories kept (7, incl. the destination):** `archive/` (destination) · `c02-session1-discovery/` (→ `scripts/stage2-retag/data/c02-vocab.json`) · `concepts-worksheet-form/` (→ `scripts/build-concepts-tool.py`, `.claude/commands/concepts-batch2.md`; the generated HTML is gitignored) · `fp1-audit/` (→ `src/__tests__/integration/submit-after-signin.test.tsx`, `src/components/Auth/AuthModal.test.tsx`, `src/pages/UserProfile.test.tsx`) · `fp5-briefs/` (→ `supabase/functions/process-submission/index.ts`; the pending spreadsheet wave) · `heritage-worksheet-form/` (2 tracked files — worksheet tool + README) · `pr6-stage2-retag-evidence/` (→ `scripts/stage2-retag/data/smaller-fields.vocab.json`)
