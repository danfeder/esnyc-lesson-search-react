# Deferred-Work Roadmap — 2026-06-20

> Project-wide read-only inventory produced by the `deferred-backlog-fanout` workflow (Discover → Normalize → Verify) + the `overnight-review-campaign-recon` pass, both 2026-06-19/20. Obsolescence verified against `main` @ `5a77c27`. Planning artifact — committing it is a follow-on choice. IDs are stable canonical ids (`C##`).

## Executive summary

A project-wide sweep of every deferred / follow-up / "later" item across **50 memory files + 67 plan docs + 38 open GH issues + 15 open PRs + 51 beads + code TODOs + 23 root docs + the 6 overnight-review docs**, each verified against current `main`.

**224 raw items → 169 canonical (deduped) → 116 live · 23 partially-done · 29 obsolete (culled) · 1 unverifiable.**

The obsolescence pass earned its keep twice over:
- **The cull is large and well-grounded.** 29 items are already done or won't-do, each with a cited resolver (every one spot-checked: resolver migrations/commits exist and are ancestors of HEAD). The cull is dominated by (a) the metadata-rebuild/search-modernization close (which resolved or un-gated ~a dozen items) and (b) a wave of tech-debt PRs (#356–#389, Dec 2025) that closed the entire `TECH_DEBT_AUDIT_2025-12.md` list — **that audit doc is now ~stale and should not be mined for fresh work** (see Source-hygiene).
- **It surfaced high-value items the overnight docs missed.** The four that jump the queue are not in the frontend-ux review at all: **C136** (public search throws a `tsquery` syntax error on any query containing `&`), **C133** (`send-email` skips auth for `password-reset`/`role-changed`/`account-status` types — a P1), **C04** (PROD email silently broken for every non-`mail@danfeder.org` recipient across ~7 types — the highest-impact infra item), and **C137** (admin user-delete crashes on a `supabase.sql` misuse).

**Top of the queue (do first):** `C57` mobile filters unreachable · `C59` false "No matches" on every keystroke · `C136` search crashes on `&` · `C04` email delivery broken · `C133` send-email auth-skip. The first three are S-effort, pure-frontend or one small migration, and **public-facing** — the only theme a teacher actually sees.



## Recommended execution order

Sequenced by **user impact × (1/effort) × dependency-order**, hardened by a Codex adversarial pass. Public-facing work leads; DB-gated and refactor work is split out so it doesn't drag the fast wins. Standing gates apply throughout (bottom of section).

### Wave 1 — Public "broken windows" (ship now; highest user impact, mostly S)
> **✅ SHIPPED 2026-06-21** — Theme B, 5 PRs: #522 `19d99b7` · #523 `530b253` · #524 `3c592b1` · #525 `5197069` · #526 `9eb1b6e`. Closed; see `2026-06-20-theme-b-public-ux-execution-status.md`.

The only theme a teacher sees. → its own full `/kickoff-feature` scaffold (Theme B).
- **W1a — pure-frontend** (no migration): `C57` mobile filters · `C59` loading-state/false-no-matches · `C14`/`C79` a11y + keyboard · `C84`/`C69` facet-badge bugs · copy/a11y one-liners (header "· Internal", SR-announcer, dialog name). 1–2 fast PRs.
- **W1b — migration-gated** (RPC + TEST-DB verify): `C136` `&`-in-query crash · `C58` sort no-op (proper) · `C11` ghost-row exclusion + deterministic no-query `ORDER BY` · location "Both"-expansion. One CI migration.
- **W1c — shareable state** (M): `C114`/`C157` URL persistence for search/filter state.

### Wave 2 — Email + Security P1 (high impact / risk)
> **🟢 ACTIVE — kickoff 2026-06-21.** Scaffolded (small-initiative): `2026-06-21-wave2-email-security-execution.md`. **Recon re-scoped 3 items vs. the prose below:** C138 is mostly already fixed (one residual = `detect-duplicates` auth gate); C128's target endpoint is orphaned (deferred pending an arch decision); C133 is worse than filed (7 skip types + a transport trap). Wave-2 PRs: C137 → C133 → C20 → C138. Deferred: C04 (DNS — yours), C128, C130.

- `C04` Resend domain verify + from-address (**external DNS step is yours**; unblocks `C05` rejection UI).
- `C133` send-email auth-skip · `C137` user-delete crash · `C138` CORS+service-role bypass (partial) · `C20` `is_admin()` ambiguous-column sleeper · `C128`/`C130` invitation rate-limit / admin session timeout.

### Wave 3 — Repo/docs hygiene (mechanical, clears the decks) — lightweight single sessions
- `C60` archive ~55–60 closed-initiative docs (now **one** wave — metadata close un-gated it) + closure banners + Algolia-ghost/count fixes (separate tiny PR per Codex).
- `C39` F8 migration-doc 4→2 · `C40` F9-full memory archive-split · `C169` triage 15 stale Dependabot PRs · `C33` edge-deploy post-verify+serialize · `C31` pin Supabase CLI.

### Wave 4 — Data / corpus cleanup (DB-careful; pre-delete FK checklist)
- `C11` ghost "Unknown" rows (also W1b) · `C12` 14 stuck submissions · `C08` remaining ~2 imports · `C01` C2.4 embeddings regen · `C02` PR F cooking_skills/main_ingredients · `C09` dedup third-state · `C07`/`C03` dedup-pipeline.

### Wave 5 — Reviewer/admin features (half-finished; **ReviewDetail decomposition first**, test-first)
ReviewDetail.tsx is a 1475-line monolith shared by frontend-B2 and simplification — decompose **once, behind page-level tests** (Codex), then build on it.
- Decompose → `C107` parallel data-loading → `C111`/`C112`/`C113` Bookmarks/Saved-Searches/Collections UI (**backends already exist** — high leverage) → `C28` analytics rewrite · `C22` assignee · `C74`/`C78` override-view / claim-lock.

### Wave 6 — Search depth + larger features (L; deferred tier)
- `C42` Heavy semantic/hybrid tier · `C41` G2 OR→AND · `C162` unaccent · `C121`/`C122` SSO / 2FA.

### Wave 7 — Tech-debt / simplification (opportunistic filler **between** other gates, not parallel — solo dev)
- `C61` simplification cherry-picks · `C100` RLS test coverage (1 of 15 tables tested) · `C153` overall coverage · the long S/low tech-debt tail (`C15`,`C46`,`C47`,`C51`,`C71`,`C81`,`C85`,`C90`–`C93`,`C103`,`C108`,`C118`,`C124`,`C127`,`C140` …).

### Process / tooling track (F4/F5) — slot after Wave 1, before Wave 5
`C37` F4 executor-brief → `C38` F5 `/exec-session` (F5 after F4). **Do not front-load before W1a** (Codex); adopt once the bigger multi-session scaffolds (B2/Wave 5) are imminent so they're authored with the lighter pattern.

### Standing gates (encode in the campaign status doc)
- **Migration PR** → TEST-DB MCP verification before merge.
- **Edge-function PR** → post-deploy MCP verification (version + `ezbr_sha256` + source grep) — the `complete-review` silent-no-op recurred twice.
- **No refactor without page-level tests first** (esp. ReviewDetail).

### Scaffolding weight
Full `/kickoff-feature` (4-file + status doc): **Theme B (public frontend)** — the flagship. Small initiatives: **Email/Security**, **process-tooling (F4/F5)**. Single-session, no scaffold: **docs-archival**, individual tech-debt PRs. **One master campaign status doc** tracks all themes (`theme | branch/PR | next action | blocker | initiative-doc link | last-verified`); per-initiative status docs only for the full-scaffold themes.



## Live items by category

*116 live items. Effort S/M/L; impact as scored. Sorted impact↑ then effort↑ within each group. The recommended execution order above re-sequences these across categories.*


### Public-facing bugs (21)

| ID | Item | Eff | Impact | Deps | Note |
|----|------|-----|--------|------|------|
| C57 | Mobile filter UI broken (public P1) — Filters button hidden on mobile … | S | high — phone/tablet users (a teacher-fac… | — | Exactly as described in frontend-ux-review.md 3.1. Trivial fix; bundle with C58/C59 + the other one-liners (SR announcer… |
| C59 | Search returns false no-matches (public P1) — no loading state, every … | S | high — users see a false negative on lit… | — | Exactly as described in frontend-ux-review.md 3.5. Two small edits + a test. No commit since 2026-06-12 touched the load… |
| C136 | Search fails with special characters like & in query (tsquery syntax e… | S | high — any public search containing &, \… | touches the shared expand_search_with_sy… | Live and empirically reproduced against TEST DB. Note: smart-search edge fn (zero-result suggestions only) builds its ts… |
| C114 | Add URL persistence for search and filter state (shareable/bookmarkabl… | M | high — filters/query are not in the URL,… | unblocks/shares serialization with C112 … | Highest public-user impact of the assigned set. A near-complete WIP exists off to the side (origin/feat/url-persistence,… |
| C11 | 3 broken 'Unknown' rows — hard-delete candidates | S | med — these are publicly-search-surfaced… | — | Live and slightly under-rated in the original memory: the public-visibility finding bumps it from pure data-hygiene to a… |
| C14 | Improve accessibility — ARIA labels and focus management across forms … | S | med — screen-reader/AT users on submissi… | — | This is the IntFormField slice of broader issue #39, which also covers focus management. The IntFormField-specific fix i… |
| C58 | Sort control is a no-op (public P1) — sortBy never reaches the query | S | med — a visible control that does nothin… | full fix (option b) needs a search_lesso… | Exactly as described in frontend-ux-review.md 3.3. No commit since 2026-06-12 touched useLessonSearch.ts sort handling. |
| C79 | LessonSearchPicker full keyboard navigation (arrow-key, Enter, Escape,… | S | med — keyboard/AT users in the submitter… | — | Component is consumed by both the submitter UPDATE flow and ReviewDetail's dup-review search hatch, so the fix benefits … |
| C89 | Key-name drift in scripts/generate-embeddings.mjs:prepareLessonText (s… | S | med — degrades semantic-embedding qualit… | C87 (same file; --test path is how you'd… | Source doc line 125. Highest user-relevance of this batch (actually degrades a data quality signal vs. pure hygiene). te… |
| C105 | Improve error handling and user feedback in duplicate resolution | S | med — reviewer/admin-facing; resolving a… | — | Partially mitigated by prior parseDbError standardization (bd-481 closed via PR #389) at the service layer, but the item… |
| C75 | Extraction-failure recovery UX — 'couldn't read your Google Doc' with … | M | med — public/teacher-facing. A submitter… | — | Claimed priority 'high (per UX critique)' matches design doc §9 first bullet and :136. Confirmed the parseDbError→Functi… |
| C128 | Add rate limiting to invitation endpoints | M | med — /invitations/accept is a PUBLIC en… | — | Issue #70 spec lists 3 endpoints with specific caps + RateLimit headers. Scope to the public accept endpoint first (real… |
| C133 | [P1] send-email skips auth for password-reset/role-change/account-stat… | M | med — unauthenticated caller with anon k… | Resend domain verification (account-stat… | Adversarial check confirms LIVE and worse than reported — 7 bypass types now, not 4. The 3 submission-* types are invoke… |
| C03 | google-docs-parser dedup Title-case cooking-methods fix | S | low — affects only the internal submissi… | None blocking — self-contained fix in _s… | Pre-existing (lessons stored kebab pre-C2; E2 touched neither parser nor overlap). Belongs to the dedup/submission-pipel… |
| C20 | is_admin() ambiguous-column bug — sleeper on lesson_archive RLS polici… | S | low — doesn't manifest today because fro… | — | Fix: rename param to p_user_id in is_admin(uuid) body or qualify column. Trivial SQL, but verify on TEST DB first and re… |
| C52 | ReviewDashboard Promise.all swallows query errors (profilesResult, sim… | S | low-med — reviewers (internal staff, not… | — | Self-documented follow-up — the fix pattern is literally adjacent in the same file (lessonsResult arm). Lowest-effort it… |
| C69 | activityType slug-vs-label count-badge bug (facet bucket keyed by stor… | S | low — IntSidebar is the Internal/admin r… | activityType label→slug normalization ma… | IMPORTANT correction to the filed description: the bug is real and live, but the cited literals are wrong post-activity_… |
| C87 | scripts/generate-embeddings.mjs --test mode broken (hardcoded deleted … | S | low — dev tooling only; no public/user i… | — | Source doc line 121. 'Blocks embedding regen' framing is accurate but note embeddings regen itself (metadata C2.4) is a … |
| C139 | [P3] Error messages leak stack traces / internal details in edge funct… | S | low — internal-only admin/reviewer/teach… | — | Real but lowest-severity. send-email:255 `details: error.toString()` is the clearest single fix. Note line cited as 228 … |
| C73 | Reviewer flow — restore prior merge target (original_lesson_id / selec… | M | low — internal-only reviewer tool (3-per… | C74 (the canonical_lesson_id RPC-write o… | Source line cited (design doc :163) matches code exactly. The cheaper durable fix is to add canonical_lesson_id writes t… |
| C84 | Tags facet count badge always shows (0) — tags not in search_lessons R… | M | low — the tags filter itself functions c… | search_lessons RPC must add `tags text[]… | Two paths: (a) expose tags in RPC result shape + wire facetCounts (M effort, touches DB pipeline), or (b) suppress the b… |

### Infra / CI / email hygiene (15)

| ID | Item | Eff | Impact | Deps | Note |
|----|------|-----|--------|------|------|
| C04 | Resend domain verification + from-address change (PROD email broken fo… | S | high — every transactional email (invita… | DNS access to esynyc.org to add SPF/DKIM… | Code change is trivial and self-contained; the gating dependency is the human/DNS step. Resolving this unblocks C05 and … |
| C137 | [P2] supabase.sql usage crashes user delete/bulk-delete | S | med — admin-only feature: single-user de… | — | Cleanly reproducible by code inspection — `.sql` is a Kysely/raw-SQL concept, not a supabase-js method. Two occurrences … |
| C33 | deploy-edge-functions.yml — add per-function post-deploy source/hash v… | M | med — when a matrix push-deploy silently… | — | Confirmed recurring 2× (Phase 7c PR #465 + PR E #516), both on complete-review on matrix push. Manual 3-signal MCP verif… |
| C40 | F9-full — Initiative memory-file archive-split for the 3 large journal… | M | med — agent-context hygiene: each on-dem… | — | Design = apply status-doc lifecycle (Current-State header first, dated journal below, archive-split into *-archive.md, ≤… |
| C10 | TEST DB duplicate_group_dismissals RLS policy drift — corrective migra… | S | low — affects only super_admin behavior … | — | Real but cosmetic/low-value. Cheapest item on the list. Could be folded into any unrelated migration PR touching dedup. … |
| C21 | Edge function CORS allow-list excludes branch-deploy URLs (source defa… | S | low — only affects developers/QA hitting… | — | Low priority; env-var workaround in place. If broadening, keep the pattern tight to the project subdomain to avoid openi… |
| C31 | Pin Supabase CLI version across all 3 workflows (backup-production, mi… | S | low — no end-user impact; affects CI rel… | Coordinate with open Dependabot PR #450 … | The 'version: latest' is in all 3 named workflows AND 5 others (e2e.yml, deploy-edge-functions.yml ×2). A complete pin w… |
| C34 | Upgrade to Supabase Pro tier for PITR | S | low — affects disaster-recovery granular… | Owner billing decision (account-level, n… | This is an account/billing action, not a code task — nothing in-repo to implement. Trigger condition (data volume) expli… |
| C72 | Drop dead btree idx_lessons_activity_type (replaced by GIN idx_lessons… | S | low — invisible to users. Dead index byt… | — | Clean, self-contained hygiene PR. Could be batched with any other index/DDL cleanup. The original PR-1 intentionally def… |
| C94 | GRANT ALL ON FUNCTION _flatten_academic_concepts TO anon — over-permis… | S | low — no demonstrated exploit (the funct… | — | Right-sized fix: REVOKE EXECUTE FROM anon (or re-grant only authenticated, service_role). Best done as part of a broader… |
| C97 | Weekly TEST DB sync failures (recurring cron) — TEST drifts from PROD | S | low — TEST-DB only (developer/CI surface… | — | Self-heals once an admin unpauses (runs 2026-06-14 schedule + 2026-06-17 dispatch both SUCCEEDED), but the auto-pause re… |
| C98 | Production backup workflow failures (recurring) | S | low — backup/recovery posture only; no p… | — | All 5 backup runs after 2026-05-18 succeeded — the recurrence has not continued. Both failures are transient infra (setu… |
| C164 | Drop unused JSON-path indexes after search v2 adoption (Phase D) | S | low — index bloat slows writes slightly … | Confirm zero usage via pg_stat_user_inde… | The 'Phase D' framing is obsolete (no search_lessons_v2 was built; the rewrite happened in-place in PR-1), but the under… |
| C64 | reset-test-db.yml no-truncate gap — TEST drifts from PROD | M | low (developer/CI-facing) — but med oper… | Investigating #498/#499/#500 run logs to… | Two intertwined problems: (1) the no-truncate design gap (TEST accumulates), and (2) the cron has been hard-failing for … |
| C169 | Dependabot dependency-update PRs (15 open, stale ~54-68 days) needing … | M | low — internal dev/CI tooling and GitHub… | C31 (Supabase CLI version-pinning hygien… | Triage buckets confirmed by CI-check inspection: (1) Merge-able routine bumps blocked only by ambient lhci Security Audi… |

### Half-finished features (backends exist) (26)

| ID | Item | Eff | Impact | Deps | Note |
|----|------|-----|--------|------|------|
| C05 | Phase 8a — Rejection UI for lesson submissions (gated on Resend) | M | med — reviewers cannot cleanly reject sp… | Hard-gated on C04 (Resend email working)… | This is genuinely partially-done at the schema/template layer (Phase 4 + 7c laid the groundwork deliberately) but the us… |
| C22 | Backend follow-ups: assignee/'Assigned to me' field + RPC | M | med — reviewer workflow lacks claim/assi… | A reviewer-assignment product decision (… | Deferred with no design, as the memo states — confirmed still entirely unbuilt. Scope a design before building (self-cla… |
| C28 | AdminAnalytics lesson-centric KPI rewrite | M | med — the analytics page an org admin ac… | 'Library searches' KPI depends on C27 (s… | Backend follow-up #7 of 8. Note the dependency framing in the original deferral is partly overstated: Avg-review-time an… |
| C41 | Search — deeper G2 server-side OR→AND term combination | M | med — multi-meaningful-term queries (e.g… | C42 | This is the deeper/server-side half of G2; the frontend half (S1) is done. Soft dependency on the eval set / measurement… |
| C45 | CRF surfacing to end users — sidebar filter / lesson-detail badge | M | med — 94% of lessons carry CR framework … | Reviewer UX redesign (Phase 2) per stake… | Verified data exists and is rich (94% populated on PROD) but is structurally walled off from public search (METADATA_CON… |
| C111 | Implement User Personalization — Bookmarks UI (backend table exists, n… | M | med — authenticated teachers/reviewers c… | auth must be present (it is — user_profi… | Part of personalization umbrella #103. Fully live and unbuilt. Smallest of the three personalization items; natural firs… |
| C112 | Implement Saved Searches UI (backend table exists, no UI) | M | med — users must re-construct filter com… | C114 URL/filter serialization logic woul… | Part of personalization umbrella #103. Live and unbuilt. Source estimate 6-8h. Strong dependency-of-convenience on C114'… |
| C157 | Implement URL state for shareable searches (ARCHITECTURE planned clean… | M | med — public users cannot share/bookmark… | Overlaps/duplicates C114 (URL persistenc… | Genuinely unimplemented in current main. Effort M not S because of multi-select + hierarchical heritage filter encoding … |
| C42 | Search — 'Heavy' semantic/hybrid tier (embedding-based search + everyd… | L | med — everyday-vocabulary queries that d… | C41 | Explicitly the 'Heavy' tier vs C41's 'deeper Medium' G2. PR D's data was preserved precisely as this tier's seed materia… |
| C113 | Implement Lesson Collections UI (backend table exists, no UI) | L | med — teachers cannot curate named lesso… | bookmarks UI (C111) shares LessonCard ac… | Part of personalization umbrella #103. Live and unbuilt; largest scope. Public-share feature would be the project's firs… |
| C76 | Repeated-submission detection (user_id + doc_url collision) | S | low — a teacher re-submitting the same d… | — | Explicitly deferred (design doc §9 + :137). Claimed priority 'unspecified' is fair. Small effort if scoped as a soft war… |
| C86 | Per-field model provenance inside ai_draft_metadata | S | low — backend provenance accuracy; invis… | C85 (same file region; bundle a process-… | Source doc line 109. Genuinely not urgent — claim's own gating condition ('not urgent while both prompts use same model'… |
| C24 | Backend follow-up: last_active_at on user_profiles for AdminUsers 'Las… | M | low — admins lack an at-a-glance 'last a… | A definition of 'active' (login vs any a… | Confirmed still unbuilt. Cheapest path may be to surface the EXISTING last_sign_in_at (already exposed by get_user_profi… |
| C25 | Backend follow-up: weekly 'This week' stats RPC for AdminDashboard | M | low — admins would get an at-a-glance 't… | Requires a new migration (Postgres RPC a… | Backend follow-up #4 of 8 from Phase 3. The right rail it was meant to feed was explicitly cut in Slice 4 ('Slice 4 skip… |
| C44 | CRF — JSONB sidecar for practice-level richness (example/evidence span… | M | low — explicitly gated on a UI use case … | C45 (CRF must first be surfaced in publi… | This is a deliberate D9 'forward path without commitment' deferral. Not obsolete — the option remains open and unbuilt. … |
| C74 | Override-tracking admin view for submission reviews | M | low — admin/analytics nicety to surface … | C73 (both want submission_reviews.canoni… | Explicitly out-of-8b-scope follow-up (design doc §6.8 + §9). Claimed priority 'low' is accurate. canonical_lesson_id col… |
| C77 | Past-submissions-first revising flow UX | M | low — teacher-facing UX refinement; curr… | — | Explicitly deferred ('not folded into v1; defer', design doc :139 + §9). Claimed priority 'unspecified' accurate. |
| C78 | Submission 'claim' mechanism to prevent concurrent-edit reviewer colli… | M | low — two reviewers editing the same sub… | — | Explicitly acknowledged-and-deferred (design doc §6.9 + §9). Claimed priority 'unspecified' accurate. The existing Phase… |
| C104 | Add similarity matrix visualization for duplicate groups | M | low — admin/reviewer-only tool (not publ… | C105 (same duplicate-resolution UI surfa… | Internal-only, no public impact. Note the live page (AdminDuplicateReview) is the target, not the partially-built Review… |
| C162 | Consider unaccent dictionary for accent-insensitive search | M | low-to-med — searches for accented dish/… | Changing the search_vector tsvector pipe… | The extension being installed is a red herring — it's available but unused in FTS. Real work = integrate into both the s… |
| C09 | Dedup pipeline rework — third-state (sibling variants), series-skip, c… | L | low — internal reviewer dedup-queue qual… | C07 (a meaningful third-state heuristic … | Genuinely live and entirely unstarted beyond inert columns. This is the larger of the two dedup items and the natural si… |
| C26 | Backend follow-up: lesson view tracking + top_viewed_lessons view for … | L | low — feeds a 'most-viewed lessons' admi… | Needs a view-event capture mechanism (co… | Backend follow-up #5 of 8. 'column/trigger' framing in the raw description understates it — a column on lessons only giv… |
| C27 | Backend follow-up: search query logging + top_search_terms view for Ad… | L | low — feeds a 'top search terms' admin i… | Needs query-capture wired into the publi… | Backend follow-up #6 of 8. Search modernization closing on the same day (2026-06-19) did NOT add query logging — verifie… |
| C43 | Rejected-but-correct S3 single-token synonym pairs — defer to semantic… | L | low — these are correct topical bridges … | Deferred 'Heavy' semantic/embedding sear… | Verified PROD search_synonyms table (columns: id, term, synonyms, synonym_type). Only decay→decomposition present. compo… |
| C115 | Implement Supabase Realtime features for admin/submissions | L | low — internal-only admin/reviewer UX ni… | Decide which tables to expose (lesson_su… | Aspirational enhancement, not a bug. Self-described Medium priority by the issue author. No partial scaffolding exists —… |
| C116 | Implement Supabase Edge Functions / Background Tasks for heavy operati… | L | low — current corpus is ~750 lessons; no… | Identify which op actually times out (no… | Premature optimization at current scale. The issue bundles 3 unrelated capabilities (background tasks / WebSockets / Sup… |

### Data / corpus cleanup (9)

| ID | Item | Eff | Impact | Deps | Note |
|----|------|-----|--------|------|------|
| C65 | Seed Bursts near-duplicate pair — two live lessons for dedup track | S | med — two near-duplicate lessons both su… | The dedup track itself is not yet built … | This is a data observation feeding a future track, not a standalone fix. The two lessons are genuinely different (3-4 vs… |
| C02 | PR F — cooking_skills / main_ingredients 2nd-pass canonicalization (mi… | M | med — these two fields aren't sidebar fi… | Vocab worksheet — DONE (93b929e); the ca… | Vocab-locked, pipeline-proven, only execution remains — the cheapest of the deferred metadata items to pick up. 'Two rou… |
| C12 | 14 stuck submissions — bulk-reject with stale-reason note | S | low — internal reviewer-queue clutter on… | — | Live and essentially unchanged from the memory snapshot (just older + 2 update-type rows cleared). Pure queue hygiene. C… |
| C49 | Compat bridge drop — filter_lesson_format param + lesson_format projec… | S | low — zero user-facing effect; the param… | Timing gate (24-48h post-frontend-deploy… | This is a genuine, never-done cleanup. The original 'timing-gated on frontend deploy' framing is now stale — the gate el… |
| C67 | guyanese / cuban heritage parent — Caribbean↔Latin-American dual-membe… | S | low — a single-parent placement is defen… | filter-UI hierarchy redesign track; curr… | This is genuinely a deferred curriculum/UX decision, not stuck work. Both vocab entries verified to carry exactly one pa… |
| C83 | seasonTiming Zod-vs-DB asymmetry — 17 zod-failing rows in submission_r… | S | low — all 17 rows are on already-approve… | — | Count, distribution, and approved-only placement all match the source doc precisely. Companion finding (lessons.metadata… |
| C117 | Implement soft delete for schools table | S | low — only super_admins can delete schoo… | Add deleted_at column migration + RLS fi… | Smallest, most tractable of the six. Real (verified hard-delete), but low-stakes given super_admin gating + FK protectio… |
| C88 | data/consolidated_lessons.json stale — predates academicConcepts and v… | M | low — local dev seed only; never touches… | — | Source doc line 123. Effort M (not S) because a correct re-export is not a one-liner: must pick PROD vs TEST source, dec… |
| C01 | C2.4 — Full-corpus embeddings regeneration (metadata-inclusive recipe) | L | low/med — public search currently uses s… | Fix embedding-pipeline bugs first ({cont… | This is a genuine deferred future task, never started. The lesson_submissions-vs-lessons embedding vector-space mismatch… |

### Tech debt (37)

| ID | Item | Eff | Impact | Deps | Note |
|----|------|-----|--------|------|------|
| C107 | Optimize ReviewDetail data loading with parallel queries | M | med — reviewer-facing latency on a high-… | — | ~1361-line component (ReviewDetail is the reviewer's primary surface per memory). The win is real but the dependency gra… |
| C140 | [P2] super_admin role mismatch: app types/RLS reference it but DB cons… | M | med — latent dead code path, not a curre… | — | Genuinely live and well-scoped. The decision (add-to-DB vs strip-from-app) is the real work; implementation of either is… |
| C100 | Expand RLS policy tests — coverage for all 15+ tables (only 1 tested) | L | med — RLS is the sole authorization boun… | Stable per-role test fixtures/accounts (… | Claim is real; the '1 tested' figure is slightly understated (functional tests touch ~3 tables) but the 17-table gap is … |
| C06 | Phase 1b Stage 2 — DROP publish_approved_submissions() after observati… | S | low — function is REVOKEd from PUBLIC/an… | Stage 1 REVOKE — DONE (PR #443); Phase 6… | Fully unblocked, no urgency, smallest-effort item. The observation window the plan required is long past; only the user'… |
| C17 | IntDataTable selectable row — add aria-selected | S | low — selection state is already conveye… | — | Explicitly scoped in the design-system memory as a 'tiny follow-up if a screen-reader admin reports a gap' — no such rep… |
| C18 | IntMetadataDiff a11y — wrap △/✓ glyph in aria-hidden | S | low — cosmetic; the words 'differs'/'agr… | — | Smallest item. The legend swatches (lines 119-128) are already text-labeled, so this is the only remaining glyph-only sp… |
| C46 | reAddActivityTypeSuffix shape-tolerant loader — add fixture-driven tes… | S | low — internal reviewer tooling; protect… | Naturally pairs with C47 (same file, sam… | Confirmed live. The current impl (ReviewDetail.tsx:132-150) is shape-tolerant (handles string/'both'/array) but has zero… |
| C47 | validateRequiredFields + fieldProgress unit-test coverage in ReviewDet… | S | low — internal reviewer form; untested v… | Naturally pairs with C46 (same file, sam… | Confirmed live. The 18-field shared ?.length pattern means one well-structured test file (empty-array fixtures per field… |
| C51 | Extract inline binding-intent banner into <BindingIntentBanner /> comp… | S | low — zero user-facing change; pure code… | — | Round-3 bot recommendation captured as deferred cleanup (project_lesson_submission_tier1.md:209). Pure cosmetic refactor… |
| C53 | Combine auto-expand + reset useEffect pair into a single effect | S | low — works correctly today (the round-2… | — | project_lesson_submission_tier1.md:192 calls this 'implementation-detail-of-React' that 'breaks if concurrent features e… |
| C68 | test:rls 2 pre-existing local-env failures (archive_duplicate_lesson) | S | low — local developer-only test noise; d… | — | Could not reproduce the failures directly (no local supabase stack spun up in this read-only pass), so the 'local-env on… |
| C71 | gradeLevel/gradeLevels key mismatch in normalizeMetadata | S | low — zero user-facing impact. The UI's … | — | Genuinely pre-existing and live, but lowest-value of the live items: no runtime effect, just a cast hiding a singular/pl… |
| C81 | DRY auth setup — extract useCurrentUser() hook (SubmissionPage, NewSub… | S | low — no user-visible effect; pure maint… | — | C80's PR-3 work (the original trigger to 'touch all three files') is done WITHOUT extracting the hook, so this stays as … |
| C85 | any types in process-submission/index.ts:136-137 | S | low — internal type-safety only; no runt… | — | Source doc line 107. Best bundled with any future process-submission refactor per kickoff 'a bug fix doesn't need surrou… |
| C90 | Dead inner if in smart-search/index.ts prefix-variant block | S | low — no behavioral effect (no-op); pure… | — | Source doc line 127. Recommend the SAFE removal (option a) unless someone deliberately re-scopes plural-stripping as a s… |
| C91 | Cache per-request search_synonyms fetch in smart-search edge fn (modul… | S | low — public search now uses the search_… | — | Couples naturally with hoisting the byTerm/bidirectionalBySynonym map construction out of expandSearchTerms (the Round-2… |
| C92 | expandSearchTerms unit-test coverage (smart-search/index.ts) | S | low — the function has bidirectional/one… | — | Cleanest to bundle with the dead-inner-if cleanup and the C91 caching/map-hoist work into one smart-search hygiene PR. B… |
| C93 | Partial index WHERE retired_at IS NULL on lessons table | S | low — at ~788 rows a seq-scan of the ret… | — | Proposed DDL: CREATE INDEX IF NOT EXISTS idx_lessons_retired_at_null ON lessons (lesson_id) WHERE retired_at IS NULL. Mu… |
| C106 | Dynamic report file loading for duplicate detection (remove hardcoded … | S | low — affects developer-run batch script… | — | Lowest-value of the set: dev-only scripts, one already archived. The 2025-08-07 report is from the original dedup revamp… |
| C108 | Add database indexes for common filter combinations | S | low — public-search-facing in principle,… | — | Live by ticket status but the LOWEST-merit of the six on technical grounds: comprehensive single-column GIN coverage alr… |
| C118 | Implement caching for school list data | S | low — each fetch is a sub-100ms query of… | Pick mechanism (shared hook / Zustand st… | Genuine duplication, but trivial impact (6 rows). Good cheap-win candidate primarily for code hygiene. React Query is al… |
| C124 | Add retry logic for user profile creation failures | S | low — fallback already sets a usable use… | — | Issue rated Medium. Small, localized change (add createProfileWithRetry helper with exponential backoff per the issue's … |
| C125 | Enhance email validation in user profile creation (non-null assertion … | S | low — Supabase auth users almost always … | — | Issue rated Medium. Same code block as C124 (useEnhancedAuth.ts profile-creation branch) — best done together as one sma… |
| C127 | Optimize N+1 query in user management — DB view for profiles+emails | S | low — internal admin user-list pages onl… | — | Two consumers must both migrate (edge fn user-management + AdminUsers.tsx) for full benefit; frontend AdminUsers also do… |
| C15 | AdminUsers count N+1 — replace ~40 round-trips with GROUP BY RPC | M | low — admin-only page; ~1-2s render at c… | — | head:true means only counts cross the wire (not rows), so the cost is round-trip latency, not payload. Real but not urge… |
| C16 | IntButton forwardRef refactor — for keyboard a11y on bulk-actions trig… | M | low — purely internal component ergonomi… | — | Deferred during PR #437 specifically to avoid cascading changes across 5+ prior slices; that rationale still holds. Only… |
| C36 | Clearing concepts via reviewer UI not possible — design clearing mecha… | M | low — no current user impact (no reviewe… | Gated on / must be designed alongside an… | Pure known-issue / design-flag, not buildable work on its own. Correctly framed as 'flag before concepts editor UI begin… |
| C101 | Add data-testid attributes to key components for E2E reliability | M | low — internal test-reliability only; no… | — | Live and valid but lower-value than its 'high (bd priority 1)' label suggests. Issue #329's proposed file paths are part… |
| C103 | Create type helper utilities for Json field casting | M | low — internal code-quality/type-safety … | — | ~20 cast sites across hooks/pages/services/components. Real but small surface. Two cast families: metadata-shape casts (… |
| C126 | Implement audit table partitioning for user_management_audit scalabili… | M | low — table currently holds 0 rows in PR… | pg_cron (or scheduler) for auto-partitio… | Issue rated Medium for long-term scalability. Given 0 rows in PROD, this is premature optimization — recommend deferring… |
| C130 | Implement session timeout for admin actions | M | low — security hardening for unattended … | — | Issue #63 supplies a useSessionTimeout sketch (30min idle, 5min warning). Lowest-priority security item — Supabase sessi… |
| C132 | Add Zod validation for user management forms | M | low — admin invite/user-edit forms only;… | — | Partial overlap: email validation already non-trivial (regex, not bare '@'), and duplicate-pending detection already exi… |
| C135 | Persistent database-backed rate limiting for password reset | M | low — in-memory Map resets on edge-funct… | new rate_limits table => schema migratio… | Verified LIVE. Ref PR #418 review. Lower priority since Supabase Auth has its own built-in reset rate limiting; this is … |
| C161 | Consider keyset pagination instead of LIMIT/OFFSET | M | low — explicitly gated in ARCHITECTURE.m… | Search RPC is OFFSET-coupled to the fron… | Genuinely unimplemented but low-value at current scale; the source doc itself frames it as conditional/future. Keep as a… |
| C163 | Optional SQL-only search suggestions via synonyms table (replace Edge … | M | low — suggestions already work via smart… | search_synonyms table (exists); expand_s… | Genuinely optional/low-priority as documented. The search-architecture-v2.md doc is itself largely stale (V2 was shipped… |
| C07 | Embedding pipeline mismatch — lesson_submissions vs lessons in differe… | L | low — internal-only: reviewers may see f… | C09 (the dedup rework is the natural pla… | Verdict adversarially confirmed, not trusted. The simple 'two different model names' framing in the memory is now PARTIA… |
| C61 | Simplification 3-wave plan from overnight review | L | low — internal maintainability/refactor … | The artifact's [PR6-CONFLICT] gates (F2 … | This is a multi-item plan, not one task — best split into the artifact's 16 findings (F1-F15). Recommend fanning out: Wa… |

### Process / tooling (3)

| ID | Item | Eff | Impact | Deps | Note |
|----|------|-----|--------|------|------|
| C32 | migrate-production.yml Verify step — remove or replace with psql to el… | S | low — purely cosmetic CI red on an other… | — | User explicitly decided 2026-04-27 to SKIP this fix and live with the cosmetic red (documented in memory). So it's live-… |
| C37 | F4 — Executor-brief artifact (5th scaffold file for multi-session init… | M | low — purely an agent/supervisor token-e… | — | Codex-endorsed design already resolved the key open question (separate committed file with version stamp + source pointe… |
| C38 | F5 — /exec-session slash command (single-source invariant kickoff boil… | M | low — supervisor/agent ergonomics only (… | C37 | Explicitly sequenced AFTER F4 proves the brief shape (dependency on C37). Takes $ARGUMENTS = per-initiative delta file. |

### Docs (1)

| ID | Item | Eff | Impact | Deps | Note |
|----|------|-----|--------|------|------|
| C39 | F8 — Migration-doc consolidation (4 surfaces → 2) | M | low — doc-maintenance/drift hygiene; aff… | — | Codex's 'skill lives outside review path' objection was on a wrong premise — the skill is IN-REPO at .claude/skills/data… |

### Other / larger features (4)

| ID | Item | Eff | Impact | Deps | Note |
|----|------|-----|--------|------|------|
| C121 | Implement SSO with Google Workspace | L | med — schools on Google Workspace could … | Supabase Auth Google OAuth provider conf… | Greenfield feature, not a bug. References USER_ROLES_AND_PERMISSIONS_SPEC.md advanced-security section. No commit/migrat… |
| C122 | Implement Two-Factor Authentication (2FA) for admin accounts | L | med — protects admin/super_admin account… | Enable Supabase TOTP MFA (config + dashb… | Greenfield security feature. Supabase has native MFA APIs so plumbing is the bulk of the work. 'Optional but encouraged'… |
| C54 | activity_type prompt garden recall precision — tighten if reviewer pus… | M | low — over-tags `garden` on ~36 lessons … | Conditional trigger NOT met: requires 'r… | Genuinely live but CORRECTLY deferred and conditional — keep it parked, do not action speculatively. The recall-over-pre… |
| C123 | Leverage React 19 enhanced Suspense patterns for loading states | M | low — incremental loading-state polish; … | React Query suspense-mode adoption decis… | Issue is explicitly Low/future and 'implement gradually'. A basic route-level Suspense boundary already exists (predates… |

## Appendix A — Obsolete (culled, with cited resolver)

*28 items verified already-done/won't-do. Cite-checked; safe to prune from source memories/docs/issues (see Source-hygiene).*

| ID | Item | Resolver (evidence) |
|----|------|---------------------|
| C110 | Consolidate multiple cooking-methods migration files | The 4+ duplicate cooking-methods migrations (20250204_consolidate_cooking_methods.sql, _fixed, _safe, _fix_cooking_methods_casing) are NO LONGER in the active supabase/migrations/ top-level. git log -… |
| C13 | 16 concept-pairs surviving only in lesson_versions — single-… | PROD read-only probe (mcp__supabase-remote): all 7 lesson_versions rows still carry object-shape academicIntegration.concepts (decomposition/soil science/trade routes/immigration stories/pollinators e… |
| C134 | [P2] Invitation acceptance UPDATE fails due to admin-only RL… | RESOLVED by migration supabase/migrations/20260208_fix_invitation_acceptance_update_policy.sql which adds policy "Users can accept their own invitation" (FOR UPDATE USING email=auth.users.email AND ac… |
| C141 | OpenAI embeddings / generate-embeddings.mjs 'currently disab… | The doc claim is stale. PROD probe: all 788 lessons have content_embedding (0 missing). Project CLAUDE.md 'Current Status' says 'OpenAI embeddings: Working in production'. scripts/generate-embeddings.… |
| C143 | Archive obsolete one-time migration scripts (resume-gemini-e… | Both scripts already live in scripts/archive/ on current main (scripts/archive/resume-gemini-embeddings.ts, scripts/archive/recover-failed-lessons.ts — neither remains in scripts/ root). Moved in comm… |
| C144 | Delete/update broken shell scripts (deploy-edge-functions.sh… | apply-production-migration.sh was DELETED in commit ed9264d (PR #356) — `git show` shows `Deleted: scripts/apply-production-migration.sh` (38 lines); it no longer exists on main. deploy-edge-functions… |
| C145 | Fix type safety in ReviewDetail.tsx (6 high-priority any typ… | GitHub issue #340 CLOSED/COMPLETED 2025-12-02. Resolved by PR #359 (commit 1d8103c) 'fix(types): improve type safety in ReviewDetail.tsx (#340)' — added LessonInsert/LessonUpdate/SimilarityWithLesson/… |
| C146 | Fix type safety in AdminDuplicates.tsx and AdminDuplicateDet… | GitHub issue #341 CLOSED/COMPLETED 2025-12-02; PR #359 (commit 1d8103c) commit body 'Closes #341' — added V3/V2 report interfaces, isV3Report type guard, LessonWithMetadata, proper V3ReportGroup→Dupli… |
| C147 | Fix `as any` assertions in ReviewActions.tsx and GoogleDocEm… | GitHub issue #345 CLOSED/COMPLETED 2025-12-02; PR #358 (commit 2b9f256) 'fix: improve type safety by replacing as any assertions (#358)' — ReviewActions.tsx got a ReviewDecision type alias + proper ca… |
| C148 | Fix type safety in AdminAnalytics.tsx (3 medium-priority iss… | GitHub issue #344 CLOSED/COMPLETED 2025-12-02; PR #359 (commit 1d8103c) commit body 'Closes #344' — 'AdminAnalytics: Replace any[] with typed recentActivities'. Current main src/pages/AdminAnalytics.t… |
| C149 | Unblock FilterModal tests (44 + 2 tests skipped due to Headl… | GitHub issue #348 CLOSED/COMPLETED 2025-12-02 by PR #360 (commit 2f3232a) 'test: unblock FilterModal tests (#348)' — added Headless UI Transition/Disclosure mocks to src/__tests__/setup.ts and un-skip… |
| C150 | Add SearchPage integration tests | GitHub issue #349 CLOSED/COMPLETED 2025-12-19. Current main has src/__tests__/integration/search-page.test.tsx which imports SearchPage from '@/pages/SearchPage' and renders it with QueryClient/Router… |
| C151 | Add hook tests (useLessonSearch, useEnhancedAuth — 5 hooks u… | Issue #350 CLOSED stateReason=COMPLETED 2025-12-18. PR #385 (f18c5d8) 'test(hooks): add unit tests for useDebounce, useLessonStats, and useEnhancedAuth'. Current src/hooks: useEnhancedAuth.test.ts (41… |
| C152 | Add component tests (LessonModal, LessonCard, SubmissionPage… | Issue #351 CLOSED stateReason=COMPLETED 2025-12-02 via PR #361 (d634a30) which added LessonModal.test.tsx/LessonCard.test.tsx/ResultsGrid.test.tsx. THREE of the five named components no longer exist: … |
| C154 | Standardize component declarations to React.FC pattern (40% … | Issue #346 CLOSED stateReason=NOT_PLANNED 2025-12-18T17:58:33Z — the team explicitly DECLINED this standardization. Current convention is the opposite of the audit's target: project-wide 53 `function`… |
| C155 | Standardize Supabase error handling pattern (try-catch-final… | Issue #347 CLOSED stateReason=COMPLETED 2025-12-19T00:07:44Z via PR #389 (3009abe 'refactor: standardize Supabase error handling with parseDbError'). The parseDbError utility exists at src/utils/error… |
| C156 | Remove unused type definitions (SavedSearch, LessonCollectio… | Issue #336 CLOSED stateReason=COMPLETED 2025-12-01. All 6 type interfaces were deleted from src/types/index.ts in commit ed9264d (PR #356 'chore: tech debt phase 2 - dead code and scripts cleanup') — … |
| C158 | Add facet counts per filter option (e.g. '5th Grade (45 less… | RESOLVED. src/utils/facetCounts.ts exports computeFacetCounts()/useFacetCounts(); SearchPage.tsx:50 calls `const counts = useFacetCounts(lessons)` and passes them to <IntSidebar counts={counts}> (Sear… |
| C165 | Consolidate search_vector triggers to a single trigger | DONE by supabase/migrations/20260209140000_cleanup_search_triggers.sql — it DROPs the two redundant triggers (trigger_update_lesson_search_vector, update_lessons_search_vector) and DROPs the obsolete … |
| C167 | Metadata merging logic for duplicate resolution (blocked on … | The cited TODO ('TODO: Implement smart metadata merging logic') lives in supabase/migrations/archive/20250131_duplicate_resolution_tables.sql:147 — an ARCHIVED pre-baseline migration. The CURRENT/live… |
| C19 | Approve-flow transaction boundary — replace multiple client … | RESOLVED by Phase 4 lesson-submission Tier-1 work. Migration supabase/migrations/20260428000003_phase_4_complete_review_atomic_rpc.sql creates the complete_review_atomic SECURITY DEFINER RPC whose hea… |
| C35 | Harden facetCounts.ts:55 lessonFormat handler against array-… | RESOLVED by the metadata-foundation lessonFormat-removal sweep (commit 57f0e69 'feat(metadata-foundation): lessonFormat removal — frontend + edge sweep', companion to Task 1.3 SQL commit 35cac25). The… |
| C50 | Stage 2 reviewer-validation UX — batch-validate LLM-drafted … | The ~700-lesson Stage 2 corpus re-tag the UX was scoped to support has SHIPPED + been validated by other means. PR 6 C2 'Stage-2 re-tag APPLY' merged #510 → squash e4d7830 (migration 20260617000000_pr… |
| C63 | search-modernization close-out commit (bb180b1) not on origi… | RESOLVED. The bb180b1 close-out content is ALREADY in main HEAD (5a77c27). git cat-file confirms bb180b1 exists as a DANGLING commit ('NOT in any ref'), but its content was folded into main via commit… |
| C70 | approve_update academicConcepts carry-forward — sending omit… | RESOLVED by migration 20260510000000_approve_update_concepts_carry_forward.sql (the targeted 'Option A' fix). Its approve_update branch (lines 306-313) carries forward v_existing.metadata->'academicCo… |
| C80 | ReviewDetail binding-intent banner enrichment — Tailwind cla… | RESOLVED by commit e72cf55 'feat(review): Phase 8b full binding-intent banner (three colored states)' (confirmed ancestor of HEAD). ReviewDetail.tsx:1203-1271 now renders the full Section 6.1 banner w… |
| C95 | CON-NN open concept-audit signals (24 open) pending Stage 2 … | All 24 signals (CON-01 through CON-24) in docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md now carry Status = 'Resolved (PR 6 ...)' in the table body — resolved via re-t… |
| C99 | Implement virtual scrolling in CulturalHeritageFilter | RESOLVED by commit 5fd3c53 ('chore: delete Filters cluster — FilterModal, FilterPills, and couplings', Daniel Feder, 2026-04-23, in main since 2026-04-25, confirmed `git merge-base --is-ancestor 5fd3c… |

## Appendix B — Partially-done (24)

| ID | Item | Eff | Impact | What's left |
|----|------|-----|--------|-------------|
| C23 | Backend follow-up: rejected submission status formaliza… | S | med — reviewers cannot formall… | Reclassify from 'deferred/not-done' to partially-done: the enum/CHECK formalization the item asks for is COMPLETE and PROD-applied… |
| C142 | Run npm audit fix for low-severity vulnerabilities | M | med — react-router/react-route… | Task is LIVE but the item's specifics are outdated — re-scope before acting. lhci was already bumped to 0.15.1 since the audit was… |
| C159 | Implement advanced admin analytics (usage metrics, subm… | M | med — admins already have subm… | Not 'live' (real progress shipped) and not 'obsolete' (the headline search/timing metrics are absent). The remaining scope is roug… |
| C48 | D6 — Unit-tying / sequence relationship UI (badges, nex… | L | med — without sequence modelin… | Crucial nuance: the claimed framing ('series_id + part_number columns exist') is TRUE but incomplete — columns exist and are 100% … |
| C56 | Overnight review 2026-06-12 — 4 unprocessed artifacts (… | L | med — umbrella tracks 4 broken… | This is a META/tracking item, not a single unit of work. ~25% actioned (working-efficiency repo-side via #518). The high-value liv… |
| C166 | Duplicate detection future improvements (dynamic thresh… | L | med — reviewers manually resol… | Low-priority as documented. Sub-item (4) has a partial analog (bulk dismiss). If pursued, split into independent tickets — (1)/(2)… |
| C08 | 23 non-ESYNYC-format imported curriculum drops — corpus… | S | low — the corpus-cleanup goal … | 21 of ~23 imports retired via PR #478 (20260520000000_corpus_cleanup); ~2 remain (stub + 1 one-off) — verify retire-or-keep. Drop … |
| C66 | TEST missing live PROD concepts rows — census PROD not … | S | low — process/methodology note… | Effectively a no-op as a standalone action: the actionable half (the process rule) is DONE, and the data half is a symptom of C64 … |
| C82 | Undesigned admin surfaces — AdminUserDetail, AdminInvit… | S | low — the 8 production-facing … | The 'Phase 4 should re-engage Claude Design' framing is stale — the redesign already happened in PR #437 (merged ac9b262, v3.0). T… |
| C138 | [P1] Edge functions use CORS:* with internal service-ro… | S | low — the high-impact targets … | Adversarial verdict: the ticket's core claim ('all 7 use service role bypassing RLS') is now FALSE — 2 deleted, 3 origin-restricte… |
| C168 | Pending architecture decisions (monitoring/observabilit… | S | low — decisions already made/i… | Claimed 'medium' priority overstates it — these are mostly already-decided. Recommend a single docs cleanup pass on architecture-d… |
| C30 | Upgrade @lhci/cli to clear remaining npm audit vulnerab… | M | low — all lhci-derived vulns a… | Reclassified partially-done/stale: the action verb ('upgrade lhci') is now a no-op because 0.15.1 is both installed and newest. Th… |
| C55 | Vocabulary drift canonicalization (PR-3) — one-shot rew… | M | low — residual drift in cookin… | Original framing (~4,920 appearances / 10 fields) is now largely OBSOLETE — the metadata rebuild resolved ~8 of 10 fields. The tru… |
| C60 | Docs cleanup — archive ~23 stale/obsolete plan docs + f… | M | low — internal navigation/cogn… | Two-part item: the OLD TECH_DEBT half is done (PR #357, doesn't need re-doing — original source_location docs/TECH_DEBT_*.md is st… |
| C62 | Working-efficiency overhead reduction (~10-14K tokens/s… | M | low — agent/workflow efficienc… | The cited '~10-14K tokens/session' figure is now mostly recovered (the per-session auto-loaded portion). What's left is 4 M-effort… |
| C96 | Theme-overlap concept adjudication (ecosystems, plant_g… | M | low — concept and theme string… | PARTIAL RESOLVER: PR 6 Stage 2 re-tag (#508/#510) incidentally cleared the food_systems overlap by dropping the concept-side singl… |
| C102 | Add runtime validation for critical database fields (re… | M | low — robustness/debuggability… | Partially-done: the issue's headline example (row.lesson_id!/row.title! in useSearch.ts) was resolved incidentally by the search-h… |
| C109 | Standardize cookingSkills/gardenSkills storage (JSONB m… | M | low — internal/data-shape conc… | Original framing '#124 stored in metadata JSONB instead of dedicated columns' is now half-resolved: dedicated columns EXIST and ar… |
| C119 | Add metrics and monitoring for Edge Function performanc… | M | low/med — no perf-regression e… | Marked partially-done because the liveness/error-detection slice (smoke cron B7 + Sentry) shipped AFTER this issue was filed and c… |
| C120 | Implement connection pooling for Supabase at production… | M | low — no connection-exhaustion… | Marked partially-done: pooling is effectively already provided by the platform for the access pattern the app actually uses, and c… |
| C129 | Add data validation checks for user management migratio… | M | low — internal migration-safet… | Reframe before doing: the concrete migrations in #66 are obsolete (baseline-consolidated). Remaining live nugget = adopt a general… |
| C131 | Add rollback procedures for database migrations | M | low — production-safety toolin… | Largely obsolesced by (a) the .rollback convention adopted in the metadata-rebuild and (b) baseline consolidation of the named mig… |
| C160 | Implement lesson versioning UI (lesson_versions table e… | M | low — versioning history is a … | The source item's two clauses split cleanly: 'archive previous version on approved-update' = DONE (7 PROD rows, complete_review_at… |
| C153 | Increase overall test coverage from ~16% to 50%+ (edge … | L | low — internal quality metric,… | Umbrella over C151/C152 and others. Marked partially-done not obsolete because the IMPLEMENTATION_STATUS pending checkbox is real … |

## Appendix C — Unverifiable (1)

| ID | Item | What's needed to decide |
|----|------|------------------------|
| C29 | Delete unused Netlify env vars (SUPABASE_SERVICE_ROLE_K… | Code-side premise CONFIRMED: grep of src/ (frontend bundle) for SUPABASE_SERVICE_ROLE_KEY / ALGOLIA / VITE_ALGOLIA returns nothing (exit 1); netlify.t… |

## Source-hygiene byproduct

The 29 obsolete + 23 partial verdicts point at stale sources worth pruning (a by-product — **not acted on by this read-only pass**; do it as a follow-on cleanup, or fold into Wave 3):

- **`docs/TECH_DEBT_AUDIT_2025-12.md` is effectively spent.** Items `C145`–`C156` (its type-safety, test-coverage, and React.FC/error-handling entries) were all closed by PRs #356–#389 (Dec 2025) or declined (#346 NOT_PLANNED). Add a "superseded — see git history / this roadmap" banner rather than mining it for fresh work.
- **Stale status-doc claims** (also `C60`/Wave 3): `2026-04-27-phase-8b-execution-status.md` still says "PR #470 OPEN" (merged 2026-04-29); `2026-05-12-...-stage1-concepts-execution-status.md` still says "awaiting Session 82 curriculum team" (verdicts returned + consumed). Closure banners as part of archival.
- **Memory files to update/trim** once their items ship or were obsoleted: `project_metadata_cleanup_candidates.md` (`C11`/`C12`/`C13` — C13 now obsolete, the concepts live in `lessons.academicConcepts`), `project_imported_non_esynyc_drops.md` (`C08` ~91% done), `project_embedding_pipeline_mismatch.md` (`C07` still live but reframe). The MEMORY.md "Open hygiene follow-ups" already partly trimmed by PR #518.
- **GH issues**: the ~12 closed-but-resurfaced tech-debt issues (#336/#340/#341/#344–#351) are already closed — no action; they leaked in via the TECH_DEBT doc, not the open-issue list. The **15 open PRs are stale Dependabot** (`C169`, ~54–68 days) — triage merge-or-close as a batch.
- **`docs/ARCHITECTURE.md`** still cites "1,098 lessons" (×8) and an Oct-2025 date — the load-bearing `CLAUDE.md` count was already fixed by PR #518; fix ARCHITECTURE's as a one-line banner during Wave 3.

---

*Generated 2026-06-20. To act on a track, scaffold it via `/kickoff-feature` (full themes) or open a single PR (mechanical waves). The master campaign status doc — to be created when execution starts — points down at per-initiative status docs.*

