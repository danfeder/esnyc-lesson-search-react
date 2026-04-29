import { test, expect } from '@playwright/test';

// These tests cover the Phase 8b reviewer-flow intent banner + pre-selection
// + search-escape behaviors per design doc §6.1-6.5. They require:
//   1. An authenticated session as a reviewer (admin@test.com / password123 per
//      reference_test_credentials.md), and
//   2. Three seeded TEST-DB submissions, one per intent state (new / update,X /
//      update,null), with a known target lesson for the (update, X) case.
//
// Neither piece of fixture infrastructure exists in e2e/ today (no auth.setup.ts;
// no submission seed). Marked .skip until a reviewer-auth fixture lands. Unit
// coverage in src/pages/reviewPreselect.test.ts (4 cases) and
// src/pages/reviewMismatch.test.ts (5 cases) is the primary regression guard
// for the helper logic in the meantime; manual smoke against the local dev
// server (Sessions 10-14, screenshots in /tmp/phase8b-task3*) covered the
// rendered behavior.

// `expect` is referenced only inside comment blocks until tests are unskipped;
// the void keeps the import lint-clean without dropping it from the file.
void expect;

test.describe('Phase 8b reviewer flow — intent banner + pre-selection', () => {
  test.skip('green banner + approve_new pre-selected for (new) submission', async () => {
    // Setup: login as reviewer, navigate to a (new) submission's review page.
    // await loginAs(page, 'admin@test.com', 'password123');
    // await page.goto(`/review/${SEEDED_NEW_SUBMISSION_ID}`);
    //
    // Banner: green wrapper + "Submitter says: New lesson".
    // await expect(
    //   page.getByText(/Submitter says: New lesson/i)
    // ).toBeVisible();
    //
    // Pre-selection: "Approve & publish" radio is checked by default.
    // await expect(page.getByRole('radio', { name: /Approve & publish/i })).toBeChecked();
    //
    // Submit button is enabled (no target required for approve_new).
    // await expect(page.getByRole('button', { name: /PUBLISH LESSON/i })).toBeEnabled();
  });

  test.skip('blue banner + target pre-selected for (update, X) submission', async () => {
    // Setup: login as reviewer, navigate to an (update, X) submission whose
    // original_lesson_id resolves to a known title (e.g. "Garden to Table").
    // await loginAs(page, 'admin@test.com', 'password123');
    // await page.goto(`/review/${SEEDED_UPDATE_X_SUBMISSION_ID}`);
    //
    // Banner: blue wrapper + "Submitter says: Updating <title>".
    // await expect(
    //   page.getByText(/Submitter says: Updating Garden to Table/i)
    // ).toBeVisible();
    //
    // Pre-selection: "Merge into existing" radio checked, target card carries
    // the "Submitter's choice" badge, MERGE & ARCHIVE button enabled.
    // await expect(page.getByRole('radio', { name: /Merge into existing/i })).toBeChecked();
    // await expect(page.getByText(/Submitter's choice/i)).toBeVisible();
    // await expect(page.getByRole('button', { name: /MERGE & ARCHIVE/i })).toBeEnabled();
    //
    // No inline guidance text (target is set).
    // await expect(
    //   page.getByText(/Pick a target lesson to merge into/i)
    // ).not.toBeVisible();
  });

  test.skip('yellow banner + search auto-expanded for (update, null) submission', async () => {
    // Setup: login as reviewer, navigate to an (update, null) submission.
    // await loginAs(page, 'admin@test.com', 'password123');
    // await page.goto(`/review/${SEEDED_UPDATE_NULL_SUBMISSION_ID}`);
    //
    // Banner: yellow wrapper + "Submitter says: Updating, but couldn't find target".
    // await expect(
    //   page.getByText(/Submitter says: Updating, but couldn't find target/i)
    // ).toBeVisible();
    //
    // Pre-selection: "Merge into existing" radio checked, no target,
    // MERGE & ARCHIVE disabled, inline guidance visible.
    // await expect(page.getByRole('radio', { name: /Merge into existing/i })).toBeChecked();
    // await expect(page.getByRole('button', { name: /MERGE & ARCHIVE/i })).toBeDisabled();
    // await expect(
    //   page.getByText(/Pick a target lesson to merge into, or change to Approve as new/i)
    // ).toBeVisible();
    //
    // Search escape hatch is auto-expanded (LessonSearchPicker visible inline,
    // not behind a disclosure toggle), with the (update, null) help text.
    // await expect(page.getByPlaceholder(/Search by lesson title/i)).toBeVisible();
    // await expect(
    //   page.getByText(/Use this to find the lesson the submitter couldn't/i)
    // ).toBeVisible();
  });
});
