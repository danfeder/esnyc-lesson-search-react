# `docs/plans/` Archival Manifest

**Created:** 2026-06-22 (Wave 3 — Repo/Docs Hygiene, PR B).
**What this is:** a navigation aid so archived ≠ lost. Wave 3 relocated **56 shipped/closed plan docs** from the working `docs/plans/` root into `docs/plans/archive/` so the root shows only **live / in-flight** work. History is preserved (`git mv`); every archived file is still in the repo at `docs/plans/archive/<same-filename>`.

**How to find an archived doc:** it kept its exact filename — look in `docs/plans/archive/`, or `git log --follow docs/plans/archive/<name>` for full history across the move.

**Why some shipped docs were NOT archived:** see [§ Kept in place](#kept-in-place-18-docs) below. In short: a doc stays in the root if a script reads it at runtime, a live slash-command points at it, it feeds deferred future work, or it's a live campaign doc. Docs cited only in **comments** were archived when the only citation is a frozen (immutable, already-applied) migration `.sql` and kept when cited in editable live source — the "Tier-4 / Option B" rule locked with the user 2026-06-22.

**Stale cross-links:** archived docs contain ~150 intra-`docs/plans/` links to each other; these now resolve to the old root path. Left as-is by design — these are closed historical docs, not a browsed wiki, and this manifest is the source of truth for where things went. The one live navigational pointer (the roadmap's "see …theme-b…-execution-status.md") was updated to the archive path.

---

## Archived (56 docs) — grouped by initiative

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

## Kept in place (18 docs)

These stayed in the `docs/plans/` root on purpose:

**Live campaign docs (4)** — the active navigation surface:
- `2026-06-20-deferred-work-roadmap.md` · `2026-06-21-deferred-campaign-status.md` (master tracker) · `2026-06-21-wave2-email-security-execution.md` · `2026-06-22-wave3-repo-docs-hygiene-execution.md`

**Functional runtime inputs (4)** — a script reads the file at build time; moving would break it:
- `2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` → `scripts/parse-heritage-worksheet.py`
- `2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md` → `scripts/emit-concepts-vocab.py`
- `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` → `scripts/build-concepts-tool.py`
- `2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` → documented input alongside `scripts/build-concepts-tool.py`

**Referenced by a live slash-command (2):**
- `2024-12-04-periodic-baselining-design.md` → `.claude/commands/baseline-db.md`
- `2026-06-10-concepts-wizard-finish-plan.md` → `.claude/commands/concepts-batch2.md`

**Inputs to deferred future work (2):**
- `2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md` → PR F (cooking_skills / main_ingredients 2nd pass)
- `2026-06-16-heritage-filter-rebuild-design.md` → heritage filter rebuild (PR C1/C2)

**Cited in editable live source comments (6)** — kept so we don't strand a path a developer would follow (Tier-4 / Option B):
- `2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` → `scripts/eval-data/activity-type-relabel-worksheet.md`
- `2026-05-03-metadata-rebuild-foundation-design.md` → `src/types/lessonMetadata.zod.ts`
- `2026-05-03-metadata-rebuild-foundation-implementation.md` → `src/hooks/useLessonSearch.ts`, `scripts/*.ts`
- `2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md` → `scripts/stage2-retag/data/*.json`
- `2026-06-12-pr6b-answer-key-verification-rulings.md` → `scripts/stage2-retag/data/*.json`
- `2026-06-20-theme-b-public-ux-design.md` → `src/utils/urlParams.ts`

**Subdirectories left untouched** (already namespaced + functional/referenced): `docs/plans/concepts-worksheet-form/`, `docs/plans/pr6-stage2-retag-evidence/`. Untracked working files (5 `*-kickoff.md` + `docs/plans/heritage-worksheet-form/`) were intentionally left alone.
