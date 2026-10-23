# T1 REDESIGN — Handoff to Fable (write a new `taste test` fix brief)

**For:** a fresh Fable design session. **From:** Opus execution session, 2026-07-01.
**Your deliverable:** a NEW self-contained T1 executor brief (for an Opus session to execute), in
the same style as the original brief below, that fixes the `taste test` search problem and clears
the frozen q18 eval gate. This doc is facts-only — the candidate *mechanism* is yours to design;
everything you need to design it (system internals, the exact gate, the measured failure of the
first attempt) is inlined here so you don't have to re-read the codebase to get the facts.

**Why you're being handed this:** the original T1 brief's fix was executed faithfully and **tripped
its STOP condition** — the proposed mechanism was wrong at the tsquery-algebra level. The problem is
still open. You are picking up at "root cause understood, first fix disproven, mechanism undecided."

---

## 1. Where T1 sits (sprint context — binding)

From `docs/plans/2026-07-01-go-live-tracker.md` (the ONLY tracking doc for the go-live sprint):

- **Goal:** basic functionality solid and live for real users, minimum effort.
- **T1 = "Search: `taste test` fix, then search CLOSES."** It is the first track. After T1 merges,
  the search track is done for launch. Tracks after it: **T2** submission→review→publish walkthrough
  WITH the user (produces a UX punch-list + an inventory of every email the flow sends → feeds the
  T3 brief); **T3** auth-only email via Google Workspace SMTP; **T4** corpus dedup (Fable design →
  Sonnet candidates → user adjudicates → Opus ships, retire embeddings); **T5** final smoke → launch.
- **Working model (binding):** *Fable* = design/briefs/adjudication (scarce, rationed hard). *Opus*
  = executes briefs exactly, code + gates only, **halts and reports on any failed assumption instead
  of redesigning**. That halt-and-report is exactly what happened here — so this is now back with you.
- **Session-end protocol** (do this when your brief is written): update the T1 status line + the
  "Last updated" line in the tracker; end your report to the user naming the next step. For this
  handoff the next step after your brief is: *Opus executes the new brief.*
- **Explicitly NOT doing (pre-launch):** C42 engine spike, C162 unaccent, WHERE-DRY refactor,
  semantic-search tier, eslint-10/TS-6 bumps, personalization, embeddings regen. Keep the fix inside
  the existing PG-FTS `search_lessons` machinery. **A phrase-aware fix inside `search_lessons` is IN
  scope; swapping the search engine is NOT.**

**Uncommitted docs floating in the working tree** (were queued to ride the now-dead T1 PR; a fresh
Opus run will re-queue whatever survives): the go-live tracker, the original brief, the modified
`docs/plans/2026-06-29-wave6-search-depth-execution-status.md`, `…/2026-06-29-c42-search-engine-options-notes.md`,
and this handoff. The abandoned branch `fix/search-taste-test-synonym` has no commits — start clean.

---

## 2. The original brief and what it tried (lineage)

Original brief: **`docs/plans/2026-07-01-brief-t1-taste-test-synonym.md`** (still on disk, read it for
the full framing). Its diagnosis and its (disproven) fix:

- **Diagnosis (correct):** C41 (shipped #569, live PROD) made multi-word search **strict AND-of-ORs**.
  `taste test` becomes the tsquery `'tast' & 'test'`. Genuine tasting lessons rarely contain the
  literal word "test", so they're excluded; only **32** lessons match both stems, and that top-10 is
  junk (casual "do a taste test" mentions like Black Bean Dip / Hummus, plus academic "test" lessons
  like Argumentative Writing). Eval predicate **q18 fell 7/10 → 1/10**. The C41 two-pass relax
  correctly does NOT fire (32 ≥ its K_relax=10 threshold) — this is its designed blind spot.
- **Proposed fix (DISPROVEN — do not reuse):** one data-only migration adding a single `oneway`
  synonym row `test → taste`, reasoning that `taste test` would become `'tast' & ( 'test' | 'tast' )`
  and readmit tasting lessons while literal "taste test" mentions still rank-boost.
- **Its out-of-scope list** (mostly still valid, but see §7 for the ONE lift): ranking changes, more
  synonym rows, C162/unaccent, WHERE-block refactors, frontend changes, **eval-gold edits (q18's
  frozen definition is untouched — the fix must clear the bar as-is)**.
- Its verify flow (reuse this — it's good): S3 "faithful TEST-load eval," gate table, bot triage,
  PROD verify. The *process* was sound; only the *mechanism* was wrong.

---

## 3. What Opus executed and measured (the crux — this is new information)

Executed the brief faithfully on TEST (`rxgajgmphciuaqzvwmox`) via the S3 faithful-load flow:
INSERT the exact row → check expander → `npm run eval:search` (target=test) → DELETE + verify. Result:

- **Expander after load:** `expand_search_with_synonyms('taste test')` = `'tast' & ( 'tast' | 'test' )`
  (Postgres normalizes lexemes alphabetically; semantically identical to the brief's predicted form).
- **THE FAILURE — absorption-law collapse.** Because the `'tast'` conjunct's stem *also* sits inside
  the OR-group, `A & (A | B)` reduces to `A`. The whole tsquery collapses to just `'tast'`. Measured:
  - `search_lessons('taste test')` (row loaded) → **total_count 501**
  - `search_lessons('taste')` alone → **total_count 501** — **byte-identical.** The strict-AND
    provided **zero** filtering. (`search_lessons('test')` alone → 503, i.e. the taste∪test union.)
- **Gate result:** q18 went **1/10 → 2/10** satisfied (gate needs **≥7/10** and pass→true). total
  32 → 501. Pass stayed **false**. The top-10 became garden/community lessons ("School and Garden
  Communities" ×2, "Garden Tasks", "Trash Masters") that mention tasting only in the body, ranked by
  pure `ts_rank` of the collapsed `'tast'` query. Even the brief's own PROD proxy (title/summary
  ILIKE '%tast%') was only **2/10** in that top-10 — so the PROD verify step would also have failed.
- Only q18 moved (no collateral), but q18 itself failed decisively → **STOP fired, halted, reverted.**

**The lesson for your redesign:** a oneway synonym whose target stem equals the *other* query word's
stem dissolves C41's strict-AND instead of relaxing it. And more fundamentally: **once you readmit
the ~500 taste lessons, the problem is which 10 rank first — a RANKING problem, not a result-set
problem.** The original brief asserted "It is a result-SET problem, not a ranking problem. Do not
touch the ranking expression." That assertion is now disproven; the result set is trivial to fix, the
ranking is the whole game.

---

## 4. Search system internals (FACTS — verified this session; don't re-derive)

Live definitions are in two migrations (most recent wins):
`supabase/migrations/20260629000000_c41_and_of_ors_term_combination.sql` and
`supabase/migrations/20260629010000_c41_pr_d_two_pass_relax.sql`.

**`expand_search_with_synonyms(text) RETURNS tsquery`** — builds an **AND-of-ORs** tsquery: each
query word becomes an OR-group (word ORed with its synonyms), stop-word-only groups dropped via
`numnode()=0`, survivors combined with `&&` (AND). There's also a PR-D companion
**`expand_search_with_synonyms_or(text)`** = identical but combines groups with `||` (OR) — the loose
fallback.

**`search_lessons(...)`** ranking + matching (this is the lever surface):

```
rank = GREATEST(
    COALESCE(ts_rank(l.search_vector, expanded_tsquery), 0),   -- FTS channel
    COALESCE(similarity(l.title,   search_query), 0),           -- trigram title channel
    COALESCE(similarity(l.summary, search_query), 0) * 0.8      -- trigram summary channel
)
WHERE ( l.search_vector @@ expanded_tsquery              -- FTS match, OR
        OR l.title   % search_query                       -- trigram title match, OR
        OR l.summary % search_query )                     -- trigram summary match
      AND (…active facet filters…)
ORDER BY rank DESC (then tie-breaks incl. l.updated_at)
```

- `l.search_vector` is a stored weighted tsvector (title/summary weighted above body, via `ts_rank`).
- **Two-pass relax (PR D):** `search_lessons` counts the strict-AND result set with the user's active
  filters into `cnt_and`; if `cnt_and < K_relax (=10)` it swaps `expanded_tsquery` to the loose-OR
  companion for the rest of the function. `taste test` = 32 ≥ 10, so relax does **not** fire — hence
  the blind spot. (A candidate direction: is 32-with-junk worse than the relax threshold assumes?)
- There are genuinely **three ranking channels** combined by `GREATEST` — FTS ts_rank, title trigram,
  summary trigram. A fix can move any of them (or add a phrase/proximity term), not just the tsquery.

---

## 5. The frozen eval gate (this is what your brief's fix MUST clear)

- **q18 gold** (`scripts/search-eval/queries.json`, FROZEN — do not edit):
  - query = `taste test`, scoring = **predicate**, threshold = **≥7/10 of top-10**.
  - predicate SQL (verbatim): **`title ILIKE '%tast%' OR summary ILIKE '%tast%'`**.
- **Before-state aggregates on TEST** (`scripts/search-eval/scorecards/test.md`, committed baseline):
  mean recall@10 **0.728**, mean precision@10 **0.800**, predicate pass-rate **14/21**, corpus MRR
  **0.923**, maxTotalCount violations **0**, dup-flood **0**. q18 currently **1/10, pass=false**.
  (q22 sentinel already alarms vs a stale pre-C41 snapshot — unchanged-alarming is fine, NEW movement
  is not. Corpus size 745.)
- **Faithful eval flow** (reuse verbatim in your brief): on TEST via `mcp__supabase-test__execute_sql`,
  apply the candidate change → `npm run eval:search` (defaults to target=test, reads TEST_SUPABASE_URL
  + anon key from `.env`) → revert the change → verify revert. Diff `scorecards/test.md`. Gate =
  q18 flips to ≥7/10 true, predicate pass-rate 14/21→15/21, and **no other per-query row moves**, with
  recall/precision/maxCount/dup-flood all held. For a *migration* mechanism this is clean (data-only,
  reversible). **For a `search_lessons` function change** the "load then revert on TEST" step is a
  `CREATE OR REPLACE` rehearsal — design the brief so the executor rehearses the new function body on
  TEST read-only-ish (it mutates the function, then restores it), same as C41's own PR verification.

---

## 6. Candidate directions (UNMEASURED — exploring/measuring these is your job)

Per the user's instruction this handoff is facts-only: **none of these are pre-measured.** They're a
starting menu; your brief should commit to ONE mechanism *after you've verified it on TEST*. Traps are
flagged because the obvious ideas have already burned us once.

- **Phrase / adjacency (`phraseto_tsquery`, `<->`).** The W6 status doc's own suggested direction.
  **Trap:** genuine tasting lessons do NOT contain the word "test" at all, so `taste <-> test` /
  `phraseto_tsquery('taste test')` matches *fewer* lessons, not the right ones. Adjacency of the
  literal words is not the concept. Verify before trusting — this may fail the same way the synonym did.
- **Collocation → concept mapping.** Treat `taste test` as a known 2-word collocation that maps to
  the tasting *concept* (i.e. rewrite the query to `taste` when the exact bigram is seen), rather than
  ANDing the two stems. Where would this live — a query-preprocess step, a curated phrase table, the
  expander? What's the blast radius on other bigrams? Does it overfit one query?
- **Ranking boost for the tasting signal.** Once the set is the ~500 taste lessons, add a rank term
  that surfaces genuine tasting lessons (e.g. title/summary weight, a phrase-presence boost).
  **Trap (overfitting):** the q18 predicate *is* `title/summary ILIKE '%tast%'`. A boost keyed on
  exactly that expression would pass the gate tautologically — that's gaming the metric, not fixing
  search. If you go ranking-side, justify it as a general ranking improvement (e.g. a real
  phrase/proximity boost, or title/summary weighting that helps a class of queries), and show it
  doesn't regress the other frozen queries.
- **Relax-threshold / two-pass rethink.** Is the K_relax=10 blind spot (32 junky results never
  triggering relax) itself the bug? Would a precision-aware relax (or a different combination for
  2-word non-concept queries) help a class of "phrase-like" queries, not just this one?
- **Curated single-query carve-out.** Lowest-risk, lowest-generality: a targeted rule just for this
  collocation. Weigh against the user's "ship only on measured lift" + "don't overfit the gold" values.

**Whatever you pick, the brief MUST require the executor to verify the mechanism's actual behavior on
TEST (the tsquery it produces AND the measured q18 lift) BEFORE authoring the final migration/function
change.** The first attempt died precisely because the mechanism was reasoned about but never verified.

---

## 7. Constraints for the new brief

- **Keep the frozen gold frozen.** q18's definition is untouched; the fix clears ≥7/10 as-is.
- **Ranking is now IN scope** (the one lift vs. the original brief) — the root cause is ranking, so a
  ranking/phrase change inside `search_lessons` is allowed. Everything else in the original out-of-scope
  list still holds (no engine swap, no unaccent, no WHERE-DRY refactor, no frontend, no gold edits).
- **Ship only on measured lift; move only q18.** Same discipline as the S3 `decay→decomposition`
  migration and the original brief — any other frozen row that moves is a STOP.
- **Data-safety discipline stays:** rehearse on TEST, `npm run check` + `npm run test:run` +
  `npm run test:rls` before push, TEST-DB MCP verify for any migration (re-run after each DB-affecting
  fix-up round), user approves the PROD apply (executor does not self-merge).
- **Write STOP conditions** so the Opus executor halts-and-reports (back to you) instead of improvising
  if the chosen mechanism doesn't clear the gate — exactly as this cycle worked.
- **Deliverable framing:** "search track closes on merge"; T1 PR also carries the floating docs listed
  in §1. Title/structure like the original brief.

## 8. One-paragraph summary for your report back to the user

The `test→taste` synonym fix was disproven on TEST (absorption-law collapse: `taste test` → 501 rows
== `taste` alone; q18 2/10, needs ≥7). Root cause is now understood to be a **ranking/phrase-collocation
problem**, not a result-set problem. Your job: design a new, TEST-verified mechanism (phrase/collocation
or a justified ranking change), write it as an Opus executor brief with STOP conditions, and update the
tracker's T1 status line.
