# Rung 8b — src/utils/ audit (files NOT touched tonight)

Run: 2026-07-03, main @ 0ed0d5d. READ-ONLY. Status: COMPLETE within budget.
Scope: src/utils/* EXCLUDING facetCounts, filterUtils, thematicNormalize, lessonToReviewMapper.
Covered: canonicalizeReviewMetadata, cn, debounce, errorHandling, featureFlags, filterDefinitions, heritage*.generated (spot), logger, parseSearchQuery, reviewToLessonMapper, sanitize, submissionStatus, titleSimilarity, urlParams.
Hunt: wrong-on-real-data helpers, dead exports the FP-15 sweep missed, duplicate logic.

## Findings

### F1 — WRONG-ON-REAL-DATA: logger keyword redaction nukes whole log MESSAGES, 6 confirmed product call sites lose their label in dev console AND prod Sentry
- **File:** `src/utils/logger.ts:46-49` (`sanitizeArgs`): if a STRING arg's lowercase form `.includes()` any of SENSITIVE_KEYS (`logger.ts:12-29` — includes bare `'key'`, `'auth'`, `'session'`, `'email'`, `'token'`), the ENTIRE string is replaced with `'[REDACTED]'`. This hits static human-written log labels, not just payloads.
- **Confirmed call sites (grep, case-insensitive, single-line string first-arg only — real count is a floor):**
  - `src/pages/AdminInvitations.tsx:215,220` — `logger.error('Failed to resend invitation email:', …)` → contains `email`
  - `src/pages/AdminInviteUser.tsx:208,213` — `'Failed to send invitation email:'` / `'Error invoking email function:'`
  - `src/lib/supabase.ts:11` — `logger.error('VITE_SUPABASE_ANON_KEY:', …)` → contains `key` (this is the missing-env startup diagnostic!)
  - `src/pages/UserProfile.tsx:264` — `'Error updating password:'`
- **Failure scenario:** invitation-email send fails on PROD → `logger.error` path (`logger.ts:152-173`) calls `captureMessage(argsToMessage(sanitized))` → the Sentry event message is literally `[REDACTED] {…}`; dev console likewise prints `[REDACTED]`. The one human-readable clue about WHICH failure fired is destroyed, while no sensitive data was ever present (these are static labels). Substring matching also means any future message containing "author", "unauthorized", "keyboard", "monkey" self-redacts.
- **Fix shape:** only redact strings that look like VALUES (`key=`, `key:`, JWT/API-key regexes already exist at :38-44), or exempt the first (label) argument, or require word-boundary + value-context match.

### F2 — DEAD MODULE missed by FP-15: `reviewToLessonMapper.ts` has zero product consumers
- **File:** `src/utils/reviewToLessonMapper.ts:27` (`export function reviewToLesson`).
- Only importer in the entire repo is a test: `src/types/__tests__/seasonTiming.backfill.test.ts:4`. Hits in `reviewFormPayload.zod.ts:14`, `lessonMetadata.zod.ts:10`, `lessonToReviewMapper.ts:5` are doc comments only. `grep -rn "from '@/utils/reviewToLessonMapper'" src supabase e2e scripts` → 1 test hit.
- The module's own doc block (`reviewToLessonMapper.ts:7-11`) claims two consumers — the ReviewDetail read site (actually uses the INVERSE, `lessonToReviewMapper`) and process-submission (a Deno edge function that cannot import `src/`; grep of `supabase/functions` confirms no use). Both claims false today.
- **Failure scenario:** none at runtime — but 88 product lines + 272 test lines masquerade as live infrastructure; the false doc comment invites someone to "keep it in sync" with `complete_review_atomic` SQL forever. Delete module + its test + the round-trip references, or move the round-trip test into `lessonToReviewMapper`'s test if the property is still wanted.

### F3 — DEAD EXPORTS missed by FP-15 in `filterDefinitions.ts`
- **File:** `src/utils/filterDefinitions.ts:295` — `METADATA_KEYS`: zero references anywhere (src, scripts, supabase/functions, e2e, tests).
- **File:** `src/utils/filterDefinitions.ts:173` — `METADATA_CONFIGS` `export` keyword: no external consumer (only in-file uses at :295 and :301; `ALL_FIELD_CONFIGS` at :299 is the exported surface actually consumed by `ReviewMetadataForm.tsx`). Demote to module-private const + delete METADATA_KEYS.
- **Failure scenario:** none at runtime; dead API surface that the FP-15 sweep's dead-export pass should have caught in this file.

### F4 — DEAD EXPORT missed by FP-15: `sanitizeHtml`
- **File:** `src/utils/sanitize.ts:31-38`. Sole consumers are its own tests (`sanitize.test.ts:60-75`). `sanitizeContent` (the strip-all-tags sibling) is the only one used in product (`ReviewDocPanel.tsx`, `ReviewDashboard.tsx`).
- **Failure scenario:** none at runtime; unused rich-text sanitizer implies a rich-text render path that does not exist.

### F5 — LATENT (safe with today's vocab): urlParams outbound/inbound cap asymmetry breaks the module's own stated invariant
- **File:** `src/utils/urlParams.ts:73-75` comment claims "the app can never emit a URL longer than it will accept on read" — but `buildSearchParams:81-86` caps array filters at 50 ENTRIES with no character cap, while `parseSearchParams:148` silently drops the ENTIRE param when the raw string exceeds `MAX_PARAM_LENGTH` (1000 chars). Only `query` is char-capped outbound (:76).
- **Real-data check:** worst case today is `culture` — all 32 heritage option slugs (`heritageHierarchy.generated.ts`, kebab slugs ~5-25 chars) joined ≈ well under 1000 chars; every other facet vocab is small. So NOT reachable with current vocab — latent only.
- **Failure scenario (if any vocab grows or a >20-value creatable facet ever joins the URL schema):** user selects many values → shares URL → recipient's parse drops the whole filter silently → different results than sender, and `useUrlSync`'s canonical-string loop-guard compares two states that can never converge. One-line fix: also char-cap the joined array value (or assert in the test that sum-of-all-values per facet < MAX_PARAM_LENGTH — cheap drift-lock).

### F6 — MINOR cluster (dead types + internal duplication)
- `src/utils/featureFlags.ts:21` — `FeatureFlagKey` type: zero references. Dead.
- `src/utils/errorHandling.ts:17-25` vs `:67-75` — the 23505+email predicate is duplicated verbatim inside `parseDbError` instead of calling the exported `isEmailDuplicateError`. Same-file drift hazard only.
- `src/utils/urlParams.ts:20-21,26` — `MAX_PARAM_LENGTH`/`MAX_ARRAY_LENGTH`/`URL_SORT_VALUES` exported only for tests. Acceptable (documented pattern, like COOKING_SKILLS_MAP), listed for completeness — NOT proposing removal.
- `src/utils/debounce.ts` `DebouncedFunction` — externally unreferenced but is the declared public return type; keep.

## Checked clean (no finding)
- `parseSearchQuery.ts` — grade router logic verified against its own invariants (ranges, ordinals, never-empty fallback, pre-k normalization survive the token-normalizer); inlined grade vocab duplication is INTENTIONAL + documented (GATE-1 purity for the tsx eval harness).
- `canonicalizeReviewMetadata.ts` — legacy→canonical maps, knife-skills dedupe, ingredient parent-completion all coherent; GARDEN_SKILLS_MAP overlap with METADATA_CONFIGS.gardenSkills is intentional (legacy slug domain vs canonical UI options); COOKING_SKILLS_MAP/MAIN_INGREDIENTS_MAP exports are documented test hooks.
- `submissionStatus.ts`, `cn.ts`, `titleSimilarity.ts` (lenient Jaccard/substring heuristic is warning-suppression only — TitleMismatchWarning; acceptable for audience), `debounce.ts` (test-mode sync path can't leak to prod builds: NODE_ENV is never 'test' in Vite prod), `featureFlags.ts` FEATURES itself (used by ReviewDocPanel).
- `filterDefinitions.ts` vocab values spot-checked against canonicalizeReviewMetadata canonical targets — consistent.

## Suggested picks for tonight-scale PRs
1. F2+F3+F4+F6a as one dead-code follow-up commit to the FP-15 lineage (pure deletions + one export-keyword demotion).
2. F1 as a small behavior fix (label-preserving redaction) — improves every future PROD incident's Sentry signal.
