# T4 Corpus Dedup — Design Decisions (Fable design session, 2026-07-02)

**The slim-scaffold exception track** (mutates data). Companion status doc:
`2026-07-02-t4-status.md`. Execution briefs: `2026-07-02-brief-t4a-candidate-sweep.md`
(sweep prep) + `2026-07-02-brief-t4b-review-reshape.md` (code PR). All user decisions below
were made live with the user on 2026-07-02.

## What T4 is

Two tracks, shipped independently:

- **Track A — corpus sweep:** find every duplicate-candidate pair in the live `lessons`
  corpus, review them all with the user in a live walkthrough, retire the true duplicate
  copies (reversibly), and record a family-type label on every "keep both" pair.
- **Track B — review-flow reshape (code PR):** rebuild the reviewer decision screen around
  one plain question, wire the missing Reject path honestly, rewrite `detect-duplicates`
  without embeddings, and remove the old admin Duplicates pages.

## PROD recon that drove the design (probed live 2026-07-02, read-only)

- 785 `lessons` rows; **21 already retired** (`retired_reason='import:…'`, the May imports
  cleanup) → **764 live**. `retired_at`/`retired_reason` + `search_lessons` filtering is an
  established, PROD-proven soft-retire mechanism (migrations `20260520000000/20260520020000/
  20260520030000`).
- **46 normalized-same-title groups among live rows (96 rows, 50 excess copies).** Title
  normalization MUST strip control characters — 10 pairs differ only by a trailing ``
  (vertical tab) or stray spaces; plain `trim()` misses them.
- Exactly **1 byte-identical pair** (`content_hash` equal): two Fattoush rows (1,008 chars each).
- **Content trigram similarity cleanly separates the cases** on the 50 same-title live pairs:
  ~16 pairs ≥0.90 (true copies: Sun Printing 0.99, Garden in the Fall 0.97, Worm Study 0.97…)
  down to 0.30–0.57 for same-name-different-lesson (Fattoush variants, Seed Dispersal ×3,
  The Water Cycle). pg_trgm 1.6 installed on PROD.
- Fuzzy title pool sizes (live pairs): sim>0.5 → 324, >0.6 → 176, >0.7 → 100. Tractable.
- Prior art: an Aug–Sep 2025 dedup pass left 86 `duplicate_resolutions` rows, 127
  `lesson_archive` rows, 1 `canonical_lessons` row; its notes already recognized
  "PEDAGOGICAL_VARIATIONS" (the third state). It did not finish: the 46 groups are live today.
  `lessons.canonical_id` is populated on 0 rows (dead). `series_id`/`part_number` exist,
  0 rows populated.
- **`archive_duplicate_lesson` HARD-DELETES** from `lessons` (snapshot to `lesson_archive`,
  then `DELETE`) while the admin UI copy claims "soft-deleted"
  (`20260209140001_cleanup_archive_function.sql:56-93`, `AdminDuplicateReview.tsx:361`).
- The reviewer dup-panel disconnect is confirmed at `ReviewDetail.tsx:190`
  (`selectedLessonId: decision === 'approve_update' ? selectedDuplicate : null`).
- Reject is already supported server-side (`complete-review/index.ts:15,29`; RPC
  `complete_review_atomic` accepts `'reject'`, `20260702000000_…:64`); the teacher-side blank
  badge is `UserProfile.tsx:43` omitting `rejected` from `SubmissionStatus`/`STATUS_BADGE`.

## Decisions (D1–D12)

**D1 — Scope: duplicates now, families right after the sprint (user).** This sweep only
retires true copies. But the walkthrough records a family-type label on every "keep both"
pair, so the post-sprint "organize families" project starts with a complete labeled
inventory and needs no second review pass. Family display/linking design is explicitly OUT
of T4.

**D2 — Candidates via text similarity, no embeddings (pre-made directive, confirmed by
probes).** Signals: normalized-title equality (lowercase, collapse ALL whitespace incl.
control chars), title trigram similarity, content-text trigram similarity, `content_hash`
equality, metadata-set overlap. Candidate blocking rules in brief t4a. The embedding
machinery is retired, not repaired (mismatched vector spaces; the T2 false-"EXACT" at
0.999997 embedding-sim with disagreeing hash). C2.4 embeddings-regen dies with it.

**D3 — Three verdicts per group (pre-made directive):** `retire_duplicate` (pick survivor) /
`keep_family` with a label (`grade-band` | `mobile-ed` | `series-part` |
`same-dish-different-lesson` | `other`) / `unrelated` (false positive). The Fattoush pair
(content_sim 0.30–0.57) is the canonical keep_family regression case; Sun Printing (0.99)
the canonical retire case.

**D4 — Adjudication = live walkthrough with the user, run by Fable (user choice; 3rd Fable
session, user-authorized).** A pre-built evidence deck makes it fast: Tier A (near-certain,
content_sim ≥0.92) bulk-confirmed in batches; Tier B (0.75–0.92) quick singles; Tier C
(judgment: families, low-sim same-titles) discussed. User declined the worksheet-tool and
Google-Sheet formats.

**D5 — Retire mechanics: reuse the proven soft-retire, never DELETE.** Migration file sets
`retired_at=now()`, `retired_reason='dedup:<group_id>'` on user-approved losers only.
Snapshot rollback table (`t4_dedup_retire_rollback`) created in the same migration, imports-
cleanup style. TEST rehearsal first; user approves the PROD gate (PROD applies are USER-only).
No FK hazard because nothing is deleted; retired rows stay reachable by direct link
(`lessons_with_metadata` exposes retired — `20260520030000`). Survivors are untouched — **no
metadata blending/merging** (the old pass's "merge" complexity is deliberately dropped).

**D6 — Decisions land in a committed repo artifact, not a new DB table (pre-launch).**
`docs/plans/t4-dedup/decisions.json`: every group, verdict, family label, survivor, and who
decided (user, date). The families project ingests this; it designs its own schema then.
Minimal moving parts now; census-provenance rule satisfied (queries + results committed).

**D7 — Reviewer screen: ONE decision list (user choice between two presented shapes).**
Evidence cards sit under the plain question **"Is this lesson already in the library?"**;
below, one honest decision list:
1. Publish as a NEW lesson
2. Publish as an UPDATE to "<selected>" — inline explainer: *replaces the library copy; the
   old version is archived* (renames the unexplained "Merge into existing")
3. Don't publish — it's already in the library (duplicate of "<selected>")
4. Send back for revisions
5. Reject — with a reason the teacher will see

Guard: choosing "Publish as NEW" while an identical/nearly-identical card is present triggers
an are-you-sure confirm. The card selection FEEDS options 2–3; the silent-ignore disconnect
(`ReviewDetail.tsx:190`) is structurally impossible in the new shape. With zero candidates
the screen is just options 1/4/5. Match labels go plain-language (no "dup", no raw
match-type jargon; % may stay as secondary detail).

**D8 — "Already in the library" = the existing reject path, no new status.** Sends
`decision:'reject'` with a prefilled, editable note ("This lesson is already in the library
as '<title>'."). Teacher-side fix: add `rejected` to `UserProfile.tsx`'s status map with an
honest badge + the reviewer's note. No schema change.

**D9 — `detect-duplicates` rewrite:** drop the embedding leg entirely; new legs = content-hash
exact + one new SQL RPC computing pg_trgm title & content similarity against live
(`retired_at IS NULL`) lessons + the existing TS metadata overlap. `exact` label is awarded
ONLY on hash match (fixes the false-EXACT class). `submission_similarities` shape and
internal match-type codes unchanged (display labels remap in frontend).
`process-submission` stops generating/updating `content_embedding`; the columns stay
(inert; on the post-launch drop list).

**D10 — Remove the admin Duplicates pages (user-ratified).** Routes `/admin/duplicates(/:groupId)`
(`App.tsx:155-169`), nav link (`Header.tsx:146`), both pages + `duplicateGroupService` +
tests. `archive_duplicate_lesson` gets `REVOKE EXECUTE` (two-stage retirement; DROP
post-launch) because it hard-deletes while claiming to be reversible. History tables
(`lesson_archive`, `duplicate_resolutions`, `canonical_lessons`, `duplicate_group_dismissals`)
stay as inert history. The sweep + reshaped review flow replace this page's job.

**D11 — Small honesty fixes ride Track B:** title-mismatch banner attributes the match to
whoever actually made it (detector vs submitter); "1 POSSIBLE DUP" → spelled out; duplicate
card CSS overflow fixed.

**D12 — Imports deletion track: nothing to fold in.** Already executed 2026-05-08
(21 retired rows on PROD). The handoff's open question is closed.

## Sequencing

1. **t4a** (Opus session, brief ready): sweep script + Sonnet evidence deck → files on disk.
   Fan-out model pinned to **Sonnet 4.6** (`claude-sonnet-4-6`), user directive 2026-07-02 —
   not the bare `sonnet` alias (now = Sonnet 5). Its PR carries this session's docs. No user
   time.
2. **Walkthrough** (Fable + user, deck in hand): decisions.json filled; session ends with
   Fable writing the retire-migration execution brief (t4c).
3. **t4c** (Opus): retire migration per D5 + decisions artifact committed.
4. **t4b** (Opus, brief ready): the code PR — independent of A; can run in parallel any time.
5. Then T5 (final smoke + launch).

Thin-driver rules bind t4a: Sonnet agents return structured JSON collected by script; no
agent output flows through a driver context; the walkthrough session reads the finished deck.

## Explicitly out of T4

Family linking/display design (post-sprint project); dropping `content_embedding` columns /
`canonical_id` / history tables (post-launch hygiene list); `find_duplicate_pairs` RPC drop
(unused after Track B; same list); google-docs-parser Title-case kebab fix (known
detect-duplicates metadata-leg gap — candidate to ride t4b only if trivially in reach,
otherwise stays deferred); AI pre-fill tagging (separate user decision, launch = manual).
