/**
 * ReviewDetail page-level test fixtures (Wave 5, PR-0 Task 0.1).
 *
 * Each fixture is a per-table map (table name → `{data, error}`) consumed by
 * `makeReviewSupabaseMock` (see `./supabaseReviewMock.ts`). Column names are the
 * REAL ones `ReviewDetail.loadSubmission` reads:
 *   - `submission_reviews` rows carry **`tagged_metadata`** (NOT `metadata` — a
 *     trap; it is read for restore at ReviewDetail L417/L441), plus `decision`,
 *     `notes`, `created_at`.
 *   - `lesson_submissions` rows carry `teacher_id` (drives the user_profiles
 *     lookup), `original_lesson_id` + `submission_type` (drive restore-vs-
 *     preselect + the intent banner), `ai_draft_metadata` (preselect seed), plus
 *     the doc/title fields the page renders.
 *
 * Per the dual-shape contract, every table's `data` is the ARRAY form:
 *   - `.single()`/`.maybeSingle()` tables (lesson_submissions, user_profiles)
 *     are still arrays-of-one — the mock unwraps to `data[0]`.
 *   - bare-await tables (submission_similarities, candidate lessons_with_metadata,
 *     submission_reviews) are plain arrays.
 *
 * Canonical vocab values are taken verbatim from
 * `src/types/lessonMetadata.zod.ts` so the modern fixture passes both
 * `validateRequiredFields` and `reviewFormPayloadSchema` on the save path.
 *
 * The three fixtures and the seams/branches they pin:
 *   - modernFixture        — array activityType (canonical, suffix-stripped),
 *                            all required fields incl. cooking, a restored review
 *                            with a SUPPORTED decision → drives the RESTORE branch
 *                            + blue "happy update" intent banner + "Submitter's
 *                            choice" candidate card + valid edit→save.
 *   - legacyFixture        — scalar `activityType: 'both'`, `decision: 'reject'`,
 *                            pre-canonical slugs, a restored review → drives the
 *                            `.map`-on-scalar landmine handling, the three-regime
 *                            canonicalize path, and the legacyDecisionWarning.
 *   - noReviewUpdateFixture — an `update` submission with `original_lesson_id:
 *                            null` and NO review row → drives the PRESELECT branch
 *                            + the auto-expand search effect + the amber
 *                            (update, null-target) intent banner.
 *   - preselectTargetUpdateFixture — an `update` submission with NO review row but
 *                            a NON-null, RESOLVABLE `original_lesson_id` AND a
 *                            non-null canonical-keys `ai_draft_metadata`. Drives
 *                            the OTHER half of the preselect branch the
 *                            null-target fixture cannot: a non-null preselect
 *                            target seeds `selectedDuplicate` (the hoisted dup
 *                            card shows selected; the "pick a target" hint is
 *                            absent) AND `computeInitialMetadataFromAiDraft` seeds
 *                            the form (distinctive processingNotes round-trips).
 *                            The seeded metadata is complete + canonical so the
 *                            approve_update merge-save passes validation and
 *                            invokes complete-review with a non-null
 *                            selectedLessonId.
 */
import type { TableResult } from '@/__tests__/helpers/supabaseReviewMock';

/**
 * Distinctive sentinel carried by `preselectTargetUpdateFixture.ai_draft_metadata
 * .processingNotes`. Exported so the page test can assert the exact round-tripped
 * value in the Processing notes textarea — pinning that the ai_draft seed
 * (computeInitialMetadataFromAiDraft) actually populated the form (C-2b).
 */
export const PRESELECT_AI_DRAFT_NOTE =
  'AI-draft seed: roasted leafy greens unit — distinctive preselect marker.';

// ---------------------------------------------------------------------------
// modernFixture — restore branch, canonical vocab, blue intent banner.
// ---------------------------------------------------------------------------
// An `update` submission whose `original_lesson_id` IS present in the rendered
// top-5 dup cards (so the off-list lookup does NOT fire and the banner resolves
// the target's title from the dup list). The restored review carries the
// supported `approve_new` decision, so the page's Publish button is enabled for
// the edit→save behavior (no `selectedDuplicate` required).
export const modernFixture: Record<string, TableResult> = {
  lesson_submissions: {
    data: [
      {
        id: 'sub-modern',
        created_at: '2026-06-01T12:00:00.000Z',
        google_doc_url: 'https://docs.google.com/document/d/modern-doc/edit',
        google_doc_id: 'modern-doc',
        submission_type: 'update',
        original_lesson_id: 'lesson-modern-target',
        status: 'in_review',
        extracted_content:
          'Modern Lesson Title\n\nSummary: A canonical modern lesson about cooking with apples.',
        extracted_title: 'Modern Lesson Title',
        content_hash: 'hash-modern',
        content_embedding: null,
        teacher_id: 'teacher-modern',
        ai_draft_metadata: null,
      },
    ],
    error: null,
  },
  submission_similarities: {
    data: [
      {
        lesson_id: 'lesson-modern-target',
        submission_id: 'sub-modern',
        combined_score: 0.92,
        match_type: 'high',
        title_similarity: 0.9,
        content_similarity: 0.93,
      },
    ],
    error: null,
  },
  // Candidate `.in()` path — the rendered dup card for the in-list target.
  lessons_with_metadata: {
    data: [
      {
        lesson_id: 'lesson-modern-target',
        title: 'Modern Target Lesson',
        grade_levels: ['3', '4'],
        thematic_categories: ['Food Systems'],
      },
    ],
    error: null,
  },
  submission_reviews: {
    data: [
      {
        id: 'rev-modern',
        submission_id: 'sub-modern',
        decision: 'approve_new',
        notes: 'Looks good — minor tag cleanup only.',
        created_at: '2026-06-02T09:00:00.000Z',
        // tagged_metadata is stored in CANONICAL, suffix-STRIPPED form (how a
        // prior save persisted it). On load, ReviewDetail re-adds the `-only`
        // activityType suffix and canonicalizes the 6 small-vocab fields.
        tagged_metadata: {
          activityType: ['cooking'], // reAddActivityTypeSuffix → ['cooking-only']
          location: 'Indoor',
          gradeLevels: ['3', '4'],
          themes: ['Food Systems'],
          season: ['Fall'],
          coreCompetencies: ['Kitchen Skills and Related Academic Content'],
          socialEmotionalLearning: ['Relationship skills'],
          cookingMethods: ['stovetop'],
          // specific + its parent group (satisfies the mainIngredients invariant).
          mainIngredients: ['Apples', 'Apples & pears'],
          cookingSkills: ['Knife skills'],
          culturalHeritage: ['Asian'],
          academicIntegration: ['Science'],
          observancesHolidays: ['Earth Month'],
          culturalResponsivenessFeatures: ['Reshapes curriculum'],
          processingNotes: 'Imported from the modern review template.',
        },
      },
    ],
    error: null,
  },
  user_profiles: {
    data: [{ id: 'teacher-modern', full_name: 'Morgan Modern' }],
    error: null,
  },
};

// ---------------------------------------------------------------------------
// legacyFixture — scalar activityType landmine + three-regime canonicalize.
// ---------------------------------------------------------------------------
// A `new` submission whose restored review predates D2.1 / the closed schema:
// `activityType` is the SCALAR string `'both'` (calling `.map` on it would throw
// into ReviewErrorBoundary if unguarded), `decision` is the no-longer-supported
// `'reject'` (drives legacyDecisionWarning), and the 6 small-vocab fields hold
// pre-canonical SLUG forms that `canonicalizeReviewMetadata` maps in memory.
export const legacyFixture: Record<string, TableResult> = {
  lesson_submissions: {
    data: [
      {
        id: 'sub-legacy',
        created_at: '2025-09-15T12:00:00.000Z',
        google_doc_url: 'https://docs.google.com/document/d/legacy-doc/edit',
        google_doc_id: 'legacy-doc',
        submission_type: 'new',
        original_lesson_id: null,
        status: 'approved',
        extracted_content:
          'Legacy Lesson Title\n\nSummary: An older lesson reopened from the archive.',
        extracted_title: 'Legacy Lesson Title',
        content_hash: 'hash-legacy',
        content_embedding: null,
        teacher_id: 'teacher-legacy',
        ai_draft_metadata: null,
      },
    ],
    error: null,
  },
  submission_similarities: { data: [], error: null },
  lessons_with_metadata: { data: [], error: null },
  submission_reviews: {
    data: [
      {
        id: 'rev-legacy',
        submission_id: 'sub-legacy',
        decision: 'reject', // unsupported by the 3-decision UI → legacyDecisionWarning
        notes: 'Legacy rejection note.',
        created_at: '2025-09-20T09:00:00.000Z',
        tagged_metadata: {
          activityType: 'both', // SCALAR — fans out to ['cooking-only','garden-only']
          location: 'Both',
          gradeLevels: ['K', '1'],
          themes: ['Garden Basics'],
          season: ['Spring'],
          coreCompetencies: ['garden-skills'], // → 'Garden Skills and Related Academic Content'
          socialEmotionalLearning: ['self-awareness'], // → 'Self-awareness'
          cookingMethods: ['basic-prep'],
          mainIngredients: ['root-vegetables'], // → 'Root vegetables' (group; no parent needed)
          gardenSkills: ['planting', 'seed-starting'], // → 'Planting','Seed starting'
          cookingSkills: ['chopping', 'mixing'], // → 'Knife skills','Mixing & stirring'
          academicIntegration: ['science'], // → 'Science'
          observancesHolidays: ['Earth month'], // → 'Earth Month'
          culturalResponsivenessFeatures: ['Reshapes curriculum'],
          processingNotes: 'Legacy processing notes.',
        },
      },
    ],
    error: null,
  },
  user_profiles: {
    data: [{ id: 'teacher-legacy', full_name: 'Lee Legacy' }],
    error: null,
  },
};

// ---------------------------------------------------------------------------
// noReviewUpdateFixture — preselect branch + auto-expand + amber banner.
// ---------------------------------------------------------------------------
// An `update` submission with NO target (`original_lesson_id: null`) and NO
// review row. Load skips the restore block, runs computePreselection (→
// approve_update, null target — so selectedDuplicate stays null), and the render
// path auto-expands the search picker (needsSearch) and shows the amber
// "(update, null-target)" intent banner. `ai_draft_metadata` is null so the
// preselect metadata seed is empty.
export const noReviewUpdateFixture: Record<string, TableResult> = {
  lesson_submissions: {
    data: [
      {
        id: 'sub-noreview',
        created_at: '2026-06-20T12:00:00.000Z',
        google_doc_url: 'https://docs.google.com/document/d/noreview-doc/edit',
        google_doc_id: 'noreview-doc',
        submission_type: 'update',
        original_lesson_id: null,
        status: 'submitted',
        extracted_content:
          'Untitled Update\n\nSummary: An update whose target lesson could not be found.',
        extracted_title: 'Untitled Update Submission',
        content_hash: 'hash-noreview',
        content_embedding: null,
        teacher_id: 'teacher-noreview',
        ai_draft_metadata: null,
      },
    ],
    error: null,
  },
  submission_similarities: { data: [], error: null },
  lessons_with_metadata: { data: [], error: null },
  // No review row → the load path takes the preselect branch.
  submission_reviews: { data: [], error: null },
  user_profiles: {
    data: [{ id: 'teacher-noreview', full_name: 'Nadia Noreview' }],
    error: null,
  },
};

// ---------------------------------------------------------------------------
// degradedUpdateFixture — yellow "degraded update" intent banner (4th state).
// ---------------------------------------------------------------------------
// An `update` submission whose `original_lesson_id` IS set, but the off-list
// `lessons_with_metadata` lookup for that id yields NO row (configured empty →
// `.single()` unwraps to null), and the id is absent from `submission_similarities`
// too. So the banner predicate is (type === 'update' && targetId && !targetTitle)
// → the YELLOW "its title couldn't be loaded — verify before approving" state,
// which the banner must reach WITHOUT falling through to the green "new" branch
// (the worst-possible misrender — risk: a degraded update read as a brand-new
// lesson). No review row → preselect branch (approve_update + target = the id).
export const degradedUpdateFixture: Record<string, TableResult> = {
  lesson_submissions: {
    data: [
      {
        id: 'sub-degraded',
        created_at: '2026-06-22T12:00:00.000Z',
        google_doc_url: 'https://docs.google.com/document/d/degraded-doc/edit',
        google_doc_id: 'degraded-doc',
        submission_type: 'update',
        // Target id is present but unresolvable (absent from BOTH
        // submission_similarities AND lessons_with_metadata) → title lookup fails.
        original_lesson_id: 'lesson-degraded-missing',
        status: 'in_review',
        extracted_content:
          'Degraded Update Title\n\nSummary: An update whose declared target lesson could not be resolved.',
        extracted_title: 'Degraded Update Title',
        content_hash: 'hash-degraded',
        content_embedding: null,
        teacher_id: 'teacher-degraded',
        ai_draft_metadata: null,
      },
    ],
    error: null,
  },
  // F5 (corrected per round-2 review): the yellow branch does NOT strictly require
  // an empty similarities array — the off-list lookup fires whenever the target is
  // absent from the top-5 RENDERED cards (`targetInRenderedTopFive`, ReviewDetail
  // L361), not based on whether similarities returned rows. So similarities could
  // hold non-target rows and the banner would still be yellow. It's kept empty here
  // only to keep the fixture minimal — and because a non-empty array would also fire
  // the candidate `.in()` query on `lessons_with_metadata`, which this table-keyed
  // mock can't serve as a different shape than the off-list `.eq().single()` path
  // (see supabaseReviewMock.ts's `lessons_with_metadata` note), making those dup
  // cards render as "Unknown". Minimal-and-unambiguous beats clever here.
  submission_similarities: { data: [], error: null },
  // Off-list lookup queries this via `.eq().single()`; an empty array unwraps to
  // null → submitterTargetLesson stays null → targetTitle null → yellow banner.
  lessons_with_metadata: { data: [], error: null },
  submission_reviews: { data: [], error: null },
  user_profiles: {
    data: [{ id: 'teacher-degraded', full_name: 'Dana Degraded' }],
    error: null,
  },
};

// ---------------------------------------------------------------------------
// preselectTargetUpdateFixture — non-null preselect target + ai_draft seed.
// ---------------------------------------------------------------------------
// An `update` submission with NO review row (so the load path takes the
// PRESELECT branch, not restore) and a NON-null `original_lesson_id` that IS
// resolvable: it appears in BOTH submission_similarities and the candidate
// lessons_with_metadata `.in()` array, so it renders as an in-list dup card (no
// off-list lookup) and computePreselection's non-null target seeds
// selectedDuplicate to it. `ai_draft_metadata` is a non-null draft in CANONICAL
// keys (lessonMetadataSchema shape — locationRequirements/seasonTiming/
// thematicCategories, NOT the review-form location/season/themes): the load path
// runs computeInitialMetadataFromAiDraft → lessonToReview → reAddActivityTypeSuffix
// and seeds the form. The draft is COMPLETE (all required fields incl. the three
// cooking fields) and canonical, so the approve_update merge-save passes both
// validateRequiredFields and reviewFormPayloadSchema. mainIngredients uses the
// group 'Leafy greens' (no specific→group parent needed). The distinctive
// processingNotes (PRESELECT_AI_DRAFT_NOTE) is the observable C-2b pin.
export const preselectTargetUpdateFixture: Record<string, TableResult> = {
  lesson_submissions: {
    data: [
      {
        id: 'sub-preselect',
        created_at: '2026-06-24T12:00:00.000Z',
        google_doc_url: 'https://docs.google.com/document/d/preselect-doc/edit',
        google_doc_id: 'preselect-doc',
        submission_type: 'update',
        original_lesson_id: 'lesson-preselect-target',
        status: 'in_review',
        extracted_content:
          'Preselect Update Title\n\nSummary: An update bound to a resolvable target, carrying an AI draft.',
        extracted_title: 'Preselect Update Title',
        content_hash: 'hash-preselect',
        content_embedding: null,
        teacher_id: 'teacher-preselect',
        // CANONICAL-keys AI draft (lessonMetadataSchema). Seeds the form on the
        // preselect branch via computeInitialMetadataFromAiDraft → lessonToReview
        // → reAddActivityTypeSuffix. Complete + canonical so the merge-save validates.
        ai_draft_metadata: {
          activityType: ['cooking'], // → cooking pill pressed; showCookingFields true
          locationRequirements: ['Indoor'], // → review-form location 'Indoor'
          thematicCategories: ['Food Systems'], // → themes
          seasonTiming: ['Fall'], // → season
          gradeLevels: ['3', '4'],
          coreCompetencies: ['Kitchen Skills and Related Academic Content'],
          socialEmotionalLearning: ['Relationship skills'],
          cookingMethods: ['stovetop'],
          mainIngredients: ['Leafy greens'], // group → no parent-group invariant trigger
          cookingSkills: ['Roasting'],
          culturalResponsivenessFeatures: ['Reshapes curriculum'],
          processingNotes: PRESELECT_AI_DRAFT_NOTE, // distinctive C-2b observable
        },
      },
    ],
    error: null,
  },
  submission_similarities: {
    data: [
      {
        lesson_id: 'lesson-preselect-target',
        submission_id: 'sub-preselect',
        combined_score: 0.88,
        match_type: 'high',
        title_similarity: 0.85,
        content_similarity: 0.9,
      },
    ],
    error: null,
  },
  // Candidate `.in()` path — the in-list dup card for the preselect target, so
  // the off-list lookup does NOT fire and the target hoists to "Submitter's choice".
  lessons_with_metadata: {
    data: [
      {
        lesson_id: 'lesson-preselect-target',
        title: 'Preselect Target Lesson',
        grade_levels: ['3', '4'],
        thematic_categories: ['Food Systems'],
      },
    ],
    error: null,
  },
  // No review row → the load path takes the preselect branch.
  submission_reviews: { data: [], error: null },
  user_profiles: {
    data: [{ id: 'teacher-preselect', full_name: 'Parker Preselect' }],
    error: null,
  },
};

// ---------------------------------------------------------------------------
// reviewsErrorPreselectFixture — submission_reviews DB error → silent preselect.
// ---------------------------------------------------------------------------
// F3: pins the CURRENT error-path behavior of the reviews fetch (ReviewDetail
// ~L390): it is destructured as `const { data: reviews } = …` WITHOUT capturing
// `error`. On a DB error supabase-js RESOLVES `{ data: null, error }` (it does
// NOT reject), so `reviews` is null → the restore block `if (reviews && …)` is
// SKIPPED and the preselect block `if (!reviews || …)` RUNS. No error surfaces:
// loadSubmission's try/catch never even sees it (the resolved error never
// throws). So a reviews DB error degrades SILENTLY to a fresh preselect —
// exactly as if there were no prior review row.
//
// Shape mirrors preselectTargetUpdateFixture (a non-null, RESOLVABLE
// original_lesson_id + a non-null canonical-keys ai_draft) EXCEPT
// submission_reviews carries `{ data: null, error }`. Using `data: null` (NOT
// `[]`) accurately simulates supabase-js's error return; the mock's bare-await
// `.then` passes `{data,error}` through as-is, so `reviews` lands as null.
//
// THE POINT: if PR-1b's hook extraction ever starts THROWING on a reviews DB
// error (instead of returning null → preselect), the page test on this fixture
// must FAIL (no decision radios rendered / no preselect ran).
export const reviewsErrorPreselectFixture: Record<string, TableResult> = {
  lesson_submissions: {
    data: [
      {
        id: 'sub-reviewserror',
        created_at: '2026-06-25T12:00:00.000Z',
        google_doc_url: 'https://docs.google.com/document/d/reviewserror-doc/edit',
        google_doc_id: 'reviewserror-doc',
        submission_type: 'update',
        original_lesson_id: 'lesson-reviewserror-target',
        status: 'in_review',
        extracted_content:
          'Reviews Error Update Title\n\nSummary: An update whose submission_reviews fetch errored — load must still preselect.',
        extracted_title: 'Reviews Error Update Title',
        content_hash: 'hash-reviewserror',
        content_embedding: null,
        teacher_id: 'teacher-reviewserror',
        // Non-null canonical-keys AI draft so the preselect branch also seeds the
        // form (computeInitialMetadataFromAiDraft). Complete + canonical (same
        // shape as preselectTargetUpdateFixture's draft).
        ai_draft_metadata: {
          activityType: ['cooking'],
          locationRequirements: ['Indoor'],
          thematicCategories: ['Food Systems'],
          seasonTiming: ['Fall'],
          gradeLevels: ['3', '4'],
          coreCompetencies: ['Kitchen Skills and Related Academic Content'],
          socialEmotionalLearning: ['Relationship skills'],
          cookingMethods: ['stovetop'],
          mainIngredients: ['Leafy greens'],
          cookingSkills: ['Roasting'],
          culturalResponsivenessFeatures: ['Reshapes curriculum'],
          processingNotes: 'AI-draft seed for the reviews-error preselect path.',
        },
      },
    ],
    error: null,
  },
  submission_similarities: {
    data: [
      {
        lesson_id: 'lesson-reviewserror-target',
        submission_id: 'sub-reviewserror',
        combined_score: 0.9,
        match_type: 'high',
        title_similarity: 0.88,
        content_similarity: 0.92,
      },
    ],
    error: null,
  },
  // Candidate `.in()` path — the in-list dup card for the resolvable target, so
  // the preselect target hoists to a SELECTED "Submitter's choice" card.
  lessons_with_metadata: {
    data: [
      {
        lesson_id: 'lesson-reviewserror-target',
        title: 'Reviews Error Target Lesson',
        grade_levels: ['3', '4'],
        thematic_categories: ['Food Systems'],
      },
    ],
    error: null,
  },
  // THE PIN: a DB error on the reviews fetch. supabase-js returns
  // `{ data: null, error }`; ReviewDetail does not capture `error`, so `reviews`
  // is null → restore skipped, preselect runs, no throw. `data: null` (NOT `[]`)
  // is the faithful supabase-js error shape.
  submission_reviews: { data: null, error: { message: 'timeout' } },
  user_profiles: {
    data: [{ id: 'teacher-reviewserror', full_name: 'Riley Reviewserror' }],
    error: null,
  },
};
