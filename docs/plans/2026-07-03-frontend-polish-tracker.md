# Frontend Polish Tracker (post-launch phase)

**Goal:** hunt frontend bugs, explain the parts of the frontend the owner doesn't understand,
improve the end-user experience, and simplify what two years of vibe-coding with weaker models
overbuilt. Less focused than go-live by design — discovery comes first, fixes ship in small
themed waves. This is the ONLY tracking doc for the phase.

**Last updated:** 2026-07-03 (Fable, FP1 discovery audit COMPLETE — 9/9 audit agents ran; full
reports in `docs/plans/fp1-audit/`; ranked backlog + assumptions review synthesized below; docs
PR pending). NEXT = **FP2 live walkthroughs (user present)**.

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
| FP3+ | Themed fix waves: quick wins first, then bug clusters, then sanctioned redesigns/simplifications | Per wave | Defined by the backlog after FP1+FP2; user picks order |

## Explicitly NOT in this phase (unless the user reopens)

- Dependency majors (#460 eslint-10 / #451 TS-6.0) — own sessions, someday
- Semantic search tier, C42 engine spike, embeddings regeneration
- Backend-only refactors with no user-visible payoff
- Any personalization/auth-gated features (audience is still ~3 internal accounts)
- Resend/DNS work
