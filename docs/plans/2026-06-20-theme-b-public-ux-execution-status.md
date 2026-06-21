# Theme B — Public "Broken-Windows" UX Execution Status

**Last updated:** 2026-06-20 by Session 8 (**W1c / PR4 cycle OPENED.** Branch `feat/theme-b-w1c-url-state` cut off `main` @ `5197069`; §4 Q6–Q8 design-locked; PR-cycle archival done (W1b → archive). **Next = author PR4 tasks in the impl plan → GATE 1B (Codex) → implement.** No code on the branch yet.)

## Current State

**W1a + W1b SHIPPED + PROD-verified** (Sessions 1–7). PR1 #522 → `19d99b7`, PR2 #523 → `530b2536`, PR3a #524 (migration) → `3c592b1`, PR3b #525 (sort wiring) → `5197069`. Full PR1/PR2/W1b detail + session logs live in `…-execution-status-archive.md` (grep, don't read whole).

> **🟢 W1c / PR4 (URL state) cycle is OPEN (Session 8).** Pure-frontend, no migration, no RLS change. Design §4 Q6–Q8 are **all LOCKED** (below). Branch `feat/theme-b-w1c-url-state` is cut off `main` @ `5197069` with this status doc carried forward (the only change on the branch so far). **NEXT = author the concrete PR4 tasks in the impl plan, run GATE 1B (Codex review of the authored tasks), then dispatch executors.**

**What W1c ships:** URL persistence for the public search — query + all filters + `sortBy` serialized into the URL so a search is **shareable / bookmarkable / refresh-surviving**. Two net-new files (`src/utils/urlParams.ts` + `src/hooks/useUrlSync.ts`) + their tests + a mount point in `SearchPage`. The `feat/url-persistence` WIP (`e6610678`, 346 commits behind) is a **read-only pattern reference only** — NOT a base to copy.

**§4 Q6–Q8 LOCKED 2026-06-20** (rationale inline in design §4; W1c flipped to Locked):
- **Q6 reuse** [user verdict, Codex-consulted] = **WRITE FRESH; WIP as reference only.** User was unsure → asked for a Codex 2nd opinion. Codex (different family) read the WIP and found (a) its loop guard has a **latent back/forward bug** (`lastSyncSourceRef` not reset after a store-origin URL write → a subsequent browser **Back** can be silently swallowed) and (b) its store→URL tests **never assert the URL** (false confidence). So lift-and-adapt's only advantage evaporates; field mapping must be rewritten anyway. Rebase (346 behind, won't type-check) rejected. **User locked WRITE FRESH.**
- **Q7 scope** [user verdict] = **query + filters + `sortBy`**; **lesson deep-linking DEFERRED.** sortBy is real now (W1b shipped) so a shared link should preserve "Title A-Z" / "Updated"; whitelist the sort param to `relevance`/`title`/`modified` (else fall back to `relevance`, mirroring the RPC `CASE…ELSE`). `?lesson=<id>` deferred (lessons open in a client-only modal; separate concern).
- **Q8 history mode** [evidence — WIP-confirmed] = **`replace`** (`setSearchParams(params, { replace: true })`). Filter/sort toggles update the URL in place; Back leaves the search rather than undoing one filter.

**Guards to bake into the PR4 tasks (Codex-named, from the Q6 consult):**
1. **Zero `lessonFormat`** references in new code/tests (field was deleted in the 2026-05 metadata rebuild).
2. **Add `tags`** to the URL mapping (array, comma-joined) + round-trip + validation tests.
3. **Sort hydration calls `setViewState({ sortBy, currentPage: 1 })`** — `setViewState` (unlike `setFilters`) does NOT reset the page; URL doesn't carry a page anyway.
4. **Test the loop guard for real:** actual debounced URL writes, URL→store hydration, invalid-URL cleanup, AND back/forward after a store-origin write (the WIP's latent bug). Tests must **assert the URL** (router/location probe), not just store state.
5. **Validate against current `FILTER_CONFIGS`** incl. recursive hierarchical-heritage children.
6. **Whitelist the sort param** (only `relevance`/`title`/`modified`; else relevance).
7. React Router is **^7.8.2 on both** WIP and `main` (Codex-confirmed — no `useSearchParams` API drift).

**Pre-flight facts confirmed for task authoring (Session 8 evidence agent + Codex):** current `SearchFilters` (`src/types/index.ts`) carries `tags: string[]`, no `lessonFormat`; `ViewState.sortBy` union = `'title'|'confidence'|'grade'|'modified'|'relevance'`; `searchStore` `partialize` persists ONLY `view`+`density` (not filters/query/sortBy/page) → **URL becomes the filter-persistence mechanism**; `setFilters` resets `currentPage:1`; `useLessonSearch` queryKey + RPC params already include `filters` + `order_by:sortBy`; lessons open via client-only `selectedLesson` state in `SearchPage` (no `/lesson/:id` route). **Executors must re-verify exact line numbers before editing — anchors drift.**

**Next actions (in order):**
1. ✅ **PR4 tasks authored** (impl plan): **4.1** `urlParams.ts` (serialize/parse/validate + `canonicalSearchString` + sort whitelist) · **4.2** `useUrlSync.ts` + atomic `hydrateUrlState` store action (two-way sync, canonical loop guard w/ one-use token, correct back/forward) · **4.3** mount in `SearchPage` + `enabled`-gate the first query on `useLessonSearch`.
2. ✅ **GATE 1B DONE** (Codex, inline, 2026-06-20) — caught **1 BLOCKER** (partial `setFilters` merge can't clear URL-absent filters → Back-to-unfiltered keeps stale + the hook re-writes them) + **5 HIGH** (pre-hydration default RPC flash; double-write; stale `lastWrittenRef`; missing scope `searchStore`/`useLessonSearch`; first-RPC test assertion) + MEDIUMs. **All accepted** and folded: atomic `hydrateUrlState`, `hydrated`+`enabled` query gate, `canonicalSearchString`, one-use token, StrictMode/createMemoryRouter/full-replacement tests. (Calibrated down: query-debounce compounding = documented; comma-in-value = invariant test.)
3. **Dispatch executor for Task 4.1** (Opus, fresh context, TDD skill); supervisor-verify; then 4.2, then 4.3 — one per dispatch. **← NEXT.**
4. Pre-push gate (code-reviewer + Codex GATE 3) → push → `gh pr create` → four-surface bot triage (GATE 4) → user-gated merge. Pure-frontend = deploy-preview + manual smoke only (no TEST-DB gate).

## Recent decisions worth carrying forward

- **W1c §4 locks** (2026-06-20, Session 8): see Current State. Q6 write-fresh (Codex-consulted — the WIP's "battle-tested" loop guard has a latent Back bug + URL-less tests, so lift-and-adapt's premise fails); Q7 include sortBy + defer deep-linking; Q8 `replace`.
- **GATE 4 / Codex-2nd-opinion discipline extended to design decisions** (Session 8): when the user is unsure on a `[user-verdict]`, a Codex consult (different family, return-inline) is a first-class input — it flipped my Q6 lean (A→C) on a real code finding. Triage Codex's take with the same rebuttal discipline; surface the reconciliation to the user; never lock a `[user-verdict]` unilaterally.
- **GATE 1B (pre-code plan review) caught a BLOCKER again** (Session 8): the partial-`setFilters`-merge hydration bug (Back-to-unfiltered keeps stale filters) was invisible until Codex traced it against `searchStore.ts`. Mechanism fix = atomic `hydrateUrlState` action + a `hydrated`/`enabled` query gate (the latter prevents a C59-class empty-result flash on shared-link load). These are implementation corrections INSIDE the locked Q6–Q8 design (no user gate, like W1b's strip-before-split), but they expand the file scope to `searchStore.ts` + `useLessonSearch.ts` — noted in the tasks.

## Out-of-scope follow-ups captured here

- **`tags` public badge (C84 path-a)** — deferred to its own audit session (`project_tags_field_audit_pending` memory). The `LessonMetadata.tags` type gap (`database.types.ts` has `tags`; `src/types/index.ts` `LessonMetadata` does not) is part of THAT future work. *(W1c URL state syncs the `tags` filter regardless — the badge suppression is independent.)*
- **`filter_lesson_format` dead RPC param** — harmless leftover in the W1b signature; dropping it = a separate deferred task (also needs the frontend to stop sending it). Not W1c.
- **Lesson deep-linking (`?lesson=<id>`/`/lesson/:id`)** — DEFERRED out of W1c (user verdict 2026-06-20). Separate concern (~200–500 lines, own back-button model). Tracked in design §9.
- **C14 IntPillGroup ARIA-forwarding** (from PR2) — pill-group controls only get wrapper-level `id`/`aria-label`; flagged follow-up.
- **LessonSearchPicker stale state after select→clear (R2-4, from PR2)** — REAL but pre-existing; fix later with a reset on `selected→null` + a test.
- **ArrowUp APG return-to-input (R2-2, from PR2)** — current clamp-at-0 is LOCKED design §5; only change with user sign-off.

## Pointers to durable context

- Kickoff prompt: `2026-06-20-theme-b-public-ux-kickoff.md`
- Design doc: `2026-06-20-theme-b-public-ux-design.md` (W1a + W1b SHIPPED; **W1c §4 Q6–Q8 LOCKED**)
- Implementation plan: `2026-06-20-theme-b-public-ux-implementation.md` (PR1/PR2/PR3 concrete; **PR4 = skeleton, author next**)
- Campaign roadmap: `2026-06-20-deferred-work-roadmap.md` (Theme B = Wave 1)
- Archive (PR1 + PR2 + W1b cycles): `2026-06-20-theme-b-public-ux-execution-status-archive.md` — grep, don't read whole.

## Session log

### Session 8 — 2026-06-20 — W1c / PR4 cycle opened: §4 Q6–Q8 locked; W1b archived

Supervisor session. Opened the W1c (URL-state) PR cycle: cut the branch, carried the status doc forward, design-locked §4 Q6–Q8 (one via a Codex consult the user requested), and archived the W1b cycle. No code on the branch yet — task authoring + GATE 1B are next.

- Oriented; git matched the status file (W1a+W1b shipped; `origin/main`=`5197069`; the Session-7 status-doc carry-forward was a local-only commit `327aae7` on `feat/theme-b-w1b-sort-frontend`). Baseline `npm run check` clean. Untracked `docs/plans/*` are unrelated other-initiative kickoffs (left alone).
- **Branch cut:** `feat/theme-b-w1c-url-state` off `main` @ `5197069`; `git checkout feat/theme-b-w1b-sort-frontend -- …execution-status.md` carried this doc forward (staged, +32/−3 vs main's stale PR3b-merge copy).
- **WIP-evidence agent** (Explore, read-only): digested the WIP `urlParams.ts`/`useUrlSync.ts`/tests + current `SearchFilters`/store/`useLessonSearch`/`filterDefinitions`/`App.tsx`. Confirmed the field-mapping delta (drop `lessonFormat`, add `tags`) + the integration points.
- **User decisions (AskUserQuestion):** Q7 = **include sortBy in URL** + **defer deep-linking**; Q6 = "ask Codex, I'm not sure."
- **Codex consult on Q6** (`codex:codex-rescue`, return-inline — no async flake): recommended **C (write fresh)** over my initial A (lift-and-adapt). Decisive findings: the WIP loop guard has a **latent back/forward bug** (`lastSyncSourceRef` not reset after a store-origin write → Back can be swallowed) and its store→URL tests **never assert the URL**. Also confirmed React Router ^7.8.2 on both (no drift) + that sort hydration needs `setViewState({ sortBy, currentPage: 1 })`. I reconciled (agreed with C) and brought it back to the user → **user locked WRITE FRESH.**
- **Q8 locked from evidence** = `replace` (WIP-confirmed; standard filter-UI back-button model).
- **Design-doc locks:** wrote 🔒 LOCKED blocks for §4 Q6/Q7/Q8 + the Codex-named guards; updated the top status line (W1b→SHIPPED, W1c→Locked), §6 W1c paragraph, and §9 (added the deep-linking deferral).
- **PR-cycle archival:** appended a full `## PR 3 — W1b-search-rpc` section to the archive (Done detail + §4 Q1–Q5 locks + TEST/PROD verification numbers + bot rounds + Sessions 5/6/7 verbatim); rewrote this live doc to be W1c-focused (W1b detail → 1-line archive pointer).
- **Grounded the tasks in current code** (Read `SearchFilters`/`ViewState`, full `searchStore`, `SearchPage` mount, `FILTER_CONFIGS`, + the WIP `urlParams.ts`/`useUrlSync.ts` via `git show`) then **authored PR4 Tasks 4.1/4.2/4.3** in the impl plan + W1c test-plan entries.
- **GATE 1B (Codex plan review, inline):** 1 BLOCKER + 5 HIGH + MEDIUMs/LOWs. Rebuttal-passed each → **all substantive accepted, two calibrated to notes**. Folded: atomic `hydrateUrlState` (full filter replace + sort+page in one write — the BLOCKER), `hydrated`+`enabled` gate on `useLessonSearch` (no pre-hydration empty-RPC flash), one-use `lastWrittenRef` + single `canonicalSearchString`, and StrictMode/`createMemoryRouter`/full-replacement/first-RPC tests. Scope grew to `searchStore.ts` + `useLessonSearch.ts`. No code dispatched yet — clean boundary.

Learnings:
- **A Codex consult is a first-class tool for an unsure `[user-verdict]`** — not just for bot-finding 2nd opinions. It flipped a real decision (A→C) on a concrete code finding the supervisor's evidence agent had glossed (the agent called the loop guard "battle-tested"; Codex found the actual Back-button bug). Reconcile + surface to the user; don't auto-lock.
- **GATE 1B paid off on a pure-frontend PR too** (not just migrations): the partial-merge hydration BLOCKER + the pre-hydration-fetch flash were design-level traps invisible from the task prose alone — they only surfaced when Codex traced the plan against `searchStore.ts`/`useLessonSearch.ts`. Run the plan-review gate before dispatching executors regardless of DB involvement.
- **"Battle-tested" from a read-only digest ≠ correct.** The evidence agent's reusability assessment was optimistic; a second, adversarial read (different family) on the same files is what found the latent bug. Worth the extra dispatch for a load-bearing design call.
