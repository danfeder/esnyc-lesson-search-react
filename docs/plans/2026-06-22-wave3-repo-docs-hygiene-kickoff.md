# Wave 3 — Repo / Docs Hygiene — Session Kickoff

> Paste this whole file into a fresh session (after `/clear`) to start Wave 3.
> Authored 2026-06-21 at the close of Wave 2 (all 4 PRs shipped + PROD-verified).

---

You're starting **Wave 3 of the deferred-work campaign.** Wave 1 (Theme-B public UX)
and Wave 2 (email + security P1) are both ✅ shipped + PROD-verified. Fresh session —
disk + git + memory are your only context. Goal this session: **right-size and scaffold
Wave 3, ending in a `/kickoff-feature` scaffold if the work warrants one.** Don't write
code or scaffold until the user has confirmed scope + weight.

## 1. Orient first (before proposing anything)
- Read the campaign memory `deferred-work-campaign-wave-1-theme-b-complete` (auto-loaded
  via MEMORY.md) — confirms W1+W2 done, W3 next, and lists the deferred follow-ups.
- Read the master tracker `docs/plans/2026-06-21-deferred-campaign-status.md` (Wave 3 row)
  and the roadmap `docs/plans/2026-06-20-deferred-work-roadmap.md` — **the roadmap's
  Wave-3 section is the source of truth for scope.** Pull the full list of W3 `C##` items.
  Known so far: `C60` (archive stale docs + add closure banners), `C169` (Dependabot
  triage) — but read the roadmap for the rest; don't trust this short list.
- `git status --short --branch && git log --oneline -5` — confirm `main` HEAD = `2d25e23`
  (#531 C138). If git and the docs disagree, trust git.
- **Working-tree note:** there are uncommitted Wave-2 close-out edits to
  `docs/plans/2026-06-21-deferred-campaign-status.md` (tracker → Wave 2 ✅ SHIPPED) and
  `docs/plans/2026-06-21-wave2-email-security-execution.md` (§3 → CLOSED). **Fold these
  into Wave 3's first PR's opening commit.** Leave the unrelated untracked `*-kickoff.md`
  files + `heritage-worksheet-form/` alone unless W3 scope explicitly covers filing them
  (ask the user first). NOTE: this kickoff file is itself one of those untracked
  `*-kickoff.md` files.
- `npm run check` — confirm a clean baseline.

## 2. Then brainstorm scope + weight WITH the user (before scaffolding)
The tracker currently calls W3 "mechanical single PRs — no scaffold," so `/kickoff-feature`'s
full 4-file weight may be overkill. Come back with: (a) the W3 item list + a proposed
sequence, and (b) a scaffold-weight recommendation — **none** (just open single PRs) vs
**small-initiative** (ONE combined exec doc + the existing master tracker, like Wave 2) vs
**full 4-file** — with reasoning. Most W3 work is docs-only → no DB/edge gates, lighter
ritual. Once agreed, invoke `/kickoff-feature` at that weight (or tee up the first single
PR if no scaffold).

## 3. Carry-forward rules
- **Standing gates** (only for items that touch them): migration PR → TEST-DB MCP verify;
  edge-fn PR → 3-signal PROD verify; pre-push Claude code-reviewer + Codex GATE 3;
  four-surface bot triage + GATE 4. `C169` dep bumps touch the lockfile/CI. The
  "Security Audit" check fails on a pre-existing `npm audit` dep-vuln backlog (@babel/core,
  basic-ftp, dompurify, brace-expansion) — that's known noise, not your change. Pure-docs
  items skip the DB/edge gates entirely.
- **NOT Wave 3** (don't fold without the user's OK): the deferred Wave-2 security/DB
  follow-ups (SECURITY DEFINER `search_path` sweep, `password-reset` audit-CHECK gap) are
  security/DB hygiene, not docs hygiene — they belong to a later wave.
- **Never without the user's explicit go:** push to main · merge a PR · approve a PROD
  deploy · force-push. PROD gates are the user's to approve (the data-safety boundary held
  in Wave 2 — keep it).

Start with orientation (§1), then come back with the §2 scope + weight recommendation.
