# FP4 discovery — evidence file

**Hand-back:** Discovery done: **53 confirmed / 0 hypotheses / 10 shelf items already-fixed** (all 26 load-bearing claims independently re-probed → 26 HOLD, 0 refuted, 0 nuance). → `docs/plans/fp4-discovery/discovery-evidence.md`

> Discovery-only, read-only. No fixes, no branches, no data mutations. Nothing here is pre-authorized to build — Fable ranks and writes briefs; the owner decides what ships. Sized for the real product: ~3 users now / ~15 max, desktop-only, invite-only, no a11y mandate, "minimize moving parts."

---

## The headline

**No user-visible breakage was found.** The public search experience is healthy — verified live on PROD (zero console errors across the whole drive; facet counts correct; click-truth holds for every facet; permalinks, drawer, sort, search, and honest empty-states all working). The shelf's four "broken public P1s" are **all already-fixed**, and FP-01 (facet counts ~30× off) is **fixed** too.

What's left is lower-stakes, and it clusters into four themes worth a wave:

1. **One silent data-drift (the only non-polish/non-annoyance item):** 60 of 74 live PROD `search_synonyms` rows are absent from the migration seeds — a `db reset` / reset-test-db would silently drop them (incl. the `activity` row FP-19 leans on). `[C3/FP4-SYN-06]`
2. **Logger label-redaction (top shelf pick):** whole-string `[REDACTED]` on any log label containing a sensitive substring — 7 live call sites lose their only human-readable clue in dev console AND prod Sentry. Not user-visible; degrades incident triage. `[C1/F1]`
3. **Admin fail-open cluster (7 sites, intact):** transient fetch failures render confidently-wrong empty states ("No users found." / "User not found.") on the ~3-account admin tool — no error/retry. `[C2/F1–F7]`
4. **One genuinely-new bug:** closing a lesson opened in split view silently reverts any facet/sort change made while it was open (Back-branch has no flush; the change landed on the lesson's history entry). Corrects the memory framing — it is NOT limited to the sub-300ms window. `[C5/FP4-SP-01]`

Everything else is polish or internal tidy-up (FP-21/22/24 oversized-mechanism trims, dead exports the FP-15 sweep missed, two stale `ARCHITECTURE.md` claims). The FP-09 summary gap (65 active blank summaries) and the parked Brief-5 VALIDATE census (7 named retired lessons block both NOT-VALID checks) are precisely quantified below.

## By the numbers

- **53 findings, all CONFIRMED** (every finding carries a reproducing probe + raw output). 0 hypotheses.
- **26 load-bearing** → adversarially re-probed by an independent verifier → **26 HOLD, 0 refuted, 0 nuance.**
- Shelf disposition: **37 still-real · 10 already-fixed · 6 new**.
- Severity mix: **0 user-visible-breakage · 1 silent-data-drift · 14 internal-annoyance · 38 polish**.
- Method: 7 parallel finder clusters (code reads + read-only SQL on PROD `jxlxtzkmicfhchkhiojz` / TEST `rxgajgmphciuaqzvwmox`) + adversarial verify pass, orchestrated as a workflow; PLUS a manual live-drive of the PROD public site (chrome-devtools MCP, read-only, no auth). 33 agents, 0 errors.

## Part 1 — the standing shelf, re-verified (do not trust the list; each re-probed)

| # | Shelf item | Finding | Verdict |
|---|---|---|---|
| 1 | Logger keyword-redaction bug (rung8b-utils F1) — top pick | `C1/F1` | **STILL-REAL** · 7 live sites (shelf said 6) · HOLDS |
| 2 | Seven fail-open admin fetch sites | `C2/F1–F7` | **ALL 7 STILL-REAL** · none swept by #591 · F1/F3 HOLDS |
| 3a | FP-09 summary backfill | `C4/FP4-DB-02` | **STILL-REAL** · exactly 65 active blank (0 NULL) · HOLDS |
| 3b | FP-20 admin robustness | `C2/FP20a–c` | **STILL-REAL** · tab race + silent CSV + unpaginated queue |
| 3c | FP-21 oversized mechanisms | `C6/FP21a–d` | **ALL STILL-REAL** · 7 unused perms, teacher auto-create, 2 debounce, 3 error boundaries |
| 3d | FP-22 scripts attic | `C6/FP22` | **STILL-REAL** · 77 entries (shelf said 75) |
| 3e | FP-24 a11y one-liners | `C6/FP24-*` | **STILL-REAL** (all polish; 1×1px checkbox confirmed NOT a bug) |
| 3f | FP-04 AuthModal rebuild | `C6/FP04-*` | scrim **ALREADY-FIXED** · modal **STILL hand-built** (rebuild not done) |
| 4 | handleCloseLesson toggle-then-close (D2) | `C5/FP4-SP-01` | **NEW real bug** · not limited to 300ms window · HOLDS |
| 5 | smart-search returns synonym set (contract) | `C3/FP4-SYN-05` | **STILL-REAL** · frontend still reconstructs heuristically (design proposal) |
| 6 | Synonyms-table sync (~29 live-only rows) | `C3/FP4-SYN-06` | **STILL-REAL, WORSE** · 60 live-only (not 29) · silent-data-drift · HOLDS |
| 7 | Brief-5 parked: 7 retired off-vocab + VALIDATE both | `C4/FP4-DB-01` | **STILL-REAL** · 7 named retired lessons block both checks, 0 active · HOLDS |
| 8 | fieldValueLabeler typing (Option C, #603) | `C1/FIELD-LABELER` | **STILL-REAL, NO ACTION** · Option C fail-safe intact |
| 9 | Overnight-review threads (4 P1s + docs + simplification) | `C7 (all)` | 4 P1s **ALL ALREADY-FIXED** · docs residual mostly resolved · 2 simplification items still-real · 2 fresh stale-docs |

## Ranked summary — actionable findings (still-real + new), sharpest first

Already-fixed items are listed separately below (evidence that the shelf drifted). `★` = load-bearing (independently verified).

| Rank | ID | Sev | Eff | Finding | Verified |
|---|---|---|---|---|---|
| 1 | `SE/FP4-SYN-06`★ | silent | M | 60 of 74 live PROD search_synonyms rows are absent from the migration seeds, so a fresh `supabase db reset` (local) or a… | HOLDS |
| 2 | `AD/F1`★ | internal | S | AdminUsers user-list load failure is swallowed (log-only catch), leaving the table to render the confidently-wrong empty… | HOLDS |
| 3 | `AD/F3`★ | internal | S | AdminUserDetail's log-only catch leaves `user` null on ANY load error, rendering the affirmatively-wrong "User not found… | HOLDS |
| 4 | `DB/FP4-DB-01`★ | internal | L | VALIDATE CONSTRAINT on both valid_cooking_skills and valid_main_ingredients is still blocked today by exactly the same 7… | HOLDS |
| 5 | `OV/FP4-SIMP-F5-cors`★ | internal | S | simplification-groundwork F5 (edge functions duplicate the restricted-CORS origin logic instead of importing _shared/cor… | HOLDS |
| 6 | `SE/FP4-SYN-05`★ | internal | M | smart-search returns only the expandedQuery tsquery STRING (not the synonym set), so the frontend must reconstruct which… | HOLDS |
| 7 | `SE/FP4-SP-01`★ | internal | M | Closing a lesson via the Back branch (navigate(-1)) silently reverts any facet/sort change the user made while the lesso… | HOLDS |
| 8 | `UT/F1`★ | internal | S | logger.ts still whole-string-redacts any string arg whose lowercase form .includes() a SENSITIVE_KEY substring, nuking h… | HOLDS |
| 9 | `AD/FP20a` | internal | M | The tab/filter/navigation list fetches have no abort or staleness guard, so on a slow connection fast tab-clicks (Review… | — |
| 10 | `OV/FP24-stale-e2e-comment` | internal | S | The e2e heritage-filter comment still describes the checkbox input as display:none, but the actual CSS is the sr-only cl… | — |
| 11 | `OV/FP4-STALE-arch-ghost-pages` | internal | S | FRESH stale doc: docs/ARCHITECTURE.md's Pages section lists AdminAnalytics.tsx, AdminDuplicates.tsx, AdminDuplicateDetai… | — |
| 12 | `OV/FP4-STALE-arch-lessonformat` | internal | S | FRESH stale doc: docs/ARCHITECTURE.md still documents a `lessonFormat` field/filter, but that field was removed entirely… | — |
| 13 | `SE/FP4-STORE-03` | internal | S | viewState.currentPage is a dead state field — written by 6+ mutations plus SearchPage, read by zero consumers — perpetua… | — |
| 14 | `UT/F2` | internal | S | reviewToLessonMapper.ts is still a dead module with zero PRODUCT consumers — the only importers repo-wide are its own te… | — |
| 15 | `UT/F6b` | internal | S | errorHandling.ts still duplicates the 23505+email predicate verbatim inside parseDbError instead of delegating to the ex… | — |
| 16 | `DB/FP4-DB-02`★ | polish | M | FP-09 backfill target: 65 ACTIVE lessons have a blank summary (empty string after btrim, 0 are NULL); an additional 21 r… | HOLDS |
| 17 | `OV/FP04-still-handbuilt-modal`★ | polish | M | AuthModal is STILL a hand-built modal (the full dialog-lib rebuild was NOT done): no role/aria-modal, no Escape-to-close… | HOLDS |
| 18 | `OV/FP21a-permissions-oversized`★ | polish | M | 13-permission RBAC still ships with 7 permissions never used in any production check, an override-merge engine no UI can… | HOLDS |
| 19 | `OV/FP21b-teacher-autocreate`★ | polish | M | useEnhancedAuth still silently client-side INSERTs a role:'teacher' user_profiles row for any authenticated user missing… | HOLDS |
| 20 | `OV/FP21c-two-debounce-impls`★ | polish | S | Two debounce implementations still coexist, one call site each, and the function-debounce skips debouncing entirely unde… | HOLDS |
| 21 | `OV/FP21d-three-error-boundaries`★ | polish | M | Three stacked global error boundaries with two hand-rolled 'Something went wrong' fallbacks still layer over the app; th… | HOLDS |
| 22 | `OV/FP22-scripts-attic`★ | polish | S | scripts/ is still an attic: 77 top-level entries (shelf said 75), 9 orphan SQL files with zero real consumers, and three… | HOLDS |
| 23 | `SE/FP4-FACET-02`★ | polish | S | Facet badge counts match click-result semantics for both non-trivial facets: Main Ingredients (direct match, no group→ch… | HOLDS |
| 24 | `UT/F5`★ | polish | S | The urlParams outbound/inbound cap asymmetry STILL STANDS and was NOT neutralized by Brief 5's %2C escaping: buildSearch… | HOLDS |
| 25 | `AD/F2` | polish | S | AdminUsers school-filter dropdown renders optionless with no signal when the schools fetch fails — both the non-throw br… | — |
| 26 | `AD/F4` | polish | S | AdminInvitations load failure surfaces only a toast that self-dismisses after 3.2s; the resting state is the persuasive … | — |
| 27 | `AD/F5` | polish | S | AdminInviteUser's schools dropdown stays empty with no signal on fetch error (log-only catch); the admin can still send … | — |
| 28 | `AD/F6` | polish | S | AdminInviteUser's live pending-invite duplicate check never destructures `error` — on a query error `data` is null → `(d… | — |
| 29 | `AD/F7` | polish | S | SchoolCheckboxGroup swallows fetch errors into `setSchools([])`, then renders the generic "No schools available" (indist… | — |
| 30 | `AD/FP20b` | polish | S | AdminUsers CSV export failure is a silent no-op (log-only catch, no toast/error) — clicking Export during a fetch failur… | — |
| 31 | `AD/FP20c` | polish | S | The review queue fetches every column of every submission unpaginated — `select('*')` with no .range()/.limit() — pullin… | — |
| 32 | `OV/FP24-header-link-names` | polish | S | Header Submit/Review links still lose their accessible name below 640px (text hidden, icons aria-hidden, no aria-label). | — |
| 33 | `OV/FP24-announcer-firstload-and-store` | polish | S | ScreenReaderAnnouncer still (a) subscribes to the whole store (banned pattern) and (b) fires a spurious 'All filters cle… | — |
| 34 | `OV/FP24-skiplink-position` | polish | S | The skip link is still not the first focusable element — it renders inside SearchPage, after the Header in DOM order. | — |
| 35 | `OV/FP24-formfield-htmlfor-nonlabelable` | polish | S | IntFormField still wires <label htmlFor> onto non-labelable read-only children (<p>/<div>) on the profile page, failing … | — |
| 36 | `OV/FP24-checkbox-not-a-bug` | polish | S | NOTE (not a bug): the '1x1px checkbox' is the CORRECT sr-only clip pattern — input stays keyboard-focusable and in the a… | — |
| 37 | `OV/FRESH-fp15-was-thorough` | polish | S | The FP-15 dead-code sweep was thorough: across components/pages/hooks/stores/types/lib there is NO missed live dead code… | — |
| 38 | `OV/FRESH-no-todos-with-teeth` | polish | S | There are ZERO TODO/FIXME/HACK/XXX comments with teeth in live src or supabase/functions, and no @ts-ignore/@ts-expect-e… | — |
| 39 | `OV/FP4-SIMP-F3-admin-dup` | polish | M | simplification-groundwork F3 (admin pages duplicate a load/filter/paginate state machine) is STILL-REAL but SHRUNK: 3 of… | — |
| 40 | `SE/FP4-STORE-04` | polish | S | Persisted layout state (esy-search-ui) has no version/migrate and the custom merge does zero validation, so a corrupt or… | — |
| 41 | `UT/FIELD-LABELER` | polish | S | fieldValueLabeler's Option C fail-safe (#603) still holds unchanged: the param is type-guarded as keyof typeof ALL_FIELD… | — |
| 42 | `UT/F4` | polish | S | sanitizeHtml is still a dead export — its only consumers are its own tests; the strip-all-tags sibling sanitizeContent i… | — |
| 43 | `UT/F6a` | polish | S | FeatureFlagKey is still a dead exported type — zero references beyond its own declaration. | — |

## Retired from the shelf — verified already-fixed / stale (10)

- **[utils-shelf/F3]** F3 is ALREADY-FIXED: METADATA_KEYS was removed entirely from filterDefinitions.ts and METADATA_CONFIGS was demoted to a module-private const — exactly the 'F3 rider' the shelf flagged Brief 5 might have landed.
- **[db-census/FP4-DB-03]** FP-02 is fully resolved on PROD: ZERO kebab-style machine tokens remain in thematic_categories; all 7 distinct values are clean Title Case.
- **[searchpage-behavior/FP4-PERMALINK-05]** All three rung8-permalink-history findings (state-drop on filter change while open; pending debounce firing on the pushed /lesson entry; open-lesson-filtered-out spurious loading) are ALREADY FIXED in current main.
- **[overeng-deadcode/FP04-scrim-already-fixed]** The FP-04 'backdrop is solid black because bg-opacity-50 no longer exists in Tailwind v4' claim is STALE — the scrim was fixed to bg-esy-ink/30 (a real @theme-registered utility) by #585, with a regression-test tripwire.
- **[overnight-docs/FP4-P1a-mobile-filters]** The mobile-filter CSS source-order bug (frontend-ux-review 3.1) is ALREADY FIXED: the base `.int-mobile-filter-btn { display:none }` now precedes the <768px override, so the trigger shows on mobile — and for a desktop-only audience it is polish regardless.
- **[overnight-docs/FP4-P1b-checkbox-a11y]** The `.int-check input { display:none }` keyboard/SR-inaccessibility claim (frontend-ux-review 3.2) is STALE: inputs now use an sr-only clip pattern that keeps them focusable and in the AX tree, with a focus-visible outline — matching the rung8/FP1 '1x1px checkbox is the correct SR pattern' verdict.
- **[overnight-docs/FP4-P1c-sort-noop]** The 'Sort dropdown is a no-op' claim (frontend-ux-review 3.3) is ALREADY FIXED end-to-end (label C58): SearchPage passes sortBy into useLessonSearch, which puts it in the React-Query key and forwards it as the RPC `order_by`, and the search_lessons RPC has a real conditional ORDER BY on title/modified/relevance.
- **[overnight-docs/FP4-P1d-false-no-matches]** The 'every search flashes false No matches' claim (frontend-ux-review 3.5) is ALREADY FIXED (label C59): useLessonSearch sets placeholderData:keepPreviousData and SearchPage branches on isPending to render a skeleton, so cold load shows a skeleton and refetches keep prior rows instead of emptying to IntEmptyState.
- **[overnight-docs/FP4-DOC-cleanup-residual]** The docs-cleanup-audit.md residual is LARGELY RESOLVED: root CLAUDE.md:171 no longer states a hard count, ARCHITECTURE.md carries a stale-counts banner with per-line Oct-2025 qualifiers, AGENTS.md/scripts Algolia ghosts are fixed, and the two 'actively misleading' status docs (F2 phase-8b, F3 concepts) plus the archive dir (F5/F7) now exist under docs/plans/archive/.
- **[overnight-docs/FP4-SIMP-F1-reviewdetail]** simplification-groundwork F1 (ReviewDetail.tsx 1,451-line monolith + dead ReviewActions/ReviewContent/ReviewDuplicates trio) is ALREADY DONE: ReviewDetail.tsx is now 518 lines and the extracted Review/ components exist; the dead trio is gone.

---

## Live-drive evidence — PROD public site (read-only)

Driven manually via chrome-devtools MCP against `https://esynyc-lessonlibrary-v2.netlify.app` (prod Supabase, no auth — public search). This is the Part-2 "drive the live site as a teacher would" pass; it independently corroborates C5/FP4-FACET-02 (facet parity) and the C7 already-fixed P1 verdicts.


Driver: chrome-devtools MCP (CDP), Opus main session. Prod Supabase (jxlxtzkmicfhchkhiojz). No auth (public search). Total corpus = 703 lessons.

### CONFIRMED WORKING (regression-clean — evidence for "already-fixed / do not reopen")
- **Facet counts correct + server-side (FP-01 FIXED).** Zero-filter badges: Winter 324 / Spring 268 / Fall 365 / Summer 127 / Cooking 394 / Garden 284 / Academic 53 / Craft 132 — match PROD truth. Old "~30× off + blank Grade badges" GONE; Grade now renders counts (3K 148, PK 220, K 284, 1 278, …, 8 208).
- **Click-truth invariant holds for every facet tested** (badge count == filtered result total):
  - Season: click Winter (324) → `?season=Winter`, "Showing 20 of 324".
  - Main Ingredients GROUP (direct-match): click Root vegetables (140) → `?ing=Root+vegetables`, "Showing 20 of 140". (parent-backfill data fix works live)
  - Cultural Heritage PARENT (ancestry expansion — hardest parity case): click Asian (69) → `?culture=asian`, "Showing 20 of 69". facetCounts heritage expansion == RPC expansion.
- **Main Ingredients tree (Brief 5)** at sidebar slot #3, collapsed by default; full tree w/ live counts (Alliums 199, Grains & starches 207, Beans & legumes 90, Spices 114…); Melons shows loaded-zero "0".
- **Comma/ampersand group permalink round-trips.** App emits `?ing=Squash%252C+cucumbers+%26+melons` (double-encoded %252C) — reloading that exact URL restores 49 results. NOTE: only the app's OWN emitted encoding round-trips; a hand-typed single `%2C` or `%20`-spaces version does NOT (restores 703, filter dropped). Cosmetic: emitted URL is ugly/double-encoded but functional.
- **Lesson permalink (FP-10) + drawer + friendly labels (FP-16).** Clicking a card routes to `/lesson/<googleDocId>?…` preserving active filters; opens dialog `int-drawer` with title, "COOK · GRADES 3K–8", summary, **OPEN LESSON PLAN** (external docs.google.com — index-not-host), **COPY LINK**. No raw kebab/machine tokens anywhere in drawer or cards ("Seed to Table" not "seed-to-table", "Cook"/"Grow"/"Cook + Grow", "Lenape").
- **Location (FP-18)** = "Indoor-friendly 607" / "Outdoor-friendly 286" — two friendly checkboxes, no "Both".
- **Sort works (NOT a no-op).** `?sort=title` orders "---", "3 Sisters Dip & Pita chips", "3 Sisters Tacos" (alphabetical). Combobox value reflects "title".
- **Honest zero-result state (false-no-matches P1 not reproduced).** "zzzxqvwk qphlmn" → "NO MATCHES / Try removing a filter or broadening your search", "0 lessons matching…", live region "Found 0 lessons." No transient false empty.
- **FP-19 synonym-hint honesty (#601 fix holds).** "compost lesson" → 164 results, NO false "Including matches for…" hint (filler-word "lesson" no longer triggers a lying activity/project expansion).
- **Zero console errors/warnings** across the ENTIRE drive (load + all filters + tree + permalinks + drawer + sort + search + gibberish), incl. preserved-over-navigations.

### FRESH FINDINGS (live)
- **FP-24 spurious announcement CONFIRMED LIVE.** On FIRST page load with zero interaction, the polite live region (uid status) reads "All filters cleared. Showing all 703 lessons." A screen-reader user hears "All filters cleared" having cleared nothing. Desktop-adjacent, polish sev (no a11y mandate). Present on every fresh load.
- **Lesson titled literally "---"** exists on PROD (sorts first under Title A–Z; grade "4–8", summary "Students are welcomed to the garden, go over garden rules…"). Data curiosity / possible title-quality gap. Low sev. (worth a title-quality census alongside the FP-09 summary backfill)
- **Gibberish suggestions echo the gibberish.** Zero-result "zzzxqvwk qphlmn" suggests "zzzxqvwk / zzzxqvw / zzzxqvwks / qphlmn / qphlm" (prefix/suffix variants that also return 0). Minor UX oddity, not a bug.

### The 4 overnight-review public P1s — live verdicts
- sort no-op → **STALE/fixed** (sort re-orders live).
- false no-matches → **STALE/fixed** (honest empty state).
- mobile filters CSS / display:none a11y → desktop-only audience + 1×1px-is-correct-SR-pattern verdict → deprioritized; code-trace deferred to workflow cluster overnight-docs.

---

## Full evidence — all 53 findings by cluster

Every finding: claim · where (file:line / DB object) · exact probe · raw output · severity · effort · confidence · (load-bearing → independent adversarial verdict). Identifiers copied verbatim from source/DB by the finders.

### C1 · src/utils shelf (logger, fieldValueLabeler, dead code)  (8 findings)

#### `F1` — INTERNAL ANNOYANCE · effort S · CONFIRMED · still-real ★load-bearing

**Claim.** logger.ts still whole-string-redacts any string arg whose lowercase form .includes() a SENSITIVE_KEY substring, nuking human-written log LABELS in the dev console AND prod Sentry; the live floor is now 7 product call sites (shelf said 6), and it grew — a new 'auth'-substring site appeared and one site drifted line numbers.

**Where.** src/utils/logger.ts:46-49 (redaction) + SENSITIVE_KEYS src/utils/logger.ts:12-29; error path captureMessage at logger.ts:170, warn at :145, debug breadcrumb at :126

**Probe.**
```
Read logger.ts; then grep -rEni "logger\.(error|warn|debug)\(\s*['\"][^'\"]*(password|token|secret|key|auth|cookie|session|email|phone|ssn|credit_card)" src ; plus manual scan of all 63 logger calls (grep -rEn "logger\.(error|warn|debug)\(" src) and Read of the 2 multi-line calls
```

**Raw output.**
```
logger.ts:46 `const lowerArg = arg.toLowerCase();` :47 `if (SENSITIVE_KEYS.some((key) => lowerArg.includes(key))) {` :48 `return '[REDACTED]';`. SENSITIVE_KEYS[12-29] includes bare 'token','key','auth','session','email','phone'. Matches:
  src/lib/supabase.ts:11  logger.error('VITE_SUPABASE_ANON_KEY:', ...) -> 'key'
  src/pages/ReviewDashboard.tsx:127  logger.error('Error checking auth state:', error) -> 'auth' [NEW, not in shelf]
  src/pages/UserProfile.tsx:277  logger.error('Error updating password:', error) -> 'password' [shelf said :264 — drifted]
  src/pages/AdminInvitations.tsx:215  logger.error('Failed to resend invitation email:', emailError) -> 'email'
  src/pages/AdminInvitations.tsx:220  (same) -> 'email'
  src/pages/AdminInviteUser.tsx:208  logger.error('Failed to send invitation email:', emailError) -> 'email'
  src/pages/AdminInviteUser.tsx:213  logger.error('Error invoking email function:', err) -> 'email'
Error path (logger.ts:159-171): non-Error first arg -> captureMessage(argsToMessage(sanitized),'error'); sanitized label = '[REDACTED]' so Sentry message = '[REDACTED] {json}'.
```

**Notes.** TOP PICK. Not user-visible (users don't see logs) and no data is destroyed — impact is degraded PROD incident triage: the invitation-email-send failure and the missing-env startup diagnostic (supabase.ts:11) both lose their only human-readable clue in Sentry AND dev console. Count grew 6->7: ReviewDashboard.tsx:127 'auth' is new vs the shelf list; UserProfile drifted :264->:277. The two multi-line logger calls (reviewMetadataInit.ts:12 'AI draft failed lessonMetadata canonical schema...', useReviewSubmission.ts:426 'Loaded review with unsupported decision...') were Read and confirmed to NOT contain a sensitive substring. Future-risk self-redaction of labels containing 'author'/'unauthorized'/'keyboard': grep found ZERO such logger first-args today, but the 'auth' substring already fires on 'auth state' — the same mechanism would silently eat any future 'unauthorized'/'authorization' label. Fix shape (shelf): exempt first (label) arg, or require key=/key: value-context, or word-boundary match; the JWT/API-key regex guards at logger.ts:38-44 already handle real secret VALUES.

**Adversarial verify → HOLDS.** Core reproduces exactly: substring-includes whole-string redaction at :46-49 nukes the human-written label in both dev console and prod Sentry across exactly 7 current call sites (incl. the 'auth' site ReviewDashboard.tsx:127); only the historical drift sub-claims (shelf-said-6 / "new" / "drifted lines") are unverifiable without the prior shelf, but they are peripheral to the load-bearing claim.

<details><summary>independent re-probe</summary>

```
Read src/utils/logger.ts (full) + `grep -rEni "logger\.(error|warn|debug)\(\s*['\"][^'\"]*(password|token|secret|key|auth|cookie|session|email|phone|ssn|credit_card)" src`
```

```
logger.ts:46-49 = `const lowerArg = arg.toLowerCase(); if (SENSITIVE_KEYS.some((key)=>lowerArg.includes(key))) return '[REDACTED]';` ; SENSITIVE_KEYS lines 12-29 include 'auth','email','password','key','session','token'; sinks confirmed: debug breadcrumb :126, warn captureMessage :145, error captureMessage :170. Grep returned 7 lines: supabase.ts:11 (VITE_SUPABASE_ANON_KEY:→'key'), ReviewDashboard.tsx:127 (Error checking auth state:→'auth'), UserProfile.tsx:277 (Error updating password:→'password'), AdminInvitations.tsx:215 & :220 (…email…), AdminInviteUser.tsx:208 & :213 (…email…). error path line 162 `firstArg instanceof Error` is false for these string-label calls → else branch → captureMessage(argsToMessage(sanitized)) sends '[REDACTED]' to Sentry.
```

</details>

---

#### `F2` — INTERNAL ANNOYANCE · effort S · CONFIRMED · still-real

**Claim.** reviewToLessonMapper.ts is still a dead module with zero PRODUCT consumers — the only importers repo-wide are its own test and one backfill test; its doc block still (falsely) claims two live consumers.

**Where.** src/utils/reviewToLessonMapper.ts:26 (export function reviewToLesson); importers src/utils/reviewToLessonMapper.test.ts:2 and src/types/__tests__/seasonTiming.backfill.test.ts:4

**Probe.**
```
grep -rn "reviewToLessonMapper" src supabase e2e scripts ; grep -rn "reviewToLesson\b" ... | grep -v lessonToReview
```

**Raw output.**
```
Import statements of the module: seasonTiming.backfill.test.ts:4 `import { reviewToLesson } from '@/utils/reviewToLessonMapper';` and reviewToLessonMapper.test.ts:2 `import { reviewToLesson } from './reviewToLessonMapper';`. All other reviewToLesson hits are the module's own def (:26), its tests, or doc comments (lessonMetadata.zod.ts:10, lessonToReviewMapper.ts:5). Zero src/ product or supabase/functions consumers.
```

**Notes.** Runtime-harmless dead code (88 product lines + a test) masquerading as live infra; its doc comment invites false 'keep in sync with complete_review_atomic' maintenance. The INVERSE mapper lessonToReviewMapper IS the one used at the read site. Candidate for a pure-deletion follow-up to the FP-15/dead-code lineage (delete module + its test; keep/relocate the season->seasonTiming round-trip property in seasonTiming.backfill.test.ts if still wanted).

---

#### `F6b` — INTERNAL ANNOYANCE · effort S · CONFIRMED · still-real

**Claim.** errorHandling.ts still duplicates the 23505+email predicate verbatim inside parseDbError instead of delegating to the exported isEmailDuplicateError (which now DOES have a product consumer), a same-file drift hazard.

**Where.** src/utils/errorHandling.ts:16-25 (inline predicate in parseDbError) vs :65-75 (isEmailDuplicateError); consumer src/pages/AdminInviteUser.tsx:11,219

**Probe.**
```
Read errorHandling.ts; grep -rn "isEmailDuplicateError" src
```

**Raw output.**
```
parseDbError :16 `if (pgError.code === '23505') {` :18-21 `if (pgError.message?.includes('idx_user_profiles_email_unique') || pgError.message?.includes('email'))`. isEmailDuplicateError :69-71 `pgError.code === '23505' && (pgError.message?.includes('idx_user_profiles_email_unique') || pgError.message?.includes('email'))` — byte-identical predicate. isEmailDuplicateError is now consumed at AdminInviteUser.tsx:219 (`if (isEmailDuplicateError(err))`).
```

**Notes.** Refactor is non-trivial-ish: parseDbError returns a MESSAGE (email-specific vs generic 23505) not a boolean, so it can't just `return isEmailDuplicateError(...)` — it would branch on the boolean then return the email message. Drift hazard only (two copies of the same email-constraint heuristic can diverge). Shelf line numbers drifted (:17-25 -> :16-25 ; :67-75 -> :65-75). Note vs shelf: isEmailDuplicateError is no longer purely internal — it gained a real caller (AdminInviteUser), which slightly raises the value of de-duplicating so both paths share one definition.

---

#### `F3` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** F3 is ALREADY-FIXED: METADATA_KEYS was removed entirely from filterDefinitions.ts and METADATA_CONFIGS was demoted to a module-private const — exactly the 'F3 rider' the shelf flagged Brief 5 might have landed.

**Where.** src/utils/filterDefinitions.ts:224 (private const METADATA_CONFIGS), :350-353 (ALL_FIELD_CONFIGS spread); confirming comment src/utils/filterDefinitions.test.ts:5

**Probe.**
```
grep -rn "METADATA_KEYS" src supabase e2e scripts ; grep -rn "METADATA_CONFIGS" ... ; Read filterDefinitions.ts:344-353
```

**Raw output.**
```
METADATA_KEYS: no hit in filterDefinitions.ts — only src/utils/filterDefinitions.test.ts:5 `// METADATA_CONFIGS is now module-private + METADATA_KEYS was removed (F3 dead-export...`. METADATA_CONFIGS: filterDefinitions.ts:224 `const METADATA_CONFIGS: Record<string, FilterConfig> = {` (NO export keyword), spread at :352 `...METADATA_CONFIGS,` inside `export const ALL_FIELD_CONFIGS = { ...FILTER_CONFIGS, ...METADATA_CONFIGS };` (:350-353). No external importer of METADATA_CONFIGS.
```

**Notes.** Both halves of the shelf finding are resolved. Shelf line numbers drifted (METADATA_CONFIGS export was ~:173 -> now private const :224; METADATA_KEYS was ~:295 -> gone). load_bearing:true only because a downstream dead-code brief must NOT re-list this — mark it closed. The exported reviewer surface is now cleanly ALL_FIELD_CONFIGS (consumed by ReviewMetadataForm.tsx + filterUtils.fieldValueLabeler).

**Adversarial verify → HOLDS.** Independent grep+Read reproduces all three load-bearing claims exactly: METADATA_KEYS fully removed (only a documenting comment survives), METADATA_CONFIGS demoted to module-private const at :224, spread into exported ALL_FIELD_CONFIGS at :352 — line refs 224/350-353/test:5 all accurate; F3 is already-fixed as claimed.

<details><summary>independent re-probe</summary>

```
grep -rn "METADATA_KEYS" src supabase e2e scripts ; grep -rn "METADATA_CONFIGS" src supabase e2e scripts ; Read src/utils/filterDefinitions.ts lines 215-353
```

```
METADATA_KEYS grep: only 1 hit, a comment — src/utils/filterDefinitions.test.ts:5:// METADATA_CONFIGS is now module-private + METADATA_KEYS was removed (F3 dead-export. No `export const METADATA_KEYS` definition anywhere.
METADATA_CONFIGS grep: src/utils/filterDefinitions.ts:224:const METADATA_CONFIGS: Record<string, FilterConfig> = {  (no `export` keyword — module-private); :352:  ...METADATA_CONFIGS,  (inside ALL_FIELD_CONFIGS block spanning 350-353); plus comment mentions at :80, test:4-5, and one prose mention in scripts/stage2-retag/data/smaller-fields.vocab.json.
Read confirms line 224 `const METADATA_CONFIGS` (no export), lines 350-353 `export const ALL_FIELD_CONFIGS = { ...FILTER_CONFIGS, ...METADATA_CONFIGS, };`, and test:5 comment verbatim.
```

</details>

---

#### `F5` — POLISH · effort S · CONFIRMED · still-real ★load-bearing

**Claim.** The urlParams outbound/inbound cap asymmetry STILL STANDS and was NOT neutralized by Brief 5's %2C escaping: buildSearchParams caps array filters by ENTRY count (MAX_ARRAY_LENGTH=50) with no char cap, while parseSearchParams drops the WHOLE param when the raw string exceeds MAX_PARAM_LENGTH=1000 chars — so the module's 'app can never emit a URL longer than it will accept' comment remains technically violated (latent/unreachable for current vocab).

**Where.** src/utils/urlParams.ts:94-97 + :102-110 (outbound: only query char-capped, arrays entry-capped) vs :179 (inbound: `if (!raw || raw.length > MAX_PARAM_LENGTH) continue;`); comment claim at :94-96; vocab-safety note at :20-22

**Probe.**
```
Read urlParams.ts; grep urlParams.test.ts for MAX_PARAM_LENGTH / char budget
```

**Raw output.**
```
buildSearchParams:97 `const query = (filters.query ?? '').slice(0, MAX_PARAM_LENGTH).trim();` (query IS char-capped). :107 `arr.slice(0, MAX_ARRAY_LENGTH).map(encodeArrayValue).join(',')` (arrays: entry-capped only, NO char cap). parseSearchParams:179 `if (!raw || raw.length > MAX_PARAM_LENGTH) continue;` (drops whole param by char length, BEFORE split/decode). encodeArrayValue at :74 turns each literal comma into 3 chars '%2C' -> outbound string can only get LONGER, never shorter. urlParams.test.ts asserts entry-cap (:82-85, :192-198) and the %2C-sentinel drift-lock (:347) but NO sum-of-values<MAX_PARAM_LENGTH char-budget assertion.
```

**Notes.** VERDICT for Fable: asymmetry NOT neutralized — Brief 5's escaping marginally WORSENS the outbound length (commas expand to %2C) and only added a doc-comment manual verification (urlParams.ts:20-22: 'all 70 ingredient values joined = 749 chars < 1000 ... unreachable for this vocab'). Still latent-only: reachable solely if a facet's summed values exceed 1000 chars (would need a large creatable facet or a vocab that grows), in which case a shared many-value URL silently drops the whole filter on the recipient AND useUrlSync's canonical-string loop-guard compares two never-converging states. The shelf's suggested cheap drift-lock (a test asserting each facet's summed-value length < MAX_PARAM_LENGTH) still does NOT exist — only the manual doc-comment check does. load_bearing:true because Fable explicitly asked for the neutralized-vs-stands verdict.

**Adversarial verify → HOLDS.** Independent Read reproduces the finding exactly: outbound arrays get only an entry-cap (L107) while inbound drops the whole param on a >1000-char cap (L179) plus an entry-cap (L194) — a real structural asymmetry that the comment (L94-96) overstates; Brief 5's %2C escape (L73-75) adds no char cap so did not neutralize it; correctly self-classified as latent/unreachable for the current ~70-value vocab (polish severity, code-comment-accuracy nit). All cited line refs accurate.

<details><summary>independent re-probe</summary>

```
Read /Users/danfeder/cCode/esynyc-lessonsearch-v2/src/utils/urlParams.ts (full file, lines 1-236)
```

```
L26-27: `export const MAX_PARAM_LENGTH = 1000;` / `export const MAX_ARRAY_LENGTH = 50;`
L97 (outbound query, char-capped): `const query = (filters.query ?? '').slice(0, MAX_PARAM_LENGTH).trim();`
L105-108 (outbound array, ENTRY-capped only, NO char cap): `params.set(FILTER_TO_PARAM[key], arr.slice(0, MAX_ARRAY_LENGTH).map(encodeArrayValue).join(','));`
L179 (inbound array, drops WHOLE param on char cap): `if (!raw || raw.length > MAX_PARAM_LENGTH) continue;`
L194 (inbound array ALSO entry-capped): `.slice(0, MAX_ARRAY_LENGTH)`
L94-96 (comment): `// Apply the same caps on the OUTBOUND path as parseSearchParams does inbound, // so the app can never emit a URL longer than it will accept on read (keeps // shared links bounded for pathological input).`
L20-22 (vocab-safety note): `F5 cap note: all 70 ingredient values joined = 749 chars < the 1000-char // MAX_PARAM_LENGTH inbound guard (verified), so the outbound/inbound cap // asymmetry is unreachable for this vocab — parse never silently drops \`ing\`.`
L73-75 (Brief 5 escaping, length-neutral-to-expanding, adds no char cap): `const COMMA_SENTINEL = '%2C'; const encodeArrayValue = (v) => v.split(',').join(COMMA_SENTINEL);`
```

</details>

---

#### `FIELD-LABELER` — POLISH · effort S · CONFIRMED · still-real

**Claim.** fieldValueLabeler's Option C fail-safe (#603) still holds unchanged: the param is type-guarded as keyof typeof ALL_FIELD_CONFIGS and the runtime `if (cfg)` guard + `map[value] ?? value` identity fallback make a bad/missing key OR an unknown value a harmless no-op (returns the value verbatim, never throws).

**Where.** src/utils/filterUtils.ts:37-50 (fieldValueLabeler); sole product call site src/components/Internal/IntLessonDetail.tsx:11; tested src/utils/filterUtils.test.ts:74-88

**Probe.**
```
Read filterUtils.ts:37-50; grep -rn "fieldValueLabeler" src supabase e2e scripts
```

**Raw output.**
```
filterUtils.ts:38 `configKey: keyof typeof ALL_FIELD_CONFIGS` :40 `const cfg = ALL_FIELD_CONFIGS[configKey];` :48 `if (cfg) walk(cfg.options as readonly HeritageOption[]);` :49 `return (value: string) => map[value] ?? value;`. Usages: IntLessonDetail.tsx:11 `const labelCookingMethod = fieldValueLabeler('cookingMethods');` (correct key); filterUtils.test.ts:76/82/87 cover 'cookingMethods' (kebab->label + unknown pass-through) and 'culturalHeritage' (nested).
```

**Notes.** NO-ACTION confirmation (Fable ruled Option C = leave the fail-safe). Nuance vs shelf phrasing: the key is NOT a 'plain string' — it is typed `keyof typeof ALL_FIELD_CONFIGS`, so a typo is a COMPILE error, not just a runtime no-op; the runtime identity fallback is the belt-and-suspenders fail-safe on top. Also note there is really only ONE product call site of the labeler (IntLessonDetail.tsx:11); the reviewer form (ReviewMetadataForm.tsx) does NOT call fieldValueLabeler — it uses the equivalent inline `ALL_FIELD_CONFIGS.<field>.options.find(o=>o.value===v)?.label || v` pattern at :293/:321/:355. So 'both call sites' in the shelf = one labeler call + one inline-equivalent. Nothing changed; safe to leave.

---

#### `F4` — POLISH · effort S · CONFIRMED · still-real

**Claim.** sanitizeHtml is still a dead export — its only consumers are its own tests; the strip-all-tags sibling sanitizeContent is the sole product-used sanitizer.

**Where.** src/utils/sanitize.ts:31 (export function sanitizeHtml); product consumers of sanitizeContent at src/components/Review/ReviewDocPanel.tsx:6,82 and src/pages/ReviewDashboard.tsx:6,271

**Probe.**
```
grep -rn "sanitizeHtml" src supabase e2e scripts ; grep -rn "sanitizeContent" ...
```

**Raw output.**
```
sanitizeHtml hits: sanitize.ts:31 (def) + sanitize.test.ts (import + 12 assertions) ONLY — no product import. sanitizeContent hits: sanitize.ts:14 (def), ReviewDocPanel.tsx:6 import + :82 render, ReviewDashboard.tsx:6 import + :271 usage.
```

**Notes.** Unused rich-text (allow-list) sanitizer implies a rich-text render path that doesn't exist; safe pure deletion (with its 12 tests) for a dead-code follow-up. No runtime effect.

---

#### `F6a` — POLISH · effort S · CONFIRMED · still-real

**Claim.** FeatureFlagKey is still a dead exported type — zero references beyond its own declaration.

**Where.** src/utils/featureFlags.ts:21 `export type FeatureFlagKey = keyof typeof FEATURES;`

**Probe.**
```
grep -rn "FeatureFlagKey" src supabase e2e scripts
```

**Raw output.**
```
Single hit: src/utils/featureFlags.ts:21 (the declaration itself). No consumers.
```

**Notes.** Trivial dead-type deletion; the FEATURES const it derives from IS used (ReviewDocPanel). Bundle into the same dead-code follow-up as F2/F4.

---

### C2 · Admin fail-open fetch sites + FP-20 robustness  (10 findings)

#### `F1` — INTERNAL ANNOYANCE · effort S · CONFIRMED · still-real ★load-bearing

**Claim.** AdminUsers user-list load failure is swallowed (log-only catch), leaving the table to render the confidently-wrong emptyMessage "No users found." with no error/retry; a later page/filter refetch error silently keeps the STALE previous page.

**Where.** src/pages/AdminUsers.tsx:212-216 (catch), :647 (emptyMessage), :120 (if (error) throw error)

**Probe.**
```
Read src/pages/AdminUsers.tsx (full file)
```

**Raw output.**
```
:118-120  const { data: profiles, error, count } = await query; ... if (error) throw error;
:212-216  } catch (error) {
      logger.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
:647  emptyMessage="No users found."
(No setUsers([]) or error-state reset in the catch → on a refetch error `users` retains the prior successful page.)
```

**Notes.** Admin-only, transient-failure-only. Round-2 nuance confirmed: the catch never resets `users`, so a failed page/filter/search refetch leaves the previous page's rows on screen labelled as the new query's result. Fix idiom = the FP-05/#591 IntFetchError+retry already in this repo (see ReviewDashboard.tsx:359 loadError branch). NOT touched by #591 (git log: last change to this file = C137 bulk-delete b4a5fc3).

**Adversarial verify → HOLDS.** Line refs exact (212-216 catch, 647 emptyMessage, 120 throw); catch is log-only with zero user-facing feedback (not even the existing toast), initial users=[] so a first-load failure renders "No users found.", and a refetch failure retains the prior page since setUsers is never reached — all as claimed.

<details><summary>independent re-probe</summary>

```
Read src/pages/AdminUsers.tsx lines 100-239 and 620-669; then grep -nE "useState|setError|useState.*[Ee]rror|error &&|isError|retry|Retry|catch" src/pages/AdminUsers.tsx
```

```
line 46: const [users, setUsers] = useState<EnrichedUser[]>([]);  | line 47: const [loading, setLoading] = useState(true);  | line 120: if (error) throw error;  | lines 212-216: } catch (error) { logger.error('Error loading users:', error); } finally { setLoading(false); }  | line 647: emptyMessage="No users found."  | grep for setError/isError/retry: NO matches (only toast state at line 64, not set by the load catch). setUsers called only at lines 196 and 208, both after the line-120 throw.
```

</details>

---

#### `F3` — INTERNAL ANNOYANCE · effort S · CONFIRMED · still-real ★load-bearing

**Claim.** AdminUserDetail's log-only catch leaves `user` null on ANY load error, rendering the affirmatively-wrong "User not found." for a network/RLS/5xx failure; the five sub-fetches (email/schools/audit/subs/revs) are all guarded `if (!x.error)` so they silently render empty sections.

**Where.** src/pages/AdminUserDetail.tsx:221-225 (catch), :150 (throw), :454 (render), :127 (.single()), sub-fetch guards :163/:171/:179/:198/:210

**Probe.**
```
Read src/pages/AdminUserDetail.tsx (loadAll + render guards)
```

**Raw output.**
```
:150  if (profileRes.error) throw profileRes.error;
:221-225  } catch (err) {
      logger.error('Error loading user detail:', err);
    } finally {
      setLoading(false);
    }
:450-455  if (!user) { ... <p className="adm-section-desc">User not found.</p>
:127  supabase.from('user_profiles').select('*').eq('id', userId).single()
:163 if (!emailsRes.error ...  :171 if (!schoolsRes.error ...  :179 if (!auditRes.error ...  :198 if (!subsRes.error)  :210 if (!revsRes.error)
```

**Notes.** Worst message of the batch — an admin clicking a real user during a blip is told they don't exist, and may re-invite. Nuance: `.single()` returns PGRST116 on zero rows, so a genuinely-deleted user takes the SAME path — "User not found." is right by accident there, wrong for every transient error. Clean fix reserves that copy for `profileRes.error?.code === 'PGRST116'` and shows IntFetchError+retry otherwise. NOT touched by #591.

**Adversarial verify → HOLDS.** Reproduced exactly — every cited line (221-225/150/454/127/163/171/179/198/210) matches current file; log-only catch + finally-clears-loading leaves initial null user, so any network/RLS/5xx failure falls through to the affirmatively-wrong "User not found." and sub-fetch errors render empty sections silently. Severity is admin-only, invite-only, ~3-15 users — internal-annoyance/polish, not public breakage.

<details><summary>independent re-probe</summary>

```
Read src/pages/AdminUserDetail.tsx lines 115-244 (loadAll: Promise.all + throw + guards + catch) and lines 440-469 (render guards); plus grep -n for "User not found|loading|setLoading|!user|return (" to locate the render branches.
```

```
L127: supabase.from('user_profiles').select('*').eq('id', userId).single()  |  L150: if (profileRes.error) throw profileRes.error;  |  L163: if (!emailsRes.error && emailsRes.data && emailsRes.data.length > 0)  |  L171: if (!schoolsRes.error && schoolsRes.data)  |  L179: if (!auditRes.error && auditRes.data)  |  L198: if (!subsRes.error)  |  L210: if (!revsRes.error)  |  L221-225: } catch (err) { logger.error('Error loading user detail:', err); } finally { setLoading(false); }  |  L440: if (loading && !user) { ...Loading user… }  |  L450: if (!user) {  L454: <p className="adm-section-desc">User not found.</p>  L455: Back to Users }  |  L104: const [loading, setLoading] = useState(true);
```

</details>

---

#### `FP20a` — INTERNAL ANNOYANCE · effort M · CONFIRMED · still-real

**Claim.** The tab/filter/navigation list fetches have no abort or staleness guard, so on a slow connection fast tab-clicks (ReviewDashboard status tabs, AdminUsers role tabs/search) or fast user-to-user navigation (AdminUserDetail) can apply a stale response last and show the wrong tab's rows / previous user's data until the next interaction.

**Where.** src/pages/ReviewDashboard.tsx:110-116 (effect on [filter]) + :238 (setSubmissions, no guard); src/pages/AdminUsers.tsx:217/:219-221 (loadUsers useCallback([filters,page]) + effect); src/pages/AdminUserDetail.tsx:122-226/:228-230 (loadAll [userId], not key-remounted)

**Probe.**
```
Read ReviewDashboard.tsx / AdminUsers.tsx / AdminUserDetail.tsx; grep -n 'key=' src/App.tsx
```

**Raw output.**
```
ReviewDashboard.tsx:110-116  useEffect(() => { loadPage(); }, [filter]);  (loadPage = checkAuth() then loadSubmissions())
ReviewDashboard.tsx:238  setSubmissions( data.map(... ) )   // applied whenever the response lands, no request-id/abort
AdminUsers.tsx:217  }, [filters, page]);  :219-221 useEffect(() => { loadUsers(); }, [loadUsers]);
AdminUserDetail.tsx:228-230  useEffect(() => { loadAll(); }, [loadAll]);
App.tsx grep 'key=' → only line 90 `<ReviewErrorBoundary key={id}>` (ReviewDetail). App.tsx:175-178 renders <AdminUserDetail /> with NO key → no remount on :userId change.
```

**Notes.** FP-20 wording says 'admin dashboard' but AdminDashboard.tsx is a static tile hub with no tabs/fetch — the actual races live in ReviewDashboard (the most reviewer-visible: status tabs), AdminUsers (role tabs + debounced search overlap), and AdminUserDetail (no key-remount, unlike /review/:id which App.tsx:90 fixed with key={id}). #591 added honest-error branches to ReviewDashboard but did NOT add staleness guards, so the race persists. Mechanism CONFIRMED by code; real-world frequency is Medium (needs slow net + fast clicks) and it self-corrects on next interaction. Bonus inefficiency: ReviewDashboard.checkAuth() re-runs getUser + a user_profiles query on EVERY tab click (loadPage at :105-108), not just mount. Standard fix = request-id ref (LessonSearchPicker.tsx already uses this idiom) or React Query.

---

#### `F2` — POLISH · effort S · CONFIRMED · still-real

**Claim.** AdminUsers school-filter dropdown renders optionless with no signal when the schools fetch fails — both the non-throw branch (`if (!error && data)`) and the throw branch are silent.

**Where.** src/pages/AdminUsers.tsx:255-262 (loadSchools), :258 (guard), :561-566 (dropdown render)

**Probe.**
```
Read src/pages/AdminUsers.tsx (loadSchools + filter select)
```

**Raw output.**
```
:255-262  const loadSchools = async () => {
    try {
      const { data, error } = await supabase.from('schools').select('id, name').order('name');
      if (!error && data) setSchools(data);
    } catch (error) {
      logger.error('Error loading schools:', error);
    }
  };
:561-566  <option value="all">All schools</option>
            {schools.map((school) => (<option key={school.id} value={school.id}>{school.name}</option>))}
```

**Notes.** Filter aid only; the users list itself still loads. Lowest-stakes of the batch. Could fold into the same loadError surface as F1.

---

#### `F4` — POLISH · effort S · CONFIRMED · still-real

**Claim.** AdminInvitations load failure surfaces only a toast that self-dismisses after 3.2s; the resting state is the persuasive empty CTA "Invite your first teacher or reviewer to get started." with no retry.

**Where.** src/pages/AdminInvitations.tsx:146-151 (catch→toast), :160-164 (3200ms auto-dismiss), :47 (EMPTY_COPY.all body), :667-675 (empty render)

**Probe.**
```
Read src/pages/AdminInvitations.tsx (loadInvitations + empty state)
```

**Raw output.**
```
:146-151  } catch (err) {
      logger.error('Error loading invitations:', err);
      setToast({ kind: 'error', msg: 'Failed to load invitations.' });
    } finally { setLoading(false); }
:160-164  const t = window.setTimeout(() => setToast(null), 3200);
:47  all: { title: 'No invitations', body: 'Invite your first teacher or reviewer to get started.' }
:667-675  : filteredInvitations.length === 0 ? (<div className="adm-empty adm-empty--large"><h3>{EMPTY_COPY[filter].title}</h3><p>{EMPTY_COPY[filter].body}</p>...)
```

**Notes.** Better than F1/F3 (a signal DOES exist) but it evaporates and the resting state fails open. Fix = persistent inline error block for the LOAD failure (keep toasts for row actions) + retry.

---

#### `F5` — POLISH · effort S · CONFIRMED · still-real

**Claim.** AdminInviteUser's schools dropdown stays empty with no signal on fetch error (log-only catch); the admin can still send the invite but cannot attach a school and nothing says why.

**Where.** src/pages/AdminInviteUser.tsx:98-111 (schools load effect), :107-109 (catch)

**Probe.**
```
Read src/pages/AdminInviteUser.tsx (schools-load effect)
```

**Raw output.**
```
:98-111  useEffect(() => { (async () => {
      try {
        const { data, error: schoolsErr } = await supabase.from('schools').select('id, name').order('name');
        if (schoolsErr) throw schoolsErr;
        setSchoolOptions((data ?? []).map((s) => ({ value: s.name, label: s.name })));
      } catch (err) {
        logger.error('Failed to load schools list:', err);
      }
    })(); }, []);
```

**Notes.** School is a CreatableSelect, so the admin can still type/create a school even with an empty options list; assignment is also fixable later via AdminUserDetail. Low stakes. Tiny inline 'couldn't load schools — retry' next to the select would fix without blocking the form.

---

#### `F6` — POLISH · effort S · CONFIRMED · still-real

**Claim.** AdminInviteUser's live pending-invite duplicate check never destructures `error` — on a query error `data` is null → `(data ?? []).length > 0` is false → the 'invite already pending' warning fails open.

**Where.** src/pages/AdminInviteUser.tsx:122-130 (`const { data } = await ...`), :129 (length check), backstop :219 (isEmailDuplicateError)

**Probe.**
```
Read src/pages/AdminInviteUser.tsx (pending-invite effect + submit catch)
```

**Raw output.**
```
:122-130  (async () => {
      const { data } = await supabase
        .from('user_invitations').select('id').eq('email', email).is('accepted_at', null).limit(1);
      if (!cancelled) setPendingInviteFound((data ?? []).length > 0);
    })();
:219  if (isEmailDuplicateError(err)) { setError('This email address is already registered ...') }
```

**Notes.** Correctly graded low. Real backstop: the `unique_pending_invitation_per_email` partial unique index + isEmailDuplicateError handling at submit (:219) means the worst case is a late error at send-time instead of an early warning, not a real duplicate. 2-line fix (destructure + skip the 'no pending invite' implication on error).

---

#### `F7` — POLISH · effort S · CONFIRMED · still-real

**Claim.** SchoolCheckboxGroup swallows fetch errors into `setSchools([])`, then renders the generic "No schools available" (indistinguishable from a genuinely empty list) — feeds the AdminUserDetail school-assignment editor.

**Where.** src/components/Schools/SchoolCheckboxGroup.tsx:46-49 (catch → setSchools([])), :70-72 (empty render), consumer src/pages/AdminUserDetail.tsx:803

**Probe.**
```
Read src/components/Schools/SchoolCheckboxGroup.tsx + AdminUserDetail.tsx consumer
```

**Raw output.**
```
:46-49  } catch (error) {
        logger.error('Error fetching schools:', error);
        setSchools([]); // Set empty array on error
      } finally { setLoading(false); }
:70-72  if (schools.length === 0) { return <div className="text-sm text-gray-500">No schools available</div>; }
AdminUserDetail.tsx:803  <SchoolCheckboxGroup selectedSchools={editedSchools} onChange={setEditedSchools} disabled={saving} />
```

**Notes.** Round-2 downgrade holds: the destructive data-loss tail does NOT survive the trace. `editedSchools` is seeded from the user's own user_schools fetch in loadAll (AdminUserDetail.tsx:171-177), not from this options list, so saving without touching checkboxes re-inserts the same assignments (:311-317). Harm is display-only: an admin's assigned schools render as an empty list, potentially prompting needless manual re-editing. Component-local fix (add error state + retry).

---

#### `FP20b` — POLISH · effort S · CONFIRMED · still-real

**Claim.** AdminUsers CSV export failure is a silent no-op (log-only catch, no toast/error) — clicking Export during a fetch failure does nothing visible; the 'analytics failures' half of the same FP-20 claim is STALE because the AdminAnalytics page/route was retired (owner decision D3).

**Where.** src/pages/AdminUsers.tsx:344-395 (handleExport), :392-394 (silent catch); analytics: no file under src/**/*analytics*, no /admin/analytics route in App.tsx

**Probe.**
```
Read AdminUsers.tsx handleExport; find src -iname '*analytics*'; grep -rn 'AdminAnalytics|/admin/analytics' src/App.tsx
```

**Raw output.**
```
AdminUsers.tsx:392-394  } catch (error) {
      logger.error('Error exporting users:', error);
    }
(no setToast / setError in the export catch → failed export is invisible)
find src -iname '*analytics*' → (no output)
grep AdminAnalytics/route in App.tsx → (no AdminAnalytics route in App.tsx)
src/pages/CLAUDE.md: 'AdminAnalytics was retired in the frontend-polish phase, owner decision D3.'
```

**Notes.** Split claim: the CSV-export silent-no-op is still-real (AdminUsers.tsx:392-394; also see F1/F3 for the 'list failures render empty' half, already covered). The 'analytics' third is STALE — there is no analytics page anymore, so drop it from any brief. Note AdminInvitations.exportToCSV (:394-437) is purely client-side over already-loaded rows (no fetch) so it has no silent-fetch-failure mode.

---

#### `FP20c` — POLISH · effort S · CONFIRMED · still-real

**Claim.** The review queue fetches every column of every submission unpaginated — `select('*')` with no .range()/.limit() — pulling the heavy `extracted_content` (full doc text) for every row when only the first line is used as a title fallback.

**Where.** src/pages/ReviewDashboard.tsx:170-173 (loadSubmissions query)

**Probe.**
```
Read src/pages/ReviewDashboard.tsx (loadSubmissions)
```

**Raw output.**
```
:170-173  let query = supabase
        .from('lesson_submissions')
        .select('*')
        .order('created_at', { ascending: false });
:175-177  if (filter !== 'all') { query = query.eq('status', filter); }
(No .range() / .limit() anywhere in loadSubmissions; extracted_content consumed only via parseExtractedContent first-line fallback at :271-275.)
```

**Notes.** Efficiency-only, not user-visible now: the submissions corpus is small (~78 submissions per memory), so payload is tolerable today; cost grows unbounded with submission volume. Cheap wins = narrow the column list (drop extracted_content from the list query, or fetch only the first line) and add pagination/.limit(). Matches audit-error-loading #9-12 / shelf-frontend-ux #21.

---

### C3 · Search synonym contract + synonyms-table census  (2 findings)

#### `FP4-SYN-06` — SILENT DATA DRIFT · effort M · CONFIRMED · still-real ★load-bearing

**Claim.** 60 of 74 live PROD search_synonyms rows are absent from the migration seeds, so a fresh `supabase db reset` (local) or a reset-test-db run would silently reduce the table to 14 migration-seeded rows — losing 60 synonym rows including the `activity -> [activities, lesson, lessons, project, projects]` row that FP-19 explicitly depends on.

**Where.** DB table public.search_synonyms (PROD jxlxtzkmicfhchkhiojz); seeds: supabase/migrations/20260522000000_seed_search_synonyms_from_smart_search.sql (13 rows), 20260618120000_seed_search_synonym_decay_decomposition.sql (1 row); baseline 20251001_production_baseline_snapshot.sql (schema-only, no data)

**Probe.**
```
PROD SELECT term,synonyms,synonym_type FROM search_synonyms ORDER BY term (full 74-row dump); PROD anti-join of live rows vs a VALUES set of the 14 migration-seeded tuples; grep -c '^COPY ' baseline snapshot; grep -rln "INSERT INTO.*search_synonyms" supabase/migrations (non-archive); TEST SELECT count(*) + activity row
```

**Raw output.**
```
PROD count: {"live_total":74,"distinct_terms":67}. Anti-join: {"live_total":74,"migration_total":14,"live_only_rows":60,"migration_only_rows":0}. Baseline snapshot: `grep -c '^COPY '` = 0 (schema-only; CREATE TABLE at line 1990, no data). Only two non-archive migrations INSERT into search_synonyms: 20260522000000 (13 tuples, guarded WHERE NOT EXISTS) + 20260618120000 (decay->decomposition, 1 tuple). No migration seeds `activity` (grep "'activity'" over non-archive migrations = empty). Full dump confirms live row present: {"term":"activity","synonyms":["activities","lesson","lessons","project","projects"],"synonym_type":"bidirectional"}. TEST: {"test_total":74,"activity_rows":1,"activity_synonyms":"{activities,lesson,lessons,project,projects}"} — TEST currently mirrors PROD (both 74), so the drift is LATENT not yet manifested.
```

**Notes.** Shelf's '~29 live-only rows' is STALE — the real count is 60 (verified by anti-join, 0 migration-only). Also: the shelf/task referenced a `bidirectional` COLUMN — it does not exist; the column is `synonym_type` text (values bidirectional|oneway|typo_correction), so 'bidirectional' is a value not a column (information_schema confirms columns: id, term, synonyms[], synonym_type). The `activity` row IS present live+TEST and IS one of the 60 live-only rows (confirmed absent from all seed migrations). Impact for this product: LOW day-to-day (PROD is never `db reset`), but two real triggers exist — (1) any local dev doing `supabase db reset` gets a 14-row synonym table and cannot reproduce search behavior; (2) reset-test-db.yml would drop TEST to 14 rows, breaking the FP-19 `activity`-row-dependent tests + eval-gold assumptions and desyncing TEST from PROD. Fix = add a new idempotent seed migration capturing all 60 live-only rows (guarded WHERE NOT EXISTS on the (term,synonym_type,synonyms) tuple, same pattern as 20260522000000). Effort M = must faithfully transcribe 60 rows incl. array-escaping (e.g. women''s) and re-verify tsquery safety per the existing search_synonyms_lexemes_no_whitespace CHECK. Overlaps FP4-SYN-05 (same root: synonym state not owned by migrations).

**Adversarial verify → HOLDS.** Reproduces exactly: 74 live PROD rows, exactly 14 seeded by migrations (13 in 20260522000000 + 1 in 20260618120000), 60 absent from all migration seeds because the 20251001 baseline is schema-only (zero COPY statements) — a fresh `supabase db reset` / reset-test-db would leave only 14 rows, dropping the FP-19-relied-upon `activity` row. Scope caveat for Fable (not a defect in the claim, which already states it): this is latent dev/test-reset drift, not a live PROD-facing breakage — migrate-production.yml only applies new migrations and never resets, so PROD's 74 rows are not at risk today; the exposure is a local `db reset` or a manual reset-test-db.yml dispatch.

<details><summary>independent re-probe</summary>

```
(1) Bash: grep -niE "COPY .*search_synonyms" and grep -niE "^COPY " over supabase/migrations/20251001_production_baseline_snapshot.sql (confirm baseline is schema-only for the table). (2) Read both seed files in full to count seeded tuples: 20260522000000 (INSERT line 68, VALUES lines 44-66 = 13 tuples) + 20260618120000 (INSERT line 52 = 1 tuple 'decay'). (3) PROD mcp__supabase-remote__execute_sql single query: anti-join live search_synonyms against an inline VALUES set of the 14 migration-seeded (term, synonyms, synonym_type) tuples, returning live_total, live_rows_not_in_seeds, seeded_rows_present_live. (4) PROD SELECT of the 'activity' row.
```

```
grep for COPY search_synonyms -> no match (exit 1); grep for any "^COPY " in baseline -> NO output at all (baseline has zero COPY/data statements; search_synonyms is CREATE TABLE line 1990 + sequence/constraints/indexes/policies only, no rows). Seed counts from Read: 20260522000000 = 13 tuples (woman, latino, hispanic, thanksgiving, christmas, halloween, easter, womans, vegatable, vegatables, recipie, recipies, middel; migration comment line 29 states "60 existing + 13 new"), 20260618120000 = 1 tuple (decay) => 14 total seeded. Anti-join on PROD: [{"live_total":74,"live_rows_not_in_seeds":60,"seeded_rows_present_live":14}]. Activity row on PROD: [{"term":"activity","synonyms":["activities","lesson","lessons","project","projects"],"synonym_type":"bidirectional"}] — not among the 14 seeded tuples, so it is one of the 60 rows a fresh reset would drop.
```

</details>

---

#### `FP4-SYN-05` — INTERNAL ANNOYANCE · effort M · CONFIRMED · still-real ★load-bearing

**Claim.** smart-search returns only the expandedQuery tsquery STRING (not the synonym set), so the frontend must reconstruct which tokens are synonyms via a morphological-stem heuristic (extractSynonymTerms) that duplicates the edge function's stemming — a fragile coupling; having smart-search return the synonym set directly would kill the heuristic and its drift risk.

**Where.** supabase/functions/smart-search/index.ts:182-194 (response) + :33-81 (expandSearchTerms); src/pages/SearchPage.tsx:63-86 (extractSynonymTerms) + :178-181 (usage); src/hooks/useLessonSuggestions.ts:52,92

**Probe.**
```
Read supabase/functions/smart-search/index.ts (full); Read src/pages/SearchPage.tsx offset 40-190; Read src/hooks/useLessonSuggestions.ts; grep -rn 'extractSynonymTerms|smart-search|expandedQuery' src/
```

**Raw output.**
```
index.ts return object (lines 182-194): { lessons, totalCount, page, totalPages, suggestions, expandedQuery: smartSearchQuery }. smartSearchQuery = buildSmartSearchQuery -> expandedTerms.map(t=>`${t}:*`).join(' | ') (e.g. 'corn:* | maize:*'). `suggestions` = expandSearchTerms(...).slice(0,5) ONLY when lessons.length===0 (line 177) — empty [] when results exist. NO field returns which expanded terms are synonyms vs stems. Frontend reconstructs: SearchPage.tsx:63-86 extractSynonymTerms(query, expandedQuery) rebuilds morphological set {w, w.slice(0,-1), `${w}s` for len>4} and subtracts it from the '|'-split expandedQuery to leave 'genuine synonyms'. This RE-IMPLEMENTS expandSearchTerms' stem logic (index.ts:71-77: substring(0,len-1), term+'s' for len>4). useLessonSuggestions.ts:92 forwards expandedQuery; SearchPage.tsx:178 feeds extractSynonymTerms the parseSearchQuery(...).cleanedQuery to keep the subtraction aligned. smart-search has its OWN TS expander (expandSearchTerms) and never calls the DB's expand_search_with_synonyms — two independently-maintained expanders exist (plpgsql expand_search_with_synonyms is only called by search_lessons RPC, per grep of supabase/migrations).
```

**Notes.** DESIGN PROPOSAL for Fable, NOT a runtime bug — current-state description is CONFIRMED. This is an improvement (removes a heuristic + a silent-drift coupling), not a live defect. Runtime risk is real but low-severity for 3-15 users: if the edge expandSearchTerms stemming ever changes and extractSynonymTerms is not updated in lockstep, the 'Including matches for…' hint silently mislabels stems as synonyms or drops real synonyms — silent-data-drift flavor. The FP-19 code already fought one instance of this class (feeding cleaned vs raw query; see the `activity` row in FP4-SYN-06). Proposed brief: smart-search returns an explicit synonymTerms:string[] (the genuine synonyms it folded in), frontend drops extractSynonymTerms + its morphological reconstruction. Overlaps FP4-SYN-06: both are symptoms of synonym state being spread across two expanders + a client heuristic. Effort M = edge contract change + frontend simplification + updating SearchPage.synonymHint.test.ts / useLessonSuggestions tests.

**Adversarial verify → HOLDS.** Independent reads reproduce every claim and line ref exactly; the frontend heuristic re-implements the edge fn's >4-char stemming to subtract it from the tsquery string, a genuine cross-boundary drift risk (latent maintainability, not a live bug — as the finder framed it).

<details><summary>independent re-probe</summary>

```
Read supabase/functions/smart-search/index.ts (full, 1-209); Read src/pages/SearchPage.tsx (1-200); Read src/hooks/useLessonSuggestions.ts (full, 1-96). Cross-checked: response object lines 182-190; expandSearchTerms stemming lines 71-77; extractSynonymTerms morphological reconstruction lines 69-76; usage lines 178-181; invoke+expandedQuery at useLessonSuggestions.ts:52 and :92.
```

```
smart-search/index.ts:189 -> `expandedQuery: smartSearchQuery` (smartSearchQuery = buildSmartSearchQuery output, an OR-joined `${term}:*` tsquery STRING; expandSearchTerms/33-81, buildSmartSearchQuery/83-95). Response body 182-190: {lessons,totalCount,page,totalPages,suggestions,expandedQuery} — no synonym set; suggestions only on 0 results (line 177) = first 5 expanded terms.
Edge stemming (71-73): `if (term.length > 4) { expandedTerms.add(term.substring(0, term.length - 1)); expandedTerms.add(term + 's'); ...`
Frontend reconstruction (SearchPage.tsx 72-75): `if (w.length > 4) { morphological.add(w.slice(0, -1)); morphological.add(\`${w}s\`); }` — then subtracts from expandedQuery.split('|') stripping /:\*$/ (lines 79-84).
useLessonSuggestions.ts:52 `supabase.functions.invoke('smart-search', ...)`; :92 `expandedQuery: payload.expandedQuery`.
```

</details>

---

### C4 · Brief-5 parked DB items + content-backfill counts  (3 findings)

#### `FP4-DB-01` — INTERNAL ANNOYANCE · effort L · CONFIRMED · still-real ★load-bearing

**Claim.** VALIDATE CONSTRAINT on both valid_cooking_skills and valid_main_ingredients is still blocked today by exactly the same 7 RETIRED lessons (0 active violators); both constraints remain NOT VALID (convalidated=false).

**Where.** PROD lessons table; pg_constraint conname='valid_cooking_skills' and 'valid_main_ingredients' (both convalidated=false)

**Probe.**
```
1) SELECT conname, convalidated, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname IN ('valid_cooking_skills','valid_main_ingredients');  2) SELECT ... FROM lessons WHERE cooking_skills IS NOT NULL AND NOT (cooking_skills <@ ARRAY[<23 verbatim allowed values>]) ...  and the analogous main_ingredients query using the 71 verbatim allowed values; both tagged by (retired_at IS NULL ? active : retired); 3) aggregate count(DISTINCT lesson_id) split retired/active + distinct offending tokens.
```

**Raw output.**
```
constraints: valid_cooking_skills convalidated=false, valid_main_ingredients convalidated=false (both '... NOT VALID').  cooking_skills: bad_lessons=7, retired_lessons=7, active_lessons=0.  main_ingredients: bad_lessons=7, retired_lessons=7, active_lessons=0.  SAME 7 retired lesson_ids in both sets: 15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz (Children's Aid Society: Food Justice Program), 1Jbc2TvhQH-mzikeBiRoyCgR21EgQdbGq (Tortilla Time!), 1kwWC4upXrmfxeOgu2OCwFOcKoowZZuwW (Green Sauce Around the World), 1o4Ru6FVLFcC766HrQNta0BiZ_1MNl1qlWf8dk362Skw (Teas around the World), 1syFNS-FUiVWUvkZRhfyxfXc0ukDrwnkO (Stone Soup), 1tKktUwEqYymTjYXXmVBOc2RR7tH5HHUy (Rainbow Grain Salad), 1Y6tHYm3Hh2vLCBCDaM36_TO1EuM61ofd (Choose-Your-Own Flavor Popcorn).  cooking_skills offending tokens (18 distinct): Assembling cold dishes, Assembling hot dishes, Chopping, Cooking Techniques, Creating sauces/dressings, Cutting Skills, Dicing, Following directions, Knife safety, Measuring (dry/liquid), Mixing, Mixing/stirring, Pressing, Recipe reading, Sautéing, Seasoning to taste, Steeping, Using mortar and pestle.  main_ingredients offending tokens (8 distinct): Beans, Grains & Starches, Herbs & Aromatics, Maple syrup, Salt, Various spices, Water, Zucchini.  Corpus split: active=703, retired=82.
```

**Notes.** Shelf claim '7 retired lessons still off-vocab' is EXACT. The FP3 2026-07-04 fix healed active/frozen rows; these 7 retired rows are the sole remaining VALIDATE blockers, and both constraints are violated by the identical 7-lesson set. VALIDATE is NOT safe today — it would scan all rows and reject on these 7. VERBATIM allowed vocab for the brief -- valid_cooking_skills: ['Measuring','Mixing & stirring','Reading & following recipes','Kitchen & food safety','Tasting','Grating','Mashing','Blending & juicing','Seasoning & spice blending','Knife skills','Boiling & simmering','Sautéing & stir-frying','Steaming','Roasting','Baking','Grilling','Dough making','Creating sauces & dressings','Pickling & preserving','Fermenting','Assembling dishes','Wrapping & rolling','Plating & garnishing']. valid_main_ingredients allowed vocab (71 values): parent set ['Alliums','Leafy greens','Root vegetables','Nightshades','Peppers','Cruciferous','Squash, cucumbers & melons','Mushrooms','Berries','Citrus fruits','Tropical fruits','Apples & pears','Stone fruits','Dried fruits','Grains & starches','Beans & legumes','Nuts & seeds','Eggs','Tofu & plant proteins','Dairy','Dairy alternatives','Fresh herbs','Spices','Sweeteners'] plus children ['Garlic','Carrots','Sweet potatoes','Potatoes','Beets','Tomatoes','Bell peppers','Cabbage','Winter squash','Cucumbers','Melons','Bananas','Avocado','Coconut','Lemon','Oranges','Lime','Apples','Wheat/flour','Corn/masa','Rice','Oats','Black beans','Black-eyed peas','Chickpeas','Pinto beans','Pumpkin seeds','Sunflower seeds','Sunflower butter','Tahini','Peanut butter',
… [truncated 729 chars — full raw output in journal.jsonl]

**Adversarial verify → HOLDS.** Fully reproduced with allowed-values parsed from the live constraint defs (independent of finder's list): both constraints NOT VALID, exactly the same 7 retired lessons violate both, 0 active violators — claim HOLDS as stated.

<details><summary>independent re-probe</summary>

```
Ran on PROD (mcp__supabase-remote, project jxlxtzkmicfhchkhiojz), 3 SELECT-only probes: (1) SELECT conname, convalidated, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname IN ('valid_cooking_skills','valid_main_ingredients'); (2) confirmed lessons.retired_at column exists via information_schema.columns; (3) a CTE that parses the ALLOWED value arrays directly out of the live constraint definitions via regexp_matches(def, '''([^'']*)''::text','g') — NOT the finder's typed list — then counts rows where cooking_skills/main_ingredients IS NOT NULL AND NOT (col <@ parsed_allowed), split by (retired_at IS NULL) AS active, plus distinct offending tokens and distinct lesson counts.
```

```
Constraint defs: valid_cooking_skills convalidated=false ... NOT VALID; valid_main_ingredients convalidated=false ... NOT VALID. Violator counts: cs_total=7, cs_active=0, cs_retired=7; mi_total=7, mi_active=0, mi_retired=7; distinct_lessons_either=7, distinct_retired_either=7, distinct_active_either=0. cs_bad_tokens=["Assembling cold dishes","Assembling hot dishes","Chopping","Cooking Techniques","Creating sauces/dressings","Cutting Skills","Dicing","Following directions","Knife safety","Measuring (dry/liquid)","Mixing","Mixing/stirring","Pressing","Recipe reading","Sautéing","Seasoning to taste","Steeping","Using mortar and pestle"]; mi_bad_tokens=["Beans","Grains & Starches","Herbs & Aromatics","Maple syrup","Salt","Various spices","Water","Zucchini"].
```

</details>

---

#### `FP4-DB-02` — POLISH · effort M · CONFIRMED · still-real ★load-bearing

**Claim.** FP-09 backfill target: 65 ACTIVE lessons have a blank summary (empty string after btrim, 0 are NULL); an additional 21 retired lessons are also blank (86 total).

**Where.** PROD lessons.summary column

**Probe.**
```
SELECT (retired_at IS NULL ? 'active':'retired') status, count(*) FILTER (WHERE summary IS NULL) null_summary, count(*) FILTER (WHERE summary IS NOT NULL AND btrim(summary)='') blank_summary, count(*) FILTER (WHERE summary IS NULL OR btrim(summary)='') total FROM lessons GROUP BY 1;
```

**Raw output.**
```
active: null_summary=0, blank_summary=65, null_or_blank_total=65.  retired: null_summary=0, blank_summary=21, null_or_blank_total=21.  Sample active blank-summary ids: lesson_011467fd86fa4339a745803f8643fe84 (All About Pumpkins), lesson_03de6aa8ce094d0b9fd6518830e3eae7 (Berry Rosehip Bars), lesson_2a67f63617374e7b93450c7d49d35bf5 (Bees), lesson_2d949e39ec8a4146aea885c71a5922c4 (Puppet Pollinators), lesson_2e4220e50b504e3da3ccd3650c2ded50 (Fall Fruit vs. Summer Fruit).
```

**Notes.** Shelf number '65' is EXACT for active lessons. All are empty strings, none NULL, so any UI '!summary' vs 'summary===""' check must handle empty-string (both fail a truthiness check, so likely fine). User-visible-but-minor: these 65 active lessons render an empty summary line in search cards / detail. Backfill needs a content source decision (LLM-generate from content_text vs manual) — that's a design/scope call for Fable, hence effort M-L. Note several titles carry a trailing vertical-tab char () — cosmetic, separate from summary.

**Adversarial verify → HOLDS.** Independent PROD probe reproduces exactly: 65 active blank summaries (0 NULL, all empty-after-btrim), 21 retired blank, 86 total — matches the claim verbatim. CONFIRMED.

<details><summary>independent re-probe</summary>

```
SELECT CASE WHEN retired_at IS NULL THEN 'active' ELSE 'retired' END AS status, count(*) AS total_rows, count(*) FILTER (WHERE summary IS NULL) AS null_summary, count(*) FILTER (WHERE summary IS NOT NULL AND btrim(summary) = '') AS empty_after_trim, count(*) FILTER (WHERE summary IS NULL OR btrim(summary) = '') AS blank_total FROM lessons GROUP BY 1 ORDER BY 1;
```

```
[{"status":"active","total_rows":703,"null_summary":0,"empty_after_trim":65,"blank_total":65},{"status":"retired","total_rows":82,"null_summary":0,"empty_after_trim":21,"blank_total":21}]
```

</details>

---

#### `FP4-DB-03` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** FP-02 is fully resolved on PROD: ZERO kebab-style machine tokens remain in thematic_categories; all 7 distinct values are clean Title Case.

**Where.** PROD lessons.thematic_categories array column

**Probe.**
```
1) WITH tc AS (SELECT lesson_id, unnest(thematic_categories) v FROM lessons WHERE thematic_categories IS NOT NULL) SELECT count(*) kebab_appearances, count(DISTINCT lesson_id) kebab_lessons, array_agg(DISTINCT v) FROM tc WHERE v ~ '^[a-z0-9]+(-[a-z0-9]+)+$';  2) SELECT DISTINCT unnest(thematic_categories) FROM lessons WHERE thematic_categories IS NOT NULL ORDER BY 1;
```

**Raw output.**
```
kebab query: kebab_appearances=0, kebab_lessons=0, kebab_values=null.  Full distinct set (7 clean values): Ecosystems, Food Justice, Food Systems, Garden Basics, Garden Communities, Plant Growth, Seed to Table.
```

**Notes.** #590 normalization held — no kebab residue and no mixed-case/underscore/machine-token stragglers anywhere in thematic_categories. Nothing to do; recommend closing FP-02. All 7 values are exactly the canonical display labels.

**Adversarial verify → HOLDS.** Confirmed: 7 distinct thematic_categories values on PROD, zero kebab/hyphenated machine tokens, all clean human-readable labels — FP-02 is resolved; the only initcap() mismatch ("Seed to Table") is proper title-case, not a defect.

<details><summary>independent re-probe</summary>

```
SELECT count(DISTINCT v) AS distinct_values, count(*) FILTER (WHERE v ~ '^[a-z0-9]+(-[a-z0-9]+)+$') AS strict_kebab_appearances, count(*) FILTER (WHERE v ~ '[a-z0-9]-[a-z0-9]') AS any_internal_hyphen_appearances, count(*) FILTER (WHERE v <> initcap(v)) AS non_titlecase_appearances FROM (SELECT unnest(thematic_categories) AS v FROM lessons WHERE thematic_categories IS NOT NULL) t;  -- plus a per-value GROUP BY listing all 7 distinct values with appearance counts (run against PROD jxlxtzkmicfhchkhiojz via mcp__supabase-remote__execute_sql)
```

```
Aggregate: {"distinct_values":7,"strict_kebab_appearances":0,"any_internal_hyphen_appearances":0,"non_titlecase_appearances":460}. Per-value: Ecosystems(149), Food Justice(102), Food Systems(361), Garden Basics(251), Garden Communities(120), Plant Growth(193), Seed to Table(460) — every value contains_hyphen=false, starts_lowercase=false. Only "Seed to Table" fails strict initcap() (lowercase "to"), which is correct English title-casing, not a machine token.
```

</details>

---

### C5 · SearchPage behavior + facet click-truth parity  (5 findings)

#### `FP4-SP-01` — INTERNAL ANNOYANCE · effort M · CONFIRMED · new ★load-bearing

**Claim.** Closing a lesson via the Back branch (navigate(-1)) silently reverts any facet/sort change the user made while the lesson was open in split view, because those changes were written to the lesson's own history entry while close returns to the pre-open list entry.

**Where.** src/pages/SearchPage.tsx:227-233 (handleCloseLesson, no flush()); interacts with useUrlSync.ts:141-176 (store→URL replaces the CURRENT top entry) and the URL→store full-replace at useUrlSync.ts:117-137 / searchStore.ts:130-136 (hydrateUrlState).

**Probe.**
```
Read SearchPage.tsx handleCloseLesson + handleOpenLesson; read useUrlSync.ts store→URL effect + flush; traced history entries. grep -n 'setQueryData|flush()' src/pages/SearchPage.tsx.
```

**Raw output.**
```
SearchPage.tsx:227 const handleCloseLesson = useCallback(() => { if (cameFromSearch) { navigate(-1); } else { navigate({pathname:'/',search:location.search},{replace:true}); } }, [navigate, cameFromSearch, location.search]) — NO flush() call. handleOpenLesson:209 DOES call flush() then :211 navigate(push) with :217 search:buildSearchParams(filters,...). useUrlSync.ts:168 setSearchParams(buildSearchParams(filters,sortBy),{replace:true,state:latestRef.current.state}) — replace mode always overwrites the CURRENT top entry (the /lesson/:id entry while a lesson is open), never the underlying list entry.
```

**Notes.** Re-trace of the pre-existing D2 close-semantics question (#601 round-6). IMPORTANT CORRECTION to the memory framing: this is NOT limited to the sub-300ms debounce window. Trace: (1) /?q=x list = entry1; (2) click A → handleOpenLesson flush()+push → entry2=/lesson/A?q=x, cameFromSearch=true; (3) toggle facet y in the (interactive, split-view) sidebar → store→URL debounce replaces ENTRY2 → /lesson/A?q=x&facet=y (entry1 untouched); (4) Close → cameFromSearch true → navigate(-1) → entry1 /?q=x → URL→store hydrateUrlState full-replaces store.filters to pre-toggle {q:x} → list refetches WITHOUT facet y. Facet y is lost whether the debounce fired (>300ms, write landed on entry2) or was cancelled (<300ms, URL→store effect at :121-124 cancels it on the pop) — the outcome is identical because navigate(-1) always returns to the pre-open entry1. Distinct from the now-FIXED rung8-stores F3 (toggle→open→Back), which handleOpenLesson's flush() cures by writing the toggle onto entry1 BEFORE the push. Here the toggle happens AFTER the push, so no flush can help; adding flush() to handleCloseLesson would NOT fix it (it would write to entry2, which navigate(-1) discards). This is a genuine D2 design fork for Fable: is Close 'history Back' (current) or 'dismiss overlay, keep current filter context'? Not a clean bug. Reachable only on the desktop-default split surface (≥1100px) where the sidebar stays interactive with a lesson open; drawer/mobile overlay the sidebar. No data loss — filter-context loss only.

**Adversarial verify → HOLDS.** Reproduced exactly: filter/sort changes while a lesson is open land on the lesson's history entry via replace:true; handleCloseLesson's navigate(-1) branch has no flush() and pops to the pre-open list entry, whose old URL full-replaces the store — reverting the change. All four cited line ranges verbatim-accurate; split-view scoping is correct (sidebar filters stay interactive there).

<details><summary>independent re-probe</summary>

```
Read SearchPage.tsx:190-238 (handleOpenLesson + handleCloseLesson), useUrlSync.ts:1-197 (both sync effects + flushPendingWrite), searchStore.ts:120-149 (hydrateUrlState); grep -n 'flush|handleCloseLesson|navigate(-1)|handleOpenLesson' src/pages/SearchPage.tsx
```

```
SearchPage.tsx:227-233 handleCloseLesson = { if (cameFromSearch) navigate(-1); else navigate({pathname:'/',search:location.search},{replace:true}); } — NO flush() call. flush() appears only at handleOpenLesson line 209. handleOpenLesson line 210-222: isReplace = routeLessonId !== null → false from the list → navigate PUSHes /lesson/:id (separate entry from list). useUrlSync.ts:168-171 store→URL debounced write: setSearchParams(buildSearchParams(filters,sortBy),{replace:true,state:...}) — replaces CURRENT top entry (the open-lesson entry). useUrlSync.ts:117-137 URL→store: on searchParams change (incl. Back) calls hydrateUrlState(parsed.filters,parsed.sortBy) and lines 121-124 clear any pending debounce timer. searchStore.ts:130-136 hydrateUrlState comment (line 132): 'FULL replace — fields absent from the URL reset to empty.'
```

</details>

---

#### `FP4-STORE-03` — INTERNAL ANNOYANCE · effort S · CONFIRMED · still-real

**Claim.** viewState.currentPage is a dead state field — written by 6+ mutations plus SearchPage, read by zero consumers — perpetuating a no-op CLAUDE.md invariant and test assertions.

**Where.** src/types/index.ts:66 (decl), src/stores/searchStore.ts:84/101/122/135/148/164/183 (writes), src/pages/SearchPage.tsx:289 (write); zero reads. Rule at src/stores/CLAUDE.md:31,43.

**Probe.**
```
grep -rn 'currentPage' src/
```

**Raw output.**
```
Writes: searchStore.ts:84,101,122,135,148,164,183; SearchPage.tsx:289 (setViewState({...currentPage:1})). Reads of viewState.currentPage: NONE. The only currentPage READ is useLessonSearch.ts:119 'const currentPage = (pageParam as number) || 0' — a local bound to React Query's pageParam, unrelated to the store field; used at :150 page_offset. Remaining hits are searchStore.test.ts/search-page.test.tsx/useUrlSync.test.tsx assertions on the store field.
```

**Notes.** rung8-stores.md F1, unchanged since 2026-07-03. Pagination is React Query infinite scroll via pageParam, not this field. Fix is pure removal (~field + 6 writes + the CLAUDE.md reset rule + ~10 test assertions) OR one line in the rule noting it's currently unread. Also still-real from the same shelf doc, minor: rung8-stores F4 — removeFilter (searchStore.ts:155-169) lacks addFilter's includes() no-op guard, so removing an absent value still churns a new state object (render churn only, no refetch).

---

#### `FP4-FACET-02` — POLISH · effort S · CONFIRMED · new ★load-bearing

**Claim.** Facet badge counts match click-result semantics for both non-trivial facets: Main Ingredients (direct match, no group→children expansion) and Cultural Heritage (ancestry expansion) both agree between facetCounts.ts and the live search_lessons RPC — no drift.

**Where.** src/utils/facetCounts.ts:334-335 (mainIngredients overlaps), :307-311 + :194-207 (heritage up-expand via heritageSlugSet) vs PROD search_lessons WHERE clauses (l.main_ingredients && filter_main_ingredients; l.cultural_heritage && expand_cultural_heritage(_alias_cultural_heritage(filter_cultures))).

**Probe.**
```
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='search_lessons' (PROD). SELECT expand_cultural_heritage(_alias_cultural_heritage(ARRAY['Chinese'])), expand_cultural_heritage(_alias_cultural_heritage(ARRAY['Asian'])) (PROD). grep ancestorsBySlug in heritageAncestry.generated.ts. Read filterDefinitions.ts:68-84.
```

**Raw output.**
```
RPC (verbatim): 'AND (filter_main_ingredients IS NULL OR array_length(filter_main_ingredients,1) IS NULL OR l.main_ingredients && filter_main_ingredients)' — plain direct overlap, NO expansion. RPC heritage: 'expanded_cultures := expand_cultural_heritage(_alias_cultural_heritage(filter_cultures))' then 'l.cultural_heritage && expanded_cultures'. PROD expansion: Chinese→["Chinese"] (leaf); Asian→15 labels [Korean,Chinese,Pakistani,Japanese,Vietnamese,Central Asian,Malaysian,Uzbek,Indian,Southeast Asian,Taiwanese,Asian,South Asian,Sri Lankan,East Asian]. heritageAncestry.generated.ts:182 chinese:['chinese','east-asian','asian'], :171 asian:['asian']. facetCounts.ts:335 case 'mainIngredients': return overlaps(lesson.mainIngredients, selected) [direct]; :311 case 'culturalHeritage': return selected.some(slug => lesson.heritageSlugs.has(slug)) [up-expanded lesson]. filterDefinitions.ts:82 type:'hierarchical' but :72-79 comment: 'DIRECT MATCH, NOT parent→children expansion ... the facet predicate (overlaps) ... match the selected value as-is'.
```

**Notes.** No bug — this is the load-bearing no-drift confirmation Fable asked for. Main Ingredients: type:'hierarchical' controls only the tree RENDER/collapse (IntMainIngredientsSection does NOT auto-check descendants); matching is direct `&&`/overlaps on BOTH sides → badge==click. Heritage: down-expand-selection (RPC) ≡ up-expand-lesson (client) over the same tree is a genuine set-equivalence (S matches L iff some L-value is a descendant-or-self of S), confirmed by the Chinese-leaf and Asian-15-subtree spot check lining up with ancestorsBySlug. Representational bridge: client normalizes to slugs via aliasToSlug, server to Title-Case labels via _alias_cultural_heritage — a NON-obvious dependency Fable should keep watch on: if data/vocab/cultural-heritage.vocab.json is regenerated but the SQL _alias_cultural_heritage/expand_cultural_heritage or heritageAncestry.generated.ts drift apart, badges silently diverge from clicks. Residual (out of scope here, tracked separately in project_ingredient_parent_invariant_broken): 7 PROD rows violate the ingredient parent-rides-along invariant, so a GROUP filter under-matches — but it under-matches EQUALLY in RPC and facetCounts (both direct), so badge still equals click; it is a data-completeness gap, not a badge-vs-click drift.

**Adversarial verify → HOLDS.** Reproduced exactly: server main_ingredients is plain && (no expansion) = client overlaps; server down-expands heritage selection while client up-expands the lesson over the same tree (inverse walks, equivalent), and search-filter option values are slugs so heritageSlugs.has(slug) resolves — badge and click agree for both facets. Cited line refs (334-335, 307-311, 194-207) accurate on current main.

<details><summary>independent re-probe</summary>

```
(1) Read src/utils/facetCounts.ts full file (predicates at :334-335 mainIngredients overlaps; :307-311 heritage; :194-207 heritageSlugSet). (2) PROD: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='search_lessons'. (3) PROD: SELECT expand_cultural_heritage(_alias_cultural_heritage(ARRAY['Chinese'])), expand_cultural_heritage(_alias_cultural_heritage(ARRAY['Asian'])). (4) PROD: SELECT _alias_cultural_heritage(ARRAY['asian']), _alias_cultural_heritage(ARRAY['Asian']), _alias_cultural_heritage(ARRAY['east-asian']). (5) grep ancestorsBySlug/aliasToSlug in src/utils/heritageAncestry.generated.ts. (6) grep culturalHeritage/mainIngredients in src/utils/filterDefinitions.ts and value shapes in src/utils/heritageHierarchy.generated.ts.
```

```
PROD search_lessons WHERE (all 3 blocks): "AND (filter_main_ingredients IS NULL OR array_length(filter_main_ingredients, 1) IS NULL OR l.main_ingredients && filter_main_ingredients)" and "expanded_cultures := expand_cultural_heritage(_alias_cultural_heritage(filter_cultures))" ... "l.cultural_heritage && expanded_cultures". expand test: chinese_expanded=["Chinese"]; asian_expanded=["Korean","Chinese","Pakistani","Japanese","Vietnamese","Central Asian","Malaysian","Uzbek","Indian","Southeast Asian","Taiwanese","Asian","South Asian","Sri Lankan","East Asian"]. alias test: _alias(['asian'])=["asian","Asian"]; _alias(['Asian'])=["Asian"]; _alias(['east-asian'])=["east-asian","East Asian"]. facetCounts.ts:335 case 'mainIngredients': return overlaps(lesson.mainIngredients, selected); :311 case 'culturalHeritage': return selected.some((slug) => lesson.heritageSlugs.has(slug)); heritageSlugSet :194-207 up-expands via ancestorsBySlug. heritageAncestry.generated.ts:182 chinese: ['chinese','east-asian','asian']; :171 asian: ['asian']. heritageHierarchy.generated.ts:49/53/57 search-tree option values are slugs 'asian'/'east-asian'/'chinese'.
```

</details>

---

#### `FP4-STORE-04` — POLISH · effort S · CONFIRMED · still-real

**Claim.** Persisted layout state (esy-search-ui) has no version/migrate and the custom merge does zero validation, so a corrupt or renamed view/density value rehydrates forever and silently breaks the layout with no error.

**Where.** src/stores/searchStore.ts:190-227 (persist config; merge at :218-227 spreads persisted.viewState over defaults unchecked). Unions at src/types/index.ts (view∈{list,grid,split}, density∈{comfy,compact,ultra}).

**Probe.**
```
Read searchStore.ts persist block :190-234.
```

**Raw output.**
```
merge: (persisted, current) => { const p = persisted as {viewState?: Partial<ViewState>}|undefined; return { ...current, viewState: { ...current.viewState, ...(p?.viewState ?? {}) } }; } — no whitelist, no version key on the persist options. partialize (:210-216) keeps re-persisting whatever is there, so a bad value never self-heals.
```

**Notes.** rung8-stores.md F2, unchanged. Low today (values stable, internal tool), but it's the classic partialize-staleness trap: a persisted view:'table' → SearchPage computes isSplit=false/isGrid=false → falls into list branch while data-view='table' matches no CSS and the switcher highlights nothing. Guard is a 3-line union whitelist in merge, or version:1 + migrate.

---

#### `FP4-PERMALINK-05` — POLISH · effort S · CONFIRMED · already-fixed

**Claim.** All three rung8-permalink-history findings (state-drop on filter change while open; pending debounce firing on the pushed /lesson entry; open-lesson-filtered-out spurious loading) are ALREADY FIXED in current main.

**Where.** src/hooks/useUrlSync.ts:112 & :168-171 (state now propagated); src/pages/SearchPage.tsx:209 (flush before push) & :217 (push search built from live filters); SearchPage.tsx:205 (setQueryData seeds by-id cache).

**Probe.**
```
Read useUrlSync.ts (full) and SearchPage.tsx handleOpenLesson; grep -n 'setQueryData|flush()' src/pages/SearchPage.tsx.
```

**Raw output.**
```
useUrlSync.ts:168-171 setSearchParams(buildSearchParams(filters,sortBy),{replace:true,state:latestRef.current.state}) and :110-112 flushPendingWrite also passes state — Finding 1 (state drop) FIXED. SearchPage.tsx:209 flush(); :211 navigate({pathname:/lesson/..., search:buildSearchParams(filters,viewState.sortBy).toString()}) — pending write flushed onto list entry + push uses LIVE filters — Finding 2 FIXED. SearchPage.tsx:205 queryClient.setQueryData(['lesson', lesson.lessonId], lesson) seeds by-id cache so openedLesson stays populated when the lesson drops out of results — Finding 3 FIXED.
```

**Notes.** rung8-permalink-history.md F1/F2/F3 all landed (the #594 follow-ups shipped). Do NOT re-file these. The ONE residual close-semantics gap that survives is FP4-SP-01 above — distinct from these three: it is the toggle-WHILE-open→close(-Back) path, which no flush cures because navigate(-1) discards the entry the toggle was written to.

---

### C6 · Overengineering (FP-21/22/24/04) + fresh dead-code/TODO  (15 findings)

#### `FP24-stale-e2e-comment` — INTERNAL ANNOYANCE · effort S · CONFIRMED · still-real

**Claim.** The e2e heritage-filter comment still describes the checkbox input as display:none, but the actual CSS is the sr-only clip pattern — a stale/incorrect comment.

**Where.** e2e/cultural-heritage-filter.spec.ts:70-72 (comment); actual CSS src/styles/internal.css:214-223 (.int-check input)

**Probe.**
```
sed e2e comment; sed internal.css:210-230
```

**Raw output.**
```
e2e comment: 'the underlying <input type="checkbox"> is `display:none` (internal.css: `.int-check input`)'. But internal.css:214-223 `.int-check input { position: absolute; width: 1px; height: 1px; ... clip: rect(0 0 0 0); clip-path: inset(50%); ... }` — sr-only clip, NOT display:none (comment above it explicitly says 'display:none / visibility:hidden would drop it from both').
```

**Notes.** One-line doc correction. Harmless but actively misleading to the next person who reads the spec.

---

#### `FP04-scrim-already-fixed` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** The FP-04 'backdrop is solid black because bg-opacity-50 no longer exists in Tailwind v4' claim is STALE — the scrim was fixed to bg-esy-ink/30 (a real @theme-registered utility) by #585, with a regression-test tripwire.

**Where.** src/components/Auth/AuthModal.tsx:79; token src/index.css:6 (@theme) + :47; test src/components/Auth/AuthModal.test.tsx:92-99

**Probe.**
```
grep line 79 of AuthModal.tsx; grep bg-opacity across src; awk block-header scan of index.css; git log AuthModal
```

**Raw output.**
```
AuthModal.tsx:79 -> className="fixed inset-0 bg-esy-ink/30 flex items-center justify-center z-50 p-4". `bg-opacity` in src -> only AuthModal.test.tsx:92-99 (tripwire asserting `.toContain('bg-esy-ink/30')` and `.not.toMatch(/bg-opacity-/)`). index.css: `@theme {` opens at line 6; `--color-esy-ink: #1A1A1A;` at line 47 (inside @theme, so bg-esy-ink generates). git log: 5324cec 'fix(auth): FP-03 — honor submit-after-sign-in; restore AuthModal scrim (FP-04a) (#585)'.
```

**Notes.** Task called this load-bearing ('scrim class no longer exists'). It NO LONGER references a dead class — the black-out user-visible bug is gone. Only the a11y/dialog gaps (next finding) remain of FP-04.

**Adversarial verify → HOLDS.** Every claim reproduces: scrim is bg-esy-ink/30 (real #1A1A1A @theme color at index.css:47), no bg-opacity in prod code, regression tripwire present at test:92-99, fixed by #585 (5324cec) — FP-04 solid-black-backdrop complaint is genuinely stale/already-fixed.

<details><summary>independent re-probe</summary>

```
sed -n '70,105p' src/components/Auth/AuthModal.tsx  |  grep -rn "bg-opacity" src/  |  grep -n "esy-ink" src/index.css  |  grep -rn "esy-ink" AuthModal.tsx AuthModal.test.tsx  |  git log --oneline -- src/components/Auth/AuthModal.tsx  |  git log -S "bg-esy-ink/30" --oneline -- src/components/Auth/AuthModal.tsx  |  sed -n '90,100p' src/components/Auth/AuthModal.test.tsx
```

```
AuthModal.tsx:79 = `<div className="fixed inset-0 bg-esy-ink/30 flex items-center justify-center z-50 p-4">`. grep bg-opacity across src/: only in test file (AuthModal.test.tsx:96 comment, :99 regex `not.toMatch(/bg-opacity-/)`) — none in production code. index.css:47 `--color-esy-ink: #1A1A1A;` (real @theme token). Test tripwire AuthModal.test.tsx:92 `it('backdrop uses the design-system scrim, not the dead Tailwind-v3 bg-opacity utility (FP-04a)'...)`, :98 `toContain('bg-esy-ink/30')`, :99 `not.toMatch(/bg-opacity-/)`. git log -S "bg-esy-ink/30" → single commit `5324cec fix(auth): FP-03 — honor submit-after-sign-in; restore AuthModal scrim (FP-04a) (#585)`.
```

</details>

---

#### `FP04-still-handbuilt-modal` — POLISH · effort M · CONFIRMED · still-real ★load-bearing

**Claim.** AuthModal is STILL a hand-built modal (the full dialog-lib rebuild was NOT done): no role/aria-modal, no Escape-to-close, no focus trap/restore, close ✕ has no accessible name, and Email/Password labels are not programmatically associated.

**Where.** src/components/Auth/AuthModal.tsx:78-80 (plain fixed div), :81-86 (✕ button, only <X/>), :94 & :100 (Email label/input), :113 & :119 (Password label/input)

**Probe.**
```
Read AuthModal.tsx in full; grep for Escape|keydown|role=|aria-modal|aria-label|htmlFor|focus (management)
```

**Raw output.**
```
grep for Escape|keydown|role=|aria-modal in AuthModal.tsx -> NONE. The only 'focus' hits are Tailwind `focus:ring-2` classes on inputs (:104,:123), not focus management. Close button :81-86 = `<button onClick={onClose}...><X size={24} /></button>` (no aria-label; lucide X is aria-hidden by default). Labels :94/:113 = `<label className=...>Email/Password</label>` with no htmlFor; inputs :100/:119 have no id/aria-label. Container :78-80 is a bare `<div className="fixed inset-0 ...">`.
```

**Notes.** IntLessonDrawer / IntMobileFilterDrawer use Headless UI Dialog (trap+Esc+restore for free); AuthModal is the app's lone hand-built modal. The one desktop-visible-for-everyone bit is 'no Escape-to-close'; the rest (focus trap, unlabeled ✕/fields) is a11y with no mandate → polish. Rebuild-on-Dialog is the shelf's proposed fix.

**Adversarial verify → HOLDS.** All five sub-claims and all four line-ref pairs reproduce exactly; still a hand-built modal, rebuild not done. Caveat for ranking: pure-a11y finding under a product with explicit "no a11y mandate, desktop-only" constraint — technically CONFIRMED but severity is polish, not breakage.

<details><summary>independent re-probe</summary>

```
Read src/components/Auth/AuthModal.tsx (full, 181 lines) + `grep -nE "Escape|keydown|keyup|role=|aria-modal|aria-label|htmlFor|useRef|focus\(|trap|Dialog|dialog" src/components/Auth/AuthModal.tsx`
```

```
grep exit code 1 (ZERO matches for any of: Escape, keydown, keyup, role=, aria-modal, aria-label, htmlFor, useRef, focus(, trap, Dialog, dialog). File confirms: line 4 imports only `X, Mail, Lock` from lucide-react (no dialog lib); line 79 `<div className="fixed inset-0 bg-esy-ink/30 flex items-center justify-center z-50 p-4">` (plain div, no role/aria-modal); lines 81-86 `<button onClick={onClose} className="absolute right-4 top-4 ..."><X size={24} /></button>` (icon-only, no accessible name); line 94 `<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>` + line 100 `<input type="email" ...` (no htmlFor/id pairing); line 113 `<label ...>Password</label>` + line 119 `<input type="password" ...` (no htmlFor/id); only useEffect (line 36) resets state on !isOpen, no key handler.
```

</details>

---

#### `FP21a-permissions-oversized` — POLISH · effort M · CONFIRMED · still-real ★load-bearing

**Claim.** 13-permission RBAC still ships with 7 permissions never used in any production check, an override-merge engine no UI can feed, and 3 unused ProtectedRoute props.

**Where.** enum src/types/auth.ts:10-29; override merge src/hooks/useEnhancedAuth.ts:146-172; JSONB column src/types/auth.ts:75; absent UI src/pages/AdminUserDetail.tsx:880; unused props src/components/Auth/ProtectedRoute.tsx:10-12,18-20

**Probe.**
```
for each Permission: rg 'Permission\.<P>' src excluding types/auth.ts; then list refs of the 7 candidates; grep ProtectedRoute props passed in App.tsx
```

**Raw output.**
```
Never in a production check site (refs only in useEnhancedAuth.test.ts or nowhere): VIEW_LESSONS(8 refs, all in useEnhancedAuth.test.ts), SUBMIT_LESSONS(2, test-only), APPROVE_LESSONS(0), DELETE_LESSONS(4, test-only), MANAGE_ROLES(1, test-only), EXPORT_DATA(0), SYSTEM_SETTINGS(0). Actually-checked (App/Header/Admin pages): VIEW_USERS, VIEW_ANALYTICS, REVIEW_LESSONS, INVITE_USERS, EDIT_USERS, DELETE_USERS. AdminUserDetail.tsx:880 = `{/* intentionally empty — no permissions matrix */}`. ProtectedRoute defines requireAll?/fallback?/redirectTo? (:10-12) but grep of App.tsx for requireAll|redirectTo=|fallback= on ProtectedRoute -> NONE (the fallback= hits at :101/:205 are ErrorBoundary, not ProtectedRoute).
```

**Notes.** Shelf's raw counts drifted (it said VIEW_USERS x11 etc.) but the qualitative claim is exact: 7 never-checked, 6 checked. Real enforcement is RLS/edge server-side; frontend checks are cosmetic. Trimming blast radius = types/auth.ts + useEnhancedAuth.ts + its 758-line test (useEnhancedAuth.test.ts exercises the override merge with synthetic data).

**Adversarial verify → HOLDS.** HOLDS on all 4 sub-claims and all line refs. Scoping nuance for Fable: the "7" depends on the finder's "used in a production CHECK" definition — a naive "zero refs anywhere" reading finds only 3 (APPROVE_LESSONS/EXPORT_DATA/SYSTEM_SETTINGS); the other 4 (VIEW/SUBMIT/DELETE_LESSONS, MANAGE_ROLES) are referenced only by DEFAULT_PERMISSIONS + tests. PROD confirms the override engine is a no-op (all 6 rows = '{}'). This is dead/over-engineered code: severity is polish/internal-cleanup, no user-visible breakage or data drift.

<details><summary>independent re-probe</summary>

```
1) Read src/types/auth.ts (enum 10-29 = 13 members; JSONB col line 75), src/hooks/useEnhancedAuth.ts (merge 146-172), src/components/Auth/ProtectedRoute.tsx (props 10-12/18-20).
2) Per-perm count outside auth.ts: for P in <13 perms>; do rg -n "Permission\.$P\b" src --glob '!src/types/auth.ts' | wc -l; done
3) rg -n "hasPermission\(|hasAnyPermission\(|hasAllPermissions\(|permissions=\{" src --glob '!useEnhancedAuth.ts' --glob '!auth.ts'  (isolate runtime checks; excluded .test.ts and CLAUDE.md)
4) grep -rn -E "Permission\.(APPROVE_LESSONS|EXPORT_DATA|SYSTEM_SETTINGS)" src
5) rg -n "requireAll|redirectTo=|fallback=" src -g '*.tsx'  ; rg -n "<ProtectedRoute" src -g '*.tsx' | wc -l
6) rg -n "permissions:" src -g '*.ts' -g '*.tsx' (write paths) + inspect AdminInvitations.tsx:209 / AdminInviteUser.tsx:202 targets
7) sed -n '860,900p' src/pages/AdminUserDetail.tsx  (absent-UI comment)
8) PROD S
… [truncated 192 chars — full raw output in journal.jsonl]
```

```
Enum: 13 members (VIEW_LESSONS..SYSTEM_SETTINGS), auth.ts:10-29. JSONB col auth.ts:75 `permissions?: Record<Permission, boolean>`. Merge useEnhancedAuth.ts:146-172 confirmed verbatim.
Perms used in a runtime check (non-test/non-doc): VIEW_USERS (App/AdminUserDetail/AdminInvitations/Header/AdminDashboard), REVIEW_LESSONS (App:123/131, Header:69/112, AdminDashboard:33), VIEW_ANALYTICS (App:140, Header:111), INVITE_USERS (App:161, AdminInviteUser:274), EDIT_USERS (AdminUserDetail:461), DELETE_USERS (AdminUserDetail:826) = 6.
Never in a runtime check (only DEFAULT_PERMISSIONS table + *.test.ts): VIEW_LESSONS, SUBMIT_LESSONS, APPROVE_LESSONS, DELETE_LESSONS, MANAGE_ROLES, EXPORT_DATA, SYSTEM_SETTINGS = 7. (grep: APPROVE_LESSONS only auth.ts:39,47; EXPORT_DATA only auth.ts:53; SYSTEM_SETTINGS only enum def line 28.)
ProtectedRoute props: 9 `<ProtectedRoute` sites, ALL pass only permissions={...}; `requireAll` appears only in ProtectedRoute.tsx (10/18/94), `redirectTo=` 0 caller matches, `fallback=` matches are Suspense/ErrorBoundary not ProtectedRoute. => requireAll/fallback/redirectTo never supplied by a caller.
permissions: writes -> AdminInvitations.tsx:209 & AdminInviteUser.tsx:202 both go into supabase.functions.invoke('send-email') body (role-derived string[]), NOT user_profiles column; no .update/.upsert on user_profiles with permissions found.
AdminUserDetail.tsx ~879: `{/* i
… [truncated 196 chars — full raw output in journal.jsonl]
```

</details>

---

#### `FP21b-teacher-autocreate` — POLISH · effort M · CONFIRMED · still-real ★load-bearing

**Claim.** useEnhancedAuth still silently client-side INSERTs a role:'teacher' user_profiles row for any authenticated user missing one — self-signup-era logic on an invite-only site.

**Where.** src/hooks/useEnhancedAuth.ts:39-74 (the `if (!data)` create branch)

**Probe.**
```
Read useEnhancedAuth.ts
```

**Raw output.**
```
Lines 39-58: `if (!data) { const newProfile = { id: authUser.id, ..., role: UserRole.TEACHER, is_active: true, ... }; const { data: createdProfile, error: createError } = await supabase.from('user_profiles').insert(newProfile).select().single(); }` — plus a fallback at :60-66 that still `setUser({...newProfile})` on insert error.
```

**Notes.** Shelf line-ref 32-67 drifted to 39-74. Since T3 (invite-only) a missing profile signals something wrong (half-deleted user / failed invite); this papers over it from the browser. Latent-risk flavor (creates an un-invited teacher row) but never fires at ~3 users whose profiles all exist. Shelf's fix: treat-as-signed-out + log; verify AcceptInvitation creates the row in all paths on TEST first.

**Adversarial verify → HOLDS.** CONFIRMED, exact line refs (39-74). RLS probe strengthens it: PROD INSERT policy explicitly whitelists self-created role='teacher' profiles, so the client insert actually persists (not silently blocked) — matches "self-signup-era logic on an invite-only site" verbatim. load_bearing: true.

<details><summary>independent re-probe</summary>

```
(1) Read /Users/danfeder/cCode/esynyc-lessonsearch-v2/src/hooks/useEnhancedAuth.ts (full file). (2) SQL on PROD (jxlxtzkmicfhchkhiojz): SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' ORDER BY cmd, policyname;
```

```
Read: lines 39-74 = `if (!data) { const newProfile = { id: authUser.id, user_id: authUser.id, email: authUser.email!, full_name: ..., role: UserRole.TEACHER, is_active: true, ... }; const { data: createdProfile, error: createError } = await supabase.from('user_profiles').insert(newProfile).select().single(); if (createError) { logger.error(...); setUser({...newProfile, email}); } else if (createdProfile) { setUser({...}); } }` — client-side teacher-role INSERT confirmed at the exact cited lines, no invite/allowlist gate in the code path. RLS INSERT policy (PROD): {"policyname":"Users can create their own profile","cmd":"INSERT","qual":null,"with_check":"((auth.uid() = id) AND ((role = 'teacher'::text) OR (EXISTS ( SELECT 1 FROM user_invitations ui WHERE ((ui.email = user_profiles.email) AND (ui.role = user_profiles.role) AND (ui.accepted_at IS NULL) AND (ui.expires_at > now()))))))"} — role='teacher' + auth.uid()=id satisfies WITH CHECK, so the insert is permitted, not blocked.
```

</details>

---

#### `FP21c-two-debounce-impls` — POLISH · effort S · CONFIRMED · still-real ★load-bearing

**Claim.** Two debounce implementations still coexist, one call site each, and the function-debounce skips debouncing entirely under test (env-sniff passthrough) so the header search debounce is untestable by construction.

**Where.** src/hooks/useDebounce.ts (value-debounce; sole live user src/pages/AdminUsers.tsx:49); src/utils/debounce.ts:12-23 (env-sniff fork; sole user src/components/Layout/Header.tsx:9,177)

**Probe.**
```
cat both debounce files; rg call sites for useDebounce and utils/debounce
```

**Raw output.**
```
utils/debounce.ts:13-15 `const isTest = typeof process !== 'undefined' && (process.env.VITEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test');` then :17-23 returns a synchronous passthrough `fn` when isTest. Live callers: useDebounce -> only AdminUsers.tsx:4,49 (rest are tests/docs); utils/debounce -> only Header.tsx:9 (import) + :177 (usage).
```

**Notes.** Shelf line-refs drifted (Header.tsx:20,191-213 -> :9,:177; fork :13-24 -> :12-23). Fix: convert Header to the hook, delete utils/debounce.ts + the env fork, use vitest fake timers. Header search is the public entry point — verify typing→results after swap.

**Adversarial verify → HOLDS.** Independently reproduced in full: two debounce impls, one live call site each (useDebounce->AdminUsers.tsx:49, utils/debounce->Header.tsx:9/177), env-sniff passthrough at debounce.ts:12-23 bypasses debouncing under Vitest making the header search debounce untestable by construction. All cited line refs exact.

<details><summary>independent re-probe</summary>

```
Read src/utils/debounce.ts and src/hooks/useDebounce.ts in full; grep -rn useDebounce src; grep -rn utils/debounce src; grep -n debounce src/components/Layout/Header.tsx
```

```
debounce.ts 12-23 = isTest block checking process.env.VITEST_WORKER_ID !== undefined || NODE_ENV === test, returning a synchronous passthrough fn with no-op cancel. useDebounce.ts = value-debounce via useState/useEffect. useDebounce defined useDebounce.ts:9; sole non-test import AdminUsers.tsx:4 used :49 (useDebounce(searchTerm,300)); all other hits in useDebounce.test.ts. utils/debounce sole import Header.tsx:9; used at 175 useMemo, 177 debounce(...), 185 .cancel(), 197 call.
```

</details>

---

#### `FP21d-three-error-boundaries` — POLISH · effort M · CONFIRMED · still-real ★load-bearing

**Claim.** Three stacked global error boundaries with two hand-rolled 'Something went wrong' fallbacks still layer over the app; the keyed ReviewErrorBoundary is separate and load-bearing.

**Where.** ① Sentry.ErrorBoundary inline ~30-line fallback src/main.tsx:20-49; ② ErrorBoundary+AppErrorFallback src/App.tsx:204-215; ③ ErrorBoundary+RouteErrorFallback src/App.tsx:101,197; keyed ReviewErrorBoundary src/App.tsx:90 (leave alone)

**Probe.**
```
Read main.tsx; rg ErrorBoundary/fallback refs in App.tsx
```

**Raw output.**
```
main.tsx:20-49 `<Sentry.ErrorBoundary fallback={({error,resetError}) => (<div ...><h1>Something went wrong</h1>...)} showDialog={false}>`. App.tsx: :101 `<ErrorBoundary fallback={RouteErrorFallback}>`, :204-205 `<ErrorBoundary fallback={AppErrorFallback}`, :90 `<ReviewErrorBoundary key={id}>`. AppErrorFallback/RouteErrorFallback/ReviewErrorBoundary are now their own files under src/components/Common/.
```

**Notes.** Shelf line-refs drifted (main.tsx:19-50 -> :20-49; App.tsx:104 -> :101; :209-214 -> :204-215). Refactor since shelf: the two custom fallbacks were extracted to their own files (they were inline per the shelf). Structure of 3 stacked + 1 keyed is intact. ①'s elaborate fallback effectively never renders (② catches first). Consolidation is a human call — mark confidence-of-facts high.

**Adversarial verify → HOLDS.** Reproduces exactly: 3 stacked global boundaries (Sentry inline / AppErrorFallback L204 / RouteErrorFallback L101), 2 hand-rolled 'Something went wrong' fallbacks (main.tsx:24 + AppErrorFallback:30), keyed ReviewErrorBoundary L90 separate/load-bearing; only nit — main.tsx closing tag is L51 not L49, immaterial.

<details><summary>independent re-probe</summary>

```
Read src/main.tsx (full); grep -n -E 'ErrorBoundary|Fallback|Something went wrong|fallback' src/App.tsx; Read src/App.tsx lines 85-215; grep -rn 'Something went wrong' src/components/Common/AppErrorFallback.tsx src/components/Common/RouteErrorFallback.tsx; ls src/components/Common/ | grep -Ei 'error|fallback'
```

```
main.tsx: `<Sentry.ErrorBoundary fallback={({error,resetError})=>(...)}>` opens L20; inline fallback JSX L21-47 with `<h1 ...>Something went wrong</h1>` L24; `<App/>` L50; `</Sentry.ErrorBoundary>` L51. || App.tsx grep: L5 `import { ErrorBoundary } from '@/components/Common/ErrorBoundary'`; L6 AppErrorFallback; L7 RouteErrorFallback; L8 ReviewErrorBoundary; L90 `<ReviewErrorBoundary key={id}>`; L101 `<ErrorBoundary fallback={RouteErrorFallback}>`; L197 `</ErrorBoundary>`; L204 `<ErrorBoundary`; L205 `fallback={AppErrorFallback}`; L215 `</ErrorBoundary>`. || App.tsx L87-93: ReviewDetailRoute renders `<ReviewErrorBoundary key={id}><ReviewDetail/></ReviewErrorBoundary>`; L77-86 comment explains key={id} remount design. L204-211: App() wraps QueryClientProvider>AppContent in ErrorBoundary/AppErrorFallback. || grep 'Something went wrong': AppErrorFallback.tsx:30 `Oops! Something went wrong`; RouteErrorFallback.tsx = no match. || Common/ dir: AppErrorFallback.tsx, ErrorBoundary.tsx, ReviewErrorBoundary.tsx, RouteErrorFallback.tsx.
```

</details>

---

#### `FP22-scripts-attic` — POLISH · effort S · CONFIRMED · still-real ★load-bearing

**Claim.** scripts/ is still an attic: 77 top-level entries (shelf said 75), 9 orphan SQL files with zero real consumers, and three duplicate-analysis tool generations.

**Where.** scripts/ (67 files + 10 dirs); orphan .sql list below; analyze-duplicates.mjs + -v2.ts + -v3.ts; package.json:36-37; scripts/archive/ (16 entries)

**Probe.**
```
find scripts -maxdepth 1; rg each orphan-SQL name repo-wide excluding self; rg analyze-duplicates in package.json; count scripts/archive
```

**Raw output.**
```
top-level entries = 77 (files 67 / dirs 10). 9 orphan SQL (make-first-admin, fix-existing-user-profile, fix-existing-user-profile-v2, verify-auth-emails, fix-rls-enablement, check-duplicate-resolution, setup-test-users, update-test-user-emails, verify-user-management-setup) each -> 1 external ref, and that ref is ONLY docs/plans/fp1-audit/shelf-simplification.md:108; NONE in package.json or .github/. analyze-duplicates.mjs external refs = scripts/CLAUDE.md:29 + scripts/README.md:109,114 (docs only, no npm/workflow); package.json:36-37 bind analyze-duplicates-v2/-v3.ts. scripts/archive = 16 entries.
```

**Notes.** Count drifted 75→77. All 9 SQL are genuinely orphaned (only the shelf doc mentions them). analyze-duplicates.mjs is doc-referenced but has no automated consumer; v2/v3 are embedding-based (moot post-T4b per shelf N1). scripts/archive/ is the ready destination; scripts/README.md still has no dead/alive ledger. Bundles with the N1 embedding-retirement sweep.

**Adversarial verify → HOLDS.** All 3 sub-claims reproduce (77 fs entries = 67 files+10 dirs, 9 orphan SQL with no executing consumer — sole ref is the shelf doc that itself flags them orphan & not in package.json, 3 analyze-duplicates generations). Minor nuance for Fable: the 77-vs-shelf-75 delta is tracked-vs-filesystem (2 untracked: __pycache__, sync-from-production.mjs), not real growth of tracked content — git-tracked count is still exactly 75; also my first ls -1 read 79 due to rtk-proxy noise counting ./ .., real ls=77.

<details><summary>independent re-probe</summary>

```
git ls-files scripts | awk -F/ '{print $2}' | sort -u | wc -l  (=75 tracked); comm -23 <(ls -1 scripts|sort) <(git ls-files scripts|awk -F/ '{print $2}'|sort -u)  (untracked); find scripts -maxdepth 1 -name '*.sql'; ls scripts/analyze-duplicates*; for each SQL: grep -rn "<name>" --include=*.md/json/ts/mjs/sh . | grep -v self; rg .sql package.json
```

```
git-tracked top-level = 75; untracked = 2 (__pycache__, sync-from-production.mjs) → filesystem total 77 = 66 files+9 dirs tracked + 1 file+1 dir untracked = 67 files+10 dirs (matches finder). 9 top-level .sql: check-duplicate-resolution, fix-existing-user-profile(-v2), fix-rls-enablement, make-first-admin, setup-test-users, update-test-user-emails, verify-auth-emails, verify-user-management-setup. Each SQL's ONLY non-self reference = docs/plans/fp1-audit/shelf-simplification.md:108 ("Nine orphan .sql files re-verified 0 references in package.json / workflows / READMEs"); `rg .sql package.json` → (no .sql refs in package.json). analyze-duplicates.mjs + -v2.ts + -v3.ts all present. scripts/archive: 16 filesystem entries (14 git-tracked).
```

</details>

---

#### `FP24-header-link-names` — POLISH · effort S · CONFIRMED · still-real

**Claim.** Header Submit/Review links still lose their accessible name below 640px (text hidden, icons aria-hidden, no aria-label).

**Where.** src/components/Layout/Header.tsx:74-77 (Submit), :80-83 (Review)

**Probe.**
```
sed -n '60,95p' Header.tsx
```

**Raw output.**
```
`<Link to="/submit" className="int-nav-link int-nav-link--cta"><Plus className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Submit Lesson</span></Link>` and same shape for Review (Shield icon, `hidden sm:inline`). No aria-label on either Link.
```

**Notes.** Phone-only a11y; desktop shows the text, so no desktop payoff → polish. Trivial fix (aria-label or sr-only sm:not-sr-only). Note the sibling user-menu button DOES have aria-label='User account' (:88ish) — inconsistent.

---

#### `FP24-announcer-firstload-and-store` — POLISH · effort S · CONFIRMED · still-real

**Claim.** ScreenReaderAnnouncer still (a) subscribes to the whole store (banned pattern) and (b) fires a spurious 'All filters cleared. Showing all N lessons.' on the first settle of a fresh page load with no first-run guard.

**Where.** src/components/Common/ScreenReaderAnnouncer.tsx:21 (whole-store destructure), :55-56 (cleared branch), :24-58 (effect, no first-run ref)

**Probe.**
```
Read ScreenReaderAnnouncer.tsx
```

**Raw output.**
```
:21 `const { filters } = useSearchStore();`. Effect :24-58 gated only by `if (suppressed) return;` — on first settled load with no active filters, activeFilters.length===0 so :55-56 `setAnnouncement(`All filters cleared. Showing all ${count} lessons.`)`. No useRef first-run flag anywhere in the effect.
```

**Notes.** This is the 'desktop-adjacent' item the task asked to check specifically — confirmed present. It is emitted into an sr-only aria-live region, so only screen-reader users hear the misleading first announcement (no a11y mandate → polish, but trivial: add a first-run ref + select-slice the store). Two fixes in one file.

---

#### `FP24-skiplink-position` — POLISH · effort S · CONFIRMED · still-real

**Claim.** The skip link is still not the first focusable element — it renders inside SearchPage, after the Header in DOM order.

**Where.** SkipLink at src/pages/SearchPage.tsx:258; Header rendered before route content in src/App.tsx; target #main-content at src/pages/SearchPage.tsx:267 (tabIndex={-1}, correct)

**Probe.**
```
rg SkipLink/#main-content in SearchPage.tsx and App.tsx
```

**Raw output.**
```
SearchPage.tsx:6 import SkipLink; :258 `<SkipLink />`; :267 `<div id="main-content" className="int-main" tabIndex={-1}>`. SkipLink.tsx href="#main-content", text 'Skip to main content'. Header is composed above SearchPage in App.tsx.
```

**Notes.** Shelf line-refs drifted (:108/:117 -> :258/:267). It still earns its keep (placed before the ~50-checkbox sidebar) but convention is first-in-DOM. Low impact; a11y-only.

---

#### `FP24-formfield-htmlfor-nonlabelable` — POLISH · effort S · CONFIRMED · still-real

**Claim.** IntFormField still wires <label htmlFor> onto non-labelable read-only children (<p>/<div>) on the profile page, failing axe/HTML label-for validation with no user harm.

**Where.** src/components/Internal/IntFormField.tsx:~44-65 (clones single child + injects id regardless of element type; renders <label htmlFor={fieldId}> unconditionally); consumers src/pages/UserProfile.tsx:401-406 (Email <p>), :408-412 (Role <div>), :421-440 (Schools <div>), :442-468 (Borough <p>)

**Probe.**
```
sed IntFormField.tsx label block; sed UserProfile.tsx:401-468
```

**Raw output.**
```
IntFormField clones any singleChild: `renderedChild = cloneElement(singleChild, { ...(childProps.id ? {} : { id: fieldId }), ... })` then `<label htmlFor={fieldId} className=...>{label}</label>`. UserProfile read-only children: Email -> `<p className="adm-readonly adm-readonly--muted">...`; Role -> `<div><IntRoleBadge/></div>`; Schools -> `<div className="adm-readonly-stack">...`; Borough (read) -> `<p className="adm-readonly">...`.
```

**Notes.** IntFormField gained aria-required/aria-invalid/aria-describedby wiring since the shelf but still injects id + label[for] onto <p>/<div>. Fix: only inject htmlFor when child is input/select/textarea, else render label as a span. a11y-only, no user-visible effect.

---

#### `FP24-checkbox-not-a-bug` — POLISH · effort S · CONFIRMED · still-real

**Claim.** NOTE (not a bug): the '1x1px checkbox' is the CORRECT sr-only clip pattern — input stays keyboard-focusable and in the a11y tree; do not 'fix' it.

**Where.** src/styles/internal.css:214-223 (.int-check input), guarded by e2e/accessibility.spec.ts and clicked-via-label in e2e/cultural-heritage-filter.spec.ts:74-76

**Probe.**
```
sed internal.css:210-230
```

**Raw output.**
```
.int-check input uses position:absolute; width/height:1px; clip:rect(0 0 0 0); clip-path:inset(50%) — the standard sr-only clip. Comment: 'visually hide the checkbox input but keep it focusable and in the accessibility tree (display:none / visibility:hidden would drop it from both). The visible affordance is the adjacent .int-check-box span.'
```

**Notes.** Reference verdict confirmed. Included so Fable does NOT mistake the 1x1 checkbox for an a11y bug. Automation must click label.int-check, not the input's clipped box. (Ties to the stale-comment finding above.)

---

#### `FRESH-fp15-was-thorough` — POLISH · effort S · CONFIRMED · new

**Claim.** The FP-15 dead-code sweep was thorough: across components/pages/hooks/stores/types/lib there is NO missed live dead code of consequence — every §A file and every B1–B6 dead export/type/plumbing item is already deleted.

**Where.** verified deletions: src/components/Internal/IntConfidencePill.tsx, IntDetectionMethodChip.tsx, Review/ReviewContent.tsx, Review/ReviewActions.tsx, Admin/EditableTitle.tsx, Schools/SchoolSelector.tsx, pages/VerifySetup.tsx, Common/VirtualizedTable.tsx, utils/{authHelpers,duplicateConstants,facetHelpers}.ts, config/version.ts, lib/search.ts; plus types User/UserProfile/ApiResponse/FacetCount, searchStore.resultsPerPage, Common.DefaultErrorFallback, lib/supabase connection-test + handleSupabaseError/buildSearchQuery, lib/sentry setUserContext/hashEmail/withErrorHandling

**Probe.**
```
for f in <13 §A files>: test -e; rg for B5 types + resultsPerPage + DefaultErrorFallback + lib dead exports; find src/components src/pages -name '*.tsx' loop counting non-barrel/non-test refs (orphan scan); rg each hook name for importers
```

**Raw output.**
```
All 13 §A files -> 'deleted'. B5 types/resultsPerPage/DefaultErrorFallback/lib helpers -> NONE / NO external importers. Orphan component/page scan (find + rg excluding self/test/index.ts) -> 0 suspects. All 9 hooks have live importers. Only marginal residue found: type export `TagValue` (src/types/lessonMetadata.zod.ts:343) has zero external consumers and the `tags` schema field (:406) is inert per the W1c tags retirement — a trivial dead type export, pure polish.
```

**Notes.** Meta-finding for the fresh sweep: the tier-1/CSS/D3 FP-15 PRs (#587/#588/#592) plus D3 AdminAnalytics retirement cleaned the manifest completely. I deliberately did NOT re-cover utils/filterUtils / logger (C1's rung8b-utils territory). The lone new nit (TagValue) is not worth a brief.

---

#### `FRESH-no-todos-with-teeth` — POLISH · effort S · CONFIRMED · new

**Claim.** There are ZERO TODO/FIXME/HACK/XXX comments with teeth in live src or supabase/functions, and no @ts-ignore/@ts-expect-error in non-test src.

**Where.** src/**, supabase/functions/** (live code)

**Probe.**
```
rg -n 'TODO|FIXME|HACK|XXX' src supabase/functions -g '!*.test.*'; case-insensitive across src supabase scripts; rg '@ts-ignore|@ts-expect-error' src
```

**Raw output.**
```
Case-sensitive sweep of src + supabase/functions -> 0 matches. Case-insensitive only surfaced non-code noise: placeholder env values in docs (scripts/CLAUDE.md 'xxx.supabase.co', 'KEY=xxx'), a template '-- Issue: #XXX' in supabase/migrations/CLAUDE.md:312, Spanish 'todo' + a tsvector token in supabase/dump-data.sql, one '-- TODO: Implement smart metadata merging logic' in an ARCHIVED, already-applied migration (supabase/migrations/archive/20250131_duplicate_resolution_tables.sql:147 — those tables were removed in T4b), and a local var named `todo` in scripts/archive/backfill-publish-approved.ts. @ts-ignore/@ts-expect-error in src (non-test) -> 0.
```

**Notes.** Nothing actionable here — reported so Fable knows the TODO-with-teeth half of item 5 came up empty (the codebase carries no live TODO/FIXME/HACK markers).

---

### C7 · Overnight-review P1s + stale-docs sweep  (10 findings)

#### `FP4-SIMP-F5-cors` — INTERNAL ANNOYANCE · effort S · CONFIRMED · still-real ★load-bearing

**Claim.** simplification-groundwork F5 (edge functions duplicate the restricted-CORS origin logic instead of importing _shared/cors.ts) is STILL-REAL but reduced from 4 to 3: invitation-management, send-email, and user-management each define their own getCorsHeaders + ALLOWED_ORIGINS parsing; the 4th (password-reset) was removed.

**Where.** supabase/functions/invitation-management/index.ts:8,:14; supabase/functions/send-email/index.ts:45,:51; supabase/functions/user-management/index.ts:8,:14; shared helper unused by them: supabase/functions/_shared/cors.ts:31 getRestrictedCorsHeaders

**Probe.**
```
for fn in invitation-management send-email user-management; do grep -n 'ALLOWED_ORIGINS\|getCorsHeaders\|_shared/cors' supabase/functions/$fn/index.ts; done ; ls supabase/functions/ 
```

**Raw output.**
```
invitation-management:8 const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [...\n:14 const getCorsHeaders = (origin) => { ... :24 'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0] }\nsend-email:45 ALLOWED_ORIGINS ...:51 getCorsHeaders ...\nuser-management:8 ALLOWED_ORIGINS ...:14 getCorsHeaders ...\nNone import _shared/cors.ts. complete-review/detect-duplicates/extract-google-doc/process-submission DO import _shared/cors. password-reset directory: REMOVED.
```

**Notes.** Genuine security-drift risk (allowed-origins change must be applied in 4 places: shared + 3 copies), and 2 of the 3 are auth-adjacent (invitation-management, user-management). Consolidation is the honest fix but each PROD edge deploy needs the 3-signal MCP verification + TEST-first (see reference_ci_flakes). smart-search still uses an inline wildcard '*' (search-lessons/generate-embeddings/gemini fns are all removed now). Low urgency for 3 users but it's a real durability item.

**Adversarial verify → HOLDS.** Reproduced exactly: 3 functions (invitation-management :8/:14, send-email :45/:51, user-management :8/:14) each redefine ALLOWED_ORIGINS+getCorsHeaders instead of importing _shared/cors.ts getRestrictedCorsHeaders (:31); password-reset function does not exist (removed), so count is 3 not 4 as claimed.

<details><summary>independent re-probe</summary>

```
ls supabase/functions/ ; for fn in invitation-management send-email user-management password-reset; do echo "=== $fn ==="; grep -n 'ALLOWED_ORIGINS\|getCorsHeaders\|getRestrictedCorsHeaders\|_shared/cors' supabase/functions/$fn/index.ts 2>/dev/null || echo "(no index.ts or no match)"; done ; grep -n 'getRestrictedCorsHeaders\|export' supabase/functions/_shared/cors.ts ; grep -rn "_shared/cors" supabase/functions/
```

```
functions dir: _shared/ complete-review/ detect-duplicates/ extract-google-doc/ invitation-management/ process-submission/ send-email/ smart-search/ user-management/ (NO password-reset). invitation-management: 8:const ALLOWED_ORIGINS=..., 14:const getCorsHeaders=.... send-email: 45:const ALLOWED_ORIGINS=..., 51:const getCorsHeaders=.... user-management: 8:const ALLOWED_ORIGINS=..., 14:const getCorsHeaders=.... password-reset: (no index.ts or no match). _shared/cors.ts: 31:export function getRestrictedCorsHeaders(origin: string | null). Importers of _shared/cors: extract-google-doc, detect-duplicates, complete-review, process-submission — NONE of the three duplicating functions import it.
```

</details>

---

#### `FP4-STALE-arch-ghost-pages` — INTERNAL ANNOYANCE · effort S · CONFIRMED · new

**Claim.** FRESH stale doc: docs/ARCHITECTURE.md's Pages section lists AdminAnalytics.tsx, AdminDuplicates.tsx, AdminDuplicateDetailV3.tsx and VerifySetup.tsx as current pages, but all were removed — App.tsx routes none of them and src/pages/CLAUDE.md:210-212 documents the removal.

**Where.** docs/ARCHITECTURE.md:1495-1498 (page list) and :983 ('Used by: AdminAnalytics page'); contradicted by src/App.tsx:38-51 and src/pages/CLAUDE.md:210-212

**Probe.**
```
sed -n '1490,1498p' docs/ARCHITECTURE.md ; grep -n 'AdminAnalytics\|AdminDuplicate' src/pages/CLAUDE.md
```

**Raw output.**
```
ARCHITECTURE.md:1495 - **AdminAnalytics.tsx** - Usage metrics + charts\n:1496 - **AdminDuplicates.tsx** - Duplicate groups list\n:1497 - **AdminDuplicateDetailV3.tsx** - Side-by-side duplicate resolution\n:1498 - **VerifySetup.tsx** - Temporary testing page (remove in production)\nsrc/pages/CLAUDE.md:210 '(The AdminDuplicates / AdminDuplicateReview pages were removed in T4b (D10) ...' :212 'AdminAnalytics was retired in the frontend-polish phase, owner decision D3.)'
```

**Notes.** ARCHITECTURE.md's :7 editor's-note ONLY disclaims lesson/user/submission COUNTS — it does not cover the pages inventory, so this is uncovered stale content an agent would trust. Cheap fix (delete 4 lines / add removed-note). Not urgent for the owner but a real doc-vs-code contradiction. docs-cleanup-audit F1/F12 never flagged it.

---

#### `FP4-STALE-arch-lessonformat` — INTERNAL ANNOYANCE · effort S · CONFIRMED · new

**Claim.** FRESH stale doc: docs/ARCHITECTURE.md still documents a `lessonFormat` field/filter, but that field was removed entirely (column + metadata key) in the 2026-05 metadata rebuild, per the authoritative note in root CLAUDE.md:120.

**Where.** docs/ARCHITECTURE.md:464 ('lessonFormat: string; // Single-select → string') and :1848 ("- 'lessonFormat'"); contradicted by CLAUDE.md:120

**Probe.**
```
grep -n 'lessonFormat' docs/ARCHITECTURE.md ; grep -n 'lessonFormat' CLAUDE.md src/utils/filterDefinitions.ts
```

**Raw output.**
```
ARCHITECTURE.md:464   lessonFormat: string;       // Single-select → string\nARCHITECTURE.md:1848                          - 'lessonFormat'\nCLAUDE.md:120 '(Note: there is no `lessonFormat` filter — that field was removed from the schema entirely in the 2026-05 metadata rebuild, column and metadata key both.)'\n(filterDefinitions.ts: no lessonFormat)
```

**Notes.** Same file as the ghost-pages finding; both are symptoms that docs/ARCHITECTURE.md is broadly pre-metadata-rebuild and the Wave-3 editor's note only covers counts. If Fable wants one brief, bundle FP4-STALE-arch-ghost-pages + this into a single 'refresh ARCHITECTURE.md pages/fields beyond the counts banner' cleanup. MEMORY confirms lessonFormat was dropped (project_lesson_format_conflated — RESOLVED/dropped).

---

#### `FP4-P1a-mobile-filters` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** The mobile-filter CSS source-order bug (frontend-ux-review 3.1) is ALREADY FIXED: the base `.int-mobile-filter-btn { display:none }` now precedes the <768px override, so the trigger shows on mobile — and for a desktop-only audience it is polish regardless.

**Where.** src/styles/internal.css:571 (base rule) vs :588 @media(max-width:767px) / :610-612 override; fix documented at :567-570

**Probe.**
```
grep -n 'int-mobile-filter-btn' src/styles/internal.css ; sed -n '567,612p' src/styles/internal.css
```

**Raw output.**
```
571:.int-mobile-filter-btn { display: none; ... }  (BASE, first)\n588:@media (max-width: 767px) {\n610:  .int-mobile-filter-btn {\n611:    display: inline-flex;\n612:  }\nComment 567-570: 'MUST precede the <768px @media override below: equal specificity (0,1,0) means later source order wins, so the base display:none has to come first ... (C57).'  => base is BEFORE the media query; override wins at <768px. Bug gone.
```

**Notes.** Fixed under label C57. Audience is desktop-only (no mobile mandate) so even if broken this would be polish; it is not broken. Adjacent doc-item #4 (split-view dead-end <1100px) is ALSO fixed: SearchPage.tsx:249-254 coerces effectiveView via useMediaQuery('(min-width:1100px)') and routes the drawer when narrow. Both can be dropped from the shelf.

**Adversarial verify → HOLDS.** Confirmed already-fixed: base display:none at 571 precedes the <768px override at 610-612 (same specificity, later source wins → trigger shows on mobile); all cited line refs exact; desktop-only audience makes it polish regardless.

<details><summary>independent re-probe</summary>

```
grep -n 'int-mobile-filter-btn' src/styles/internal.css  →  then Read internal.css lines 560-624 (fresh, not trusting finder's sed output)
```

```
grep: 571:.int-mobile-filter-btn {  | 610:  .int-mobile-filter-btn {  | 850:.int-mobile-filter-btn:hover {  | 854:.int-mobile-filter-btn-count {
Read: line 567-570 = fix comment ("MUST precede the <768px @media override below: equal specificity (0,1,0) means later source order wins ... C57"); line 571 base rule `.int-mobile-filter-btn { display: none; ... }`; line 588 `@media (max-width: 767px) {`; lines 610-612 override `.int-mobile-filter-btn { display: inline-flex; }`.
```

</details>

---

#### `FP4-P1b-checkbox-a11y` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** The `.int-check input { display:none }` keyboard/SR-inaccessibility claim (frontend-ux-review 3.2) is STALE: inputs now use an sr-only clip pattern that keeps them focusable and in the AX tree, with a focus-visible outline — matching the rung8/FP1 '1x1px checkbox is the correct SR pattern' verdict.

**Where.** src/styles/internal.css:222-231 (.int-check input sr-only clip); :232-235 (:focus-visible outline)

**Probe.**
```
sed -n '219,235p' src/styles/internal.css
```

**Raw output.**
```
219-221 comment: 'sr-only clip: visually hide the checkbox input but keep it focusable and in the accessibility tree (display:none / visibility:hidden would drop it from both).'\n222:.int-check input { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; }\n232:.int-check input:focus-visible + .int-check-box { outline:2px solid var(--color-esy-green); outline-offset:2px; }
```

**Notes.** No `display:none` on the input anymore; the finding's premise no longer holds. No a11y mandate for this ~3-15 user invite-only desktop tool anyway. Drop from shelf.

**Adversarial verify → HOLDS.** Independent Read + grep confirm the sr-only clip + :focus-visible outline at the cited lines (222-231, 232-235); frontend-ux-review 3.2 display:none claim is genuinely stale/fixed.

<details><summary>independent re-probe</summary>

```
Read src/styles/internal.css lines 205-259 + grep -n "display:none\|display: none" src/styles/internal.css
```

```
208 .int-check { display: flex; ...; position: relative; }
219 /* sr-only clip: visually hide the checkbox input but keep it focusable and in
220    the accessibility tree (display:none / visibility:hidden would drop it from
221    both). The visible affordance is the adjacent .int-check-box span. */
222 .int-check input {
223   position: absolute;
224   width: 1px; height: 1px;
225   padding: 0; margin: -1px;
226   overflow: hidden;
227   clip: rect(0 0 0 0);
228   clip-path: inset(50%);
229   white-space: nowrap;
230   border: 0;
231 }
232 .int-check input:focus-visible + .int-check-box {
233   outline: 2px solid var(--color-esy-green);
234   outline-offset: 2px;
235 }
--- grep: no `.int-check input { display:none }`; the only match near this rule is the comment at line 220 explaining they avoid display:none. Other display:none hits are unrelated (.int-filter-body[hidden]:207, media-query rules :572/:590/:597/:607/:662/:686).
```

</details>

---

#### `FP4-P1c-sort-noop` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** The 'Sort dropdown is a no-op' claim (frontend-ux-review 3.3) is ALREADY FIXED end-to-end (label C58): SearchPage passes sortBy into useLessonSearch, which puts it in the React-Query key and forwards it as the RPC `order_by`, and the search_lessons RPC has a real conditional ORDER BY on title/modified/relevance.

**Where.** src/pages/SearchPage.tsx:127 (sortBy:viewState.sortBy) & :288-290 (onSortChange); src/hooks/useLessonSearch.ts:108 (queryKey incl. sortBy) & :148 (order_by:sortBy); supabase/migrations/20260704000000_search_lessons_add_main_ingredients.sql:102 (sort_key) & :312-318 (ORDER BY)

**Probe.**
```
sed -n '107,167p' src/hooks/useLessonSearch.ts ; grep -n 'sort_key\|ORDER BY\|DESC\|ASC' supabase/migrations/20260704000000_search_lessons_add_main_ingredients.sql
```

**Raw output.**
```
useLessonSearch.ts:108 queryKey: ['lesson-search', SEARCH_RPC_NAME, filters, sortBy, pageSize]\n:148 order_by: sortBy,\nmigration:102 sort_key text := CASE WHEN order_by IN ('title','modified') THEN order_by ELSE 'relevance' END;\nmigration:312 ORDER BY\n:313 CASE WHEN sort_key='relevance' THEN sub.rank END DESC NULLS LAST,\n:315 CASE WHEN sort_key='title' THEN sub.title END ASC NULLS LAST,\n:316 CASE WHEN sort_key='modified' THEN sub.updated_at END DESC NULLS LAST
```

**Notes.** Because sortBy is in the query key (line 108), changing the dropdown restarts the infinite query at page 0 and re-orders. FP1 already NOT-reproduced this live; code now confirms the full wiring. Drop from shelf.

**Adversarial verify → HOLDS.** Reproduces cleanly at all 4 layers incl. live PROD RPC; only drift is finder's SearchPage cite :127 vs actual :128 (immaterial). Sort dropdown is genuinely wired end-to-end; shelf claim is already-fixed as stated.

<details><summary>independent re-probe</summary>

```
Read src/pages/SearchPage.tsx:115-139 + grep -n 'onSortChange|sortBy' src/pages/SearchPage.tsx ; Read src/hooks/useLessonSearch.ts:95-169 ; grep -n 'sort_key|ORDER BY|order_by|DESC|ASC|CASE' supabase/migrations/20260704000000_search_lessons_add_main_ingredients.sql ; live PROD: SELECT substring(pg_get_functiondef ...) for sort_key line + final ORDER BY of public.search_lessons
```

```
SearchPage.tsx:128 `sortBy: viewState.sortBy,` in useLessonSearch({...}); :288-289 `onSortChange={(sort) => setViewState({ sortBy: sort as ViewState['sortBy'], currentPage: 1 })`. useLessonSearch.ts:108 `queryKey: ['lesson-search', SEARCH_RPC_NAME, filters, sortBy, pageSize],`; :148 `order_by: sortBy,`. Migration :102 `sort_key text := CASE WHEN order_by IN ('title', 'modified') THEN order_by ELSE 'relevance' END;`; :312-318 ORDER BY CASE WHEN sort_key='relevance' THEN sub.rank END DESC NULLS LAST, ... sub.title END ASC ..., sub.updated_at END DESC ..., sub.title ASC, sub.lesson_id ASC. Live PROD pg_get_functiondef returned IDENTICAL sort_key line and ORDER BY block, confirming deployed function (not just migration file) has real conditional sort.
```

</details>

---

#### `FP4-P1d-false-no-matches` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** The 'every search flashes false No matches' claim (frontend-ux-review 3.5) is ALREADY FIXED (label C59): useLessonSearch sets placeholderData:keepPreviousData and SearchPage branches on isPending to render a skeleton, so cold load shows a skeleton and refetches keep prior rows instead of emptying to IntEmptyState.

**Where.** src/hooks/useLessonSearch.ts:1 (import keepPreviousData) & :167 (placeholderData:keepPreviousData); src/pages/SearchPage.tsx:346-351 (isPending -> IntListSkeleton) & :132 (enabled:hydrated gate)

**Probe.**
```
grep -n 'keepPreviousData\|placeholderData' src/hooks/useLessonSearch.ts ; sed -n '346,362p' src/pages/SearchPage.tsx
```

**Raw output.**
```
useLessonSearch.ts:1 import { keepPreviousData, useInfiniteQuery } ...\n:167 placeholderData: keepPreviousData,\nSearchPage.tsx:347 (isPending ? (\n:351   <IntListSkeleton />\n:352 ) : lessons.length === 0 ? (\n:353   <IntEmptyState title={hasQuery||activeFilterCount>0 ? 'No matches' : 'No results'} ...
```

**Notes.** Also W1c hydration gate (enabled:hydrated) prevents a default empty-filter RPC flashing before URL->store applies. FP1 already NOT-reproduced live; code confirms. Drop from shelf. All four 2026-06-12 'broken public P1s' (mobile/a11y/sort/false-no-matches) are now resolved — MEMORY.md 'Open hygiene' line listing them can be closed.

**Adversarial verify → HOLDS.** Independent Read/grep reproduces every cited line verbatim (hook import :1, placeholderData :167; SearchPage isPending :120, enabled:hydrated :132, isPending->IntListSkeleton :347-351 gating before the IntEmptyState 'No matches' branch :352); C59 fix is real and already-fixed as claimed.

<details><summary>independent re-probe</summary>

```
grep -n 'keepPreviousData\|placeholderData' src/hooks/useLessonSearch.ts ; Read SearchPage.tsx:320-380 ; grep -n 'isPending\|enabled\|hydrated' src/pages/SearchPage.tsx ; grep -n 'enabled\|isPending' src/hooks/useLessonSearch.ts
```

```
useLessonSearch.ts:1: import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'; | :167: placeholderData: keepPreviousData,  ||  SearchPage.tsx:120 isPending (destructured from hook) | :132 enabled: hydrated | :346 {(!isError || lessons.length > 0) && | :347 (isPending ? ( | :348-351 // C59: cold load (no cached/placeholder data) — show the skeleton, never a false "No matches". With keepPreviousData a refetch keeps the prior rows instead of reaching this branch. | :351 <IntListSkeleton /> | :352 ) : lessons.length === 0 ? ( <IntEmptyState title=...'No matches'... />  ||  useLessonSearch.ts:164 // flashing a false "No matches". `isPending` then stays true ONLY on cold
```

</details>

---

#### `FP4-DOC-cleanup-residual` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** The docs-cleanup-audit.md residual is LARGELY RESOLVED: root CLAUDE.md:171 no longer states a hard count, ARCHITECTURE.md carries a stale-counts banner with per-line Oct-2025 qualifiers, AGENTS.md/scripts Algolia ghosts are fixed, and the two 'actively misleading' status docs (F2 phase-8b, F3 concepts) plus the archive dir (F5/F7) now exist under docs/plans/archive/.

**Where.** CLAUDE.md:171; docs/ARCHITECTURE.md:7 (banner),:4,:18,:137; AGENTS.md:18; scripts/CLAUDE.md:21,:160; docs/plans/archive/2026-04-27-phase-8b-execution-status.md & .../2026-05-12-metadata-rebuild-stage1-concepts-execution-status.md

**Probe.**
```
grep -n 'lesson plans with FTS' CLAUDE.md ; sed -n '7p' docs/ARCHITECTURE.md ; grep -n 'sync-algolia' AGENTS.md ; find docs -name '*phase-8b-execution-status*' -o -name '*concepts-execution-status*' ; PROD: SELECT count(*), count(*) FILTER(WHERE retired_at IS NULL) FROM lessons
```

**Raw output.**
```
CLAUDE.md:171 '`lessons` - lesson plans with FTS (row count drifts — query the table, don't trust a number in docs)'  [F1 fixed]\nARCHITECTURE.md:7 '⚠️ Editor's note (Wave 3, 2026-06-21): the production metrics in this document are stale...'  [F1 banner added]\nAGENTS.md:18 '...the legacy Algolia sync-algolia / configure-synonyms scripts were removed.'  [F6 fixed]\nfind -> docs/plans/archive/2026-04-27-phase-8b-execution-status.md ; docs/plans/archive/2026-05-12-...-concepts-execution-status.md  [F2/F3/F5/F7 done]\nPROD lessons: {"total_rows":785,"live_rows":703}
```

**Notes.** TRUE PROD count today = 785 total / 703 live (doc said 788/767 — drifted; ARCHITECTURE.md's literal 1,098 is now qualified everywhere so no longer actively misleading). ONLY trivial residual: scripts/README.md:59-64 documents `npx tsx scripts/test-edge-function.ts` while the npm-scripted path is `scripts/test-edge-functions.mjs` — but F6's premise ('test-edge-function.ts doesn't exist') is now WRONG: that file DOES exist (scripts/test-edge-function.ts, 2.7K), so the command isn't broken, just non-canonical. Not worth a brief. The genuinely-still-stale doc content is ARCHITECTURE.md's pages list + lessonFormat (separate findings below) which docs-cleanup-audit never flagged.

**Adversarial verify → HOLDS.** Every cited line reference reproduces exactly; the two status docs and archive dir exist; PROD live=703/785 confirms the drift the banners now correctly flag instead of asserting — residual is genuinely largely resolved.

<details><summary>independent re-probe</summary>

```
grep -n 'lesson plans with FTS' CLAUDE.md ; sed -n '1,20p' docs/ARCHITECTURE.md ; sed -n '4p;18p;137p' docs/ARCHITECTURE.md ; grep -n 'algolia' AGENTS.md scripts/CLAUDE.md ; ls -la docs/plans/archive/ | grep -E 'phase-8b-execution-status|concepts-execution-status' ; PROD SQL: SELECT count(*) AS total, count(*) FILTER (WHERE retired_at IS NULL) AS live FROM lessons;
```

```
CLAUDE.md:171:- `lessons` - lesson plans with FTS (row count drifts — query the table, don't trust a number in docs) [NO hard count]. ARCHITECTURE.md:7 banner present: "⚠️ Editor's note (Wave 3, 2026-06-21): the production metrics in this document are stale... For live figures, query the database". ARCHITECTURE.md:4 "**Production State** (Oct 2025 baseline — stale, see note below): 1,098 lessons...", :18 "**1,098 lessons** indexed...", :137 "**lessons** (~1,098 rows as of Oct 2025 baseline — see top note)". AGENTS.md:18 "...there is no sync step (the legacy Algolia sync-algolia / configure-synonyms scripts were removed)." scripts/CLAUDE.md:21 "(Legacy removed) Algolia sync and synonyms configuration are no longer used", :160 "Previous Algolia sync and config scripts have been removed." archive listing shows both 2026-04-27-phase-8b-execution-status.md (109.8K) and 2026-05-12-metadata-rebuild-stage1-concepts-execution-status.md (97.2K). PROD: [{"total":785,"live":703}].
```

</details>

---

#### `FP4-SIMP-F1-reviewdetail` — POLISH · effort S · CONFIRMED · already-fixed ★load-bearing

**Claim.** simplification-groundwork F1 (ReviewDetail.tsx 1,451-line monolith + dead ReviewActions/ReviewContent/ReviewDuplicates trio) is ALREADY DONE: ReviewDetail.tsx is now 518 lines and the extracted Review/ components exist; the dead trio is gone.

**Where.** src/pages/ReviewDetail.tsx (518 lines); src/components/Review/ (ReviewMetadataForm.tsx, ReviewDecisionPanel.tsx, ReviewDocPanel.tsx, ReviewSearchPanel.tsx, SubmitterIntentBanner.tsx, TitleMismatchWarning.tsx)

**Probe.**
```
wc -l src/pages/ReviewDetail.tsx ; ls src/components/Review/
```

**Raw output.**
```
518 src/pages/ReviewDetail.tsx\nReview/: GoogleDocEmbed.tsx  ReviewDecisionPanel.tsx  ReviewDocPanel.tsx  ReviewMetadataForm.tsx  ReviewSearchPanel.tsx  SubmitterIntentBanner.tsx  TitleMismatchWarning.tsx  index.ts   (NO ReviewActions/ReviewContent/ReviewDuplicates)
```

**Notes.** This is the W5 ReviewDetail work (MEMORY: Deferred-work campaign W5 #552-556). Also resolves frontend-ux-review 3.8 (same monolith + dead-code finding). Both simplification-F1 and ux-3.8 can be dropped.

**Adversarial verify → HOLDS.** Independent probes reproduce the finding exactly: ReviewDetail.tsx is 518 lines, all six named Review/ components exist, and the dead trio has zero source files and zero references in src — F1 groundwork is done.

<details><summary>independent re-probe</summary>

```
wc -l src/pages/ReviewDetail.tsx ; ls -la src/components/Review/ ; grep -rln "ReviewActions\|ReviewContent\|ReviewDuplicates" src (EXIT status) ; /usr/bin/find src -type f \( -iname 'ReviewActions*' -o -iname 'ReviewContent*' -o -iname 'ReviewDuplicates*' \) ; cat src/components/Review/index.ts
```

```
wc -l → 518. ls src/components/Review/ → GoogleDocEmbed.tsx, GoogleDocEmbed.test.tsx, ReviewDecisionPanel.tsx (17.4K), ReviewDocPanel.tsx (2.8K), ReviewMetadataForm.tsx (18.1K), ReviewSearchPanel.tsx (2.8K), SubmitterIntentBanner.tsx (4.2K), TitleMismatchWarning.tsx (2.2K), index.ts. grep -rln for dead trio → EXIT=1 (no matches). find for ReviewActions*/ReviewContent*/ReviewDuplicates* → no files (empty). index.ts barrel exports the 6 extracted panels + GoogleDocEmbed.
```

</details>

---

#### `FP4-SIMP-F3-admin-dup` — POLISH · effort M · CONFIRMED · still-real

**Claim.** simplification-groundwork F3 (admin pages duplicate a load/filter/paginate state machine) is STILL-REAL but SHRUNK: 3 of the 5 cited pages (AdminAnalytics, AdminDuplicates, AdminDuplicateReview) were removed; the duplication now spans only AdminUsers + AdminInvitations (+AdminUserDetail), and no shared usePaginatedList/useAsyncLoader hook was ever extracted.

**Where.** src/hooks/ (no paginated/list/async hook); src/pages/AdminUsers.tsx:49,:59-60,:75,:653; src/pages/AdminInvitations.tsx; removed pages confirmed absent from src/App.tsx:38-51 routes and src/pages/CLAUDE.md:210-212

**Probe.**
```
ls src/hooks/ | grep -i 'paginat\|list\|async\|loader' ; grep -n 'useState.*page\|totalPages\|useDebounce\|setPage' src/pages/AdminUsers.tsx ; grep -n 'Admin' src/App.tsx
```

**Raw output.**
```
hooks: (no paginated/list/async hook)\nAdminUsers.tsx:49 const debouncedSearch = useDebounce(searchTerm, 300);\n:59 const [page, setPage] = useState(1);\n:60 const [totalPages, setTotalPages] = useState(1);\n:75 setPage(1);  (reset-on-filter)\nApp.tsx routes ONLY: AdminDashboard, AdminUsers, AdminUserDetail, AdminInviteUser, AdminInvitations  (no AdminAnalytics/AdminDuplicates/AdminDuplicateReview)
```

**Notes.** Reduced scope: DRY win is now ~2 list pages, not 5. For a ~3-15 user internal tool this is pure internal-annoyance/polish (works fine, just repeated). OVERLAP: tracker FP-20 ('Internal-admin robustness bundle', line 116) touches the same admin pages but from a robustness/error-handling angle (fast-tab-click wrong rows, empty-data-on-failure), NOT the DRY hook extraction — don't double-count. Don't fold into FP-21 either (FP-21 is permission/debounce/error-boundary trims).

---


---

## Fable independent verification note (2026-07-03, ranking session)

Skeptically re-probed BEFORE ranking, per standing routine (the workflow's adversarial
verify pass is self-verification and was not trusted). 12 claims re-probed with fresh
probes, identifiers copied from source; live DB over docs:

**Confirmed findings (8):** UT/F1 (re-ran the grep: 7 sites; mechanism at logger.ts:46-49),
SE/FP4-SYN-06 (own PROD anti-join with tuples extracted from the two seed migrations:
74 live / 60 unowned / activity row present), AD/F1 (log-only catch + emptyMessage
re-read), SE/FP4-SP-01 (full code re-trace: replace-onto-lesson-entry + navigate(-1) +
hydrateUrlState full-replace — bug real, NOT limited to the 300ms window), DB/FP4-DB-01
(PROD: both convalidated=false, 0 active / 7 retired violators each, allowed vocab parsed
from live constraint defs), DB/FP4-DB-02 (PROD: 65 active blank / 703), OV/FP4-SIMP-F5-cors
(3 edge fns carry own origin logic beside _shared/cors.ts), plus for Brief 5 accuracy:
metadata JSONB has ZERO `summary` keys library-wide and all 65 blanks have content_text
>200 chars.

**Already-fixed claims (5):** METADATA_KEYS removal (grep: only the documenting comment),
ReviewDetail split (518 lines + extracted Review/ components on disk), sort no-op fixed
(order_by: sortBy at useLessonSearch.ts:148), false-no-matches fixed (placeholderData:
keepPreviousData + isPending branch), permalink trio fixed (flush() at SearchPage.tsx:209,
setQueryData :205, state propagation in useUrlSync).

**Verdict: 12/12 HOLD. 0 kills, 0 downgrades.** The "0 hypotheses" smell resolved benignly
(design proposals and no-action confirmations were classified as confirmed findings, not
forced into fake certainty). Hand-back accepted as the FP4 ranking basis.

**Owner decisions (same session, via explicit options):** all four recommended briefs ship
(admin error honesty / synonym seed safety net / close-lesson fix / small-stuff cleanup);
summary backfill APPROVED with extract-from-lesson-text-first + owner review (+ fix the
"---" title); VALIDATE cleanup PULLED IN as a sixth brief. Everything else stays shelved.
Briefs: `docs/plans/fp4-briefs/`.
