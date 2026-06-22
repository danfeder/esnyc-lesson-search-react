# Wave 2 — Email + Security P1 — Combined Execution Doc

> **Small-initiative weight.** This ONE doc combines all four scaffold roles:
> §0 Kickoff (paste at session start) · §1 Design / locked decisions (WHY) · §2 Implementation plan (WHAT) · §3 Status (WHERE we are).
> Master cross-wave tracker: `2026-06-21-deferred-campaign-status.md`. Roadmap: `2026-06-20-deferred-work-roadmap.md`.
>
> **Grounding:** every file:line anchor below came from a read-only recon against `main` @ `9eb1b6e` (2026-06-21). Where the roadmap's prose disagreed with the code, the code won — noted inline. **Executors must re-verify exact line numbers before editing — anchors drift.**

---

## §0 — KICKOFF (paste this section at the start of every Wave-2 session, after `/clear`)

You are continuing execution of **Wave 2 — Email + Security P1** (deferred-work campaign). Assume no prior conversation context. Disk + git + §3 of this doc are your only source of truth.

### What you're building
Five small backend security/correctness fixes from the deferred-work roadmap, as **4 separate PRs**:
- **PR1 (lead): C137** — admin user-delete crash (`supabase.sql` misuse in `user-management` edge fn) + missing error toast. Edge-only.
- **PR2: C133** — `send-email` skips auth for 7 email types; rewrite to per-type auth classification. Edge-only.
- **PR3: C20** — `is_admin()` ambiguous-column sleeper; fix the param (disambiguate the body — do NOT rename). One migration.
- **PR4: C138** — `detect-duplicates` is an unauthenticated service-role endpoint; add an auth gate. Edge-only.

### Where things live
- **This doc** (`2026-06-21-wave2-email-security-execution.md`): §1 = locked decisions (WHY), §2 = per-PR tasks (WHAT), §3 = status (WHERE).
- Master campaign tracker: `docs/plans/2026-06-21-deferred-campaign-status.md`.
- Roadmap: `docs/plans/2026-06-20-deferred-work-roadmap.md` (item `C##` scope).
- CI/deploy flake playbook: `reference_ci_flakes.md` (auto-loaded pointer in MEMORY.md) — **read before any PROD migration or edge deploy.**
- 3-pipeline model: `reference_database_pipeline.md`.

### SESSION-START RITUAL (do FIRST, every session)
1. Read this §0 + §1 + the §2 task you're about to start.
2. Read §3 Current State — it's the load-bearing orientation piece.
3. `git status --short --branch && git branch --show-current && git log --oneline -10` — confirm git matches §3. If they diverge, trust git, then fix §3.
4. If the worktree is dirty with changes that aren't yours, don't touch them (there are unrelated untracked `docs/plans/*-kickoff.md` files + `heritage-worksheet-form/` — leave them).
5. `npm run check` (= type-check + lint) — confirm clean baseline. If it fails and it's unrelated to this branch, report + ask before touching unrelated files.
6. Tell the user where you are and what's next. Don't dispatch the first executor until they confirm orientation.

### EXECUTION MODE — supervisor + fresh-context subagents
This session runs as a **light supervisor**: you own orientation, decisions, verification, user checkpoints, and all edits to this doc. Impl tasks are **executed by dispatched subagents** (Agent tool, fresh context) so the supervisor stays light and one session carries several tasks.
- One §2 task per executor dispatch; never bundle two.
- **Verify in the main loop before accepting any executor result** — LOAD-BEARING (`feedback_workflow_orchestration.md`: supervisor-verify has caught real agent misses). Re-run the task's cheap verification yourself (`npm run check`, the key probe, `git show --stat`); spot-check the artifact. Don't re-read everything the agent read.
- Checkpoint §3's Current State header after EACH verified task (one-line edit), not just at session end.
- Each executor prompt must carry: the doc path + task id (tell it to READ §1+§2 from disk), a digest of the DATA-SAFETY / NEVER rules + locked decisions, which skills the task needs, the boundaries (commit on the feature branch OK; NEVER push / open PR / touch PROD / edit this doc), "if blocked or disk contradicts the locked design, STOP and report," and the required report format (what was done · commits · verification commands + ACTUAL output).
- **Ultracode is on for this campaign** → the Workflow tool is the preferred orchestration for fan-out phases (executor → adversarial verifier); same supervisor-verify gate applies.

### LOCKED DECISIONS (full set in §1; at-risk ones pinned here)
- 4 separate PRs; sequence **C137 → C133 → C20 → C138** (C137 stays first; order among PR2–4 flexible).
- C137 = **Option B** (pure edge, no migration); fix BOTH sites (live 695 + latent 612) + add the AdminUsers error toast.
- C133 = per-type auth; the **exact per-type bucketing + transport mechanism are `[evidence-lockable]` via the Task-2.0 TEST probe** — do NOT assume how server-side callers authenticate.
- C20 = **keep the arg name, disambiguate the body via `$1`** (`CREATE OR REPLACE` can't rename a param — Postgres 42P13; DROP unsafe — RLS deps). Signature unchanged → no additive-RPC hazard; leave no-arg overload + RLS policies untouched.
- C138 = re-scoped to the ONE `detect-duplicates` residual; embedding-proxy auth defaults to **deferred**.

### HARD RULES
**DATA SAFETY (supersedes velocity):** Schema changes ONLY via migration files — never apply schema to PROD via MCP. Before merging a DB/edge PR: wait for CI → verify on TEST via `mcp__supabase-test__`. After a PROD migration applies: verify via `mcp__supabase-remote__` (read-only). When in doubt about PROD, ask. (`feedback_data_safety_top_priority.md`)

**MIGRATION DISCIPLINE (PR3 only):** Invoke the `database-migrations` (or `new-migration`) skill before touching `supabase/migrations/`. Confirm the date prefix sorts AFTER `20260620000000_search_lessons_w1b.sql` (use `20260621000000_` or later; ASCII gotcha: `YYYYMMDDHHMMSS_` sorts before `YYYYMMDD_`). `supabase db reset && npm run test:rls` locally before pushing.

**EDGE-FUNCTION DISCIPLINE (PR1/PR2/PR4):** No TEST environment auto-deploys edge functions — they go from PR/merge straight to PROD via `deploy-edge-functions.yml` (manual approval). After ANY PROD edge deploy, **3-signal verify** (`mcp__supabase-remote__get_edge_function <slug>`: version bumped + `ezbr_sha256` matches TEST + grep `files[].content` for new code). The CLI "Deployed" line is NOT proof — `complete-review` silently no-op'd on matrix push 2×. If unchanged, re-run `gh workflow run deploy-edge-functions.yml -f environment=production -f function=<slug>`. (`reference_ci_flakes.md`)

**CODEX ADVERSARIAL GATES (different model family — earned its keep every Theme-B bot round):** GATE 1A/1B (plan review — done at scaffold for this small initiative, see §3), GATE 2 (pre-TEST migration review, PR3), GATE 3 (pre-push, parallel with Claude code-reviewer), GATE 4 (2nd opinion on every real bot finding before finalizing). Codex slash commands are user-invoked. Dispatches MUST say "return findings INLINE" (`feedback_codex_return_inline.md`).

**PER-PR RITUAL (compact; canonical detail in auto-loaded `feedback_*` memories):** (1) pre-push: dispatch a code-reviewer agent on `git diff main...HEAD` + Codex GATE 3 in parallel; rebuttal-pass + fix-ups before push. (2) `npm run check`, push, `gh pr create`. (3) wait for external bots. (4) **four-surface triage** — issue-comments + review-summaries + line-comments + checks/run-logs; "0 findings" needs evidence from all four (use `/pr-triage <PR>`). (5) rebuttal-pass EVERY finding; default-reject hardening that fails the "absence = user-visible bug or DB risk" bar; **GATE 4** on every real suggested change. (6) consolidated fix-up commits (never amend pushed). (7) **re-verify TEST DB after every DB-affecting round** (`feedback_per_round_test_db_verification.md`) — copy verbatim ids from the source into probes (`feedback_verbatim_identifiers_in_probes.md`). (8) round-cap after 2 rounds (3rd = critical-only).

**NEVER without explicit user instruction:** push to main · merge a PR · approve a PROD migration in CI · `git push --force` · rewrite this doc's locked decisions to "improve" mid-execution.

**OK without asking:** `git push -u origin fix/wave2-*` for the current feature branch · commit on the feature branch · `gh pr create` · read/test/baseline · dispatch review agents.

### RIGHT NOW
Read §0 → §1 → §3 Current State → §2 current task → `npm run check` → tell the user where you are. Don't start coding until they confirm. **Respect `[evidence-lockable]` vs `[user-verdict]` tags:** evidence-lockable you may lock from discovery with a one-line rationale; user-verdict gets evidence + a recommendation to the user, who decides.

---

## §1 — DESIGN / LOCKED DECISIONS (WHY)

**Status: Locked** (GATE 1A/1B done at scaffold — see §3). Two `[evidence-lockable]` open questions remain, both inside execution: C133's per-type auth matrix (Task 2.0 probe) and C138's embedding-proxy scope (defaults to defer).

### Why this wave
Wave 1 (public UX) shipped the only theme a teacher sees. Wave 2 is the highest-risk cluster: an unauthenticated email-spoofing hole, a crashing admin feature, an unauthenticated corpus-enumeration endpoint, and a latent RLS sleeper. All small, all backend, all carrying real abuse or correctness risk.

### What the recon changed vs. the roadmap (read before trusting the roadmap's Wave-2 line)
- **C138 is mostly already fixed.** "All 7 edge functions use CORS:\* + service-role bypass" is **false in current main** — 11 functions, 8 origin-restricted, service-role ones (`user-management`, `complete-review`, `extract-google-doc`, `invitation-management`) auth-gate properly; `smart-search` uses the anon key (RLS applies). The ONE residual is `detect-duplicates`. → PR4 shrinks to a single additive auth gate.
- **C128's target is orphaned.** The live frontend does the whole invitation lifecycle client-side; `invitation-management` is referenced only by a smoke-test. Rate-limiting it protects nothing. → DEFERRED pending an architecture decision (below).
- **C133 is worse than filed (7 skip types, not 4) AND has a transport trap:** server-side callers use two different transports (`complete-review` = raw fetch w/ `Bearer SERVICE_ROLE_KEY`; `user-management` = `supabase.functions.invoke` w/ a service-role client). A naïve fix can silently break notifications (callers swallow email errors). → the per-type matrix is `[evidence-lockable]` via a TEST probe.
- **C137 is non-destructive.** It gates a *soft* delete (`is_active=false` + a notes marker), not a row/auth delete, and fails closed today (crash = no mutation). Low data risk. Edge-only fixable.
- **C20 genuinely throws** `42702` at runtime on TEST (not theoretical); dormant only because no live authenticated path hits the affected policies.

### Locked decisions
1. **Scope = 4 PRs**, all separate (user sign-off 2026-06-21): PR1 C137 · PR2 C133 · PR3 C20 · PR4 C138.
2. **Sequence: C137 → C133 → C20 → C138.** C137 first = smallest/safest, warms up the edge-deploy + 3-signal verify rhythm on a non-destructive change. C133 = the headline P1. C20 (migration) slots anywhere (manual-approval queue; no dependency). C138 last (re-scoped, lower severity). Order among PR2–4 is flexible; **C137 stays first.**
3. **C137 fix = Option B** (pure edge-function, no migration). Fix BOTH the live bulk site and the latent single-user site; add the missing user-facing error toast in `AdminUsers.tsx`. Option A (a `SECURITY DEFINER` RPC doing the concat in one statement) was rejected to keep PR1 off the migration pipeline.
4. **C133 strategy = per-type auth classification:** browser-callable types require an admin/super_admin JWT; server-side-only types require the service-role key. The **exact per-type bucketing + the transport mechanism are `[evidence-lockable]`** via the Task-2.0 TEST probe. Do NOT assume how each server-side caller authenticates.
5. **C20 fix = keep the param name `user_id`, disambiguate the body** via positional `$1` (`WHERE user_profiles.id = $1`). **Do NOT rename the param** — `CREATE OR REPLACE FUNCTION` errors `42P13: cannot change name of input parameter` (verified empirically on TEST 2026-06-21), and `DROP FUNCTION` is unsafe (RLS policies depend on `is_admin` → CASCADE would drop them). Signature is therefore truly unchanged (name/arg-name/type/grants all identical) → backward-compatible → **no additive-RPC hazard.** Leave the no-arg `is_admin()` overload and all RLS policies untouched (they call positionally; the body fix is transparent).
6. **C138 = re-scoped** from "CORS:\* + service-role bypass across all functions" to "**`detect-duplicates` is an unauthenticated service-role endpoint**." The fix must preserve the `process-submission → detect-duplicates` server-to-server hop. Embedding-proxy auth (the two `generate-*-embeddings` functions) is `[evidence-lockable]` scope — **default DEFER** to a noted follow-up. Update the `supabase/functions/CLAUDE.md` template (still shows the unsafe CORS:\* + "use service role" pattern).
7. **Scaffold weight = small-initiative** — this one combined doc + the master campaign status doc. Not the 4-file Theme-B weight.

### Out of scope / deferred (do NOT scope-creep)
- **C04** — Resend domain verify + from-address. The DNS step on esynyc.org is the **user's**; unblocks C05 (rejection UI). Independent of C133's *auth* fix (C04 = *deliverability*). Note: once C04 lands, spoofed `account-status`/`password-reset` emails become a sharper phishing surface — extra reason C133 lands first.
- **C128** — invitation rate-limit. DEFERRED. `invitation-management` is orphaned (client does invites directly). `[user-verdict]`: confirm the edge fn is dead → likely close/downgrade as obsolete-against-current-architecture; the real surface is the anon-readable `user_invitations` + `validate_invitation_token` RPC + Supabase Auth's built-in signup throttling. Bring to the user before any work.
- **C130** — admin session timeout. DEFERRED to a later frontend slice. Pure frontend, lowest-priority. Issue #63's `navigate('/login')` + `toast.warning(...)` sketches are both wrong here (no `/login` route → use `navigate('/')`; no toast library → bespoke warning UI); mount a `useSessionTimeout` hook in `ProtectedRoute`.
- **C05** (rejection UI) — gated on C04.
- **C135** (persistent DB-backed rate limiting) — separate, lower priority.

---

## §2 — IMPLEMENTATION PLAN (WHAT)

> Each PR = its own `fix/wave2-*` branch off latest `main`. Tasks are dispatch-sized. Re-verify all anchors before editing.

### PR1 — C137 user-delete crash  ·  branch `fix/wave2-c137-user-delete-crash`  ·  pipeline: edge-function

**Bug:** `supabase.sql` is not a supabase-js method (it's a Kysely/raw-SQL concept). Building `notes: supabase.sql\`...\`` throws `TypeError: supabase.sql is not a function` at object-construction time, before any `.update()` runs. Confirmed: `SupabaseClient` has no `sql` member in either 2.39.1 (esm.sh runtime) or 2.84.0 (local).

**Sites (re-verify line numbers):**
- `supabase/functions/user-management/index.ts:692-696` — **LIVE** bulk-delete path (`POST /users/bulk` action `delete`). `updateData = { is_active:false, notes: supabase.sql\`COALESCE(notes,'') || ' [DELETED]'\` }`; applied via `.update().in('id', userIds)` ~line 709. Reachable from the frontend.
- `supabase/functions/user-management/index.ts:607-615` — **latent** single-user soft-delete (`DELETE /users/:id`), `supabase.sql` at ~612. No current frontend caller (grep found none; `AdminUserDetail.tsx:398` does its own direct `.update()`). Fix it anyway so the route isn't a landmine.
- `src/pages/AdminUsers.tsx:253-300` — the only live caller (`handleBulkAction('delete')`, invoke ~270). On the 500 it `throw`s (275) → caught (297) → **silent `logger.error` only** (no toast). `setSelectedUsers([])`/`loadUsers()` (295-296) never run.

**Tasks:**
- **1.1** — Fix the bulk path (`:692-696`): extend the `affectedUsers` query (~`:678-681`, currently selects `id, full_name, email, is_active`) to also select `notes`; replace the single `updateData` + `.update().in()` with a per-user loop: `supabase.from('user_profiles').update({ is_active:false, notes:(u.notes ?? '') + ' [DELETED]', updated_at }).eq('id', u.id)`. (`user_profiles.notes` is `TEXT` — confirmed.) **Non-atomic loop** — a mid-loop failure marks some users and not others; acceptable for a soft delete, but note it. **Decide the partial-failure response explicitly** (best-effort: collect per-user failures → return 200-with-warnings, vs. fail the batch) so the executor doesn't reintroduce an all-or-nothing `throw` inside the loop. **Audit-action fix (GATE-1):** the bulk audit insert (`:753`) writes `action: auditAction`, and the delete branch sets `bulk_users_deleted` (`:697`) — NOT in the `user_management_audit_action_check` allowed list (`baseline:2142`: `user_deleted`/`user_activated`/`user_deactivated`/…). The insert is `await ...insert()` with **no `error` check**, so the CHECK violation is **silently swallowed** today (no crash — but no audit row written). Map the bulk actions to allowed values: `bulk_users_activated`→`user_activated`, `bulk_users_deactivated`→`user_deactivated`, `bulk_users_deleted`→`user_deleted` (keep the per-action detail in `metadata`). This restores the audit trail (and fixes the pre-existing activate/deactivate gap), and keeps PR1 edge-only (no migration to widen the enum). Confirm on TEST that the audit row actually writes after the fix.
- **1.2** — Fix the latent single-user path (`:607-615`): `currentUser.notes` is already fetched (~`:594-598`) → `notes: (currentUser.notes ?? '') + ' [DELETED]'`.
- **1.3** — `AdminUsers.tsx`: surface the failure to the admin (replace the silent `logger.error` at ~298 with the page's existing toast/alert pattern). Confirm `setSelectedUsers([])`/`loadUsers()` run on success.
- **1.4** — Pre-push gate + PR. Deploy to PROD on merge → **3-signal verify** `user-management`. **TEST verify:** run an actual bulk delete against a throwaway TEST user via the deployed function and confirm `is_active` flips false + `notes` gets the ` [DELETED]` suffix (`mcp__supabase-test__execute_sql` to inspect the row). Test against the esm.sh runtime (2.39.1), not just local.

**Gates:** 3-signal post-deploy edge verify + TEST-DB verify. No migration. **Data-safety:** soft delete only; no row/auth deletion; fail-closed today.

### PR2 — C133 send-email auth-skip  ·  branch `fix/wave2-c133-send-email-auth`  ·  pipeline: edge-function

**Bug:** `supabase/functions/send-email/index.ts:83-93` is a negative-list gate that skips the auth block (`:94-131` — `Authorization` header → `getUser(token)` → role ∈ {admin, super_admin}) for **7** types: `password-reset`, `role-changed`, `account-deactivated`, `account-reactivated`, `submission-approved`, `submission-needs-revision`, `submission-rejected`. All functions deploy `--no-verify-jwt` (`deploy-edge-functions.yml:205-219, 275-282`), so the in-code check is the ONLY gate. An anon caller can spoof these emails to any `to` address (`from: onboarding@resend.dev`, `:219`); `resetUrl` in password-reset is attacker-controlled and NOT escaped.

**Legitimate server-side callers (the transport trap):**
- `complete-review/index.ts:304-322` — `submission-*` via **raw fetch** w/ `Authorization: Bearer SERVICE_ROLE_KEY` (comment: SDK `invoke` "silently fails" inside an edge fn).
- `user-management/index.ts:533, 556, 628, 732` — `role-changed` + `account-*` via `supabase.functions.invoke` with a **service-role client** (transport unknown — this is the trap).
- `password-reset/index.ts:167, 243` — `password-reset` + `password-changed` via a service-role client.
- Frontend (anon-key): `AdminInvitations.tsx:198` / `AdminInviteUser.tsx:188` / `AcceptInvitation.tsx:139` send only `invitation` + `welcome` (both already require auth — fine). **No frontend sends any of the 7 skip types** → none need to be publicly callable.

**Tasks:**
- **2.0 `[evidence-lockable]` PROBE (do FIRST, before writing the fix):** On TEST, determine exactly how each server-side caller authenticates to send-email — specifically whether `user-management`'s `supabase.functions.invoke` (service-role client) forwards a usable `Authorization: Bearer <service-role-key>` header, or whether the service key arrives only via `apikey`, or whether `invoke` fails the way `complete-review`'s comment warns. **Lock the per-type auth matrix from the evidence** (one-line rationale in §3). Expected buckets, to be confirmed/corrected by the probe: **browser/admin-JWT** = {invitation, welcome}; **service-role-only** = {submission-approved, submission-needs-revision, submission-rejected, password-reset, password-changed, role-changed, account-deactivated, account-reactivated}.
  - **Pre-existing-failure caveat (GATE-1):** `complete-review` switched from `invoke` to raw fetch *because* `invoke` "silently fails" inside a deployed edge fn (`complete-review/index.ts:304-309`), yet `user-management` (`:628, :732`) and `password-reset` (`:167, :243`) still call send-email via `invoke`. If the probe shows `invoke` doesn't deliver a usable bearer, those `account-*`/`password-reset` emails may **already be broken in PROD today** — report that as a *separate* pre-existing outage to the user; don't let the auth PR silently mask it (switch those callers to raw fetch, Task 2.1's second option).
  - **4th caller (GATE-1):** `invitation-management/index.ts:253-255` + `:379-381` ALSO invoke send-email `type:'invitation'` via a service-role client — a caller the recon missed. This is the **orphaned C128 endpoint** (no live frontend path hits it). `invitation`/`welcome` stay in the admin-JWT bucket (the LIVE browser callers carry the JWT); include `invitation-management` in the probe and either explicitly EXCLUDE it (document it as dead) or also accept service-role for `invitation` — don't silently change the behavior of a path the team might revive. Cross-ref the C128 deferral (§1 Out of scope).
- **2.1** — Implement the locked matrix in `send-email/index.ts`: replace the negative-list (`:83-93`) with explicit per-type classification. Service-role-only types require `Authorization === \`Bearer ${SERVICE_ROLE_KEY}\`` (constant-time compare; mirror `extract-google-doc/index.ts:42-60` — the real in-repo `crypto.subtle.timingSafeEqual` service-role-or-user-token pattern); browser types keep the JWT + admin-role check. If the probe shows `invoke` doesn't forward a usable bearer, EITHER also accept the service key via `apikey`, OR switch `user-management`'s send-email calls to raw fetch like `complete-review` — pick from evidence, lock it.
- **2.2** — TEST per-type verify: call the deployed send-email on TEST with the **anon key** for each of the 8 now-gated types → expect 401/403; with the **service-role key** → expect 200/dev-log. Confirm every real caller path (`complete-review`, `user-management`, `password-reset`) still succeeds end-to-end (they swallow email errors — check edge logs, don't trust the UI).
- **2.3** — Pre-push gate + PR → deploy → 3-signal verify `send-email`.

**Gates:** TEST per-type probe + 3-signal post-deploy. No migration. **Note:** C04 (deliverability) is a separate DNS-gated follow-up — do NOT block this auth fix on it.

### PR3 — C20 is_admin() ambiguous param  ·  branch `fix/wave2-c20-is-admin-param`  ·  pipeline: migration

**Bug:** `is_admin("user_id" uuid)` (baseline `20251001_production_baseline_snapshot.sql:583-594`) has a param named `user_id` that collides with `user_profiles."user_id"` (baseline `:2191`); the `WHERE id = user_id` reference is ambiguous and throws `ERROR 42702` at runtime (default `plpgsql.variable_conflict=error`). Callers: `lesson_archive` policies (`:3015` INSERT, `:3059` SELECT), plus `canonical_lessons` / `cultural_heritage_hierarchy` / `duplicate_resolutions` / `search_synonyms` / `user_management_audit` (`:2977-3051`), and heritage policies re-created in `20260616000000_heritage_recursive_expansion.sql:75-86`. Dormant: archive writes go through the `SECURITY DEFINER archive_duplicate_lesson` RPC (`src/services/duplicateGroupService.ts:429`, RLS bypassed); `search_synonyms` SELECT is `USING(true)`; no frontend reads/writes those tables through RLS. The no-arg `is_admin()` overload is fine.

**Tasks:**
- **3.1** — Invoke the `new-migration` skill. Create `supabase/migrations/20260621000000_fix_is_admin_ambiguous_param.sql` (sorts after `20260620000000_search_lessons_w1b.sql` ✅). Body: `CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid) RETURNS boolean ... WHERE user_profiles.id = $1 AND role IN ('admin','super_admin') AND is_active = true ...` — **keep the arg name `user_id`; remove the ambiguity by referencing the param positionally as `$1` and qualifying the column as `user_profiles.id`.** ⚠️ **Do NOT rename the param** to `p_user_id`: `CREATE OR REPLACE` errors `42P13 cannot change name of input parameter` (verified on TEST), and `DROP FUNCTION` is unsafe (RLS policies depend on `is_admin` → CASCADE would drop them). Preserve `SECURITY DEFINER` + any `SET search_path`; re-`ALTER OWNER` + re-`GRANT` defensively (match baseline `:597, :3374-3376`). Leave the no-arg overload + ALL RLS policies untouched. Include a rollback comment restoring the old body. (The old body throws `42702` under `db reset`+`test:rls`, so local tests catch a residual ambiguity.)
- **3.2** — `supabase db reset && npm run test:rls` locally — RLS still green.
- **3.3** — **GATE 2** (Codex, pre-TEST migration review: idempotency, grants, rollback completeness). Pre-push gate + PR. CI applies to TEST automatically.
- **3.4** — **TEST-DB verify:** `SELECT public.is_admin('<real-admin-uuid>')` → true and `is_admin('<non-admin-uuid>')` → false with NO 42702; re-run a simulated-authenticated `lesson_archive` SELECT (`SET LOCAL role authenticated` + `request.jwt.claims`) and confirm it no longer throws. After merge → PROD migration approval → PROD MCP verify.

**Gates:** local reset+RLS · GATE 2 · TEST-DB verify · PROD migration approval · PROD MCP verify. **No additive-RPC hazard** (signature unchanged).

### PR4 — C138 detect-duplicates auth gate  ·  branch `fix/wave2-c138-detect-dup-auth`  ·  pipeline: edge-function

**Bug (re-scoped):** `detect-duplicates/index.ts:201-216` builds a **service-role client with zero in-code auth**, deployed `--no-verify-jwt` → an unauthenticated internet endpoint that enumerates the entire `lessons` corpus (incl. retired rows) via RPCs + `lessons_with_metadata` and inserts into `submission_similarities` (`:400-402`). Called server-to-server by `process-submission/index.ts:568-573` with the service key as bearer. (`submission_similarities.submission_id` has an FK to `lesson_submissions(id)`, baseline `:2898`, so arbitrary-row injection is blocked — the real exposure is read-amplification + DoS.)

**Tasks:**
- **4.1** — Add an auth gate at the top of `detect-duplicates`'s `serve()`: accept if `Authorization` token `=== SERVICE_ROLE_KEY` (constant-time compare, mirror `extract-google-doc/index.ts:42-60` — the real in-repo `crypto.subtle.timingSafeEqual` service-role-or-user-token pattern) **OR** `getUser(token)` resolves to a reviewer/admin/super_admin. **Must preserve the `process-submission` hop** (it sends the service key at `:572`). **Companion (required, SAME PR — GATE-1):** the daily smoke `scripts/test-edge-functions.mjs` calls `detect-duplicates` (`:74`) with `Bearer ${SUPABASE_ANON_KEY}` (`:60, :138`) — the new gate will 401 it and turn the smoke cron red. Update that smoke path to send the service-role key (keep `submissionId` omitted to avoid writes) or demote it to an OPTIONS health check.
- **4.2** — Update `supabase/functions/CLAUDE.md`: remove the unsafe `CORS:*` + "use service role for admin operations" template so new functions don't copy the shape.
- **4.3 `[evidence-lockable]` (default DEFER):** `generate-embeddings` / `generate-gemini-embeddings` are unauthenticated API-key proxies (cost/DoS; the gemini one already has a 60/min IP limit). Default = note as a follow-up, keep PR4 focused. Only fold in if trivial AND the supervisor confirms it doesn't bloat the PR.
- **4.4** — Pre-push gate + PR → deploy → 3-signal verify `detect-duplicates`. **TEST verify:** unauthenticated call → rejected; `process-submission` end-to-end → dup detection still succeeds.

**Gates:** 3-signal post-deploy + TEST-DB verify. No migration.

---

## §3 — STATUS (WHERE we are)

**Last updated:** 2026-06-21 by Session 5 (PR4 C138 **coded + supervisor-verified + both pre-push gates clear**; about to push + open PR).

### Current State
**Active PR:** PR4 — C138 detect-duplicates auth gate (LAST Wave-2 item; **branch cut, coded, gates passed — pushing now**). Branch `fix/wave2-c138-detect-dup-auth`.
**Current task:** Push branch + `gh pr create`, then four-surface triage → deploy → 3-signal PROD verify + TEST verify. **Code complete on branch:** `146b799` (gate + smoke demote + CLAUDE.md scrub) + `94ebc6b` (stale smoke comment 11→10). Auth gate mirrors `extract-google-doc:42-60` constant-time service-role compare OR reviewer/admin/super_admin user token; `process-submission` hop (service-role bearer) preserved; smoke demoted FULL_SMOKE→HEALTH_CHECK (OPTIONS-only) because the PROD smoke runs anon-key-only + no prod service-role secret in CI. `npm run check` green.
**Pre-push gates (both clear):** Codex GATE 3 (cross-family) = all 6 dims CLEAN, SAFE TO PUSH. Claude `feature-dev:code-reviewer` = 1 HIGH → **investigated + REJECTED as false positive (GATE-4):** claimed `crypto.subtle.timingSafeEqual` returns a Promise in Deno (→ equal-length-token bypass) — FALSE. Deno's `crypto.subtle.timingSafeEqual` is a **synchronous** non-standard extension returning `boolean` (verbatim std source `(a,b): boolean`, no async/await; absent from W3C SubtleCrypto, which is why the analogy failed). Same un-awaited idiom is shipped + PROD-verified in `send-email` (PR2) + `extract-google-doc`. No `await` added (would diverge from the 2 shipped gates for zero benefit). Reviewer's `.replace('Bearer ')` note self-rated sub-threshold (pre-existing shared pattern). **No code changes from the gates.**
**Last commit on main:** `c52a00e` (#530 C20). PR4 branch carries the 2 code commits + this §3/status-doc edit (commit it onto the branch before push). Unrelated untracked `docs/plans/*-kickoff.md` + `heritage-worksheet-form/` left alone.
**How to resume:** push `fix/wave2-c138-detect-dup-auth` → `gh pr create` → four-surface triage → on merge, deploy-edge-functions to PROD (manual approval) → **3-signal PROD edge verify** `detect-duplicates` (version bump + ezbr_sha256 + grep gate code) + TEST verify (unauth call → 401/403; `process-submission` E2E → dup detection still succeeds). Embedding-proxy auth (4.3) stays DEFERRED.

**Out-of-scope follow-up surfaced during PR2 (C133) — NOT yet addressed (DO NOT fold into PR3 without user OK; PR3 is locked to the is_admin fix):** `password-reset` audit inserts use `action: 'password_changed'`/`'password_reset_requested'` — NOT in `user_management_audit_action_check` → silently rejected (same class as C137's `bulk_users_*`). Needs a migration to widen the CHECK or a remap; separate from the C133 auth fix. Candidate for a tiny standalone migration or Wave-3 hygiene.

**PR1 — ✅ DONE + PROD-verified:** merged #527 (squash `b4a5fc3`) + PROD 3-signal verified (`user-management` v28). Filed "supabase.sql crash" was actually a routing-404; PR1 fixed routing + crash + audit vocab (edge+frontend) + error toast + GATE-3 guards. Branch deleted.
**PR2 — ✅ DONE + PROD-verified (Session 4 reconfirmed):** merged #528 (squash `05d86ce`) + edge deploy ran (deploy-edge-functions 2026-06-21 22:37Z, re-run 22:59Z). **3-signal PROD verify (Session 4): `send-email` v31, deployed source carries the locked gate** — constant-time `crypto.subtle.timingSafeEqual` service-role check, `SERVICE_ROLE_ONLY_TYPES` (8 backend types), `ADMIN_JWT_TYPES={invitation,welcome}`, unknown-type→400. Per-type matrix + Option-B-full raw-fetch switch (6 live invoke sites) all live. `#529` (setup-cli CI auth) landed after as an unrelated CI flake fix.

### Recent decisions worth carrying forward
- Scaffold committed on PR1's branch (not a standalone docs PR) per user instruction — the Wave-1 ✅ and theme-b CLOSED banners ride PR1's first commit.
- GATE 1A/1B was run as ONE combined scaffold review (small-initiative calibration), not two separate gates — see Session 1 log.
- **Codex GATE-1 (round 2) findings — all folded:** (1) **C20 param can't be renamed** via `CREATE OR REPLACE` (42P13; DROP unsafe — RLS deps) → disambiguate body via `$1`; (2) **C137 bulk audit actions** (`bulk_users_*`) violate the audit CHECK but are silently swallowed → use valid enum values; (3) **C133 has a 4th caller** (invitation-management, the orphaned C128 endpoint); (4) **C138's gate breaks the anon-key smoke test** → fix it in the same PR.

### Done
- ✅ **Scaffold (Session 1)** — recon (6-agent read-only workflow) → this doc + the master campaign status doc → combined GATE-1 review → committed on `fix/wave2-c137-user-delete-crash` with the Wave-1/theme-b banners. No code yet.
- ✅ **PR1 / C137 (Sessions 2–3) — SHIPPED + PROD-VERIFIED.** Merged #527 (squash `b4a5fc3`); 3-signal PROD pass. Scope expanded (user-approved) to fix the routing-404 the supabase.sql crash hid; E2E-proven on TEST (real soft-delete + partial-failure + audit). Branch deleted. Full detail in memory [[project_deferred_work_campaign]]. Deferred follow-up: AdminAnalytics dead `bulk_users_*` labels (below).
- ✅ **PR2 / C133 (Session 3, reconfirmed Session 4) — SHIPPED + PROD-VERIFIED.** Merged #528 (squash `05d86ce`); edge deploy ran + Session-4 3-signal PROD verify (`send-email` v31, locked gate live in deployed source). Per-type auth matrix (8 service-role-only + 2 admin-JWT) + Option-B-full raw-fetch switch for the 6 live invoke sites. Codex GATE-3 caught a HIGH the Claude reviewer missed (raw-fetch switch activated a `password-reset/notify` spoof → recipient resolved server-side from `userId`). Branch deleted. Deferred follow-up: `password-reset` audit-action CHECK gap (above).
- ✅ **PR3 / C20 (Session 4) — SHIPPED + PROD-VERIFIED.** Merged #530 (squash `c52a00e`); migration `20260621000000_fix_is_admin_ambiguous_param.sql` keeps the `user_id` param + disambiguates via `$1` + `user_profiles.id`. One executor (general-purpose, fresh context) built it; supervisor-verified independently (local + TEST + PROD MCP); both pre-push gates (Claude reviewer + Codex GATE 2) + bot review all clean/no-blockers. TEST-DB verify 143 rows + PROD verify 127 rows on the simulated-auth `lesson_archive` SELECT, all no-42702. Branch deleted. Surfaced follow-up: SECURITY DEFINER `search_path` hardening sweep (above).

### In flight
- PR4 / C138 — coded + supervisor-verified + both pre-push gates clear; pushing + opening PR now. Last Wave-2 item.

### Blocked
(none — user-approval gates are expected, not blockers)

### Out-of-scope follow-ups captured here
- C04 (Resend DNS — user's), C128 (orphaned `invitation-management` — arch decision), C130 (admin session timeout — later frontend slice), C05 (rejection UI — gated on C04), C138 embedding-proxy auth (default deferred). Lift to project memory when the wave closes.
- **SECURITY DEFINER hardening sweep (surfaced by PR3 / C20 bot review, 2026-06-21):** the Supabase `function_search_path_mutable` advisor class — SECURITY DEFINER functions (incl. `is_admin`) have **no `SET search_path`** → theoretical search_path-injection surface. Real but PRE-EXISTING + fleet-wide; deliberately out of scope for a 42702 fix (locked decision #5). Right fix = a dedicated migration setting `SET search_path = public, pg_temp` (or `''` + fully-qualified refs) across ALL SECURITY DEFINER functions at once, tested together. Candidate for a Wave-2 residual or Wave-7 tech-debt slice. (Companion bot nit — `GRANT EXECUTE` vs `GRANT ALL` — is NOT a real follow-up: for a function object `GRANT ALL` confers exactly `EXECUTE`, so it's functionally identical, cosmetic only.)
- **AdminAnalytics.tsx:402–404 dead audit-action labels** (surfaced Session 2 during PR1 verify): the `formatAction` map keys `bulk_users_activated`/`bulk_users_deactivated`/`bulk_users_deleted` — values that no longer get written (canonical vocab is `user_activated`/`user_deactivated`/`user_deleted`). The map is ALSO missing `user_activated`/`user_deactivated`/`user_role_changed`/`permissions_changed`, so single-user activate/deactivate already render as raw strings there today (pre-existing). Display-only; a deliberate reconciliation against `IntActivityTimeline`'s (more complete) label source is the right fix — NOT a drive-by in a crash/security PR. Deferred out of PR1.

### Session log
#### Session 1 — 2026-06-21 — Wave 2 kickoff + scaffold
- Read campaign memory + roadmap (Wave 2) + `reference_ci_flakes` + `reference_database_pipeline`.
- Ran a 6-agent read-only recon workflow against `main` @ `9eb1b6e`; surfaced 3 roadmap-vs-code corrections (C138 mostly fixed, C128 orphaned, C133 worse + transport trap).
- User signed off (4 questions): separate PRs · defer C128 · defer C130 · small-initiative scaffold.
- Authored this combined doc + `2026-06-21-deferred-campaign-status.md`; folded the Wave-1 ✅ SHIPPED banner (roadmap) + CLOSED banner (theme-b status doc).
- GATE-1 review: Claude reviewer (folded 1 HIGH — service-role pattern → `extract-google-doc:42-60`) + **Codex cross-family, retried & returned: 1 BLOCKER (C20 can't rename param via CREATE OR REPLACE — 42P13 verified on TEST → disambiguate via `$1`) + 1 HIGH (C137 bulk audit action violates CHECK, silently swallowed) + 2 MEDIUM (C133 invitation-management 4th caller; C138 breaks anon-key smoke test). All verified against code + folded into §1/§2.**
- **Next:** `/clear` → execute PR1 (C137) in a fresh session.

#### Session 2 — 2026-06-21 — PR1 (C137) coded + verified
- Session-start ritual clean: git matched §3, `npm run check` green baseline.
- Dispatched ONE executor (Opus, fresh context) for Tasks 1.1+1.2+1.3 (user-approved bundling — one coherent change across `user-management/index.ts` + `AdminUsers.tsx`). Executor reported done; committed `5a1c675`.
- **Supervisor-verify (load-bearing) caught a real miss the spec didn't anticipate:** the GATE-1 claim that the edge audit fix "closes the activate/deactivate gap" was inaccurate — the live activate/deactivate bulk path does NOT call the edge fn; it does a client-side audit insert at `AdminUsers.tsx:313` with the same invalid `bulk_users_*` enum (silently rejected by `user_management_audit_action_check`). Grep proved `user_activated`/`user_deactivated`/`user_deleted` is the canonical vocab (types/auth.ts, AdminUserDetail single-user path, IntActivityTimeline + its tests, DB CHECK). Folded a 2-line fix → canonical enum + `bulk:true` metadata. Commit `1c1bd40`.
- Captured the `AdminAnalytics.tsx:402–404` dead-label inconsistency as a deferred follow-up (display-only; reconcile against IntActivityTimeline later).
- Verified: no `supabase.sql` anywhere in `supabase/functions/`; no `bulk_users_*` WRITES remain (only AdminAnalytics display labels); `npm run check` exit 0; diff reviewed line-by-line.
- Pre-push gates run: Claude code-reviewer (clean) + Codex GATE 3 (1 HIGH pre-read-error-discarded + 1 MEDIUM truthful-count, both folded `2353194`; rejected 500-on-zero-rows). Pushed → **PR #527 OPEN**.
- **MAJOR E2E discovery (Task-1.4 TEST verify):** the deployed `user-management` fn returns **HTTP 404** for the admin bulk-delete — confirmed 3 ways incl. supabase-js `functions.invoke('user-management',{action:'delete'})` as authed admin on TEST. The fn routes by `pathParts[0]==='users'` but the served path keeps the `user-management` segment, so NO route ever matched → 404 fallback. The `supabase.sql` crash was an UNREACHABLE latent bug; the real blocker for working admin delete is this routing 404 (same router on main → PROD affected too). Security Audit CI check = pre-existing noise (fails on main 3/3). TEST audit CHECK confirmed = PROD (no drift).
- **User approved expanding PR1 to fix the routing.** Two-part fix committed `47d37af`: edge fn resolves route relative to the `user-management` segment; frontend invokes the explicit `user-management/users/bulk` subpath. No migration (Option B still holds).
- **Next:** push routing fix → wait for `Deploy to TEST — user-management` → re-fetch deployed fn (confirm routing code live) → E2E throwaway bulk-delete on TEST (957e2ca9 / 78cbe55c: confirm `is_active` flip + ` [DELETED]` notes append + `user_deleted`+`bulk:true` audit row) + restore → then `/pr-triage 527` external bots → PROD deploy approval → 3-signal.

#### Session 3 — 2026-06-21 — PR2 (C133) shipped (log reconstructed from git in Session 4)
- The doc froze mid-Task-2.2; no contemporaneous Session-3 log entry was written. Reconstructed from git/PR records:
- PR1 (C137) merged #527 (`b4a5fc3`); PR2 (C133) built on `fix/wave2-c133-send-email-auth`, per-type auth gate + Option-B-full raw-fetch switch, Codex GATE-3 HIGH folded (`221f5b0`), merged #528 (squash `05d86ce`) at 22:37Z. Edge deploy succeeded (22:37Z + 22:59Z re-run). `#529` setup-cli CI auth fix landed after (unrelated flake).

#### Session 4 — 2026-06-21 — Reconcile + PR3 kickoff
- Session-start ritual: git had diverged from §3 (doc still said PR2 active). Trusted git, confirmed via `gh`: PR1 #527 + PR2 #528 BOTH merged. `npm run check` green; tree clean (only unrelated untracked docs).
- **PR2 PROD 3-signal verify (load-bearing — merge ≠ deploy for edge fns):** `send-email` v31, deployed source carries the full locked gate (constant-time service-role check + 8 service-role-only types + {invitation,welcome} admin-JWT + unknown→400). PR2 confirmed truly shipped, not half-shipped.
- Reconciled §3 + the master campaign status doc to reality (PR1 ✅ + PR2 ✅; PR3 next).
- **PR3 / C20 built + shipped same session:** user confirmed orientation → dispatched ONE general-purpose executor (fresh context) for Tasks 3.1+3.2 (migration + local verify). Executor created `20260621000000_fix_is_admin_ambiguous_param.sql` (`d898a9b`), committed clean (migration-only). **Supervisor-verify (load-bearing):** independently re-ran the local `is_admin` probe (true/false/no-arg, no-42702; SECURITY DEFINER + null search_path preserved) + `test:rls` (16/16; the 2 `archive_duplicate_lesson` failures confirmed pre-existing on clean main).
- **Pre-push gates** (parallel, Task 3.3): Claude `feature-dev:code-reviewer` = no high-confidence issues; **Codex GATE 2** (cross-family) = no blocking findings, all 6 adversarial dims CLEAN. Bundled the §3/status-doc reconciliation into a 2nd branch commit (`d045055`) to avoid a docs-only CI cycle later. `npm run check` green → pushed → **PR #530**.
- **Four-surface bot triage:** claude[bot] review = APPROVE/no-blockers; no PR reviews; no line comments; Security Audit fail = pre-existing `npm audit` dep-vuln noise (PR adds zero deps). E2E + all substantive checks green. Rebuttal-pass on 3 non-blocking suggestions — all out-of-scope, NONE folded (captured the SECURITY DEFINER `search_path` hardening sweep as a deferred follow-up; noted `GRANT EXECUTE` nit is functionally-equivalent cosmetic).
- **Task 3.4 TEST verify** (CI applied to TEST): body=`$1`, probes true/false/no-42702, simulated-auth `lesson_archive` SELECT = 143 rows, no throw.
- User: "Hold — finish PR3 first" → "you can merge" → squash-merged #530 (`c52a00e`), deleted both branches. `migrate-production` run `27921252908` waited at the manual gate; user approved → applied + CI-verified.
- **PROD MCP verify (read-only):** body=`$1`, probes true/false/no-42702, simulated-auth `lesson_archive` SELECT = 127 rows, no throw. **PR3 SHIPPED + PROD-VERIFIED.**
- **Next:** user checkpointed before PR4. On their go → PR4 (C138 detect-duplicates auth gate), the last Wave-2 item.

#### Session 5 — 2026-06-21 — PR4 (C138) coded + gated
- Session-start ritual clean: git matched §3 (`c52a00e` HEAD, PR1/2/3 merged), `npm run check` green, only the §3/status-doc working-tree edits + unrelated untracked files.
- User gave go → cut `fix/wave2-c138-detect-dup-auth` off `main` (carried the §3 edits onto it).
- **Supervisor recon locked the one open sub-decision (the smoke companion fix):** `edge-function-smoke.yml:58-59` runs the smoke against **PROD with only the anon key**, and NO prod service-role secret exists in CI (only `..._KEY_TEST` in e2e). Injecting the prod service-role key into a scheduled cron would enlarge the exact surface C138 closes → **demote `detect-duplicates` FULL_SMOKE→HEALTH_CHECK (OPTIONS)**, not switch to service-role. Also confirmed **no `src/` frontend caller** of detect-duplicates (only `process-submission:568`), so the reviewer/admin/super_admin role-gate breaks no prod flow.
- Dispatched ONE general-purpose executor (fresh context) for Tasks 4.1+4.2. Built `146b799` (gate + smoke demote + CLAUDE.md scrub). Supervisor caught + fixed a pre-existing stale comment (smoke tests 10 fns not 11) → `94ebc6b`.
- **Supervisor-verify (load-bearing):** re-ran `npm run check` (exit 0), read the full gate diff (matches locked design exactly), confirmed `process-submission` untouched (the "1" grep hit was the commit-message mention, not a file change), smoke demote correct (removed from FULL_SMOKE, added to HEALTH_CHECK, header accurate 2+8=10).
- **Pre-push gates (parallel):** **Codex GATE 3** (cross-family) = all 6 dims CLEAN, SAFE TO PUSH. **Claude `feature-dev:code-reviewer`** = 1 HIGH → **GATE-4 investigation → REJECTED as false positive:** claimed Deno's `crypto.subtle.timingSafeEqual` returns a Promise (→ un-awaited = equal-length-token bypass). Settled empirically (no local Deno) via authoritative Deno docs + verbatim std source: signature is `(a,b): boolean`, **synchronous**, no async/await — it's a Deno non-standard extension (hence absent from the W3C SubtleCrypto page the reviewer analogized from). Corroborated by Codex (Dim 1 CLEAN) + the same idiom shipping PROD-verified in `send-email` (PR2) + `extract-google-doc`. No `await` added. `.replace('Bearer ')` note = sub-threshold pre-existing pattern. **No code changes from gates.**
- **Next:** push → `gh pr create` → four-surface triage → deploy → 3-signal PROD verify + TEST verify.
