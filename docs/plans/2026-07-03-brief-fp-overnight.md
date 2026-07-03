# Brief: FP overnight autonomous run (2026-07-03, ~2am–6:45am ET)

**Decided live with the user 2026-07-03 ~1:20am.** Executor: Fable, fresh session, fully
autonomous — the user is asleep. Backlog + evidence merged to main in #580 (`0ed0d5d`):
tracker `docs/plans/2026-07-03-frontend-polish-tracker.md`, reports `docs/plans/fp1-audit/`.

## Paste-ready kickoff (user: paste into a fresh session, then sleep)

> You are Fable, running the FP overnight autonomous execution. Repo:
> /Users/danfeder/cCode/esynyc-lessonsearch-v2. Read
> docs/plans/2026-07-03-brief-fp-overnight.md FIRST — it is binding (scope, owner
> decisions, merge rules, hard PROD rules, stop time). Then the tracker's backlog.
> Work the waves in the brief's order until quota exhaustion or ~6:45am ET, whichever
> first. Ultracode is ON for this session: default every substantive wave-slice to a
> Workflow (executor agents → independent adversarial-verifier agents → your own thin
> main-loop verify before push — the pattern from the workflow-orchestration working
> preference). Keep your own context light: agents write artifacts to disk and return
> one-line statuses; you adjudicate, gate, and commit. End with a morning-handoff
> section appended to the tracker.

## Owner decisions (locked 2026-07-03, do not re-litigate)

- **D1 = option (b):** fix facet counts by fetching all ~703 lessons' facet fields once
  client-side and counting truthfully (current-filter-aware). No new DB function.
- **D2 = YES:** add shareable per-lesson permalinks (route + modal deep-link).
- **D3 = YES:** retire the AdminAnalytics page (route + page + dead nav links).
- **Merge authority:** mechanical, behavior-safe PRs (Wave D deletion, Wave E repo-side
  hygiene) MAY be merged by the session when CI is fully green AND bot review is clean
  after a real 4-surface triage. Behavior-changing PRs (Wave A, FP-01b, permalinks) stay
  OPEN for morning review. ANY PR touching `supabase/migrations/**` or
  `supabase/functions/**` stays OPEN — no exceptions.
- **D5 scope confirmed** (waves below).

## 🔴 Hard rules (violating any of these is a failed night)

1. **PROD is untouchable.** Never approve `migrate-production` or edge-deploy gates; never
   call `mcp__supabase-remote__*` write operations; never `supabase functions delete` on
   any hosted project. PROD applies are USER-ONLY, in the morning.
2. DB work happens on LOCAL (`supabase db reset`) and TEST (CI-applied, MCP-verified,
   read-only probes + marker-disciplined rehearsals only). TEST baseline 763/685/130 +
   zero `1E2EAUTH` markers must be byte-exact at session end if touched.
3. Every PR: `npm run check` + `npm run test:run` green locally BEFORE push; all 4
   bot-review surfaces triaged with rebuttals; investigate every finding.
4. Don't change `filterDefinitions.ts` semantics (categories/options) — D1b changes how
   counts are computed, not what the filters are.
5. Small PRs, one wave-slice each. No scope creep beyond the backlog rows named below.

## Waves, in execution order

1. **E — stop the meter first** (repo-side ops hygiene): the daily paid OpenAI call is
   fired by `.github/workflows/edge-function-smoke.yml` (cron `0 4 * * *`, "Smoke 10 PROD
   edge functions", per-function strategy in `scripts/test-edge-functions.mjs`) — remove
   `generate-embeddings` from that smoke matrix (or the whole embedding leg) rather than
   the whole workflow; also note `process-submission/index.ts` still greps for "openai"
   (likely a dead reference — verify + clean); remove the two caller-less embedding edge functions
   FROM THE REPO + their workflow matrix entries (hosted deletion = morning user gate —
   list them in the handoff); draft (do NOT merge) the orphan-DB-function drop migration.
   Repo-side pieces mergeable on green; migration PR stays open.
2. **D — dead-code deletion** (backlog dead-code rows + D3 Analytics retirement): the
   grep-verified ~2,150 TS/TSX + ~590 CSS lines + removable deps, in 2-3 mechanical PRs.
   Re-verify each deletion target is still unreferenced before deleting (evidence in
   `fp1-audit/audit-overengineering.md`). Mergeable on green + clean bot.
3. **A — quick-win fixes, PRs left open:** the four fail-open empty states get honest
   error + retry (`audit-error-loading.md` P2s); AuthModal backdrop fix + the dead
   submit-after-sign-in promise (`audit-state-bugs.md` FP-03, `audit-mobile-a11y.md`);
   UserProfile edit-clobber on auth events (FP-06).
4. **FP-02 prep, PR left open:** kebab-theme data fix — migration per the t4c pattern
   (snapshot table + guarded wrapped transaction + rollback file; ~74 rows, generated
   from a committed script, ids never hand-typed) + write-site normalization guard in app
   code. LOCAL rehearsal + pre-registered TEST expectations in the PR. PROD apply =
   morning user gate.
5. **Stretch (quota permitting): B-lite, PRs left open:** FP-01b true facet counts (D1b)
   incl. rendering Grade counts; D2 permalinks (route `/lesson/:id` + modal deep-link +
   copy-link affordance).

## Never idle — the work ladder (binding until ~6:45am ET or quota)

Do NOT end the session because the named waves are done. Whenever a wave finishes or you
are waiting on CI, take the next rung. While waiting on CI, use background monitors +
a ScheduleWakeup fallback heartbeat (~20-30 min) so a hung check can't strand the night.

1. The five waves above, in order.
2. **Quality flywheel on your own open PRs** (absorbs unlimited quota usefully): dispatch
   independent reviewer/adversarial-verifier agents against each open PR's diff, triage
   their findings exactly like bot findings (rebut or fix), push fix-ups. Repeat per PR
   until a round comes back clean.
3. The go-live tracker's Post-launch list, frontend/test-side items only: review queue
   default to PENDING tab; "title changed on resubmit" hint; stale revision-note display
   on approved cards; t4b deferral #3 (delete similarity.test dead block + extract
   detect-duplicates scoring into a pure fn with a unit suite — test-side only).
4. The FP1 backlog's P3 tail (grouped rows in the tracker) — smallest first, PRs open.
5. Unit-test deepening for everything you shipped tonight (facet counts, permalink route,
   AuthModal behaviors) beyond the minimum the PRs needed.
6. The small zero-risk docs PR from `fp1-audit/shelf-docs-cleanup.md`.
7. Write the FP2 walkthrough script for the morning: a step-by-step scenario doc for the
   user's public-search + reviewer walkthroughs, seeded with the open owner questions
   (facet-badge presentation, permalink UX, anything the audits flagged "needs live
   eyes").
8. Second-pass discovery, loop-until-dry: one more finder round on surfaces the first
   sweep covered thinly (hooks/, stores/, LessonModal/detail rendering), same evidence
   discipline, findings appended to the backlog — stop after two consecutive dry rounds.

Only after rung 8 runs dry twice may the session close early — and then only with the
full morning handoff written.

## STOP conditions

- Any gate/tooling failure you can't route around cleanly → leave that wave, write it up,
  move to the next.
- Anything that would require a PROD action or a new secret → handoff list, never act.
- A test failure that implicates a design question → PR stays open with the question in
  its description; don't guess.
- ~6:45am ET or quota: stop starting new work, finish/park cleanly.

## Session end (mandatory)

Append "## Morning handoff (overnight run)" to the tracker: per wave — PRs opened/merged
(shas), gates run, what awaits the user (merges to review, PROD gates, hosted edge-fn
deletions), any STOPs. Update the Last-updated line + wave rows. Update the memory index's
frontend-polish line via the memory files.
