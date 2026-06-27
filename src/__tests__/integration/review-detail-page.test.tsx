/**
 * ReviewDetail page-level RTL characterization test (Wave 5, PR-0 Task 0.2).
 *
 * THE GATE: pins CURRENT `ReviewDetail` behavior before the PR-1 decomposition
 * and PR-2 (C107) serial→parallel reorder move its seams. Every behavior asserts
 * FINAL STATE, not call order (Q8/Q2 LOCKED) — so PR-2's reorder of the fetch
 * graph cannot break it, and the table-dispatch supabase mock (not an ordered
 * queue) backs that contract.
 *
 * Render contract (Q2 LOCKED): mount the NAMED export `<ReviewDetail/>` directly
 * under MemoryRouter at `/review/:id` with a `/review` sentinel for post-save
 * navigation — NO ProtectedRoute, NO auth mock, NO QueryClientProvider
 * (ReviewDetail imports no auth hook and is raw supabase-js + useState/useEffect,
 * not react-query). A local `vi.mock('@/lib/supabase')` supplies the table-aware
 * `from` mock + a `functions.invoke` mock (the global setup mocks `from` but has
 * NO `functions`/`rpc`). Mirrors the local-override pattern in search-page.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { makeReviewSupabaseMock, type TableResult } from '../helpers/supabaseReviewMock';
import {
  modernFixture,
  legacyFixture,
  noReviewUpdateFixture,
  degradedUpdateFixture,
  preselectTargetUpdateFixture,
  PRESELECT_AI_DRAFT_NOTE,
} from '../helpers/reviewFixtures';
import * as featureFlags from '@/utils/featureFlags';

// Module-scope mocks. The vi.mock factory's arrows read these LAZILY (only when
// `from`/`invoke` are actually called during a render), so reassigning
// `currentMock` per test is safe — exactly the consumption contract documented
// in supabaseReviewMock.ts.
const functionsInvokeMock = vi.fn();
let currentMock = makeReviewSupabaseMock(modernFixture);

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => currentMock.from(table),
    functions: { invoke: (...args: unknown[]) => functionsInvokeMock(...args) },
  },
}));

// Import after the mock (mirrors search-page.test.tsx).
import { ReviewDetail } from '@/pages/ReviewDetail';

// jsdom doesn't implement Element.prototype.scrollIntoView; ReviewDetail's
// validation-error effect (focus + scrollIntoView on the banner) calls it. Shim
// it for this suite — a test-environment gap, NOT a production-code change (the
// global setup.ts already shims scrollTo/ResizeObserver/IntersectionObserver but
// not scrollIntoView).
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

/** Render `<ReviewDetail/>` for a fixture, routed at the fixture's submission id. */
function renderReview(fixture: Record<string, TableResult>, id: string) {
  currentMock = makeReviewSupabaseMock(fixture);
  return render(
    <MemoryRouter initialEntries={[`/review/${id}`]}>
      <Routes>
        <Route path="/review/:id" element={<ReviewDetail />} />
        <Route path="/review" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  functionsInvokeMock.mockClear().mockResolvedValue({ data: { success: true }, error: null });
  currentMock = makeReviewSupabaseMock(modernFixture);
});

describe('ReviewDetail page-level safety net (Wave 5 PR-0)', () => {
  // [render; restore branch 1b.1; metadata form 1b.3] — modern restore load→render.
  it('1. modern restore: renders metadata controls, progress bar, intent banner, decision radios', async () => {
    renderReview(modernFixture, 'sub-modern');

    // Progress bar reflects a FULL restore (7 base + 3 cooking = 10/10). A failed
    // metadata restore would lower aria-valuenow — this is the non-vacuous pin.
    const progress = await screen.findByRole('progressbar', { name: 'Required fields' });
    expect(progress).toHaveAttribute('aria-valuenow', '10');

    // Restored activity pill: stored ['cooking'] → reAddActivityTypeSuffix →
    // ['cooking-only'] → the "Cooking" pill is pressed.
    expect(screen.getByRole('button', { name: 'Cooking', pressed: true })).toBeInTheDocument();

    // Blue "happy update" banner resolved the in-list target's title from the
    // dup card list (off-list lookup did NOT fire).
    const banner = screen.getByText('Submitter says:').closest('div');
    expect(banner).toHaveTextContent('Updating');
    expect(banner).toHaveTextContent('Modern Target Lesson');

    // Three decision radios; the restored decision (approve_new) is checked.
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /approve & publish/i })).toBeChecked();
  });

  // [risks 3, 5] — legacy regime: scalar activityType + legacy reject decision.
  it('2. legacy fixture: scalar "both" fans out to cooking+garden pills, no crash, legacy warning', async () => {
    renderReview(legacyFixture, 'sub-legacy');

    // Page rendered (the .map-on-scalar landmine is HANDLED — an unguarded
    // .map('both') would have thrown out of loadSubmission's try and left
    // metadata/decision unrestored). Decision radios prove the page rendered.
    expect(await screen.findAllByRole('radio')).toHaveLength(3);

    // Scalar 'both' fanned out to BOTH activity pills (the regression pin: if
    // reAddActivityTypeSuffix regressed, both would be unpressed).
    expect(screen.getByRole('button', { name: 'Cooking', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Garden', pressed: true })).toBeInTheDocument();

    // Legacy 'reject' decision (unsupported by the 3-decision UI) → warning banner.
    expect(screen.getByText(/previously marked "reject"/i)).toBeInTheDocument();
  });

  // [save flow 1b.4; activityType round-trip risk 3] — edit→save canonicalizes + navigates.
  it('3. edit→save: invokes complete-review with -only-stripped activityType, then navigates', async () => {
    renderReview(modernFixture, 'sub-modern');
    const user = userEvent.setup();

    // Edit: append to the (restored) note-to-teacher textarea.
    const note = await screen.findByPlaceholderText(/will be emailed to the teacher/i);
    await user.type(note, ' Reviewed and approved');

    await user.click(screen.getByRole('button', { name: /publish lesson/i }));

    // Navigation happened (the /review sentinel mounted).
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();

    // The invoke body carries the CANONICALIZED activityType (-only stripped) and
    // the edited note — not just "was called".
    expect(functionsInvokeMock).toHaveBeenCalledTimes(1);
    const [fnName, opts] = functionsInvokeMock.mock.calls[0] as [
      string,
      {
        body: {
          submissionId: string;
          metadata: { activityType?: string[] };
          decision: string;
          notes: string;
          selectedLessonId: string | null;
        };
      },
    ];
    expect(fnName).toBe('complete-review');
    expect(opts.body.metadata.activityType).toEqual(['cooking']);
    expect(opts.body.decision).toBe('approve_new');
    expect(opts.body.notes).toContain('Reviewed and approved');
    // C-3 (cheap part): the body targets THIS submission, and approve_new sends a
    // null selectedLessonId (the merge-target id is only attached for approve_update).
    expect(opts.body.submissionId).toBe('sub-modern');
    expect(opts.body.selectedLessonId).toBeNull();
  });

  // [reviewValidation 1a.5] — clearing a required field blocks the save.
  it('4. validation block: clearing a required field shows the banner and skips invoke', async () => {
    renderReview(modernFixture, 'sub-modern');
    const user = userEvent.setup();

    // Clear required Location (single-select pill: clicking the active one clears it).
    const indoor = await screen.findByRole('button', { name: 'Indoor', pressed: true });
    await user.click(indoor);

    await user.click(screen.getByRole('button', { name: /publish lesson/i }));

    expect(await screen.findByText(/missing required fields/i)).toHaveTextContent('Location');
    expect(functionsInvokeMock).not.toHaveBeenCalled();
  });

  // [error path] — a failed invoke surfaces the saveError banner and does NOT navigate.
  it('5. save-error: surfaces the saveError banner and does not navigate', async () => {
    renderReview(modernFixture, 'sub-modern');
    functionsInvokeMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /publish lesson/i }));

    expect(await screen.findByText(/nothing was written/i)).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  // [restore-vs-preselect risk 2; auto-expand risk 4; intent banner 1a.4] — preselect branch.
  it('6. no-review preselect: approve_update preselected, no restored target, search auto-opens, amber banner', async () => {
    renderReview(noReviewUpdateFixture, 'sub-noreview');

    // Amber (update, null-target) intent banner.
    expect(await screen.findByText(/updating, but couldn.t find target/i)).toBeInTheDocument();

    // computePreselection set the decision to approve_update for the update path.
    expect(screen.getByRole('radio', { name: /merge into existing/i })).toBeChecked();

    // selectedDuplicate is NOT restored from preselect (null target) → the
    // "pick a target" hint shows (proves no selectedDuplicate carried in).
    expect(screen.getByText(/pick a target lesson to merge into/i)).toBeInTheDocument();

    // Search escape hatch auto-opened (needsSearch === true).
    expect(screen.getByRole('button', { name: /hide library search/i })).toBeInTheDocument();
  });

  // [search-hatch effect ordering risk 4 / 1b.2] — manual close stays sticky across a re-render.
  it('7. search-hatch: a manual close persists across a re-render (auto-expand is one-directional)', async () => {
    renderReview(noReviewUpdateFixture, 'sub-noreview');
    const user = userEvent.setup();

    // Auto-opened, then manually closed.
    await user.click(await screen.findByRole('button', { name: /hide library search/i }));
    expect(
      screen.getByRole('button', { name: /search the library for a different lesson/i })
    ).toBeInTheDocument();

    // Force a re-render that does NOT change submission.id / needsSearch / noDups
    // (change the decision). The auto-expand effect must NOT reopen the panel.
    await user.click(screen.getByRole('radio', { name: /request revisions/i }));

    expect(screen.queryByRole('button', { name: /hide library search/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /search the library for a different lesson/i })
    ).toBeInTheDocument();
  });

  // [ReviewDocPanel 1a.3] — Doc/Text toggle renders the text view + persists the viewMode.
  it('8. doc/text toggle: switches to the text view and persists reviewViewMode to localStorage', async () => {
    // F3: pin GOOGLE_DOC_EMBED true so the Doc/Text toggle exists REGARDLESS of
    // the local VITE_ENABLE_DOC_EMBED env. When the flag is false ReviewDetail
    // hides the toggle group and forces viewMode='text' at mount — there would be
    // no "View mode" group to click, and the test would be non-deterministic
    // across dev environments. Spy the module-namespace getter (the global
    // setup.ts uses clearAllMocks, NOT restoreAllMocks, so we MUST restore the
    // spy ourselves — done in the finally below).
    const featuresSpy = vi
      .spyOn(featureFlags, 'FEATURES', 'get')
      .mockReturnValue({ GOOGLE_DOC_EMBED: true });
    try {
      renderReview(modernFixture, 'sub-modern');
      const user = userEvent.setup();

      // Toggle button lives in the IntDocFrame "View mode" group (not the embed
      // pre-flight screen's "View as Text" button).
      const viewModeGroup = await screen.findByRole('group', { name: 'View mode' });
      await user.click(within(viewModeGroup).getByRole('button', { name: 'Text' }));

      // Text view renders the extracted content.
      expect(
        await screen.findByText(/a canonical modern lesson about cooking with apples/i)
      ).toBeInTheDocument();
      // viewMode persisted under the exact localStorage key ReviewDetail uses.
      expect(window.localStorage.getItem('reviewViewMode')).toBe('text');
    } finally {
      featuresSpy.mockRestore();
    }
  });

  // [risk 7 / 1b.3] — each closed-enum Select renders its chip; do NOT over-DRY the selects.
  it('9. closed-enum selects: cookingSkills (config-label path) and CRF (raw-label path) each render their chip', async () => {
    renderReview(modernFixture, 'sub-modern');

    // F2/H-2 investigated: this pins that EACH closed-enum Select still renders
    // its selected chip — an over-DRY refactor that broke either rendering path
    // would drop a chip. It deliberately does NOT pin the config-lookup-label
    // path vs the raw `label: v` path as DISTINCT: cookingSkills/mainIngredients/
    // gardenSkills resolve their label from ALL_FIELD_CONFIGS (`?.label || v`)
    // while CRF/observances use raw `label: v`, but across the ENTIRE frozen
    // closed-enum SELECT vocab value === label, so the two paths produce
    // byte-identical output and no in-vocab value can tell them apart. (Verified:
    // mainIngredients/cookingSkills are `VALUES.map(v => ({value:v,label:v}))`,
    // gardenSkills/observances/CRF are explicit value===label entries.) So the
    // assertion checks chip presence, not which label branch ran.
    expect(await screen.findByText('Knife skills')).toBeInTheDocument(); // config-label path
    expect(screen.getByText('Reshapes curriculum')).toBeInTheDocument(); // raw-label path
  });

  // [preselect branch — non-null target half; C-2a + C-2b] — the complement of
  // test 6 (null-target). A no-review `update` with a RESOLVABLE original_lesson_id
  // seeds selectedDuplicate from the preselect target AND seeds the form from
  // ai_draft_metadata. test 6 cannot reach either (its target is null, its draft empty).
  it('10. no-review preselect (resolvable target): approve_update preselected, target card SELECTED, ai_draft seeds the form', async () => {
    renderReview(preselectTargetUpdateFixture, 'sub-preselect');

    // C-2a: computePreselection set decision=approve_update for the update path.
    expect(await screen.findByRole('radio', { name: /merge into existing/i })).toBeChecked();

    // C-2a: the non-null preselect target seeded selectedDuplicate → the hoisted
    // "Submitter's choice" dup card renders SELECTED (aria-pressed=true). This is
    // exactly what test 6's null target CANNOT produce.
    const targetCard = screen.getByRole('button', { name: /preselect target lesson/i });
    expect(targetCard).toHaveAttribute('aria-pressed', 'true');

    // C-2a: because selectedDuplicate IS set, the "pick a target" hint is ABSENT
    // (test 6 shows it present for the null target) — the contrasting pin.
    expect(screen.queryByText(/pick a target lesson to merge into/i)).not.toBeInTheDocument();

    // C-2b: computeInitialMetadataFromAiDraft seeded the form — the distinctive
    // canonical-keys ai_draft processingNotes round-tripped into its textarea.
    expect(
      screen.getByPlaceholderText(/internal notes about how this lesson was processed/i)
    ).toHaveValue(PRESELECT_AI_DRAFT_NOTE);
  });

  // [merge-save flow; C-3] — approve_update save carries the preselect target as
  // selectedLessonId (NOT null) and targets this submission.
  it('11. merge-save: approve_update invokes complete-review with the preselect target as selectedLessonId', async () => {
    renderReview(preselectTargetUpdateFixture, 'sub-preselect');
    const user = userEvent.setup();

    // The ai_draft seeded a complete, canonical form, so the approve_update save
    // passes validation. The merge button is enabled because selectedDuplicate is set.
    await user.click(await screen.findByRole('button', { name: /merge & archive/i }));

    // Navigation happened (the /review sentinel mounted) → the save succeeded.
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();

    expect(functionsInvokeMock).toHaveBeenCalledTimes(1);
    const [fnName, opts] = functionsInvokeMock.mock.calls[0] as [
      string,
      { body: { submissionId: string; decision: string; selectedLessonId: string | null } },
    ];
    expect(fnName).toBe('complete-review');
    expect(opts.body.decision).toBe('approve_update');
    // The crux: selectedLessonId is the preselect target id, NOT null (approve_new
    // would null it; the null-target preselect fixture could never set it).
    expect(opts.body.selectedLessonId).toBe('lesson-preselect-target');
    expect(opts.body.submissionId).toBe('sub-preselect');
  });
});

describe('SubmitterIntentBanner — 4-state coverage', () => {
  // blue (happy update, target in list) — modernFixture.
  it('blue: happy update resolves the target title', async () => {
    renderReview(modernFixture, 'sub-modern');
    const banner = (await screen.findByText('Submitter says:')).closest('div');
    expect(banner).toHaveTextContent('Updating');
    expect(banner).toHaveTextContent('Modern Target Lesson');
  });

  // green (genuine new) — legacyFixture is a `new` submission.
  it('green: genuine new submission', async () => {
    renderReview(legacyFixture, 'sub-legacy');
    const banner = (await screen.findByText('Submitter says:')).closest('div');
    expect(banner).toHaveTextContent('New lesson');
  });

  // amber (update, null target) — noReviewUpdateFixture.
  it('amber: update with no declared target', async () => {
    renderReview(noReviewUpdateFixture, 'sub-noreview');
    expect(await screen.findByText(/updating, but couldn.t find target/i)).toBeInTheDocument();
  });

  // yellow (update + target id present but off-list lookup FAILS) — degradedUpdateFixture.
  // The critical invariant: a degraded update must NOT fall through to green "new".
  it('yellow: degraded update (target id set, title unresolvable)', async () => {
    renderReview(degradedUpdateFixture, 'sub-degraded');
    expect(await screen.findByText(/its title couldn.t be loaded/i)).toBeInTheDocument();
    // Must NOT have rendered the green "new lesson" banner.
    expect(screen.queryByText('New lesson')).not.toBeInTheDocument();
  });
});
