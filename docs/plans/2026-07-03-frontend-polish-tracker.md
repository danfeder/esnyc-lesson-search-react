# Frontend Polish Tracker (post-launch phase)

**Goal:** hunt frontend bugs, explain the parts of the frontend the owner doesn't understand,
improve the end-user experience, and simplify what two years of vibe-coding with weaker models
overbuilt. Less focused than go-live by design — discovery comes first, fixes ship in small
themed waves. This is the ONLY tracking doc for the phase.

**Last updated:** 2026-07-03 afternoon (Fable, DESIGN SESSION complete — all 4 deferred design
questions decided with the owner; record: `2026-07-03-fable-design-session.md`; five Opus
execution briefs written in `fp3-briefs/`). NEXT = **Opus executes the briefs in separate fresh
sessions, Brief 1 (#593 finalization) first**; owner merges each.

## Working model (binding, carried from go-live where it worked)

- **All main-session work on Fable** (user directive 2026-07-03; unchanged).
- **Discovery and fixing stay separate.** Discovery sessions produce findings + ranked backlog,
  no fixes beyond trivial one-liners. Fix sessions work the backlog, no new wandering discovery.
  This phase is sprawl-prone; the separation is the guardrail.
- **User is the product owner and the stakeholder** for anything touching filter categories
  (`filterDefinitions.ts` rule in CLAUDE.md): recommendations get presented in plain language,
  the user decides. Old design shapes are re-openable — past approvals were trust-based.
- **Simplification bar:** fewer moving parts on surfaces someone actually uses — not fewer
  lines, not rewrites for taste. Every simplification PR names what got simpler for the user
  or the maintainer.
- **Safety net:** the T5b authenticated E2E suite + 1960 unit tests run on every PR. Frontend
  reshaping leans on them; reshaped areas get tests added where coverage is thin.
- **Audience (user, 2026-07-03, binding for ranking):** a small team of ~15 people max,
  eventually; essentially nobody on mobile; accessibility features effectively unused. Do NOT
  invest in mobile or a11y work unless it's trivial OR it also fixes a desktop problem —
  general-public-internet polish is explicitly out of scope. Rank all findings against this.
- Data safety unchanged: mutations rehearse on TEST, PROD is read-only except user-approved
  gates, TEST baseline (763/685/130 + zero `1E2EAUTH` markers) stays byte-exact after any
  session that touches it.
- **Session-end protocol:** update the Last-updated line + your track's row; end your report
  naming the next track and whether it needs the user present.

## Discovery feeds (FP1 pulls from all four)

1. **The shelf (existing, UNPROCESSED, stale — re-verify everything):**
   `~/cCode/pr6-overnight-2026-06-12/overnight-review/` — the frontend/UX artifact
   (4 broken public P1s claimed: mobile filters, a11y, sort no-op, false no-matches) and the
   simplification 3-wave plan. Both predate T4b/T5/T5b and heavy shipping; each finding must
   be re-verified against today's code before it enters the backlog. Also: the docs-cleanup
   artifact (may fold into a hygiene wave).
2. **Known-but-unshipped lists:** the go-live tracker's Post-launch list (review queue lands
   on ALL not PENDING; resubmit keeps round-1 title over a renamed doc; approved cards show
   stale revision notes; 3 t4b deferrals; drop `t4_dedup_retire_rollback` when PROD-stable)
   + any T2 punch-list rows (`2026-07-01-t2-walkthrough.md`) that never shipped in a bucket.
3. **Live walkthroughs with the user (FP2)** — the highest-yield format this project has had
   (T2 precedent). One session on the public search experience, one on teacher/reviewer. The
   user narrates confusion and friction; Fable explains what's actually happening and logs it.
   This is where "things I don't understand" and philosophy questions get answered live.
4. **Fresh code audit (FP1)** — bug patterns (state, error/loading handling, mobile,
   accessibility), vibe-code-era residue (dead abstractions, parallel ways of doing the same
   thing, config nobody reads), and an **assumptions review**: the load-bearing design concepts
   (filter taxonomy + facet counts, search result presentation, submission flow shape, admin
   surface inventory, state management layering) each get a plain-language verdict —
   still-makes-sense / rethink — sized against the real audience (~3 internal accounts now,
   teachers later).

## User-reported leads

| # | Lead | Reported | Status / pointers |
|---|------|----------|-------------------|
| L1 | **Filter counts are wrong** — the numbers next to filter options are "definitely not accurate," beyond just the mobile-filter issue | user, 2026-07-03 | **CONFIRMED on the live site 2026-07-03 (Fable, read-only probe):** with zero filters and "703 lessons" showing, badges read Winter **9** / Spring **11** / Indoor **11** / Cooking **11**, while PROD truth (read-only SELECT over live rows) is Winter **324** / Spring **268** / Indoor **417** / Cooking **394** — ~30× off. Root cause: `SearchPage.tsx:73-75` computes counts client-side via `useFacetCounts` over only the infinite-scroll pages fetched so far (20 cards), not the corpus; counts grow as you scroll. **Second sub-bug spotted in the same probe: Grade Level badges render entirely EMPTY** (all options blank) — likely a separate keying/markup miss; FP1's facets agent pins it down. Tally logic in `src/utils/facetCounts.ts` (activityType slug remap, heritage ancestry expansion = second-order candidates). Fix options (user decides — filters are stakeholder territory): server-side facet RPC, fetch-all-and-count, or reframe/drop the numbers. |

## FP1 live-probe evidence (Fable, 2026-07-03, live site, read-only)

- **L1 filter counts: CONFIRMED** (~30× off; table in the leads row above). Bonus sub-bug:
  Grade Level badges render empty.
- **Shelf P1 "sort no-op": NOT reproduced.** Title A–Z re-sorted results correctly and wrote
  `?sort=title` to the URL. Likely fixed since 2026-06-12 or narrower than claimed.
- **Shelf P1 "false no-matches": NOT reproduced** in two variants: normal query (703→164 in
  ~500ms, no transient message) and gibberish-then-clear (honest "No results" only at true
  zero; clearing restored 703 instantly, no stale empty state). SearchPage's C59
  placeholder-data comments look like the fix — FP1 confirms from git history.
- Shelf P1s "mobile filters" + "a11y": mobile drawer already passed the T5 smoke at 390px
  (with the 1×1px checkbox-input quirk noted); full a11y verdict awaits the audit agent.

## FP1 ranked backlog (synthesized 2026-07-03)

Synthesized from the 9 audit reports in `docs/plans/fp1-audit/` (3 shelf re-verifications +
6 fresh audits). Ranked by end-user impact × confidence ÷ effort, with the audience rules
above applied strictly. Duplicated findings (facet counts, kebab themes, dead code) appear
once, citing the deepest report. Trivia is merged into grouped rows.

| Rank | ID | Finding (plain language) | Evidence | Sev | Effort | Wave |
|---|---|---|---|---|---|---|
| 1 | FP-01 | The numbers next to filter options are counted from only the ~20 lessons loaded so far — they read ~30× too low, grow as you scroll, and show blank instead of 0 (Grade never shows counts at all: the tally is computed but never rendered). Second-order suspects (activity remap, heritage tree, retired leakage) all checked out clean against the DB. | `fp1-audit/audit-facets-L1.md` §1–§5; `src/pages/SearchPage.tsx:73-75` | P1 | M | B — user picks the fix (see waves) |
| 2 | FP-02 | ~74 live lessons carry old machine-style theme labels (`seed-to-table` instead of "Seed to Table"), making them **invisible to the Thematic Categories filter** — ~10% of the library silently missing from theme results on the live site today. One-time data cleanup + a guard so it can't drift back. | `fp1-audit/shelf-frontend-ux.md` NEW-A (PROD-probed); mechanism deep-dive `audit-facets-L1.md` §3-F2 | P2 | S | C — PROD data track |
| 3 | FP-03 | "Sign in and we'll submit your lesson" silently breaks its promise: a signed-out teacher who clicks Submit and then signs in gets… nothing. They must click Submit again, and may believe they already submitted. | `fp1-audit/audit-state-bugs.md` F1; `src/components/Auth/AuthModal.tsx:63-64` | P2 | S | A |
| 4 | FP-04 | The sign-in pop-up blacks out the whole screen behind it (a styling class that no longer exists) and is the app's only hand-built modal — no Escape-to-close, keyboard focus leaks out, fields unlabeled. Rebuild on the same dialog library every other modal already uses. Desktop-visible for everyone. | `fp1-audit/audit-mobile-a11y.md` F1+F2; `AuthModal.tsx:72-79` | P2 | S–M | A |
| 5 | FP-05 | When a data fetch fails, key screens claim "nothing here" instead of showing an error: the review queue says "No submissions", the teacher profile says "No submissions yet" (hiding the resubmit button), the lesson picker says "No matches found". Add error + Retry in each. | `fp1-audit/audit-error-loading.md` findings 1–3 | P2 | S | A |
| 6 | FP-06 | The profile page reloads itself on any background account event (hourly session refresh, password change) — flashing a spinner and silently throwing away edits being typed. | `fp1-audit/audit-state-bugs.md` F2; `src/pages/UserProfile.tsx:196-201` | P2 | S | A |
| 7 | FP-07 | A momentary profile-fetch blip visually signs the user out (redirect home, no message) — or shows a real reviewer a false "Access denied" screen. | `fp1-audit/audit-error-loading.md` findings 4–5 | P2 | S–M | A |
| 8 | FP-08 | Several text colors are too light to read comfortably — for everyone, desktop included: the gray hint text (incl. the doc-sharing instruction that prevents failed submissions), the amber/orange status labels, and the revision note teachers must read. Darken two or three color tokens. | `fp1-audit/audit-mobile-a11y.md` F4+F5 (computed contrast ratios) | P2 | S | A |
| 9 | FP-09 | 65 live lessons still have no summary, so their cards show a blank description line. Needs a one-time content backfill (extraction/generation pass), not a code fix. | `fp1-audit/shelf-frontend-ux.md` #7 residual (PROD probe 2026-07-03) | P2 | M | C |
| 10 | FP-10 | A lesson has no address of its own — you can share a search but not a single lesson, so teachers share the Google Doc link and bypass the library. A `?lesson=` URL param opening the drawer rides the existing URL machinery. | `fp1-audit/audit-assumptions.md` §2a; `shelf-frontend-ux.md` #10 | P2 | M | B — user decision |
| 11 | FP-11 | The retired embedding pipeline is still plugged in: two dead server functions deployed, a daily automated test that pays OpenAI to test one of them, an orphan DB function. One deliberate sweep unplugs it all. ⚠️ needs edge deploy + migration (STOP-flagged per brief). | `fp1-audit/shelf-simplification.md` N1 | P2 | M | E |
| 12 | FP-12 | Unknown URLs (incl. stale bookmarks to admin pages deleted in T4b) render a blank page — add a 404 page with a link back to search. | `fp1-audit/audit-error-loading.md` #8; `src/App.tsx:110-198` | P3 | S | A |
| 13 | FP-13 | The public search error card prints raw technical error text ("TypeError: Failed to fetch") and has no Retry button. | `fp1-audit/audit-error-loading.md` #14; `SearchPage.tsx:148-161` | P3 | S | A |
| 14 | FP-14 | Every visitor pays for wasted requests: a dead "connection test" on every page load, a lesson-count fetch nobody displays, and a suggestions call on every search whose answer only shows on zero results. | `fp1-audit/audit-state-bugs.md` F6+F7; `audit-overengineering.md` B1 | P3 | S | A |
| 15 | FP-15 | Dead-code sweep: ~2,150 lines of provably unreachable TypeScript/React + ~590 lines of orphaned CSS + 1–2 whole npm dependencies delete with zero behavior change (full manifest in the report — incl. the 5 orphaned Int* components, dead Review components, VirtualizedTable, VerifySetup, legacy Tailwind layer). | `fp1-audit/audit-overengineering.md` §A/B/E + deletion manifest; `shelf-frontend-ux.md` NEW-B; `shelf-simplification.md` F10/F11/F2/F13 | P3 | M | D |
| 16 | FP-16 | The lesson drawer shows raw machine values ("basic-prep") and stacks parent+child heritage tags (56 lessons show e.g. "Chinese" AND "Asian"). Map values through display labels; collapse chains to the most specific. | `fp1-audit/shelf-frontend-ux.md` #14 | P3 | S | C rider (display half of the vocab story) |
| 17 | FP-17 | The Cook/Grow badge on cards is computed from skills tags, not the Activity Type field the filter actually uses — a lesson can be badged "Cook" yet not match the Cooking filter. | `fp1-audit/audit-assumptions.md` §2b; `shelf-frontend-ux.md` #23 | P3 | S | B — stakeholder |
| 18 | FP-18 | Location is documented as pick-one but rendered as three free checkboxes, and the stored "Both" value is exposed as an option. Present as Indoor-friendly / Outdoor-friendly instead (presentation only, no data change). | `fp1-audit/audit-state-bugs.md` F9; `audit-assumptions.md` §1c | P3 | S | B — stakeholder |
| 19 | FP-19 | Small search-page polish bundle: "No more results to load" shows even on 5-result searches; synonym expansion is invisible (no "Including matches for…" hint). | `fp1-audit/audit-state-bugs.md` minor notes; `shelf-frontend-ux.md` #15/#25 | P3 | S | A rider |
| 20 | FP-20 | Internal-admin robustness bundle (~3-account audience): fast tab clicks can briefly show the wrong tab's rows; admin list/CSV/analytics failures render as empty data or silent no-ops; review queue fetches every column unpaginated. | `fp1-audit/audit-state-bugs.md` F3; `audit-error-loading.md` #9–12; `shelf-frontend-ux.md` #21 | P3 | M | E — opportunistic |
| 21 | FP-21 | Oversized-mechanism trims: 13-permission system with 7 permissions never checked + an override engine no UI can feed; silent auto-creation of teacher profiles on an invite-only site; two debounce implementations (one skips debouncing under test); three stacked error boundaries with duplicate fallbacks. | `fp1-audit/audit-overengineering.md` §C + §D1/D2 | P3 | M | D — tier 2 |
| 22 | FP-22 | `scripts/` folder attic: 75 entries incl. three generations of dead duplicate-analysis tools and 9 orphan SQL files nothing references; archive + README ledger. | `fp1-audit/shelf-simplification.md` F4 | P3 | S–M | E |
| 23 | FP-23 | Docs hygiene one-PR: dead Algolia instructions in `AGENTS.md`/`scripts/README.md` (following them fails), archive-policy table missing the docs archives, two obsolete kickoff files, one stale local branch. | `fp1-audit/shelf-docs-cleanup.md` (net-remaining-work list) | P3 | S | E |
| 24 | FP-24 | Trivial a11y one-liners bundle (all S, all desktop-safe): names for the icon-only header links, skip-link position, label wiring on read-only profile fields, spurious "All filters cleared" announcement on first load, announcer's whole-store subscription, one stale e2e comment. | `fp1-audit/audit-mobile-a11y.md` F3/F11/F12/F16; `audit-state-bugs.md` F5 | P3 | S | A rider |

**Deprioritized (audience rules — pure mobile/a11y, non-trivial, no desktop payoff):**

- Touch targets below the 24px minimum across the filter UI (`audit-mobile-a11y.md` F6, effort M)
- iOS Safari auto-zoom on sub-16px inputs (F7)
- Result-card screen-reader semantics — headings/list/selection state (F8)
- View/density switcher radio-group keyboard model (F10)
- Submission success-screen focus move (F13)
- Focus-ring consistency polish (F14)
- 320px resubmit-button label wrap (F15)
- Reference verdict: the "1×1px checkbox" is confirmed **not a bug** — it's the correct
  screen-reader pattern; test automation must click the label, not the input
  (`audit-mobile-a11y.md`, explicit-verdicts section).

### Suggested waves

1. **Wave A — Quick wins: honest errors + AuthModal + readability** (FP-03/04/05/06/07/08/12/
   13/14, riders FP-19/24). All frontend-only, S or S–M, no migrations, no decisions needed.
   One or two PRs; biggest felt-quality jump per hour of the whole backlog.
2. **Wave B — Filter truth (user-decision-gated).** FP-01 needs the owner to pick a fix first:
   **(a)** let the database count the badges (recommended in the report — truthful, fixes the
   union-semantics and zero-blank problems too, costs one migration), **(b)** fetch-everything
   stopgap, or **(c)** drop the numbers until (a) ships. FP-17 (badge field) and FP-18
   (location presentation) are stakeholder-gated filter changes that belong in the same
   conversation; FP-10 (lesson permalink) is a separate yes/no for the owner. Good FP2 agenda.
3. **Wave C — Data truth (its own careful track — PROD data mutations).** FP-02 kebab-theme
   normalization (rehearse on TEST, guarded transaction per the autocommit gotcha, then a CHECK
   constraint; user approves the PROD apply) + FP-09 summary backfill (content generation, can
   trail). FP-16 display mapping rides along as the belt-and-suspenders display half.
4. **Wave D — Dead-code deletion (mechanical).** FP-15 straight deletions first (one PR,
   `npm run check` + tests + smoke as the net), FP-21 trims second. **User decision embedded:**
   keep or delete AdminAnalytics (charts over ~3 accounts; carries the `recharts` dependency).
5. **Wave E — Ops & hygiene tail.** FP-11 embedding sweep (the one item with ongoing external
   cost; needs edge deploy + migration), FP-22 scripts attic, FP-23 docs PR; FP-20 stays
   opportunistic-only.

### Assumptions review — decisions for the owner

Plain-language verdicts from `fp1-audit/audit-assumptions.md` (full reasoning there):

1. **Ten filter categories** — KEEP the structure; ask stakeholders three roster questions:
   does Cooking Methods (3 options) earn its slot, should Ingredients (70 values, very
   teacher-intuitive) be promoted from reviewer-only to a search filter, and is the sidebar
   order the order teachers reach for.
2. **Facet-count badges** — RETHINK (= FP-01). The interface currently asserts numbers that
   aren't real; either make the database count them or drop them. The one truth-telling
   problem the review found.
3. **Location filter** — SIMPLIFY presentation only: two checkboxes (Indoor-friendly /
   Outdoor-friendly), stop exposing the stored "Both" value. No data change.
4. **Lesson permalinks** — RETHINK: add `?lesson=` so one lesson can be shared without
   bypassing the library (today the only way is the Google Doc link).
5. **Card activity badge** — SIMPLIFY: derive from the Activity Type field the filter uses,
   falling back to skills only when it's empty.
6. **Infinite scroll** — KEEP; it fits browsing + the accurate toolbar total; a11y fallbacks
   exist.
7. **New-vs-update submission chooser** — KEEP (it's advisory; wrong answers cost nothing and
   right answers pre-link the reviewer's merge). Cheapest improvement is copy: "not sure? pick
   either — a reviewer checks everything."
8. **Admin area** — KEEP Users/Invite/Invitations (load-bearing since invite-only); DECIDE
   Analytics: park or delete (growth charts over ~3 accounts, and it holds the app's only
   charting dependency).
9. **Search state layering** (store + URL + query cache) — KEEP and freeze: write the
   one-paragraph ownership rule so new state extends the machinery instead of adding a fourth
   mechanism.
10. **"Internal" design-system name** — KEEP the unified system; document that Int* IS the
    app-wide system (the name is historical); skip the rename churn.
11. **"We are an index, not a host"** — the app's deepest, undocumented belief (no lesson
    content is ever rendered in-app). KEEP — and write it down as an explicit product
    principle so future feature ideas get tested against it.

## Tracks

| # | Track | Needs user? | Status |
|---|---|---|---|
| FP1 | Discovery audit: re-verify the shelf, sweep the frontend (bugs + overengineering), assumptions review, ranked backlog | No (user reviews output) | **Audit DONE 2026-07-03** (9/9 agents; reports in `fp1-audit/`; ranked backlog below). FP2 walkthrough next |
| FP2 | Live walkthroughs (public search; teacher/reviewer) — user narrates, Fable explains + logs | **Yes** | **NEXT** — audit findings below sharpen the walkthrough script |
| FP3+ | Themed fix waves: quick wins first, then bug clusters, then sanctioned redesigns/simplifications | Per wave | **NOW BRIEF-DRIVEN (2026-07-03 PM):** five Opus briefs in `fp3-briefs/` (1 = #593 finalize, 2 = display truth, 3 = search polish, 4 = heritage close, 5 = ingredients promote — run 5 last). Earlier: **OVERNIGHT RUN 2026-07-03 shipped the bulk**: FP-11 (E, #581 merged + #582/583/584 gates), FP-15+D3 (D, #587/#588/#592 merged), FP-03/04a/05/06/07 (A, #585/#586/#591 open), FP-02 (#590 open, TEST-verified), FP-01b+D2 (B-lite, #593/#594 open), reviewer-UX batch (#595 open) — see Morning handoff below. Remaining backlog: FP-09 summary backfill, FP-16/17/18 (stakeholder), FP-19/20/21/22/24 tails, FP-04 full dialog rebuild |

## Explicitly NOT in this phase (unless the user reopens)

- Dependency majors (#460 eslint-10 / #451 TS-6.0) — own sessions, someday
- Semantic search tier, C42 engine spike, embeddings regeneration
- Backend-only refactors with no user-visible payoff
- Any personalization/auth-gated features (audience is still ~3 internal accounts)
- Resend/DNS work

## Morning handoff (overnight run, 2026-07-03 ~1:20am–4:30am ET)

Run per `2026-07-03-brief-fp-overnight.md` (binding). All five waves executed in order, plus
ladder rungs 2/3/6/7. Every PR below went through: executor agent → independent adversarial
verifier → my own verify → `npm run check` + `test:run` green before push → full 4-surface bot
triage with a written rebuttal or fix for every finding. PROD was not touched; no gates approved.

**GATES CLOSED (2026-07-03 late morning, Fable + user):** #590 merged (`6f198d6`) + PROD-applied +
verified (95 rows normalized, snapshot 95 = 74 active/21 retired, CHECK validated, S2T 421 via RPC);
#584 slot-renamed `020000`→`040000` (red-team correction) + merged + PROD-applied + verified
(fn dropped, invariants 785/703/127 unchanged); #582/#583 merged, process-submission v39
3-signal-verified (sha byte-exact vs TEST, no-auth 400-by-design), hosted `generate-embeddings` +
`generate-gemini-embeddings` DELETED from PROD+TEST, resurrection check clean (0 queued runs),
`OPENAI_API_KEY` unset on both projects. Remaining open: #585/#586/#591/#593/#594/#595 → FP2
walkthrough sessions (script + decision checklist in `2026-07-03-fp2-walkthrough-script.md`).

**✅ FABLE DESIGN SESSION COMPLETE (2026-07-03 PM, owner + Fable).** All four deferred design
questions decided (record: `2026-07-03-fable-design-session.md`): (1) counts = standard
convention + explainer line, 0-with-dimmed-row → **#593 UNBLOCKED**, finalization spec =
`fp3-briefs/brief-1-593-finalization.md`; (2) grade-pill counts inline as built; (3) roster:
Cooking Methods KEPT, **Main Ingredients PROMOTED** to a search filter (tree UI, slot #3,
brief-5 — carries the only PROD gates), sidebar order otherwise unchanged; (4) FP-03 **CLOSED**
— gate-first stays (invite-only site, no signup exists; fill-first protects nobody). Bonus
decision: filter-panel "Clear all" → clears filters only (rides brief-3). New finding: 3 stray
off-vocab main_ingredients values on 4 PROD lessons (cleanup in brief-5). "Index, not host"
written into `docs/PRODUCT_PRINCIPLES.md`. Non-overlapping rung8 findings stay parked (list at
the end of the design-session doc).

**✅ FP2 WALKTHROUGH COMPLETE (2026-07-03 AM, owner + Opus).** Full record: decision-capture
checklist in `2026-07-03-fp2-walkthrough-script.md`; cold-read summary in `2026-07-03-fp2-handoff.md`.

- **Merged today (all frontend-only, no PROD gate fired):** #585 (`5324cec`), #586 (`ef48ef8`),
  #591 (`ae0df3e` — hand-resolved UserProfile conflict + stale test-mock fix, CI-green),
  #594 (`b57b490` — D2 permalink smoke passed), #595 (`b0fc09e`). **#593 HELD** — it *is* the
  counts convention the owner wants to settle with Fable first; do NOT merge until then.
- **Approved to BUILD (not in the 6 PRs):** FP-16 (friendly drawer labels + collapse heritage
  chains to the leaf + fix the "cultural" field label), FP-17 (badge from Activity Type field),
  FP-18 (Location two-checkbox — cosmetic; search already folds Both), FP-08 (darken light-gray
  text), FP-19 (synonym-match hint), chooser reassurance line, FP-12/13 (real 404 + search-error
  Retry), grade counts (with #593). ⚠️ **Indoor badge = 607, not the script's 417** (search folds
  Both). **Heritage reviewer field → CLOSE IT** (owner reversal; make a closed pick-list; build
  notes in handoff — worksheet confirmed still in flight). Adopt **"index, not host"** as a written
  principle.
- **Deferred to Fable (design agenda — hang together):** (1) counts convention [HOLDS #593] +
  show-0-vs-blank; (2) grade-pill layout; (3) filter roster (Cooking Methods category / promote
  Main Ingredients / sidebar order); (4) FP-03 primary-flow reachability — the "fill-first" submit
  flow was removed in Phase-8b (`f218800`), so #585's auto-submit only fires via a direct
  `/submit/new` deep-link (investigation: `scratchpad/fp03-submission-gate-investigation.md`).
- **Confirmed/closed (no work):** D3 Analytics gone; AI-draft provenance skip; review drafts +
  batch-nav skip; FP-06 tradeoff blessed; FP-02 done (#590, PROD-verified live: S2T 421).
- **TEST DB re-verified clean post-session:** 763 / 685 / 130, 0 markers, 0 submissions created.

### ✅ Merged overnight (under the brief's merge authority — mechanical/repo-side, green + clean bot)

| PR | What | Squash |
|---|---|---|
| #581 | **The meter is stopped**: daily smoke no longer makes the paid OpenAI call (generate-embeddings full-smoke + gemini health check removed); trimmed smoke ran live vs PROD twice, 7/7 | `b75c985` |
| #587 | FP-15 dead-code sweep: 58 files, −2,405 lines (5 orphan Int* components, dead Review/Admin/VerifySetup/Virtualized code, dead exports incl. the per-visit "connection test" request, `@tanstack/react-virtual` dep) | `6efb0b5` |
| #588 | D3 AdminAnalytics retirement (your locked decision): page, route, nav, CSS, `recharts` + 35 transitive packages | `853234a` |
| #589 | FP-23 docs hygiene: dead Algolia instructions, archive-policy table rows | `f8d16fb` |
| #592 | FP-15 CSS sweep: −952 lines of orphaned admin CSS + dead index.css layers (emitted CSS −21%) | `27e254c` |

### 🔴 YOUR GATES — open PRs that need you (in suggested order)

1. **#590 FP-02 kebab-themes data fix** (migration; the ~10%-of-library Thematic-filter bug).
   TEST-verified twice, every pre-registered expectation hit exactly (incl. `search_lessons`
   Seed-to-Table 387→413). **Before approving the PROD apply: run the read-only PROD probes in
   the PR body** — if PROD has any stray theme variant TEST lacked, the migration aborts loudly
   by design and the mapping question comes back to you. **Merge #590 BEFORE #584** (see note 3).
2. **#582 embedding edge-fns repo removal + #583 process-submission debug-path removal** (both
   `supabase/functions/**`). After merging: the **hosted deletions** are yours —
   `supabase functions delete generate-embeddings` / `generate-gemini-embeddings` on PROD
   (`jxlxtzkmicfhchkhiojz`) and TEST (`rxgajgmphciuaqzvwmox`), **then check
   `gh run list --workflow=deploy-edge-functions.yml --status=waiting`** and cancel stale queued
   runs (resurrection hazard, playbook). Optional afterwards: delete the now-unused
   `OPENAI_API_KEY` edge secret.
3. **#584 drop `find_duplicate_pairs()`** (migration draft). Its TEST application was rolled back
   overnight to unblock #590's CI (two unmerged migration PRs poison each other's dry-run guard —
   details on both PRs). **⚠️ CORRECTED by the 6:45am red-team: rebase alone is NOT enough** —
   #584's migration slot `20260703020000` sorts BEFORE #590's already-applied `20260703030000`,
   and CI/PROD run plain `supabase db push` (no `--include-all`), so it would never apply. After
   #590 merges: rebase #584, **rename its migration (+.rollback) to a post-030000 slot (e.g.
   `20260703040000_`)**, update the in-file header references, re-run the local reset, push.
   Note its PR-body "TEST verification" section is stale until then (the function EXISTS on TEST
   again after the overnight rollback — expected).
4. **Behavior PRs to review** (all green, all triaged, none merged — your call): **#585** AuthModal
   submit-after-sign-in + scrim (confirm DQ-1 auto-resubmit + DQ-2 scrim tone), **#586** UserProfile
   edit-clobber fix, **#591** honest error+retry on six fail-open surfaces (absorbed FOUR review
   rounds, each finding a real, narrower bug — all fixed + pinned; a 5th round found only the
   known out-of-scope F3 staleness item; confirm DQ-2 stale-user-over-false-signout),
   **#593** true facet counts (D1-b; badge semantics questions listed for FP2), **#594** lesson
   permalinks (D2; copy-link carries no filters — confirm; one deploy-preview smoke owed: paste a
   permalink in a private window + probe a retired lesson id), **#595** reviewer-UX batch (Pending
   default tab, doc-title-changed hint, stale revision-note republish fix).
5. Suggested merge order for the overlapping frontend PRs: #586 → #591 → #595 (ReviewDashboard/
   UserProfile overlaps are single-line-disjoint), then #593 → #594 (shared SearchPage hunks) —
   whichever merges second in each pair rebases trivially.

### 📋 Also ready / noted for you

- **FP2 walkthrough script**: `docs/plans/2026-07-03-fp2-walkthrough-script.md` (uncommitted,
  rides the next docs PR) — step-by-step for both walkthrough sessions, seeded with every open
  owner decision from tonight's PRs + the audit's stakeholder questions.
- **t4b deferral #3 spec** (similarity.test dead block + detect-duplicates scoring extraction) is
  written (`scratchpad/rung3-postlaunch-specs.md` item 4) but NOT executed: even test-file changes
  under `supabase/functions/**` trigger the edge-deploy workflow → it's a morning-gate PR.
- **Discovered tonight, needs a future slot**: (a) `npm run test:rls` has 2 pre-existing failures
  on main (`archive_duplicate_lesson` scenarios, likely T4b revoke fallout); (b) 28 lessons have
  order-only column↔metadata-mirror theme diffs (display-inert, pre-existing); (c)
  `validate_invitation_token.accepted_at` generates as non-nullable but is null for pending
  invitations (latent footgun, documented on #584); (d) PROD hosts an orphan `check-google-doc-access`
  edge function that's not in the repo with zero callers; (e) a shared `useFetchWithRetry` hook
  would de-duplicate the error-handling pattern #591 spread across five call sites.
- **Repo-local cleanups done**: 2 obsolete kickoff files removed, stale `tools/concepts-worksheet-form`
  branch deleted, `src/pages/CLAUDE.md` page count corrected (uncommitted, rides next docs PR).
- **TEST DB baseline**: verified byte-exact at handoff (763/685/130, zero markers) — plus the
  sanctioned #590 CI mutation (86 rows' theme values normalized, snapshot table present).
- **Process note**: one green-before-push violation occurred and was self-caught (a `;` where `&&`
  belonged let a red commit push on #591; superseded within minutes by the amended green commit —
  detail on the PR).

### STOPs / not done

- Nothing hit a hard STOP. Wave E/D/A + FP-02 + B-lite stretch all shipped. Ladder rung 8
  (second-pass discovery) was not reached — rungs 2 (flywheel: 3 extra review rounds on #591,
  independent reviewer on #585), 3 (reviewer-UX batch), 6 (docs PR), 7 (walkthrough script) were.

### Rung-8 second pass (6:41am burn window) — 22 findings, artifacts in scratchpad `rung8-*.md`

Fresh discovery, NOT yet backlog-ranked (next FP session's input). Highlights: **7 fail-open fetch
sites remain post-#591** (worst: AdminUsers "No users found." / AdminUserDetail "User not found."
on fetch errors); useLessonSuggestions fires a full discarded search per keystroke (`limit:0`
coerced to 20 server-side) and caches swallowed errors as 5-min successes; CONFIRMED-live cosmetic:
unsorted grade arrays render "Grades 1–K" (live on lesson "Sunprints"); #594 follow-ups (urlSync
wipes `fromSearch` on filter change while a lesson is open; pending debounce fires on the /lesson
entry); searchStore has a dead `currentPage` field + unversioned persist; one latent (0-rows-today)
heritage badge/click asymmetry. Red-team also verified the rest of this handoff's shas/stats/
baseline claims exact. PROD pre-probe for #590 was run and posted: **95 kebab rows, ZERO strays —
gate pre-cleared** (expect 95, not 86, in the PROD after-probes).
