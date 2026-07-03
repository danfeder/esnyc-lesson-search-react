# Wave-3 Tail — C33 + C40 — Session Kickoff (post-/clear)

> Untracked scratch doc (like the other `docs/plans/*-kickoff.md`). Do **not** commit it; leave it untracked. Memory satellite `project_deferred_work_campaign.md` is the durable source of truth.

## What just shipped (the session before this one, 2026-06-22)
- **C169 Phase 2 DONE:** merged #450 setup-cli (`d42bc50`) + #502 actions-netlify (`f65c051`) + #501 codecov (`ef6e5f9`); closed #458 glob. Deferred majors **#460 eslint 9→10** + **#451 TS 5.9→6.0** are **STILL DEFERRED — leave them open & untouched (user call).**
- **Security Audit check FIXED:** PR #535 (`4ee9cea`) — `npm audit fix` cleared all criticals + prod highs; `security.yml` blocking gate scoped to prod (`--omit=dev --audit-level=high`) + non-blocking full-tree audit. Dev-only lhci leftovers tracked in **issue #536**. ⚠️ A red `Security Audit` now = a REAL prod high+ vuln; don't dismiss it.
- `main` should be at `4ee9cea` or later.

## This session's job: the last two Wave-3 tail items, then Wave 3 = DONE.

---

## C33 — deploy-edge-functions post-deploy verify + serialize the matrix (the careful PR, REAL TEETH)

**Why it matters:** `deploy-edge-functions.yml` deploys via `supabase functions deploy "$FUNCTION_NAME" --no-verify-jwt` inside a `max-parallel: 4` matrix (`deploy-test` job ~line 182, `deploy-prod` job ~line 255) and has **NO post-deploy verification step**. The CLI's `Deployed Functions on project:` log line is NOT proof the source changed — the **`complete-review` silent-no-op recurred 2×** (Phase 7c PR #465, PR E #516) and **`password-reset` silently no-op'd on the TEST matrix leg** (PR #528 C133). See [[reference_ci_flakes]] → "Verify every PROD edge-function deploy via MCP before claiming success" for the full history + the **3-signal pattern** (version + `ezbr_sha256` vs TEST + `files[].content` source grep).

**The two changes:**
1. **Add a per-function post-deploy verify step** (in both `deploy-test` and `deploy-prod` matrix jobs) that, after the deploy, confirms the deployed source actually changed — e.g. fetch the function via the Supabase Management API / CLI and assert the new version/hash, failing the job loudly on a silent no-op. (The current 3-signal verify is done manually via `mcp__supabase-*__get_edge_function`; C33 bakes an automated equivalent into CI.)
2. **Serialize the matrix** — drop `max-parallel: 4` → `max-parallel: 1` (or add explicit ordering) so deploys don't race and each is verified before the next. `fail-fast: false` stays (one function failing shouldn't strand the others' verification).

**⚠️ TESTING GOTCHA (carryover lesson from C169 Phase 2):** C33 changes only workflow YAML → it changes no edge-function source → so on the PR, `detect-changes` finds "no functions to deploy" and **both the deploy AND the new verify step are SKIPPED** (same migration-gated-skip trap that bit setup-cli #450, where e2e's Setup-Supabase-CLI step skipped). To actually exercise the new verify step before merge, **dispatch it on the branch**: `gh workflow run deploy-edge-functions.yml --ref <branch> -f environment=test -f function=<some-fn>` (TEST target; PROD needs manual approval). Pick a function and confirm the new verify step runs + passes on a real deploy, AND deliberately confirm it would FAIL on a no-op (the whole point).

**Standing gates (this is a PROD-pipeline workflow):** pre-push `feature-dev:code-reviewer` + Codex cross-exam (return findings INLINE — note Codex's sandbox has NO network, so for anything requiring a live API call, the authoritative check is the real CI run / local MCP, not Codex); bots + claude-review; **never merge without the user's explicit go**; verify on TEST before it ever rides PROD.

**Bookkeeping fold (do it in C33's branch — trust-git-then-fix):** the Wave-3 exec doc `docs/plans/2026-06-22-wave3-repo-docs-hygiene-execution.md` §3 + the master tracker `docs/plans/2026-06-21-deferred-campaign-status.md` still read **"PR C in flight"** on `main` (the merge happened after those edits). In C33's first commit, fold in: PR C merged (`063bd4b`) → Wave-3 CORE complete; C169 Phase 2 done; Security Audit fixed (PR #535); then mark C33 itself.

---

## C40 — out-of-repo memory archive-split (trivial, NO PR, zero-risk)

Three memory journals have grown large and are all SHIPPED/CLOSED initiatives (bulk = historical forensics, rarely needed live):
- `project_metadata_rebuild_initiative.md` (~110KB)
- `project_internal_design_system.md` (~80KB)
- `project_lesson_submission_tier1.md` (~66KB)

(All under `/Users/danfeder/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/`.)

**Approach:** for each, split the bulk historical detail into an `_archive.md` (or similar) companion and leave a slim active file holding the current-state summary + deferred-follow-ups + a pointer to the archive. Update the `MEMORY.md` index line if the slug changes. Zero repo impact (memory is out-of-repo). The F9-full "memory archive-split" brief in [[reference_working_efficiency_deferred]] may have a ready template/method — check it first.

---

## Deferred — DO NOT TOUCH this session (user call)
- **#460** eslint 9→10 (flat-config breaking work — own session, or close)
- **#451** TypeScript 5.9→6.0 (new type errors — own session, or close)

## After C33 + C40 → **Wave 3 = DONE** → next is roadmap **Wave 4** (data/corpus cleanup, DB-careful: C11/C12/C08/C01/C02/C09). Roadmap: `docs/plans/2026-06-20-deferred-work-roadmap.md`.

## Session-start steps
1. `git status --short && git rev-parse --abbrev-ref HEAD && git log --oneline -3` — confirm clean `main` @ `4ee9cea`+ (only the untracked `*-kickoff.md` + `heritage-worksheet-form/` should be untracked — leave them, incl. THIS file).
2. Recall campaign memory `project_deferred_work_campaign.md` (Wave-3 tail checklist is at the top) + `reference_ci_flakes.md` (the 3-signal edge-deploy verify playbook — load before touching C33).
3. Pick order: C40 first (trivial warm-up, no PR) or C33 first (the meaty one). Tell the user where you are.
