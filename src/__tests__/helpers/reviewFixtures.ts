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
 */
import type { TableResult } from './supabaseReviewMock';

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
