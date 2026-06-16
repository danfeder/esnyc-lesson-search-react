import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * E2E for the rebuilt nested Cultural Heritage filter (PR C1.8).
 *
 * SCOPE (decided 2026-06-16, "structural + superset", NO data fixtures):
 * this is the UI integration/smoke proof that the recursive nested filter
 * (built in C1.4/C1.5/C1.6) is wired end-to-end on the public search page.
 * Recursion-correctness at the data layer is proven separately by C1.3 (DB
 * tests, RED-against-old) and C1.9 (backward-compat baseline diff); this spec
 * deliberately makes NO per-lesson / exact-count assertions.
 *
 * Asserted here:
 *  (a) the nested tree renders across tiers, including the NEW groups the old
 *      flat filter lacked (Indigenous and Diaspora -> African American;
 *      Indigenous -> Lenape) plus deep descendants (Asian -> East Asian ->
 *      Chinese);
 *  (b) a parent checkbox and a nested child checkbox each render, toggle, and
 *      apply/clear the filter (proven via the active-filter chip + the section
 *      header active-count badge — the public store does NOT sync filters to the
 *      URL, so the chip is the correct state surface here, unlike the
 *      activityType=cooking URL idiom which only works as a deep-link entry);
 *  (c) selecting parent "Asian" yields a result set that is a SUPERSET (count >=)
 *      of selecting child "Chinese" — monotonic, robust at any data size
 *      (0 >= 0 on the sparse local seed; non-trivial against the CI/TEST DB),
 *      with NO exact-count assertions. A second European >= Italian pair is
 *      non-trivial even on local data (European 2 >= Italian 1).
 *
 * Node labels/slugs below are quoted verbatim from
 * src/utils/heritageHierarchy.generated.ts (the committed vocab-derived tree).
 *
 * Local data note: the local Supabase seed is sparse (5 lessons; 3 heritage:
 * European, Italian+Mexican, Mexican+Latin American), so data-MAGNITUDE checks
 * (e.g. "African American returns > 0") are only meaningfully exercised in CI
 * against the fuller TEST DB and are GUARDED here so the sparse local seed
 * cannot falsely fail them. The structural (a)/(b) and monotonic (c) checks
 * pass at any data size.
 */

/** Returns the heritage section header button (toggles the collapsible body). */
function heritageHeader(page: Page): Locator {
  // The header is a <button> whose accessible name starts with the section
  // label (a count badge may be appended once a filter is active). Anchor to
  // the start so it never collides with "Cultural Responsiveness Features".
  return page.getByRole('button', { name: /^Cultural Heritage(\s+\d+)?$/ });
}

/** Expands the heritage section if it is collapsed, then returns its header. */
async function openHeritageSection(page: Page): Promise<Locator> {
  const header = heritageHeader(page);
  await expect(header).toBeVisible({ timeout: 15000 });
  if ((await header.getAttribute('aria-expanded')) !== 'true') {
    await header.click();
  }
  await expect(header).toHaveAttribute('aria-expanded', 'true');
  return header;
}

/**
 * Locates a single heritage node's <label> by its EXACT visible label text.
 * Exact matching is required so "Indigenous" does not also match the parent
 * "Indigenous and Diaspora", and so node labels never collide with non-heritage
 * filter rows that share the .int-check class.
 *
 * NOTE: the visible, clickable surface IS the <label> — the underlying
 * <input type="checkbox"> is `display:none` (internal.css: `.int-check input`),
 * with a styled `.int-check-box` span as the visual control. So interactions
 * click the LABEL; checked-state is read off the (hidden) input via
 * toBeChecked() (a property read that does not require visibility).
 */
function heritageNode(page: Page, label: string): Locator {
  return page.locator('label.int-check').filter({ has: page.getByText(label, { exact: true }) });
}

/** The (display:none) checkbox inside a heritage node label — for state reads. */
function heritageCheckbox(page: Page, label: string): Locator {
  return heritageNode(page, label).locator('input[type="checkbox"]');
}

/** Toggles a heritage node by clicking its label (the real interactive surface). */
async function toggleHeritageNode(page: Page, label: string): Promise<void> {
  await heritageNode(page, label).click();
}

/** The active-filter chip (remove pill) for a selected heritage label. */
function activePill(page: Page, label: string): Locator {
  return page.getByRole('button', { name: `Remove ${label}` });
}

/** Reads the current total result count from the IntToolbar <strong>. */
async function resultCount(page: Page): Promise<number> {
  const strong = page.locator('.int-toolbar-left strong');
  await expect(strong).toBeVisible({ timeout: 15000 });
  // Settle on a stable, numeric value (count starts at 0 before data loads).
  await expect(strong).toHaveText(/^\d+$/, { timeout: 15000 });
  const text = (await strong.textContent())?.trim() ?? '';
  return Number.parseInt(text, 10);
}

/**
 * Selects exactly one heritage node (clearing any prior heritage selection
 * first by reloading), waits for the result count to settle, and returns it.
 * Reloading guarantees a clean filter state because the public store persists
 * neither filters nor URL params.
 */
async function countForSingleHeritage(page: Page, label: string): Promise<number> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await openHeritageSection(page);
  await toggleHeritageNode(page, label);
  await expect(activePill(page, label)).toBeVisible();
  await page.waitForLoadState('networkidle');
  return resultCount(page);
}

test.describe('Cultural Heritage filter — nested rebuild (PR C1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // (a) Structural: nested tree renders across tiers incl. the new groups.
  test('renders the nested tree across tiers incl. the newly-added groups', async ({ page }) => {
    await openHeritageSection(page);

    // Each node renders as a visible <label> row carrying a (display:none)
    // checkbox. We assert the label is visible AND its checkbox is attached
    // (the input is hidden by design, so visibility is asserted on the label).

    // Top-tier roots present (a representative spread, incl. roots the OLD flat
    // filter had).
    for (const root of ['Asian', 'Americas', 'European', 'African', 'Middle Eastern']) {
      await expect(heritageNode(page, root)).toBeVisible();
      await expect(heritageCheckbox(page, root)).toHaveCount(1);
    }

    // Deep descendants present (Asian -> East Asian -> Chinese/Japanese): proves
    // the recursive render reaches tier 3, not just the legacy 2 levels.
    for (const node of ['East Asian', 'Chinese', 'Japanese']) {
      await expect(heritageNode(page, node)).toBeVisible();
      await expect(heritageCheckbox(page, node)).toHaveCount(1);
    }

    // The brand-new groups the OLD filter entirely lacked (design §2 S1: "Omits
    // African American, Indigenous, Indigenous-and-Diaspora entirely"). Their
    // presence is the core proof that C1.4/C1.5 wired the generated tree in.
    for (const node of ['Indigenous and Diaspora', 'African American', 'Indigenous', 'Lenape']) {
      await expect(heritageNode(page, node)).toBeVisible();
      await expect(heritageCheckbox(page, node)).toHaveCount(1);
    }

    // "Indigenous" (a child) and "Indigenous and Diaspora" (its parent) are
    // distinct nodes — confirm exact-text targeting really resolves two rows.
    await expect(heritageNode(page, 'Indigenous')).toHaveCount(1);
    await expect(heritageNode(page, 'Indigenous and Diaspora')).toHaveCount(1);
  });

  // (b) A parent checkbox toggles + applies/clears the filter.
  test('a parent checkbox toggles and applies/clears the filter', async ({ page }) => {
    const header = await openHeritageSection(page);
    const asian = heritageCheckbox(page, 'Asian');

    await expect(asian).not.toBeChecked();
    await expect(activePill(page, 'Asian')).toHaveCount(0);

    // Apply (click the label — the real interactive surface).
    await toggleHeritageNode(page, 'Asian');
    await expect(asian).toBeChecked();
    await expect(activePill(page, 'Asian')).toBeVisible();
    // The section header gains an active-count badge.
    await expect(header).toHaveText(/Cultural Heritage\s*1/);

    // Clear (untoggle).
    await toggleHeritageNode(page, 'Asian');
    await expect(asian).not.toBeChecked();
    await expect(activePill(page, 'Asian')).toHaveCount(0);
  });

  // (b) A nested (non-leaf-of-root) child checkbox toggles + applies/clears too.
  test('a nested child checkbox toggles and applies/clears the filter', async ({ page }) => {
    await openHeritageSection(page);
    const chinese = heritageCheckbox(page, 'Chinese'); // Asian > East Asian > Chinese

    await expect(chinese).not.toBeChecked();

    await toggleHeritageNode(page, 'Chinese');
    await expect(chinese).toBeChecked();
    await expect(activePill(page, 'Chinese')).toBeVisible();

    // Remove via the active pill (the other clear surface).
    await activePill(page, 'Chinese').click();
    await expect(chinese).not.toBeChecked();
    await expect(activePill(page, 'Chinese')).toHaveCount(0);
  });

  // (c) Superset / monotonic: parent Asian >= child Chinese (robust at any size).
  test('parent "Asian" result set is a superset (>=) of child "Chinese"', async ({ page }) => {
    const asianCount = await countForSingleHeritage(page, 'Asian');
    const chineseCount = await countForSingleHeritage(page, 'Chinese');

    // Monotonic at any data size: 0 >= 0 on the sparse local seed; non-trivial
    // in CI against the TEST DB. Exact magnitudes are deliberately NOT asserted.
    expect(asianCount).toBeGreaterThanOrEqual(chineseCount);
  });

  // (c) Second monotonic pair that is NON-TRIVIAL even on the local seed
  // (European matches "Bread Baking Basics" tagged only European AND
  // "Garden to Table" tagged Italian via the recursive descendant chain, so
  // European(2) > Italian(1) locally — a real superset, not 0 >= 0).
  test('parent "European" result set is a superset (>=) of child "Italian"', async ({ page }) => {
    const europeanCount = await countForSingleHeritage(page, 'European');
    const italianCount = await countForSingleHeritage(page, 'Italian');

    expect(europeanCount).toBeGreaterThanOrEqual(italianCount);

    // CI-meaningful, locally GUARDED data-magnitude probe: only when the page is
    // showing more than a tiny seed do we additionally require the recursive
    // parent expansion to STRICTLY out-count the leaf. On the sparse local seed
    // (total results <= 5) this guard is skipped so it can never falsely fail;
    // the real exercise of this branch is the CI run against the TEST DB.
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const totalResults = await resultCount(page);
    if (totalResults > 10) {
      expect(europeanCount).toBeGreaterThan(italianCount);
    }
  });

  // (a)+data-magnitude (CI-meaningful, locally GUARDED): the newly-added
  // "African American" group is wired to the recursive expansion. We always
  // prove it renders + toggles (structural); we only require a non-zero result
  // set when the page has enough data that a zero would signal a real wiring
  // break (the local seed has no AA lessons, so an unguarded > 0 would falsely
  // fail). The TEST DB (corpus freq 24) exercises the > 0 branch in CI.
  test('newly-added "African American" group renders, toggles, and matches in CI', async ({
    page,
  }) => {
    await openHeritageSection(page);
    const aa = heritageCheckbox(page, 'African American');

    await expect(heritageNode(page, 'African American')).toBeVisible();
    await toggleHeritageNode(page, 'African American');
    await expect(aa).toBeChecked();
    await expect(activePill(page, 'African American')).toBeVisible();
    await page.waitForLoadState('networkidle');

    const aaCount = await resultCount(page);
    // Sanity at any size; the meaningful > 0 assertion is CI-only (see below).
    expect(aaCount).toBeGreaterThanOrEqual(0);

    // GUARDED data-magnitude: only require matches when the corpus is non-sparse
    // (i.e. we're on the TEST DB in CI, not the 5-lesson local seed).
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const totalResults = await resultCount(page);
    if (totalResults > 50) {
      expect(aaCount).toBeGreaterThan(0);
    }
  });
});
