# Phase 8b — `approve_update` Workflow Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Ship the intent-first lesson submission redesign over three sequential PRs (schema → submitter flow → reviewer flow), closing the orphan-producing failure mode in `approve_update` end-to-end.

**Architecture:** The submitter declares intent up front via two-button picker (`/submit` → `/submit/new` or `/submit/revising`); the revising branch uses a search picker to bind a target lesson; the reviewer UI consumes binding intent with pre-selection, color-coded banner, and three-state queue badges. Schema work collapses to a single FK alter (the Phase 4 status guard at `20260428000008_phase_4_status_guard.sql` already covers item 2 of Section 1).

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind, Zustand, React Router v6, Supabase (Postgres + Edge Functions on Deno), Vitest + React Testing Library, Playwright for E2E.

**Design reference:** `docs/plans/2026-04-27-phase-8b-approve-update-redesign-design.md`. Read it before starting any task.

**Sub-skills to invoke (per phase):**
- `superpowers:test-driven-development` — every code-bearing task is test-first
- `superpowers:verification-before-completion` — before claiming any task done, run the verification commands in that task's "Verify" step
- `superpowers:requesting-code-review` — between phases (after PR 1, after PR 2)
- `database-migrations` — before touching any file in `supabase/migrations/`

**Per-PR ritual (mandatory, every PR):**
1. Pre-push self-review: `git diff main...HEAD` and read every change
2. Push → dispatch your own `feature-dev:code-reviewer` agent BEFORE bot reviews land
3. Investigate every bot finding (don't auto-accept; per `feedback_bot_review_investigation.md`)
4. Consolidated fix-up commits (don't amend pushed commits)
5. **Round-cap after 2 rounds** of bot review — if there's a 3rd round, stop, document open issues, ship anyway

**Beads is broken** (per `project_beads_broken.md`): use `TaskCreate`, NOT `bd`. Every PR also runs `npm run type-check && npm run lint` before push (per CLAUDE.md mandatory pre-PR checklist).

---

## PR 1 — Schema (single FK migration)

**Branch:** `feat/phase-8b-fk-on-delete-set-null`

**What ships:** one migration that re-creates the FK on `lesson_submissions.original_lesson_id` with `ON DELETE SET NULL`. (The Phase 4 status guard already covers Section 1's second item — verified at `supabase/migrations/20260428000008_phase_4_status_guard.sql:89-93`.)

**Why this is its own PR:** schema-first per `feedback_data_safety_top_priority.md`. Defensive change with no UI dependency. Smallest possible blast radius (single ALTER TABLE).

### Task 1.1: Create the FK alter migration

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/20260428000009_phase_8b_fk_on_delete_set_null.sql`

**Why this filename:** must sort AFTER `20260428000008_phase_4_status_guard.sql` and before `20260429000000_phase_5_b_new_publish.sql`. Using the next sequential same-day timestamp is correct here (the Phase 4 sub-migrations established `20260428000NNN` as the pattern for this date).

**Step 1: Write the migration**

```sql
-- =====================================================
-- Migration: 20260428000009_phase_8b_fk_on_delete_set_null.sql
-- =====================================================
-- Description: Phase 8b Section 1 — re-create the FK on
-- lesson_submissions.original_lesson_id with ON DELETE SET NULL.
--
-- Rationale: Phase 8b makes the submitter's binding intent ("updating
-- lesson X") a first-class signal. If a reviewer or admin later
-- deletes lesson X, the submission row should survive with its intent
-- neutralized (original_lesson_id = NULL) rather than cascade-deleting
-- the submission. The original FK had no ON DELETE clause (defaults to
-- NO ACTION), which would block the lesson delete — also wrong, since
-- a delete shouldn't be vetoed by an old submission's reference.
--
-- Section 1 of the design doc had a second item (RPC status guard) but
-- that already exists from Phase 4 (see 20260428000008_phase_4_status_guard.sql),
-- which refuses re-entry on terminal statuses ('approved', 'rejected').
-- This file is the only schema migration needed for Phase 8b.

ALTER TABLE public.lesson_submissions
  DROP CONSTRAINT IF EXISTS lesson_submissions_original_lesson_id_fkey;

ALTER TABLE public.lesson_submissions
  ADD CONSTRAINT lesson_submissions_original_lesson_id_fkey
    FOREIGN KEY (original_lesson_id)
    REFERENCES public.lessons(lesson_id)
    ON DELETE SET NULL;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- ALTER TABLE public.lesson_submissions
--   DROP CONSTRAINT IF EXISTS lesson_submissions_original_lesson_id_fkey;
-- ALTER TABLE public.lesson_submissions
--   ADD CONSTRAINT lesson_submissions_original_lesson_id_fkey
--     FOREIGN KEY (original_lesson_id)
--     REFERENCES public.lessons(lesson_id);
```

**Step 2: Apply locally**

Run: `supabase db reset`
Expected: completes without errors; "Finished supabase db reset on branch main."

**Step 3: Verify the FK clause locally**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT conname, confdeltype
FROM pg_constraint
WHERE conname = 'lesson_submissions_original_lesson_id_fkey';
"
```
Expected: one row, `confdeltype = n` (where `n` = SET NULL; reference: `pg_constraint.confdeltype` codes are `a` no action, `r` restrict, `c` cascade, `n` set null, `d` set default).

**Step 4: Run RLS tests (regression check)**

Run: `npm run test:rls`
Expected: all tests pass; no new failures.

**Step 5: Commit**

```bash
git add supabase/migrations/20260428000009_phase_8b_fk_on_delete_set_null.sql
git commit -m "feat(db): Phase 8b — FK on lesson_submissions.original_lesson_id ON DELETE SET NULL

Section 1 of the Phase 8b design. Re-creates the FK so deleting a
lesson the submitter linked to neutralizes the submission's intent
rather than cascade-deleting or vetoing the lesson delete. Section 1's
second item (RPC status guard) already exists from Phase 4
(20260428000008_phase_4_status_guard.sql), so this file is the only
schema migration for Phase 8b."
```

### Task 1.2: Push, verify on TEST DB, merge

**Step 1: Push**

```bash
git push -u origin feat/phase-8b-fk-on-delete-set-null
```

**Step 2: Open PR**

```bash
gh pr create --title "feat(db): Phase 8b Section 1 — FK ON DELETE SET NULL" --body "$(cat <<'EOF'
## Summary
- Re-creates `lesson_submissions_original_lesson_id_fkey` with `ON DELETE SET NULL`
- First of three Phase 8b PRs (schema → submitter flow → reviewer flow)
- Section 1's second item (RPC status guard) is already in production from Phase 4 — no migration needed for it

## Why this matters
Phase 8b makes the submitter's binding intent ("updating lesson X") a first-class signal. The current FK (no ON DELETE clause) would let lesson deletes silently fail with a vague constraint error if any submission references the lesson. Setting NULL on delete keeps both the submission row intact and the delete operation succeeding.

## Test plan
- [ ] Local `supabase db reset` succeeds
- [ ] `pg_constraint.confdeltype = 'n'` for the new FK locally
- [ ] `npm run test:rls` passes
- [ ] After CI applies migration to TEST DB, verify via `mcp__supabase-test__execute_sql` that the FK shows `ON DELETE SET NULL`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Wait for CI to apply migration to TEST DB**, then verify

Run via `mcp__supabase-test__execute_sql`:
```sql
SELECT conname, confdeltype
FROM pg_constraint
WHERE conname = 'lesson_submissions_original_lesson_id_fkey';
```
Expected: one row, `confdeltype = n`.

**Step 4: Per-PR ritual**

Dispatch own `feature-dev:code-reviewer` agent on the PR before any bot review. Investigate every finding from any reviewer (claude-review, etc.) per `feedback_bot_review_investigation.md`. Round-cap after 2 rounds.

**Step 5: Merge after approval; production migration runs after manual approval in `migrate-production.yml`.** Verify on PROD via `mcp__supabase-remote__execute_sql` (same query as Step 3) — per `feedback_data_safety_top_priority.md`, MCP verification is mandatory after every PROD migrate.

---

## PR 2 — Submitter flow + LessonSearchPicker

**Branch:** `feat/phase-8b-intent-first-submitter-flow`

**What ships:** rewrite of `SubmissionPage.tsx` as an intent picker; new routes `/submit/new` and `/submit/revising`; new `LessonSearchPicker`, `NewSubmissionForm`, `RevisingSubmissionForm` components; `process-submission` edge function pre-INSERT validation; new utility `titlesAreSimilar` (for Section 3 to consume but built here so PR 3 stays narrow).

**Pre-flight: read these files first to internalize current shape:**
- `src/pages/SubmissionPage.tsx` (entire — 413 lines)
- `src/components/Auth/AuthModal.tsx` (existing modal pattern + `onSuccess` signature)
- `src/components/Internal/IntButton.tsx`, `IntFormField.tsx`, `IntPageHeader.tsx` (the design system components used by submission UI)
- `supabase/functions/process-submission/index.ts` (entire — verify line numbers haven't shifted from 173-187 INSERT region)
- `src/App.tsx` lines 89-130 (where new routes go)

### Task 2.1: TDD — `titlesAreSimilar` utility

**Sub-skill:** `superpowers:test-driven-development`

**Files:**
- Create: `src/utils/titleSimilarity.ts`
- Create: `src/utils/__tests__/titleSimilarity.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/utils/__tests__/titleSimilarity.test.ts
import { describe, it, expect } from 'vitest';
import { titlesAreSimilar } from '@/utils/titleSimilarity';

describe('titlesAreSimilar', () => {
  // Threshold is 0.3 (per design Section 6.6)
  const SIMILAR = true;
  const NOT_SIMILAR = false;

  it.each([
    ['Apple Crisp', 'Apple Crisp', SIMILAR],                              // identical
    ['Apple Crisp', 'apple crisp', SIMILAR],                              // case
    ['Apple Crisp', 'Apple-Crisp', SIMILAR],                              // punctuation
    ['Apple Crisp Lesson', 'Apple Crisp', SIMILAR],                       // contains
    ['Spring Planting', 'Spring Planting Updated for 2026', SIMILAR],     // legitimate revision
    ['Three Sisters Garden', 'Planting the Three Sisters', SIMILAR],      // word reorder
    ['Apple Crisp', 'Solar Eclipse', NOT_SIMILAR],                        // unrelated
    ['Pumpkin Pie', 'Apple Crisp', NOT_SIMILAR],                          // unrelated 2
    ['', '', NOT_SIMILAR],                                                // both empty
    ['Apple Crisp', '', NOT_SIMILAR],                                     // one empty
  ])('titlesAreSimilar(%s, %s) === %s', (a, b, expected) => {
    expect(titlesAreSimilar(a, b)).toBe(expected);
  });
});
```

**Step 2: Run test, verify it fails**

Run: `npx vitest run src/utils/__tests__/titleSimilarity.test.ts`
Expected: FAIL — module not found `@/utils/titleSimilarity`.

**Step 3: Implement minimal code to pass**

```typescript
// src/utils/titleSimilarity.ts
/**
 * Word-set Jaccard similarity for short titles.
 * Used as a non-blocking UX hint on the reviewer side when an auto-picked
 * merge target's title differs from the submission's extracted title.
 *
 * Threshold 0.3 — generous enough to match legitimate revisions
 * ("Spring Planting" vs "Spring Planting Updated for 2026") while
 * still flagging unrelated targets ("Apple Crisp" vs "Solar Eclipse").
 *
 * Empty strings always return false (no signal to compare).
 */
const SIMILARITY_THRESHOLD = 0.3;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function titlesAreSimilar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const wa = new Set(na.split(' '));
  const wb = new Set(nb.split(' '));
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  if (union === 0) return false;
  return intersection / union >= SIMILARITY_THRESHOLD;
}
```

**Step 4: Run tests, verify all pass**

Run: `npx vitest run src/utils/__tests__/titleSimilarity.test.ts`
Expected: 10/10 pass.

**Step 5: Commit**

```bash
git add src/utils/titleSimilarity.ts src/utils/__tests__/titleSimilarity.test.ts
git commit -m "feat(utils): add titlesAreSimilar (word-set Jaccard, 0.3 threshold)

Used by Section 3 reviewer flow as a non-blocking UX hint when an
auto-picked merge target's title differs from the submission's
extracted title. In-browser, no DB call. Threshold tuned so legitimate
revisions ('Spring Planting' vs 'Spring Planting Updated for 2026')
don't trigger; unrelated targets do."
```

### Task 2.2: TDD — `LessonSearchPicker` component

**Sub-skill:** `superpowers:test-driven-development`

**Files:**
- Create: `src/components/LessonSearchPicker.tsx`
- Create: `src/components/__tests__/LessonSearchPicker.test.tsx`

This is the meatiest component. It's used by both submitter (PR 2) and reviewer (PR 3).

**Step 1: Write the failing tests**

```typescript
// src/components/__tests__/LessonSearchPicker.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonSearchPicker } from '@/components/LessonSearchPicker';

// Mock supabase client. Returns Apple Crisp + Pumpkin Pie when query has chars.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          { lesson_id: 'lesson_1', title: 'Apple Crisp Lesson', grade_levels: ['3', '4'], season_timing: ['Fall'] },
          { lesson_id: 'lesson_2', title: 'Pumpkin Pie Math', grade_levels: ['5'], season_timing: ['Fall'] },
        ],
        error: null,
      }),
    })),
  },
}));

describe('LessonSearchPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state with placeholder + example', () => {
    render(<LessonSearchPicker selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByPlaceholderText(/search by lesson title/i)).toBeInTheDocument();
    expect(screen.getByText(/three sisters/i)).toBeInTheDocument();
  });

  it('debounces input and queries lessons after typing', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LessonSearchPicker selected={null} onSelect={onSelect} onClear={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'apple');
    await waitFor(
      () => expect(screen.getByText('Apple Crisp Lesson')).toBeInTheDocument(),
      { timeout: 1000 }
    );
  });

  it('calls onSelect when a result card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LessonSearchPicker selected={null} onSelect={onSelect} onClear={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'apple');
    await waitFor(() => screen.getByText('Apple Crisp Lesson'));
    await user.click(screen.getByText('Apple Crisp Lesson'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ lesson_id: 'lesson_1', title: 'Apple Crisp Lesson' })
    );
  });

  it('renders a chip with × clear when selected is non-null', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <LessonSearchPicker
        selected={{ lesson_id: 'lesson_1', title: 'Apple Crisp Lesson' }}
        onSelect={vi.fn()}
        onClear={onClear}
      />
    );

    expect(screen.getByText(/apple crisp lesson/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/clear selected lesson/i));
    expect(onClear).toHaveBeenCalled();
  });

  it('renders can\'t-find option when cantFindOption=true and query has no results', async () => {
    // Override mock to return empty
    const { supabase } = await import('@/lib/supabase');
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const user = userEvent.setup();
    const onCantFind = vi.fn();
    render(
      <LessonSearchPicker
        selected={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        cantFindOption
        onCantFind={onCantFind}
      />
    );

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'nonsense');
    await waitFor(() => screen.getByText(/can't find it/i));
    await user.click(screen.getByText(/can't find it/i));
    expect(onCantFind).toHaveBeenCalled();
  });

  it('does not render can\'t-find option when cantFindOption=false', async () => {
    const user = userEvent.setup();
    render(
      <LessonSearchPicker
        selected={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        cantFindOption={false}
      />
    );
    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'nonsense');
    await waitFor(() => {}, { timeout: 500 });
    expect(screen.queryByText(/can't find it/i)).not.toBeInTheDocument();
  });
});
```

**Step 2: Run tests, verify they fail**

Run: `npx vitest run src/components/__tests__/LessonSearchPicker.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement the component**

```typescript
// src/components/LessonSearchPicker.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export interface LessonSearchResult {
  lesson_id: string;
  title: string;
  grade_levels?: string[] | null;
  season_timing?: string[] | null;
}

interface Props {
  selected: LessonSearchResult | null;
  // eslint-disable-next-line no-unused-vars
  onSelect: (lesson: LessonSearchResult) => void;
  onClear: () => void;
  cantFindOption?: boolean;
  onCantFind?: () => void;
}

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 10;

export function LessonSearchPicker({
  selected,
  onSelect,
  onClear,
  cantFindOption = false,
  onCantFind,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LessonSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasQueried(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('lesson_id, title, grade_levels, season_timing')
        .ilike('title', `%${q}%`)
        .order('title', { ascending: true })
        .limit(MAX_RESULTS);
      if (error) throw error;
      setResults(data ?? []);
      setHasQueried(true);
    } catch (err) {
      logger.debug('LessonSearchPicker query failed:', err);
      setResults([]);
      setHasQueried(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) return; // No live search when something is bound
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected, runSearch]);

  if (selected) {
    return (
      <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg sticky top-0 z-10">
        <div>
          <span className="text-xs uppercase tracking-wide text-emerald-700 mr-2">Selected:</span>
          <span className="font-medium text-emerald-900">{selected.title}</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selected lesson"
          className="text-emerald-700 hover:text-emerald-900 p-1"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by lesson title or topic"
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <Loader2
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">e.g., 'Three Sisters' or 'composting'</p>

      {results.length > 0 && (
        <ul className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100">
          {results.map((r) => (
            <li key={r.lesson_id}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-100 focus:outline-none"
              >
                <div className="font-medium text-gray-900">{r.title}</div>
                {(r.grade_levels?.length || r.season_timing?.length) && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.grade_levels?.length ? `Grades ${r.grade_levels.join(', ')}` : ''}
                    {r.grade_levels?.length && r.season_timing?.length ? ' · ' : ''}
                    {r.season_timing?.join(', ')}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasQueried && results.length === 0 && !isLoading && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
          No matches found.
          {cantFindOption && onCantFind && (
            <button
              type="button"
              onClick={onCantFind}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              I'm updating but can't find it — let a reviewer help
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Run tests, verify all pass**

Run: `npx vitest run src/components/__tests__/LessonSearchPicker.test.tsx`
Expected: 6/6 pass.

**Step 5: Commit**

```bash
git add src/components/LessonSearchPicker.tsx src/components/__tests__/LessonSearchPicker.test.tsx
git commit -m "feat(components): add reusable LessonSearchPicker

Used by Phase 8b submitter (revising branch) and reviewer (search
escape hatch) flows. Debounced (300ms) ilike against the existing
trigram index on lessons.title. Optional 'can't find it' affordance
for the submitter side."
```

### Task 2.3: Add new routes to `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Step 1: Read current routes section**

Run: `grep -n "<Route path" src/App.tsx`
Confirm `/submit` is the only existing submission route.

**Step 2: Edit `App.tsx` to add the two new routes**

Find:
```tsx
<Route path="/submit" element={<SubmissionPage />} />
```

Replace with:
```tsx
<Route path="/submit" element={<SubmissionPage />} />
<Route path="/submit/new" element={<NewSubmissionForm />} />
<Route path="/submit/revising" element={<RevisingSubmissionForm />} />
```

Add the imports near the top of `App.tsx` alongside the existing `SubmissionPage` lazy import:
```tsx
const NewSubmissionForm = lazy(() => import('./pages/NewSubmissionForm').then(m => ({ default: m.NewSubmissionForm })));
const RevisingSubmissionForm = lazy(() => import('./pages/RevisingSubmissionForm').then(m => ({ default: m.RevisingSubmissionForm })));
```
(Match the existing lazy-import pattern; check `App.tsx` lines 1-30 for the existing `SubmissionPage` lazy import shape.)

**Step 3: Verify type-check passes (will warn about missing files until next tasks)**

Run: `npm run type-check 2>&1 | head -20`
Expected: errors reference missing `NewSubmissionForm` and `RevisingSubmissionForm` modules. That's fine — they'll be created in Tasks 2.5 and 2.6. Do not commit yet.

(Alternatively: stage the route additions but defer commit until after Task 2.6 so we never have a broken commit.)

### Task 2.4: Rewrite `SubmissionPage.tsx` as the intent picker

**Files:**
- Modify: `src/pages/SubmissionPage.tsx` (full rewrite — currently 413 lines, will become ~80 lines)

**Step 1: Replace the entire file contents**

```typescript
// src/pages/SubmissionPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthModal } from '@/components/Auth/AuthModal';
import { IntPageHeader } from '@/components/Internal';
import { User } from '@supabase/supabase-js';

type Intent = 'new' | 'revising';

export function SubmissionPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleIntent = (intent: Intent) => {
    if (!user) {
      setPendingIntent(intent);
      setShowAuthModal(true);
      return;
    }
    navigate(`/submit/${intent}`);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingIntent) {
      navigate(`/submit/${pendingIntent}`);
      setPendingIntent(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <IntPageHeader title="Submit a lesson" />
      <p className="text-gray-600 mb-8">
        Submit a Google Doc lesson plan for the ESYNYC library. A reviewer will check it and either
        publish it or get back to you.
      </p>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">What are you submitting?</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleIntent('new')}
          className="text-left p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 focus:border-blue-500 focus:outline-none transition"
        >
          <FilePlus size={28} className="text-blue-600 mb-3" />
          <div className="font-semibold text-lg text-gray-900 mb-1">
            Add a new lesson to the library
          </div>
          <div className="text-sm text-gray-600">
            Use this if no version of this lesson has been added yet.
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleIntent('revising')}
          className="text-left p-6 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 focus:border-emerald-500 focus:outline-none transition"
        >
          <Edit3 size={28} className="text-emerald-600 mb-3" />
          <div className="font-semibold text-lg text-gray-900 mb-1">
            Update a lesson that's already in the library
          </div>
          <div className="text-sm text-gray-600">
            Use this if a version of your lesson is already published.
          </div>
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingIntent(null);
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
```

**Step 2: Type-check**

Run: `npm run type-check 2>&1 | head -20`
Expected: still references missing `NewSubmissionForm` / `RevisingSubmissionForm` from `App.tsx`. The `SubmissionPage` itself should type-check.

**Step 3: Defer commit until Task 2.6 (so we never have a broken commit on the branch).**

### Task 2.5: Create `NewSubmissionForm`

**Files:**
- Create: `src/pages/NewSubmissionForm.tsx`

**Step 1: Implement**

This page handles the "brand new lesson" flow. Most of the heavy lifting (validation, edge function call, success/error rendering) is preserved from the original `SubmissionPage.tsx` lines 60-300 — but with `submissionType` hardcoded to `'new'` and `originalLessonId` hardcoded to `null`. The post-submit duplicates panel (originally lines 286-350) is dropped.

```typescript
// src/pages/NewSubmissionForm.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { AuthModal } from '@/components/Auth/AuthModal';
import { IntButton, IntFormField, IntPageHeader, IntStatusBadge, type IntStatus } from '@/components/Internal';
import { User } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

const SUBMISSION_STATUS_TO_BADGE: Record<string, IntStatus> = {
  submitted: 'submitted',
  in_review: 'review',
  needs_revision: 'revision',
  approved: 'approved',
};

export function NewSubmissionForm() {
  const navigate = useNavigate();
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    extractedTitle: string;
    status: string;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!/\/document\/d\/([a-zA-Z0-9-_]+)/.test(googleDocUrl)) {
      setError('Please paste a valid Google Doc URL.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('process-submission', {
        body: { googleDocUrl, submissionType: 'new', originalLessonId: null },
      });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error ?? 'Submission failed.');
      setSubmissionResult({
        submissionId: data.submissionId,
        extractedTitle: data.extractedTitle,
        status: data.status,
      });
    } catch (err) {
      logger.debug('NewSubmissionForm submit failed:', err);
      setError(parseDbError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="text-green-600 mb-2" size={32} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Submitted!</h2>
          <div className="text-gray-700 mb-4">
            <FileText size={16} className="inline mr-1" />
            <strong>{submissionResult.extractedTitle}</strong>
          </div>
          <IntStatusBadge status={SUBMISSION_STATUS_TO_BADGE[submissionResult.status] ?? 'submitted'} />
          <p className="mt-4 text-sm text-gray-700">
            We'll publish this once a reviewer approves.
          </p>
          <div className="mt-4 text-xs text-gray-500">Submission ID: {submissionResult.submissionId}</div>
          <IntButton variant="primary" onClick={() => navigate('/')} className="mt-6">
            Back to library
          </IntButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/submit" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center mb-4">
        <ChevronLeft size={14} className="mr-1" />
        Adding a new lesson · Change
      </Link>
      <IntPageHeader title="Add a new lesson" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <IntFormField
          label="Google Doc URL"
          value={googleDocUrl}
          onChange={setGoogleDocUrl}
          placeholder="https://docs.google.com/document/d/..."
          required
        />
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <IntButton type="submit" variant="primary" disabled={isSubmitting || !googleDocUrl}>
          {isSubmitting ? (<><Loader2 size={16} className="animate-spin mr-2 inline" />Submitting…</>) : 'Submit'}
        </IntButton>
      </form>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
```

**Step 2: Type-check** — should now reference only `RevisingSubmissionForm` as missing.

### Task 2.6: Create `RevisingSubmissionForm`

**Files:**
- Create: `src/pages/RevisingSubmissionForm.tsx`

**Step 1: Implement**

```typescript
// src/pages/RevisingSubmissionForm.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { AuthModal } from '@/components/Auth/AuthModal';
import { IntButton, IntFormField, IntPageHeader, IntStatusBadge, type IntStatus } from '@/components/Internal';
import { LessonSearchPicker, LessonSearchResult } from '@/components/LessonSearchPicker';
import { User } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

const SUBMISSION_STATUS_TO_BADGE: Record<string, IntStatus> = {
  submitted: 'submitted',
  in_review: 'review',
  needs_revision: 'revision',
  approved: 'approved',
};

export function RevisingSubmissionForm() {
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState<LessonSearchResult | null>(null);
  const [cantFind, setCantFind] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    extractedTitle: string;
    status: string;
    targetTitle: string | null;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const targetReady = selectedLesson || cantFind;
  const canSubmit = targetReady && /\/document\/d\/([a-zA-Z0-9-_]+)/.test(googleDocUrl) && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!targetReady) {
      setError('Pick a lesson or use the "can\'t find it" option first.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('process-submission', {
        body: {
          googleDocUrl,
          submissionType: 'update',
          originalLessonId: selectedLesson?.lesson_id ?? null,
        },
      });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error ?? 'Submission failed.');
      setSubmissionResult({
        submissionId: data.submissionId,
        extractedTitle: data.extractedTitle,
        status: data.status,
        targetTitle: selectedLesson?.title ?? null,
      });
    } catch (err) {
      logger.debug('RevisingSubmissionForm submit failed:', err);
      setError(parseDbError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="text-green-600 mb-2" size={32} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Submitted!</h2>
          <div className="text-gray-700 mb-4">
            <FileText size={16} className="inline mr-1" />
            <strong>{submissionResult.extractedTitle}</strong>
          </div>
          <IntStatusBadge status={SUBMISSION_STATUS_TO_BADGE[submissionResult.status] ?? 'submitted'} />
          <p className="mt-4 text-sm text-gray-700">
            {submissionResult.targetTitle ? (
              <>We'll merge this into <strong>"{submissionResult.targetTitle}"</strong> once a reviewer approves.</>
            ) : (
              <>A reviewer will identify which lesson this updates and either merge or publish as new.</>
            )}
          </p>
          <div className="mt-4 text-xs text-gray-500">Submission ID: {submissionResult.submissionId}</div>
          <IntButton variant="primary" onClick={() => navigate('/')} className="mt-6">
            Back to library
          </IntButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/submit" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center mb-4">
        <ChevronLeft size={14} className="mr-1" />
        Updating a lesson · Change
      </Link>
      <IntPageHeader title="Update an existing lesson" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Step 1 · Find the lesson you're revising
          </label>
          {cantFind && !selectedLesson ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-amber-900">
                A reviewer will identify which lesson this updates.
              </span>
              <button
                type="button"
                onClick={() => setCantFind(false)}
                className="text-sm text-amber-800 underline hover:text-amber-900"
              >
                Try search again
              </button>
            </div>
          ) : (
            <LessonSearchPicker
              selected={selectedLesson}
              onSelect={(l) => { setSelectedLesson(l); setCantFind(false); }}
              onClear={() => setSelectedLesson(null)}
              cantFindOption
              onCantFind={() => setCantFind(true)}
            />
          )}
        </div>

        <div className={targetReady ? '' : 'opacity-50 pointer-events-none'}>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Step 2 · Paste your Google Doc link
          </label>
          <IntFormField
            label=""
            value={googleDocUrl}
            onChange={setGoogleDocUrl}
            placeholder="https://docs.google.com/document/d/..."
            disabled={!targetReady}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <IntButton type="submit" variant="primary" disabled={!canSubmit}>
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin mr-2 inline" />Submitting…</>
          ) : selectedLesson ? (
            <>Submit as a revision of {selectedLesson.title}</>
          ) : (
            <>Submit for reviewer to match</>
          )}
        </IntButton>
        <p className="text-xs text-gray-500">
          {selectedLesson
            ? 'A reviewer will replace the published lesson with this content.'
            : 'A reviewer will identify which lesson this updates.'}
        </p>
      </form>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
```

**Step 2: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: passes.

**Step 3: Commit (consolidates Tasks 2.3, 2.4, 2.5, 2.6 — first compilable state on this branch)**

```bash
git add src/App.tsx src/pages/SubmissionPage.tsx src/pages/NewSubmissionForm.tsx src/pages/RevisingSubmissionForm.tsx
git commit -m "feat(submit): Phase 8b intent-first submitter flow

Rewrites SubmissionPage as a two-button intent picker. Adds
/submit/new (URL-paste only) and /submit/revising (search picker +
URL paste) routes. The revising form supports a 'can't find it'
escape that submits with original_lesson_id=null and binding intent
'update' — the reviewer-side flow (PR 3) interprets this as
'submitter is updating but couldn't find target.' Drops the post-submit
duplicates panel; success copy now mentions the bound target lesson
title (or the can't-find fallback message)."
```

### Task 2.7: Add pre-INSERT validation to `process-submission`

**Sub-skill:** `superpowers:test-driven-development` (integration test)

**Files:**
- Modify: `supabase/functions/process-submission/index.ts` (insert before line 174)

**Step 1: Read the current INSERT region** (line 173-187 confirmed earlier; verify line numbers haven't drifted)

Run: `grep -n "Step 1: Create submission record" supabase/functions/process-submission/index.ts`
Expected: line ~173.

**Step 2: Insert the pre-INSERT validation block before line 174**

Insert this code block immediately AFTER line 171 (`const googleDocId = docIdMatch[1];`) and BEFORE line 173 (`// Step 1: Create submission record`):

```typescript
      // Phase 8b: validate originalLessonId BEFORE INSERT to avoid orphan
      // rows on the error path. The DB-level FK serves as the TOCTOU
      // backstop; this check provides fast user feedback.
      if (submissionType === 'update' && originalLessonId) {
        const { count: lessonCount, error: lessonCheckError } = await supabaseAdmin
          .from('lessons')
          .select('lesson_id', { count: 'exact', head: true })
          .eq('lesson_id', originalLessonId);
        if (lessonCheckError) {
          throw lessonCheckError;
        }
        if ((lessonCount ?? 0) === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Original lesson not found: ${originalLessonId}`,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
```

**Step 3: Local test**

Start the function locally:
```bash
supabase functions serve process-submission --no-verify-jwt
```

Send a test request with an invalid `originalLessonId` from a separate terminal:
```bash
curl -X POST 'http://localhost:54321/functions/v1/process-submission' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $(supabase status -o env | grep SERVICE_ROLE_KEY | cut -d= -f2 | tr -d '"')" \
  -d '{"googleDocUrl":"https://docs.google.com/document/d/abc/edit","submissionType":"update","originalLessonId":"lesson_nonsense_uuid"}'
```
Expected: HTTP 400 with `{"success":false,"error":"Original lesson not found: lesson_nonsense_uuid"}`. Verify NO row was inserted:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
  SELECT count(*) FROM lesson_submissions WHERE google_doc_url LIKE '%abc/edit%';
"
```
Expected: `0`.

**Step 4: Commit**

```bash
git add supabase/functions/process-submission/index.ts
git commit -m "feat(edge-fn): Phase 8b — pre-INSERT validation of originalLessonId

When submissionType='update' and originalLessonId is non-null, verify
the target lesson exists BEFORE inserting the submission row. Returns
400 on missing target without inserting; the existing FK constraint
remains the TOCTOU backstop. Allows (update, null) — that's the
'submitter said update but couldn't find target' state from PR 2."
```

### Task 2.8: E2E tests for the three submitter paths

**Files:**
- Modify or create: `e2e/submission-flow.spec.ts`

**Step 1: Read the existing E2E setup**

Run: `cat e2e/smoke.spec.ts && ls e2e/`
Confirm Playwright config + how the existing test bootstraps a session.

**Step 2: Implement the new spec**

```typescript
// e2e/submission-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Phase 8b — submission flow (intent-first)', () => {
  test('intent picker renders and routes to /submit/new on click', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.getByRole('heading', { name: /Submit a lesson/i })).toBeVisible();
    await expect(page.getByText(/Add a new lesson to the library/i)).toBeVisible();
    await expect(page.getByText(/Update a lesson that's already in the library/i)).toBeVisible();
  });

  test('Add new branch shows URL paste form and a back-to-intent link', async ({ page }) => {
    await page.goto('/submit/new');
    await expect(page.getByText(/Add a new lesson/i)).toBeVisible();
    await expect(page.getByPlaceholder(/docs\.google\.com\/document/i)).toBeVisible();
    await expect(page.getByText(/Adding a new lesson · Change/i)).toBeVisible();
  });

  test('Update branch shows search picker; URL field disabled until target picked or can\'t-find', async ({ page }) => {
    await page.goto('/submit/revising');
    await expect(page.getByText(/Find the lesson you're revising/i)).toBeVisible();
    const urlInput = page.getByPlaceholder(/docs\.google\.com\/document/i);
    await expect(urlInput).toBeDisabled();
  });

  // The login/submit happy paths require seeded credentials and TEST DB —
  // run those in a dedicated authenticated suite separately. The structural
  // tests above cover the route + initial state regression risk.
});
```

**Step 3: Run E2E**

Run: `npm run test:e2e -- submission-flow`
Expected: 3/3 pass.

**Step 4: Commit**

```bash
git add e2e/submission-flow.spec.ts
git commit -m "test(e2e): Phase 8b submission flow structural smoke

Covers: /submit renders intent picker; /submit/new shows URL form +
breadcrumb; /submit/revising disables URL field until target picked.
Authenticated happy-path flows deferred to a credentialed suite."
```

### Task 2.9: Push, dispatch own reviewer agent, investigate bot findings

**Step 1: Mandatory pre-PR check**

Run: `npm run type-check && npm run lint`
Expected: both pass with no errors.

**Step 2: Push**

```bash
git push -u origin feat/phase-8b-intent-first-submitter-flow
```

**Step 3: Open PR**

```bash
gh pr create --title "feat: Phase 8b — intent-first submitter flow + LessonSearchPicker" --body "$(cat <<'EOF'
## Summary
- Rewrites `SubmissionPage` as a two-button intent picker (Add new / Update existing)
- Adds `/submit/new` and `/submit/revising` routes
- New `LessonSearchPicker` component (reused by PR 3 reviewer flow)
- New `titlesAreSimilar` utility (consumed by PR 3)
- `process-submission` edge function pre-INSERT validation of `originalLessonId`
- Drops the post-submit duplicates panel (per design)

## Phase 8b context
This is PR 2 of 3. PR 1 (the FK migration) is already merged. PR 3 (reviewer flow) lands after this. See `docs/plans/2026-04-27-phase-8b-approve-update-redesign-design.md` for full context.

## Test plan
- [ ] Unit: `npx vitest run src/utils/__tests__/titleSimilarity.test.ts` (10/10 pass)
- [ ] Unit: `npx vitest run src/components/__tests__/LessonSearchPicker.test.tsx` (6/6 pass)
- [ ] E2E: `npm run test:e2e -- submission-flow` (3/3 pass)
- [ ] Type: `npm run type-check` clean
- [ ] Lint: `npm run lint` clean
- [ ] Manual smoke on TEST DB after Netlify preview is up: submit via `/submit/new`, verify row in TEST DB has `submission_type='new'` and `original_lesson_id=NULL`
- [ ] Manual smoke: submit via `/submit/revising` with target picked, verify row has `original_lesson_id` set
- [ ] Manual smoke: submit via `/submit/revising` with "can't find it", verify row has `submission_type='update'` and `original_lesson_id=NULL`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 4: Dispatch own `feature-dev:code-reviewer` agent on the PR before bot reviews**

Per `feedback_pr_bot_review_workflow.md`. Investigate every bot finding per `feedback_bot_review_investigation.md`. Round-cap after 2 rounds.

**Step 5: Manual TEST DB smoke after Netlify preview is up**

Use `mcp__supabase-test__execute_sql` to verify each of the three submission paths produces a correctly-shaped row. Required before merge per `feedback_data_safety_top_priority.md`.

**Step 6: Merge**

---

## PR 3 — Reviewer flow

**Branch:** `feat/phase-8b-reviewer-flow`

**What ships:** `ReviewDetail.tsx` updates (binding-intent banner, pre-selection, fixed enable/disable, unified card list, search escape hatch, mismatch helper, off-list submitter target fetch); `ReviewDashboard.tsx` + `IntQueueRow.tsx` three-state queue badges.

**Pre-flight: read these files first to internalize shape:**
- `src/pages/ReviewDetail.tsx` (entire — 1016 lines; focus on `selectedDuplicate` state at line 122, `loadSubmission` near line 200-300, decision-bar at line 990-1010, duplicate cards at line 876-911, approve_update radio at line 938)
- `src/pages/ReviewDashboard.tsx` (line 109 query; line 165 status cast; lines 257-266 `IntQueueRow` instantiation)
- `src/components/IntQueueRow.tsx` (current props shape)
- `src/components/IntDuplicateCard.tsx` (matchLabel prop; this is what powers the "Submitter's choice" badge)
- `src/components/LessonSearchPicker.tsx` (created in PR 2)
- `src/utils/titleSimilarity.ts` (created in PR 2)

### Task 3.1: Extend `loadSubmission` to fetch off-list submitter target

**Files:**
- Modify: `src/pages/ReviewDetail.tsx` (in the `loadSubmission` function around line 200-300)

**Why:** if the submitter bound to lesson X but X doesn't appear in `submission_similarities`, the unified card list (Task 3.5) needs X's metadata to render the "Submitter's choice" card.

**Step 1: Find the spot in `loadSubmission` where similarities-with-lessons are assembled**

Run: `grep -n "similaritiesWithLessons\|lessons_with_metadata" src/pages/ReviewDetail.tsx`
Expected: a few lines around the join logic (likely 240-280).

**Step 2: After the existing similarities-with-lessons assembly, add this block**

```typescript
// Phase 8b: if submitter bound to a lesson that's NOT in the dup list,
// fetch it separately so the unified card list can render it as
// "Submitter's choice."
const submitterTargetId = submissionData?.original_lesson_id ?? null;
const targetInDupList = submitterTargetId
  ? similaritiesWithLessons.some((s) => s.lesson?.lesson_id === submitterTargetId)
  : false;
let submitterTargetLesson: any = null;
if (submitterTargetId && !targetInDupList) {
  const { data: targetData, error: targetErr } = await supabase
    .from('lessons_with_metadata')
    .select('lesson_id, title, summary, file_link, grade_levels, thematic_categories')
    .eq('lesson_id', submitterTargetId)
    .single();
  if (!targetErr) {
    submitterTargetLesson = targetData;
  }
}
```

Then attach `submitterTargetLesson` to the `setSubmission(...)` payload (extend the type as needed).

**Step 3: Verify type-check passes**

Run: `npm run type-check`
Expected: passes (after extending the submission type).

**Step 4: Commit (will be amended via fix-up commits in later tasks if needed)**

```bash
git add src/pages/ReviewDetail.tsx
git commit -m "feat(review): fetch off-list submitter target lesson

When submission.original_lesson_id is set but that lesson is not in
the dup-detection list, fetch it from lessons_with_metadata so the
upcoming unified card list can render it as 'Submitter's choice.'"
```

### Task 3.2: Add color-coded binding-intent banner

**Files:**
- Modify: `src/pages/ReviewDetail.tsx` (top of decision panel — find the wrapper around the decision radio set, likely around line 920-940; add a new block ABOVE the existing decision UI)

**Step 1: Add the banner component logic**

Inside the render function, near the top of the decision panel area, add:

```tsx
{/* Phase 8b: binding-intent banner */}
{(() => {
  const type = submission?.submission_type;
  const targetId = submission?.original_lesson_id;
  const targetTitle = submitterTargetLesson?.title
    || topDuplicates.find((d) => d.id === targetId)?.title
    || null;

  if (type === 'update' && targetId && targetTitle) {
    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <span className="font-medium text-blue-900">Submitter says:</span>{' '}
        <span className="text-blue-900">Updating <strong>{targetTitle}</strong></span>
      </div>
    );
  }
  if (type === 'update' && !targetId) {
    return (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm flex items-start">
        <AlertTriangle size={16} className="text-amber-700 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-medium text-amber-900">Submitter says:</span>{' '}
          <span className="text-amber-900">Updating, but couldn't find target — please search to identify.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
      <span className="font-medium text-emerald-900">Submitter says:</span>{' '}
      <span className="text-emerald-900">New lesson</span>
    </div>
  );
})()}
```

(Make sure `AlertTriangle` is imported from `lucide-react` if it isn't already.)

**Step 2: Type-check + visual smoke**

Run: `npm run type-check`
Then `npm run dev` and open a sample submission to confirm the banner renders. Verify all three states by manually editing `lesson_submissions` rows in local DB to flip `submission_type` and `original_lesson_id`.

**Step 3: Commit**

```bash
git add src/pages/ReviewDetail.tsx
git commit -m "feat(review): Phase 8b binding-intent banner with three colored states

Green (new), blue (update with target), yellow ⚠ (update without target).
Color is load-bearing for muscle memory."
```

### Task 3.3 + 3.4: Pre-selection logic + fixed enable/disable

**Files:**
- Modify: `src/pages/ReviewDetail.tsx`

These are tightly coupled — do them in one step.

**Step 1: Pre-select decision and target after `loadSubmission` resolves**

Inside `loadSubmission`, after `setSubmission(...)`, add:

```typescript
// Phase 8b: pre-select decision + target based on submitter intent.
// Both setState calls batch in React 19 so the radio renders enabled
// on first paint when target is set.
if (submissionData?.submission_type === 'update') {
  setDecision('approve_update');
  if (submissionData.original_lesson_id) {
    setSelectedDuplicate(submissionData.original_lesson_id);
  }
} else {
  setDecision('approve_new');
}
```

(Confirm `setDecision` is the existing setter; if not, name-match to whatever the file calls it.)

**Step 2: Find the existing `disabled={!selectedDuplicate}` on the approve_update radio (line 938)**

Replace it with `disabled={false}` (or remove the `disabled` prop entirely on the radio). The radio should always be selectable; it's the SUBMIT button that gets the constraint.

**Step 3: Find the submit button (around line 990-1010)**

Add this disabled condition (combining with whatever existing disabled logic is there):

```typescript
disabled={
  /* existing conditions */
  || (decision === 'approve_update' && !selectedDuplicate)
}
```

And adjacent to the button, add inline guidance text rendered when the condition is met:

```tsx
{decision === 'approve_update' && !selectedDuplicate && (
  <p className="text-sm text-gray-600 mt-2">
    Pick a target lesson to merge into, or change to Approve as new.
  </p>
)}
```

**Step 4: Manual smoke**

Run dev server. Open a submission with `(submission_type='update', original_lesson_id=null)`. Verify:
- Yellow banner shows
- `approve_update` radio is selected by default
- Submit button is disabled with the inline guidance text visible

Open one with `(update, valid_id)`. Verify:
- Blue banner shows
- `approve_update` radio is selected
- Target is pre-selected (look for visual ring on the matching dup card)
- Submit button is enabled

**Step 5: Commit**

```bash
git add src/pages/ReviewDetail.tsx
git commit -m "feat(review): Phase 8b pre-selection + fixed submit-disabled logic

Decision + target pre-selected from submission.submission_type and
.original_lesson_id. All decision radios always selectable; submit
button disabled when approve_update is chosen with no target, with
inline guidance: 'Pick a target lesson to merge into, or change to
Approve as new.' Closes the silent-degrade-to-approve_new failure
mode for the (update, null) state."
```

### Task 3.5: Unified candidate matches list with "Submitter's choice" badge

**Files:**
- Modify: `src/pages/ReviewDetail.tsx`
- (Possibly) modify: `src/components/IntDuplicateCard.tsx` if it doesn't already accept a custom `matchLabel`

**Step 1: Verify `IntDuplicateCard` supports `matchLabel`**

Run: `grep -n "matchLabel" src/components/IntDuplicateCard.tsx`
Expected: prop already exists per agent verification.

**Step 2: Build a unified `candidateMatches` array**

Around the existing `topDuplicates` derivation (line ~412-415), add:

```typescript
// Phase 8b: unified candidate-matches list — submitter's pick at top
// (with "Submitter's choice" badge), then dup-detection results.
const candidateMatches = useMemo(() => {
  if (!submission) return [];
  const dupList = topDuplicates ?? [];
  const submitterTargetId = submission.original_lesson_id ?? null;
  if (!submitterTargetId) return dupList;

  // If submitter target is in the dup list, hoist it to the top and label.
  const inListIdx = dupList.findIndex((d) => d.id === submitterTargetId);
  if (inListIdx >= 0) {
    const hoisted = { ...dupList[inListIdx], matchLabel: 'Submitter\'s choice' };
    return [hoisted, ...dupList.filter((_, i) => i !== inListIdx)];
  }
  // Otherwise prepend the off-list submitter target as a synthetic card.
  if (submitterTargetLesson) {
    const synthetic = {
      id: submitterTargetLesson.lesson_id,
      title: submitterTargetLesson.title,
      summary: submitterTargetLesson.summary ?? '',
      similarityScore: 0,
      matchType: 'submitter',
      matchLabel: 'Submitter\'s choice',
    };
    return [synthetic, ...dupList];
  }
  return dupList;
}, [submission, topDuplicates, submitterTargetLesson]);
```

**Step 3: Replace the rendering of `topDuplicates` with `candidateMatches`** in the duplicate cards section (around line 876-911).

**Step 4: Type-check + visual smoke**

Verify on three test submissions: (new), (update, X-in-dup-list), (update, X-not-in-dup-list). Confirm "Submitter's choice" badge appears on the right card and stays anchored when reviewer selects a different card.

**Step 5: Commit**

```bash
git add src/pages/ReviewDetail.tsx
git commit -m "feat(review): unified candidate-matches list with Submitter's choice badge

One card list instead of two (dup-detection results + separate
submitter-pick card). Submitter's pick is hoisted to top with
'Submitter's choice' badge whether or not it's in the dup list. Badge
stays anchored to that card regardless of which card the reviewer
selects."
```

### Task 3.6: Search escape hatch (collapsed by default, auto-expand for needs-search)

**Files:**
- Modify: `src/pages/ReviewDetail.tsx`

**Step 1: Add disclosure UI below the candidate-matches list**

Find the spot just below the cards (still within the decision panel). Add:

```tsx
{/* Phase 8b: search escape hatch */}
{(() => {
  const needsSearch = submission?.submission_type === 'update' && !submission?.original_lesson_id;
  const noDups = candidateMatches.length === 0;
  const [showSearch, setShowSearch] = React.useState(needsSearch || noDups);
  // When intent changes (rare), keep the toggle in sync
  React.useEffect(() => {
    setShowSearch(needsSearch || noDups);
  }, [needsSearch, noDups]);

  const helpText =
    needsSearch
      ? "Use this to find the lesson the submitter couldn't"
      : submission?.original_lesson_id
        ? "Use this if you disagree with the submitter's pick"
        : "Use this when no card above is the right match";

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setShowSearch((v) => !v)}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        {showSearch ? '− Hide library search' : '+ Search the library for a different lesson'}
      </button>
      {showSearch && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">{helpText}</p>
          <LessonSearchPicker
            selected={null}
            onSelect={(l) => setSelectedDuplicate(l.lesson_id)}
            onClear={() => {}}
            cantFindOption={false}
          />
        </div>
      )}
    </div>
  );
})()}
```

(Hoist the `useState` and `useEffect` to the component body if linting rejects them inside the IIFE; the IIFE is just for readability of the design spec.)

**Step 2: Add the import**

Add `import { LessonSearchPicker } from '@/components/LessonSearchPicker';` at the top of `ReviewDetail.tsx`.

**Step 3: Manual smoke**

Verify auto-expansion fires for (update, null) and zero-dup-match cases; confirm contextual help text matches state.

**Step 4: Commit**

```bash
git add src/pages/ReviewDetail.tsx
git commit -m "feat(review): collapsed search escape hatch with contextual help

Auto-expanded for (update, null) and no-dup-matches cases. Reuses
LessonSearchPicker built in PR 2. Help text varies by state:
update-no-target, override mode, or generic 'no match above.'"
```

### Task 3.7: Title mismatch helper

**Files:**
- Modify: `src/pages/ReviewDetail.tsx`

**Step 1: Add the import**

`import { titlesAreSimilar } from '@/utils/titleSimilarity';`

**Step 2: Track which targets are "auto-picked" vs "manual"**

The mismatch warning only fires on auto-picks (submitter binding or dup detector). Reviewer manual picks are deliberate.

Add a `manualPickRef = useRef(false)` near the top of the component. Set `manualPickRef.current = true` inside the `LessonSearchPicker.onSelect` handler and inside any dup-card click handler. Reset to `false` on `loadSubmission`.

(Or simpler: derive from `selectedDuplicate` vs `submission.original_lesson_id`: if they match, it's a binding pick; if `selectedDuplicate` matches a top-N dup card, it's a dup-detector pick; otherwise manual. Pick whichever is cleaner against the existing state machine.)

**Step 3: Render the mismatch warning when applicable**

Below the candidate-matches list, before the search escape hatch:

```tsx
{(() => {
  if (!selectedDuplicate || manualPickRef.current) return null;
  const targetTitle =
    candidateMatches.find((c) => c.id === selectedDuplicate)?.title ?? '';
  const submissionTitle = submission?.extracted_title ?? '';
  if (!targetTitle || !submissionTitle) return null;
  if (titlesAreSimilar(targetTitle, submissionTitle)) return null;
  return (
    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
      Heads up: submitter linked to <strong>"{targetTitle}"</strong> but submission's extracted
      title is <strong>"{submissionTitle}"</strong> — confirm this is the right merge target.
    </div>
  );
})()}
```

**Step 4: Manual smoke** with a contrived case (submitter target = "Apple Crisp", extracted title = "Solar Eclipse") to confirm the warning fires; with target = "Spring Planting", extracted title = "Spring Planting Updated for 2026" to confirm it does NOT fire.

**Step 5: Commit**

```bash
git add src/pages/ReviewDetail.tsx
git commit -m "feat(review): title mismatch helper using titlesAreSimilar

Yellow inline warning when an auto-picked merge target's title
diverges from the submission's extracted title. Word-set Jaccard at
0.3 threshold. Only fires on auto-picks (submitter binding or dup
detector); reviewer manual picks are deliberate confirmations and
suppress the warning."
```

### Task 3.8: Three-state queue badge in `ReviewDashboard.tsx` + `IntQueueRow.tsx`

**Files:**
- Modify: `src/pages/ReviewDashboard.tsx` (around the `IntQueueRow` instantiation at lines 257-266)
- Modify: `src/components/IntQueueRow.tsx` (extend props + render the badge)

**Step 1: Extend `IntQueueRow` props**

Add to the `IntQueueRowSubmission` interface:
```typescript
originalLessonId?: string | null;
originalLessonTitle?: string | null;
```

Inside the row render, add badge logic (replacing or supplementing the existing `type` chip rendering at line 65 of `IntQueueRow`):

```tsx
{(() => {
  if (submission.type === 'new') {
    return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">NEW</span>;
  }
  if (submission.originalLessonId) {
    return (
      <span
        className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
        title={submission.originalLessonTitle ?? ''}
      >
        UPDATE
      </span>
    );
  }
  return (
    <span
      className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded"
      title="Submitter is updating but couldn't find target — needs reviewer search"
    >
      UPDATE?
    </span>
  );
})()}
```

**Step 2: Pass new props from `ReviewDashboard.tsx`**

Around line 257-266, extend the `<IntQueueRow ...>` call:
```tsx
<IntQueueRow
  ... existing props ...
  submission={{
    ...existingSubmission,
    originalLessonId: submission.original_lesson_id,
    originalLessonTitle: lessonTitleMap[submission.original_lesson_id ?? ''] ?? null,
  }}
/>
```

If `lessonTitleMap` doesn't already exist, add a small batched fetch in `loadSubmissions`: collect `original_lesson_id` values, fetch their titles in one query, build a map. (Keep this lean — N is small.)

**Step 3: Type-check + visual smoke**

Verify the queue shows three different badge colors for the three states.

**Step 4: Commit**

```bash
git add src/pages/ReviewDashboard.tsx src/components/IntQueueRow.tsx
git commit -m "feat(review): three-state queue badge (NEW / UPDATE / UPDATE?)

Green NEW for submission_type='new', blue UPDATE for type='update'
with a bound target (target title in tooltip), yellow UPDATE? for
type='update' with no target (tooltip explains needs reviewer
search). Lets reviewers triage the queue — UPDATE? rows need the
extra work."
```

### Task 3.9: Add tests for pre-selection + mismatch helper

**Files:**
- Create: `src/pages/__tests__/ReviewDetail.preselect.test.tsx`

**Step 1: Write a focused test** (mocking `loadSubmission` is tricky given the file size; consider testing a hypothetical pure helper or extracting the pre-selection logic to a small function for testability)

If extraction is appropriate, create:
```typescript
// src/pages/__tests__/reviewPreselect.test.ts
import { describe, it, expect } from 'vitest';
import { computePreselection } from '@/pages/reviewPreselect';

describe('computePreselection', () => {
  it('new → approve_new, no target', () => {
    expect(computePreselection({ submission_type: 'new', original_lesson_id: null }))
      .toEqual({ decision: 'approve_new', target: null });
  });
  it('update with target → approve_update + target', () => {
    expect(computePreselection({ submission_type: 'update', original_lesson_id: 'lesson_1' }))
      .toEqual({ decision: 'approve_update', target: 'lesson_1' });
  });
  it('update without target → approve_update, no target', () => {
    expect(computePreselection({ submission_type: 'update', original_lesson_id: null }))
      .toEqual({ decision: 'approve_update', target: null });
  });
  it('legacy unknown type → approve_new fallback', () => {
    expect(computePreselection({ submission_type: undefined as any, original_lesson_id: null }))
      .toEqual({ decision: 'approve_new', target: null });
  });
});
```

Then extract `computePreselection` to its own file `src/pages/reviewPreselect.ts` and import it from `ReviewDetail.tsx`.

**Step 2: Run tests, verify pass**

Run: `npx vitest run src/pages/__tests__/reviewPreselect.test.ts`
Expected: 4/4 pass.

**Step 3: Commit**

```bash
git add src/pages/reviewPreselect.ts src/pages/__tests__/reviewPreselect.test.ts src/pages/ReviewDetail.tsx
git commit -m "test(review): unit tests for pre-selection logic

Extract computePreselection to its own file for testability. Covers
all three intent states + legacy/undefined fallback."
```

### Task 3.10: E2E tests for reviewer flows

**Files:**
- Create: `e2e/review-flow.spec.ts`

These need authenticated sessions with TEST DB. Match whatever credential pattern the existing project uses (per project memory `reference_test_credentials.md`: `admin@test.com` / `password123`).

**Step 1: Implement smoke tests for the three intent states**

```typescript
// e2e/review-flow.spec.ts
import { test, expect } from '@playwright/test';

// These tests assume seeded TEST DB rows. If the seed doesn't include
// the three (intent, target) shapes, mark them .skip or seed via a
// fixture before running.

test.describe('Phase 8b reviewer flow — intent banner + pre-selection', () => {
  test.skip('green banner + approve_new pre-selected for (new) submission', async () => {
    // Login as admin@test.com, navigate to a known (new) submission, assert.
  });

  test.skip('blue banner + target pre-selected for (update, X) submission', async () => {
    // Login, navigate to known (update, X) submission, assert.
  });

  test.skip('yellow banner + search auto-expanded for (update, null) submission', async () => {
    // Login, navigate to known (update, null) submission, assert.
  });
});
```

Mark `.skip` for now if seeded fixtures aren't in place — log as a follow-up. The unit tests in Task 3.9 cover the logic; E2E for reviewer is best done manually for v1 if the auth fixture isn't already established.

**Step 2: Commit**

```bash
git add e2e/review-flow.spec.ts
git commit -m "test(e2e): scaffolding for reviewer flow E2E (currently .skip)

Three tests sketched for the three intent states. Skipped pending
seeded fixtures or test-credential automation. Unit coverage in
src/pages/__tests__/reviewPreselect.test.ts is the primary regression
guard for now."
```

### Task 3.11: Final type-check, lint, push, PR

**Step 1: Mandatory pre-PR check**

Run: `npm run type-check && npm run lint`
Expected: passes.

**Step 2: Push**

```bash
git push -u origin feat/phase-8b-reviewer-flow
```

**Step 3: Open PR**

```bash
gh pr create --title "feat: Phase 8b — reviewer flow (binding-intent banner, pre-selection, search escape, mismatch helper, queue badges)" --body "$(cat <<'EOF'
## Summary
- Color-coded binding-intent banner at top of decision panel (green NEW / blue UPDATE / yellow ⚠ UPDATE-no-target)
- Pre-selection of decision + target from submitter intent
- Fixed enable/disable: all decision radios always selectable; submit disabled when approve_update has no target with inline guidance
- Unified candidate-matches list with "Submitter's choice" badge
- Collapsed search escape hatch (auto-expand for update-no-target / no-dup-matches)
- Title mismatch helper (word-set Jaccard, only on auto-picks)
- Three-state queue badge (NEW / UPDATE / UPDATE?)

## Phase 8b context
This is PR 3 of 3 — the reviewer-side consumer of the binding intent that PR 2's submitter flow now produces. PR 1 (FK migration) and PR 2 (submitter flow) are already merged. See `docs/plans/2026-04-27-phase-8b-approve-update-redesign-design.md`.

## Test plan
- [ ] Unit: `npx vitest run src/pages/__tests__/reviewPreselect.test.ts` (4/4)
- [ ] Type: `npm run type-check` clean
- [ ] Lint: `npm run lint` clean
- [ ] Manual smoke on TEST DB: open submissions in each of the three intent states, verify banner color, pre-selection, search-escape auto-expand, queue badges
- [ ] Manual smoke: override pre-selection, verify save still succeeds with overridden value
- [ ] Manual smoke: contrived mismatch case (target Apple Crisp + extracted Solar Eclipse) — verify warning fires; legitimate revision (Spring Planting + Spring Planting 2026) — verify warning does NOT fire

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 4: Per-PR ritual** — own reviewer first; investigate every bot finding; round-cap after 2 rounds.

**Step 5: Manual TEST DB smoke after Netlify preview is up** (mandatory per `feedback_data_safety_top_priority.md`).

**Step 6: Merge.** No production migration needed for PR 3 (no schema changes). Netlify auto-deploy.

---

## Done

After PR 3 merges + smoke-passes on PROD:

1. **Update auto-memory** `project_lesson_submission_tier1.md` with the Phase 8b ship status.
2. **Verify on PROD**: open a real submission (any intent) and confirm the banner + pre-selection render correctly.
3. **Capture follow-ups in beads** (when fixed) or in a markdown TODO list:
   - Override-tracking admin view (compare `original_lesson_id` to `published_lesson_id`)
   - Extraction-failure recovery
   - Repeated-submission detection
   - Past-submissions-first revising flow
   - Brand-new-branch safety check
   - Submission claim mechanism
   - Lesson title snapshot at picker-time
   - DB-trigram fallback for title mismatch (if in-browser proves insufficient)
   - Separate queue lane for UPDATE-NO-TARGET

## References

- **Design doc:** `docs/plans/2026-04-27-phase-8b-approve-update-redesign-design.md`
- **Original investigation:** `~/.claude/plans/i-want-you-to-pure-iverson.md`
- **Tier-1 plan:** `~/.claude/plans/lesson-submission-tier1-implementation.md`
- **Mid-brainstorm handoff (now superseded by design doc):** `~/.claude/plans/2026-04-27-phase-8b-workflow-redesign-handoff.md`
