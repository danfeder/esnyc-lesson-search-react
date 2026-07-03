# Wave 4 — Data / Corpus Cleanup — Session Kickoff (post-/clear)

> Untracked scratch doc (like the other `docs/plans/*-kickoff.md`). Do **not** commit it; leave it untracked. The campaign memory `project_deferred_work_campaign` is the durable source of truth. Paste the prompt block below into a fresh session after `/clear`.

## What just shipped (the session before this one, 2026-06-22)
- **Wave 3 = ✅ DONE.** C33 (edge-deploy post-deploy verification + serialized matrix) merged squash `a8efac9` (PR #537); C40 (memory archive-split of the 3 biggest journals) done out-of-repo. C169 Phase 2 + Security Audit fix (#535) already done earlier the same day. `main` should be at `a8efac9` or later.
- Deferred, untouched (user call): **#460** eslint 9→10, **#451** TS 5.9→6.0 — separate sessions each, or close.

## This session's job: scope Wave 4 + scaffold it with `/kickoff-feature`. Planning only — no code, no DB changes.

---

## Prompt to paste

```
Wave 4 — Data / Corpus Cleanup — planning + scaffolding session.

We just finished Wave 3 of the deferred-work campaign (C33 edge-deploy
verification merged `a8efac9` / PR #537; C40 memory archive-split done). The
goal of THIS session is to scope Wave 4 and scaffold it with /kickoff-feature —
no code, no DB changes yet, planning only.

Wave 4 is the "data / corpus cleanup" wave: real data mutations on the lessons
corpus, so DATA SAFETY is the top constraint (3-tier local → TEST → PROD;
never touch prod without my explicit go).

Session-start steps:
1. `git status --short && git log --oneline -3` — confirm clean `main` at
   `a8efac9` or later. Only the untracked `docs/plans/*-kickoff.md` +
   `heritage-worksheet-form/` should be untracked — leave them.
2. Recall campaign memory `project_deferred_work_campaign` (Wave 3 is now ✅
   DONE; Wave 4 is next) and read the roadmap
   `docs/plans/2026-06-20-deferred-work-roadmap.md` Wave 4 section + items
   C11/C12/C08/C01/C02/C09, plus the master tracker
   `docs/plans/2026-06-21-deferred-campaign-status.md`.
3. Before proposing ANY mutation, pull up the data-safety references:
   `reference_data_mutation_gotchas` (lesson pre-delete FK checklist,
   facetCounts, concepts-clearing) and the known cleanup targets in memory —
   the 23 imported non-ESYNYC curriculum drops (`project_imported_non_esynyc_drops`),
   the 3 ghost metadata populations (`project_metadata_cleanup_candidates`),
   and C11 ghost-row deletion.

Bookkeeping (trust-git-then-fix): the master tracker AND the Wave-3 exec-doc
`docs/plans/2026-06-22-wave3-repo-docs-hygiene-execution.md` on `main` still
read "C33 in flight" (authored pre-merge). Fold "C33 merged `a8efac9` → Wave 3
DONE" into the Wave-4 scaffold's first commit.

Then, BEFORE scaffolding: walk me through the Wave 4 items in plain language —
what each one is, its data-safety hazards, and a recommended scope + ordering
(smallest / lowest-risk first; soft-vs-hard delete and search-hiding are open
questions). Once we've settled scope and scaffold weight together, invoke
/kickoff-feature to scaffold the design + implementation-plan + kickoff +
status docs for Wave 4.

Leave the 2 deferred Dependabot majors (#460 eslint 9→10, #451 TS 5.9→6.0)
untouched — separate sessions.
```

---

## Why it's shaped this way
- **Data safety first** — Wave 4 is the first wave that actually mutates the corpus; that framing should lead.
- **Plain-language scope conversation before `/kickoff-feature`** — which items, ordering, soft-vs-hard delete, hide-from-search-vs-delete are the user's calls, not to be assumed.
- **Carries the one trust-git-then-fix loose end** so the stale "C33 in flight" docs on `main` get corrected in the Wave-4 scaffold's first commit.
