# FP2 Live Walkthrough Script — public search + teacher/reviewer sessions

**Written:** 2026-07-03, overnight (Fable), for the morning FP2 sessions with the owner.
**Two sessions, ~45 minutes each.** Session 1 = the public search experience (no login).
Session 2 = the teacher/reviewer flow (test accounts, never production data).
**Sources:** ranked backlog + owner-decision list in `2026-07-03-frontend-polish-tracker.md`;
audit detail in `docs/plans/fp1-audit/` (facets deep-dive, assumptions review, shelf re-verify,
error/loading, mobile+a11y); overnight scope in `2026-07-03-brief-fp-overnight.md`.

---

## How to use this doc

- **You (the owner) drive the browser and narrate.** Say out loud what you expect, what you
  see, and anything that confuses you — confusion is the most valuable data these sessions
  produce. Going off-script is encouraged; Fable logs everything and steers back.
- Every step says **Do** (a concrete action), **Why** (which finding or decision it exercises),
  and **What you should see** — plus what to say if it looks different.
- Steps marked **(optional)** can be skipped if a session runs long.
- Numbers in this script were measured the night of 2026-07-03. Small drift by morning is
  normal; being off by 30× is not — that's the bug.
- Nothing in these sessions touches production data. Session 2 runs against the throwaway
  test database with throwaway accounts; Fable restores its baseline afterward.
- The goal is to leave with the **decision-capture checklist** (last section) filled in.

---

## Part 0 — What changed overnight (read this before the sessions)

While you slept, an autonomous session worked the frontend-polish backlog under the rules you
locked before bed (your decisions D1–D3 were followed, nothing touched production, and every
behavior-changing or database-touching change was left OPEN for you).

> **Reconciled at run end (~4:20am ET)** — this table now reflects the final overnight state;
> the tracker's "Morning handoff (overnight run)" section is the authoritative ledger with
> shas and the full gate checklists.

### Already merged (no action needed)

- **#581** — stopped a small daily bill: a scheduled nightly health-check was still calling
  the retired OpenAI-based embedding function every day, paying for an API nobody uses
  anymore. That call is gone.
- **#587** — the dead-code sweep (58 files, ~2,400 lines, incl. the wasted per-visit
  "connection test" request) and **#592** — its CSS follow-up (−952 lines, stylesheet −21%).
- **#588** — Admin Analytics retired per your decision D3 (page, nav, charting library).
- **#589** — docs hygiene (dead Algolia instructions, archive-policy table).

### Open and waiting on you

| PR | What it is, in plain words | What you do |
|---|---|---|
| **#582** | Deletes the two retired "embedding" server functions from the codebase (the machinery behind the old duplicate-detection, replaced in T4b). The copies still running on Supabase's servers are NOT deleted — that's your call. | Review + merge; then approve/run the **hosted deletions** (see gates below) |
| **#583** | Removes a dead debug path from the submission-processing function — its last reference to the old OpenAI key. Merging triggers a redeploy of that server function. | Review + merge; approve the edge redeploy |
| **#584** (draft) | A database migration dropping one orphaned database function left over from the old duplicate system. Rehearsed locally and verified on the test database; rollback file included. | Review + merge; approve the production migration gate |
| **#585** | Fixes the broken "sign in and we'll submit your lesson" promise (FP-03) and the sign-in pop-up's solid-black backdrop (FP-04a). **Has two design questions for you — DQ-1 and DQ-2 — demoed live in Session 2.** | Watch the Session 2 demo, answer DQ-1/DQ-2, then merge |
| **#586** | Stops the profile page from throwing away your half-typed edits whenever a background account event fires (FP-06). One small tradeoff to bless (Session 2, step 5). | Bless the tradeoff, then merge |
| **#590** (draft) | The FP-02 theme-label data fix: ~74 lessons invisible to the Thematic filter get their labels normalized; verified end-to-end on the test database. **Pairs with Session 1, step 6.** | Review; run the PROD pre-probes in its body; **merge BEFORE #584**; approve the production migration gate |
| **#591** | Honest "something went wrong — Retry" cards on six screens that used to claim emptiness or denied access on a failed load (FP-05/07). Survived four review rounds. | Session 2 demos; answer its DQ-2; merge |
| **#593** | True filter-count badges (your decision **D1-b**): numbers now count the whole library, Grade finally shows counts. **Session 1, steps 4–5 demo it; four presentation questions attached.** | Session 1 demo, answer the questions, merge |
| **#594** | Lesson permalinks (your decision **D2**): every lesson gets a shareable address + a Copy-link button. **Session 1, step 9.** One deploy-preview smoke owed (paste a permalink in a private window). | Session 1 demo, confirm copy-link behavior, merge |
| **#595** | Reviewer quality-of-life: queue opens on Pending; a hint when a resubmitted doc's title changed; approved cards stop showing last round's revision ask. | Session 2 demos; merge |

### The gates in plain language (your morning to-do, besides the sessions)

1. **Merges to review:** #585/#586/#591/#595 after their Session 2 demos; #593/#594 after
   Session 1; #582/#583 whenever you're ready; #590 then #584 (that order — see the handoff's
   migration-ordering note).
2. **Production migration approvals** (the GitHub "migrate-production" button): #590's
   theme-label data fix (run its read-only PROD pre-probes first), then #584's
   orphan-function drop (rebase it onto main after #590 merges).
3. **Hosted server-function deletions** (after #582 merges): delete `generate-embeddings` and
   `generate-gemini-embeddings` from both the production and test Supabase projects. #582's
   description has the exact commands **and a warning about a "resurrection hazard"** — check
   for stale queued deploy runs first. Fable walks you through it.
4. **Optional:** once #582 + #583 are both in, the `OPENAI_API_KEY` secret on the server
   functions has zero remaining users and can be removed.

Two small awareness items from the night (no action needed from you): the test suite for
database permissions has 2 pre-existing failures on main (unrelated to overnight work, flagged
for a future session), and #584's description documents a typing quirk in a generated file
that future code needs to respect.

---

## Session 1 — The public search experience (~45 min)

**Setup:** open the live site — <https://esynyc-lessonlibrary-v2.netlify.app> — in your normal
browser, signed out. This is exactly what a teacher without an account sees. Fable follows
along and takes notes; you narrate.

### 1. The truth anchor: the total count

- **Do:** load the search page with no search and no filters. Read the toolbar's total aloud
  (something like "703 lessons").
- **Why:** that number comes from the database and IS accurate. Keep it in mind — everything
  in the next two steps gets compared against it.
- **What you should see:** a stable three-digit total. *If the total itself looks wrong or
  flickers, say so — that would be new information, not a known bug.*

### 2. The filter numbers lie (FP-01 — your lead L1, confirmed)

- **Do:** open the filter sidebar. With zero filters applied, read aloud the numbers next to
  **Winter**, **Spring**, **Indoor**, and **Cooking**. Then scroll the results down two or
  three screenfuls and read the same four numbers again.
- **Why:** you reported "the counts are definitely not accurate." The audit confirmed it and
  found the cause: the numbers only count the ~20 lessons the page has downloaded so far, not
  the whole library. True values are roughly Winter **324**, Spring **268**, Indoor **417**,
  Cooking **394** — the badges will likely show 9–11 each, then *grow as you scroll*.
- **What you should see:** absurdly small numbers that inflate as you scroll, while the
  toolbar insists on ~703. **You already picked the fix before bed (decision D1: download all
  lessons' filter fields once and count them truthfully) — that is NOT up for re-litigation.**
  This step is to settle four *presentation* details while you look at the real thing —
  they're steps 3–5 and the first block of the checklist. *If the numbers look RIGHT, the
  overnight run shipped the fix and it got merged — tell Fable, who'll confirm the build and
  turn steps 3–5 into "verify the shipped behavior" instead.*

### 3. Grade pills have no numbers at all (FP-01 sub-decision)

- **Do:** look at the Grade Level pills at the top of the sidebar.
- **Why:** grade counts are computed but never displayed — the pills render blank. Grade has
  lived happily without numbers this whole time.
- **What you should see:** pills with no counts. **Decision to capture:** when the fix ships,
  should grades get numbers like everything else, or stay clean pills?

### 4. What should the number next to an UNCHECKED box mean? (FP-01 sub-decision)

- **Do:** check **Garden** under Activity Type. Now read the number next to the *unchecked*
  **Cooking** box. Then check Cooking too, and watch the result total.
- **Why:** within one category, checking more boxes **widens** results (Garden OR Cooking).
  But today's badge shows a tiny number (the overlap within loaded rows) — you read
  "Cooking (3)", click it, and get ~600 results. The standard convention in faceted search:
  a category's own badges ignore that category's selections — the number answers "how many
  lessons have this trait (given all my OTHER filters)?"
- **What you should see:** a nonsense-small Cooking badge, then the total jumping UP when you
  check it. **Decision to capture:** adopt the standard convention? (Fable recommends yes —
  it's what the fix will do unless you object.)

### 5. Location's three boxes and the hidden "Both" (FP-18 + a counting detail)

- **Do:** open the **Location** filter. Look at the three checkboxes: Indoor, Outdoor, Both.
- **Why:** "Both" is a storage value that leaked into the UI. The search already does the
  right thing (checking Indoor also matches "Both" lessons), but the presentation makes you
  think about it. Proposal: show just **two** checkboxes — "Indoor-friendly" and
  "Outdoor-friendly" — and stop exposing "Both". No data changes; presentation only.
  Related counting detail for the badge fix: the Indoor badge should count indoor+both
  lessons (~417 on the live site), matching what clicking actually returns.
- **What you should see:** the current three boxes. **Decisions to capture:** the two-checkbox
  presentation (FP-18), and "Indoor badge counts indoor+both" (should feel obvious once seen).

### 6. Ten percent of the library is invisible to the Thematic filter (FP-02)

- **Do:** open **Thematic Categories** and click **Seed to Table**. Read the result total
  aloud and note it down.
- **Why:** ~74 live lessons still carry old machine-style theme labels (`seed-to-table`
  instead of "Seed to Table"). The filter matches labels *exactly*, so those lessons never
  appear under any theme — silently missing from theme browsing, ~10% of the library. The fix
  is a one-time, rehearsed data cleanup + a guard so it can't drift back.
- **What you should see:** a number in the high 300s. About **29 more** "Seed to Table"
  lessons exist that this filter cannot see. Fable can pull up one affected lesson by name
  (from a read-only lookup) and show that no theme filter finds it.
- **Decision to capture:** approve the FP-02 migration's production apply (PR number from
  Part 0 reconciliation — if the PR didn't open overnight, it's the next fix-wave's first
  item). **Nice payoff:** after the apply, re-click "Seed to Table" and watch the count rise
  by ~29 — a before/after you can see in one sitting.

### 7. The lesson drawer shows raw machine values (FP-16)

- **Do:** click any lesson to open its side panel. Find the **Cooking Methods** row and read
  it aloud. Also glance at Cultural Heritage — some lessons show both a specific value and
  its parent ("Chinese" AND "Asian").
- **Why:** the drawer prints stored values verbatim: `basic-prep`, `stovetop` instead of
  "Basic prep", "Stovetop"; and 56 lessons stack parent+child heritage tags.
- **What you should see:** kebab-case machine labels on the public site. **Decision to
  capture:** map values through friendly display labels + collapse heritage chains to the
  most specific tag (rides along with the FP-02 wave)?

### 8. A lesson has no address (D2 — you said YES; confirm the shape)

- **Do:** with a lesson's drawer open, copy the URL from the address bar, open a new tab, and
  paste it.
- **Why:** search state (query, filters, sort) IS in the URL — but the open lesson isn't. Your
  colleague gets your *search*, not your *lesson*. Today the only way to share one lesson is
  the Google Doc link, which bypasses the library. You decided **YES** to permalinks (D2)
  before bed; the build may already be open as a PR.
- **What you should see:** the new tab restores your filters but no drawer opens.
  **Decision to capture (UX detail only):** a visible **"Copy link" button in the drawer
  header** is the proposed affordance — confirm that's what you want, or describe what you'd
  prefer (e.g. just the address bar updating silently).

### 9. The Cook/Grow badge can contradict the filter (FP-17)

- **Do:** filter Activity Type = **Cooking**. Scan the result cards' little badges (Cook /
  Grow / Cook + Grow / Academic). See if any card says something other than Cook.
- **Why:** the badge is computed from a lesson's *skills tags*, not from the Activity Type
  field the filter uses. Post-cleanup they usually agree, so you may not catch one live — but
  the mechanism allows a "Cooking"-filtered lesson to wear an "Academic" badge. Also: "Craft"
  activity lessons have no badge of their own at all.
- **What you should see:** probably all Cook/Cook + Grow badges; the point is the two parallel
  definitions. **Decision to capture:** derive the badge from the Activity Type field (the
  filterable truth), falling back to skills only when it's empty?

### 10. The filter roster — three questions for you (assumptions review §1a)

- **Do:** read the sidebar top to bottom, slowly, as if you were a teacher planning next week.
  Narrate the order you'd *want* things in. Then open **Cooking Methods** (3 options:
  basic-prep / stovetop / oven).
- **Why:** the audit's philosophy review endorsed the 10-category structure but flagged three
  roster questions only stakeholders can answer. Filters are stakeholder territory by project
  rule — today you record YOUR answer and whether to take it to the curriculum team.
  1. **Does Cooking Methods earn a whole category** for its 3 options?
  2. **Should Main Ingredients be promoted** from reviewer-only metadata to a search filter?
     It's 70 values and arguably the most teacher-intuitive facet of all ("what can I cook
     with the cabbage we harvested?") — today it's only reachable by typing in the search box.
  3. **Is the sidebar order the order teachers reach for?** (Currently: Grade → Activity →
     Location → Theme → Season → Competencies → Heritage → Academic → SEL → Cooking Methods;
     only the first three start expanded.)
- **Tradeoff in plain words:** every category added makes each one easier to overlook; every
  removal makes some rare search impossible without typing.
- **Decisions to capture:** all three (each can be "decide now" or "ask the team").

### 11. Squint test: the light gray text (FP-08)

- **Do:** look at the small gray text on the cards (the grades line), the "No more results to
  load" footer, and the counts in the sidebar. Read them at arm's length.
- **Why:** several text colors measure below the readability standard — for everyone, desktop
  included. The worst case is on the teacher submit form (Session 2, step 4). The fix is
  darkening two or three color tokens; the pages don't change shape.
- **What you should see:** text you have to lean into. **Decision to capture:** approve the
  darkening (it will subtly change how "light" the design feels — that's why you're deciding,
  not just the audit).

### 12. Two small search-page moments (FP-19) *(optional)*

- **Do:** (a) search something narrow (e.g. `kimchi`) so only a handful of results return —
  note the "No more results to load" line under 5 results. (b) Search `tomato` and know that
  behind the scenes the engine also matched synonyms — nothing on screen tells you.
- **Why:** (a) is noise on short result sets; (b) is invisible helpfulness — an "Including
  matches for…" hint would explain surprising-but-correct results.
- **Decision to capture:** want the synonym hint? (The noise fix needs no decision — queued.)

### 13. Dead ends: bad URLs and raw errors (FP-12 / FP-13) *(optional, 1 min)*

- **Do:** type a made-up address: `esynyc-lessonlibrary-v2.netlify.app/nonsense`.
- **Why:** unknown URLs (including stale bookmarks to admin pages deleted in T4b) render a
  **blank page**. Separately, when search itself breaks, the error card prints raw technical
  text with no Retry button.
- **What you should see:** a blank page. No decision needed — both fixes are already in the
  next quick-wins wave; this is so you recognize them and agree they're worth it.

### 14. The deepest belief, written down at last (assumptions review §11)

- **Do:** open any lesson drawer one more time. Notice the only real action: "Open Lesson
  Plan" → Google Docs.
- **Why:** the app's most load-bearing, never-written-down principle is **"we are an index,
  not a host"** — lesson *content* never renders in-app; the library finds lessons, Google
  Docs holds them. Future ideas (in-app previews, PDFs, favorites) quietly violate it, so it
  should be an explicit product principle you've signed, not an accident.
- **Decision to capture:** adopt "index, not host" as a written product principle (one
  paragraph in the docs)?

---

## Session 2 — The teacher & reviewer flow (~45 min)

**Setup (Fable does this before you sit down):**

- These demos run against the **test database** — real corpus copy, throwaway accounts,
  production untouched. Two of the demos use the **preview builds** of overnight PRs #585 and
  #586 (each PR gets its own preview site backed by the test database; Fable pulls the URLs
  from the PRs' checks). If #585/#586 were already merged by morning, everything below works
  on the live site instead — with real accounts, so Fable will say which to use.
- Accounts: `teacher@test.com`, `reviewer@test.com`, `admin@test.com` (password on file —
  throwaway, test-database only).
- Heads-up: the test environment returns **canned document text** on submissions (it has no
  Google credentials) — the flow mechanics are real, the extracted content is fake. That's
  expected; don't report it as a bug.
- Steps 2 creates a test submission; Fable cleans it up and restores the test-database
  baseline at session end (standing rule).

### 1. The sign-in pop-up: black screen vs fixed (FP-04a, decision DQ-2)

- **Do:** on the **live site**, signed out, click **Submit Lesson**, pick "Add a new lesson,"
  paste any Google Doc URL, click Submit → the sign-in pop-up appears. Look at what's behind
  it. Then repeat on **PR #585's preview**.
- **Why:** the pop-up's dimming layer used a style rule that no longer exists in the current
  styling toolkit — the screen behind goes **solid black** on the live site. The fix uses the
  same translucent gray-ink scrim as the app's other panels.
- **What you should see:** live = blackout; preview = you can see the page through the dim.
- **Decision to capture (DQ-2):** keep the light scrim that matches the rest of the app
  (shipped), or ask for a darker one? One-line change either way.

### 2. "Sign in and we'll submit your lesson" — now actually true (FP-03, decision DQ-1)

- **Do:** stay on #585's preview, signed out. Submit a lesson (any shared Google Doc URL),
  and when the sign-in pop-up appears, sign in as `teacher@test.com`.
- **Why:** the pop-up literally promises "sign in and we'll submit your lesson" — and until
  tonight it silently did nothing after sign-in; teachers may have walked away believing they
  submitted. The fix makes the pending submission fire immediately after sign-in.
- **What you should see:** no second Submit click needed — you land on the success screen.
- **Decision to capture (DQ-1):** keep the auto-submit (recommended — it's what the promise
  says, and the URL is still validated on the way through), or would you rather it ask again
  after sign-in? *(Fable notes the created test submission for cleanup.)*

### 3. The New-vs-Update chooser: one line of reassurance (assumptions review §4)

- **Do:** go back to `/submit` and read the two-option chooser as a nervous teacher would:
  "Add a new lesson" vs "Update a lesson that's already in the library."
- **Why:** the audit endorsed keeping the chooser (a right answer pre-links the reviewer's
  merge; a wrong answer costs nothing — duplicate detection and the reviewer catch
  everything). But the teacher doesn't KNOW a wrong answer is free. Cheapest improvement is
  copy, not structure: add "Not sure? Pick either — a reviewer checks everything."
- **Decision to capture:** add that line?

### 4. The most important sentence on the form is the lightest (FP-08 again)

- **Do:** on the new-submission form, find the small gray hint about sharing your doc —
  "Anyone with the link (Viewer)" — and read it at arm's length.
- **Why:** missing that instruction is the #1 cause of failed submissions, and it's rendered
  in the lightest, smallest text on the page. This is the sharpest instance of the
  readability finding from Session 1 step 11 — same one decision covers both.
- **What you should see:** a hint you'd skim past. Feeds the FP-08 checkbox.

### 5. Your profile no longer eats your edits (FP-06 — bless one tradeoff)

- **Do:** sign in as the teacher on **PR #586's preview**, open **Profile**, and start typing
  into a field — no need to save.
- **Why:** until tonight, any background account event (the hourly session refresh, a password
  change) reloaded the page mid-typing and threw your edits away. Fixed by keying the reload
  on *who you are* instead of *the session object*. The tradeoff: if an admin renames you
  while your profile form is open, you won't see it until your next visit.
- **What you should see:** normal editing (the bug fired on a timer, so the demo is really
  about understanding the fix). **Decision to capture:** bless the "no live refresh of an
  open profile form" tradeoff (recommended for a ~15-person tool)?

### 6. Watch a screen lie to you (FP-05) *(optional but persuasive, 3 min)*

- **Do:** Fable will use a developer tool to make one data request fail on purpose, then
  reload your Profile page. Read the "My submissions" card aloud. Then the same trick on the
  reviewer queue.
- **Why:** in older corners of the app, when a fetch fails the page shows a friendly *empty*
  state instead of an error: your profile claims "No submissions yet" (hiding the Resubmit
  button you came for); the reviewer queue claims "No submissions" (a reviewer could shrug
  and walk away while submissions sit unreviewed). Same pattern the T2 walkthrough caught
  elsewhere.
- **What you should see:** confident, friendly, **false** empty states. No decision needed —
  the fix (honest error + Retry) is already queued in the quick-wins wave; seeing the lie is
  what makes that wave's priority make sense.

### 7. The reviewer queue's landing tab (post-launch list item)

- **Do:** sign in as `reviewer@test.com`, open **Review**. Note which tab you land on.
- **Why:** the queue lands on **ALL** instead of **PENDING** — a T2 punch-list item that never
  shipped. Pending items are the reviewer's actual job.
- **What you should see:** the ALL tab active, everything mixed together. **Decision to
  capture:** default to PENDING?

### 8. Approved cards still wear their old revision notes (post-launch list item)

- **Do:** in the queue, find a submission that was approved after previously needing
  revisions (the test data from earlier smokes should have one — Fable will point). Read its
  card.
- **Why:** the old "please revise…" note stays visible under Reviewer notes even after
  approval — cosmetic history confusion for the teacher.
- **What you should see:** an APPROVED card that still scolds. **Decision to capture:** hide
  superseded revision notes on approved cards?

### 9. The renamed-doc resubmit quirk (post-launch list item — explain-only)

- **Do:** nothing to click — Fable explains with the queue open: when a teacher renames their
  Google Doc and resubmits, the review header shows the NEW title but the title field keeps
  the reviewer's round-1 title.
- **Why:** re-running a full resubmit live would burn 10 minutes; the proposed fix is a small
  "title changed on resubmit" hint for the reviewer.
- **Decision to capture:** approve the hint approach?

### 10. One field where reviewers can still type anything (shelf re-verify #9)

- **Do:** open any submission's review screen. Look at the metadata form: almost every field
  is a closed pick-list, but **Cultural Heritage** still lets a reviewer type brand-new
  values.
- **Why:** every other vocabulary was locked down after the big cleanup (typed values are how
  the library drifted in the first place). Heritage was left open — possibly deliberately,
  since your heritage-vocabulary worksheet track is still in flight.
- **What you should see:** the type-anything heritage box. **Decision to capture:** confirm
  it stays open until the heritage vocab locks (and closes then), or close it now?

### 11. Nobody signs the AI's homework (shelf re-verify #19) *(optional)*

- **Do:** on the same review screen, notice the form arrives pre-filled. Nothing says a
  machine drafted those values, which model, or when — the reviewer just sees filled fields.
- **Why:** flagged in June as a transparency gap; downgraded since — you three reviewers know
  the drafts are AI-seeded. Worth one explicit yes/no so it stops resurfacing in audits.
- **Decision to capture:** skip provenance display for good (recommended), or want a small
  "AI draft · model · date" line?

### 12. Analytics is gone — confirm and close D3

- **Do:** sign in as `admin@test.com` on **PR #588's preview** (or the live site if it merged).
  Open the Admin hub. Count the tiles. Then type the old `/admin/analytics` URL directly.
- **Why:** you decided (D3) to retire the Analytics page — growth charts over ~3 accounts,
  carrying the app's only charting library. This is the "show it's gone" confirmation.
- **What you should see:** three tiles (Users, Invitations, Review — no Analytics), and the
  old URL landing on a **blank page** — that blankness is the missing-404-page finding from
  Session 1 step 13, already queued; it will become a proper "page not found" soon.
- **Decision to capture:** D3 confirmed done (and merge #588 if still open).

### 13. Things the queue does NOT have — confirm we keep it that way *(optional, 1 min)*

- **Do:** notice while reviewing: no draft-saving (leave mid-review and your form state is
  gone), no prev/next arrows between submissions (save exits to the queue).
- **Why:** both were June findings, downgraded because the audience is ~3 reviewers with a
  low-volume queue. Recording an explicit "skip" keeps them from re-litigating themselves.
- **Decision to capture:** confirm skip on drafts + batch navigation?

---

## Decision-capture checklist

Fill this in during/right after the sessions — one line each, this doc is the record.
(Fable: transcribe outcomes to the tracker's backlog rows afterward.)

### Session 1 — public search

- [x] **FP-01/counts-semantics:** badge counts ignore their own category's selections (standard convention) — **DEFER to Fable.** Owner wants to discuss options; concern = the OR-within / AND-across behavior plus the "ignore own category" rule may confuse teachers. Live demo confirmed the bug vividly (Cooking badge "7" but checking it added 339: 284→623). **CONSEQUENCE: #593 IS this convention, so #593 is HELD — does NOT merge today; waits for the Fable convention discussion.**
- [x] **FP-01/location-math:** Indoor badge counts indoor+both — **YES.** ⚠️ SCRIPT NUMBER CORRECTED: live search ALREADY folds Both into Indoor (verified `_match_location` helper, migration 20260620000000_search_lessons_w1b.sql:137-161 — Indoor→{indoor,both}), so picking Indoor returns **607**, NOT the script's ~417. (417 = literal-Indoor bucket only; PROD active: Indoor 417 + Outdoor 96 + Both 190 = 703.) Honest Indoor-friendly badge must read 607. Input to #593 finalization.
- [x] **FP-01/zero:** show a real "0" instead of blank when a filter has no matches — **DEFERRED to Fable** (bundled with the counts-semantics convention discussion — it's a presentation detail of how counts display, and may depend on whichever convention Fable+owner land on). Not lost; flag in the Fable counts agenda.
- [x] **FP-01/grades:** Grade pills get counts too — **YES (add counts).** Owner reversed from initial "no." Design caveat owner raised: the pills are very compact, so fitting numbers may need a visual rework of the pill layout — **that layout/design piece deferred to a Fable design session** (functional decision = show the counts; #593 already renders them).
- [x] **FP-02:** kebab-theme data fix — **DONE (already shipped + PROD-applied overnight, PR #590).** Verified live against PROD: Seed to Table = 421 (was ~326), 0 kebab values remaining, valid_thematic_categories CHECK validated. Owner saw the 421 payoff live in Session 1. No approval needed.
- [x] **FP-16:** friendly labels in drawer + collapse parent/child heritage — **YES to both.** Owner confirmed Cooking Methods shows raw kebab (`basic-prep`, `stovetop`). Two refinements caught live: (1) the drawer's heritage field label reads just **"cultural"** — fix as part of the friendly-labels pass; (2) heritage chains can be 3-DEEP (owner saw "Asian, East Asian, Chinese" on one lesson) — collapse rule = drop any tag that is a broader ANCESTOR of another tag present on the same lesson (keep leaves), so that lesson shows just "Chinese." Rides with the FP-02/label wave.
- [x] **D2 (permalink UX):** **CONFIRMED** — owner wants BOTH (as #594 already builds): address bar auto-updates when a lesson drawer opens (deep link) **+** an explicit "Copy link" button in the drawer header. Gap confirmed live (paste drawer URL in new tab → restores the search filter, no lesson opens). ✅ #594 deep-link smoke PASSED (2026-07-03, owner's browser, signed out = fresh-visitor/private-window case): active permalink `/lesson/1BQdTnCz…Fxzww` opened "3 Sisters Tacos" on its own; retired permalink `/lesson/lesson_6c69…7f40` ("Garden Jobs") landed gracefully with no crash. #594 CLEARED TO MERGE.
- [x] **FP-17:** card badge derives from Activity Type field (skills as fallback) — **YES.** Owner saw only Cook / Cook+Grow badges live (consistent with the filter today) but agreed to make the badge derive from the Activity Type field — the same field the filter uses — falling back to skills tags only when Activity Type is empty. Also closes the "Craft activity → no badge at all" gap.
- [x] **Roster Q1:** Cooking Methods keeps its category — **DEFERRED to Fable** (owner wants the whole filter-roster conversation with Fable, not in this session).
- [x] **Roster Q2:** promote Main Ingredients to a search filter — **DEFERRED to Fable** (part of the filter-roster conversation).
- [x] **Roster Q3:** sidebar order — **DEFERRED to Fable** (part of the filter-roster conversation).
- [x] **FP-18:** Location as two checkboxes (Indoor-friendly / Outdoor-friendly), hide "Both" — **YES.** Confirmed PURELY COSMETIC: the search already folds Both correctly (see location-math above), so no functional/search change needed. 0 active lessons have a blank location, so both-boxes-checked == neither-checked == all 703 (owner's OR intuition verified live against PROD).
- [x] **FP-08:** darken the light-gray/amber text tokens app-wide — **YES, approved.** Owner confirmed the light-gray text is hard to read at arm's length (card grades line, "No more results to load" footer, sidebar counts). Covers the worst instance too — the submission-form share-hint (Session 2 step 4). Fix = darken 2–3 color values; no layout change.
- [x] **FP-19:** add the "Including matches for…" synonym hint — **YES.** Owner wants the hint that explains synonym/related-term matches (e.g. searching "tomato" surfacing results that don't literally say "tomato"). The separate "No more results to load" noise-on-short-result-sets fix is queued regardless (no decision needed).
- [x] **Principle:** adopt "we are an index, not a host" as a written product principle — **YES.** Owner adopts it as a signed product principle (one paragraph in docs). Rationale owner bought: cheap insurance against scope-creep (in-app previews / PDFs / favorites all quietly violate it and balloon complexity+cost). FOLLOW-UP: write the paragraph into repo docs (next docs wave).

### Session 2 — teacher & reviewer

- [~] **DQ-1 (PR #585):** keep auto-submit after sign-in — **ANOMALY RESOLVED by investigation; demo re-openable via direct-URL path; owner to decide demo-vs-defer.** Both the LIVE site AND #585's preview gate to sign-in IMMEDIATELY on "Add a new lesson". Background read-only investigation (`scratchpad/fp03-submission-gate-investigation.md`) found why: the script's "fill-first" flow was REMOVED in commit `f218800` (Phase 8b intent-first chooser). Today's chooser gates on the button click via a **handler guard** (`SubmissionPage.tsx:27-34`, `if(!user) setShowAuthModal`), NOT a ProtectedRoute — the `/submit`, `/submit/new`, `/submit/revising` routes are all PUBLIC (`App.tsx:107-109`). **#585's ACTUAL change** = confined to `AuthModal.tsx` (call `onSuccess()` before/without `onClose()` so the form's pending-submit ref survives sign-in) + 2 test files incl. integration test `submit-after-signin.test.tsx`. VERIFIED diff scope = AuthModal.tsx + 2 tests only → small, safe, test-covered. The pending-submit machinery (`NewSubmissionForm.tsx:37,47-52`) already lives on main. **NET:** the FP-03 auto-submit path is UNREACHABLE via the primary "Add a new lesson" button (user is signed in before the URL field renders), but NOT dead code — a signed-out user landing DIRECTLY on `/submit/new` (typed URL / bookmark / refresh / deep link) sees the field, and Submit→sign-in→auto-fire works there. So DQ-1 CAN be demoed via direct `/submit/new` entry. **Open product question for Fable:** is FP-03 worth keeping given the primary flow gates first (narrow real-world reachability)? NOTE: "sign in and we'll submit your lesson" is the PR author's paraphrase, not literal UI text. **RESOLVED:** owner skipped the live demo (accepted the verified-safe, test-covered diff). **DQ-1 = KEEP auto-submit** (strictly-better behavior, no downside, URL still validated on the way through). **#585 CLEARED TO MERGE** (DQ-1 keep + DQ-2 light scrim both settled; also fixes the FP-04a black backdrop). The primary-flow reachability / "let teachers fill first" redesign question is logged as a **Fable product question**, separate from merging #585.
- [x] **DQ-2 (PR #585):** scrim darkness — **LIGHT (as shipped).** Owner reproduced the FP-04a bug on the LIVE site (solid-black backdrop behind the sign-in pop-up) and chose to keep the light-grey scrim ("it's good").
  - ⚠️ **FLOW ANOMALY (for Fable):** on the LIVE site, clicking **"Add a new lesson" opens the sign-in pop-up IMMEDIATELY**, before any Google-Doc-URL entry — contradicts the script's "paste URL → Submit → gate" premise that FP-03/DQ-1 (step 2) is built on. The URL field is never reached signed-out on live. Testing what #585's preview actually does next; capturing the observed behavior for the handoff rather than improvising.
- [x] **Chooser copy:** add "Not sure? Pick either — a reviewer checks everything" — **YES.** Owner agrees it's a good, cheap anxiety-reducer on the New-vs-Update chooser (copy-only, no logic change). Chooser itself is reachable signed-out (it renders before the auth gate).
- [x] **FP-06 tradeoff (PR #586):** no live refresh of an open profile form — **BLESSED.** Owner okays that an admin renaming a user won't reflect in that user's open profile form until their next visit (fine for a ~15-person tool). **#586 CLEARED TO MERGE.**
- [x] **Queue default tab:** land on PENDING — **YES.** Owner confirms the reviewer queue should default to the PENDING tab (reviewer's actual job) instead of ALL. Shipped in #595.
- [x] **Approved cards:** hide superseded revision notes — **YES.** Owner confirms: on an approved card, hide the superseded "please revise…" note so an approved lesson doesn't still look like it's being scolded. Shipped in #595.
- [x] **Resubmit title:** add "title changed on resubmit" reviewer hint — **APPROVED (yes).** Owner approves the small hint that flags when a resubmitted doc's title differs from the reviewer's round-1 title. Shipped in #595. → **#595 fully confirmed, CLEARED TO MERGE.**
- [x] **Heritage field:** **CLOSE IT NOW** (owner decision — reverses the script's "leave open" lean). Make the reviewer Cultural Heritage field a closed pick-list; end reviewer free-text. Owner's rationale: "it ends up a closed list regardless, and I can add values in the DB/code anyway." Confirmed the Stage-1 Heritage Worksheet is still in flight (`docs/plans/heritage-worksheet-form/` — a curriculum-team review of 88 values, recommendations explicitly "starting points, not finished decisions"; no locked vocab exists yet). **BUILD = separate code task (stakeholder/filterDefinitions territory — captured here, not changed).** Implementation notes for Fable: (1) derive the closed list from CURRENT distinct heritage values so no existing lesson is invalidated; (2) worksheet merge/split/drop outcomes apply later via code, not reviewer typing; (3) preserve the existing parent/child hierarchy; (4) reviewers needing a not-yet-listed value ask the maintainer to add it.
- [x] **AI provenance:** **SKIP for good.** Owner confirms no "AI draft · model · date" line needed — the ~3 reviewers already know the metadata drafts are AI-seeded. Closes the recurring audit flag (shelf re-verify #19).
- [x] **D3:** AdminAnalytics retirement confirmed gone — **CONFIRMED DONE.** #588 already merged + live on PROD (commit `853234a`). Admin hub = 3 tiles (Users/Invitations/Review), no Analytics; old `/admin/analytics` lands on a blank page (the missing-404, already queued as FP-12/13). Nothing to merge.
- [x] **Drafts + batch nav:** confirmed skip — **YES (skip both).** Owner confirms no review-draft-saving and no prev/next batch navigation between submissions — appropriate for ~3 reviewers / low-volume queue. Recorded as an explicit "skip" so it stops re-litigating in audits.

### Morning gates (from Part 0 — check off as done)

- [x] #585 merged (DQ-1/DQ-2 answered) — squash `5324cec`
- [x] #586 merged (tradeoff blessed) — squash `ef48ef8`
- [x] #591 merged (FP-05/07 honest errors) — squash `ae0df3e` (hand-resolved UserProfile conflict + stale test-mock fix; CI-green before merge)
- [x] #594 merged (D2 permalinks) — squash `b57b490` (deep-link smoke passed in Session 1)
- [x] #595 merged (reviewer-UX batch) — squash `b0fc09e`
- [ ] **#593 HELD** (facet counts) — do NOT merge; waits on the Fable counts-convention conversation
- [x] #587 merged overnight (dead-code sweep) — `6efb0b5`
- [x] #588 merged overnight (Analytics retirement) — `853234a`
- [x] #582 merged + hosted `generate-embeddings`/`generate-gemini-embeddings` DELETED on PROD+TEST, 0 stale queued runs (overnight)
- [x] #583 merged + process-submission edge redeploy done (v39, 3-signal verified, overnight)
- [x] #584 merged + PROD migration applied (orphan `find_duplicate_pairs()` drop; slot renamed `020000`→`040000`, overnight)
- [x] FP-02 migration **PR #590 merged + PROD-applied overnight** (verified live: Seed to Table 421, 0 kebab, CHECK validated)
- [x] `OPENAI_API_KEY` edge secret removed on both projects (overnight)
- [x] Additional overnight PRs dispositioned: #581 (`b75c985`), #589 (`f8d16fb`), #592 (`27e254c`) all merged overnight — see tracker Morning-handoff
- [x] Docs bundle PR (script + handoff + trackers + kickoff + heritage-worksheet-form/ + rung8-morning-burn/ + src/pages/CLAUDE.md) — **PR #596** (merge on owner's go after CI)
