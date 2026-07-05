import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Lesson } from '@/types';
import { makeLesson } from '@/__tests__/helpers/factories';
import { IntListRow, intActivityLabel, intGradesLabel, sortGradeLevels } from './IntListRow';

// Build a Lesson with a partial metadata override, keeping the factory's full
// metadata shape (required fields present).
function lessonWith(metadata: Partial<Lesson['metadata']>): Lesson {
  const base = makeLesson();
  return { ...base, metadata: { ...base.metadata, ...metadata } };
}

describe('sortGradeLevels (canonical order + dedup)', () => {
  it('sorts a stored-out-of-order array into 3K…8 order', () => {
    expect(sortGradeLevels(['1', '2', '3', 'K'])).toEqual(['K', '1', '2', '3']);
  });

  it('orders the early-childhood grades ahead of K', () => {
    expect(sortGradeLevels(['K', '3K', 'PK'])).toEqual(['3K', 'PK', 'K']);
  });

  it('de-duplicates repeated grades', () => {
    expect(sortGradeLevels(['K', 'K', '1'])).toEqual(['K', '1']);
  });

  it('pushes unknown values to the end', () => {
    expect(sortGradeLevels(['mystery', 'K', '1'])).toEqual(['K', '1', 'mystery']);
  });
});

describe('intGradesLabel (grades-sort fix — rung8-lesson-detail F2)', () => {
  it('renders "Sunprints" {1,2,3,K} as the forward range K–3, not the backwards 1–K', () => {
    expect(intGradesLabel(['1', '2', '3', 'K'])).toBe('K–3');
  });

  it('renders a contiguous run as a first–last range', () => {
    expect(intGradesLabel(['3', '4', '5', '6'])).toBe('3–6');
  });

  it('renders a non-contiguous set as a comma list (no misleading dash)', () => {
    expect(intGradesLabel(['K', '4', '8'])).toBe('K, 4, 8');
  });

  it('renders a run with an interior gap as a list', () => {
    // K,1,3 (missing 2) must not collapse to "K–3".
    expect(intGradesLabel(['3', 'K', '1'])).toBe('K, 1, 3');
  });

  it('joins ≤2 grades with a comma (sorted)', () => {
    expect(intGradesLabel(['2', '1'])).toBe('1, 2');
    expect(intGradesLabel(['1', 'K'])).toBe('K, 1');
  });

  it('renders a single grade as itself', () => {
    expect(intGradesLabel(['K'])).toBe('K');
  });

  it('renders an empty / undefined array as an em dash', () => {
    expect(intGradesLabel([])).toBe('—');
    expect(intGradesLabel(undefined)).toBe('—');
  });

  it('collapses duplicates before deciding contiguity', () => {
    expect(intGradesLabel(['K', 'K', '1', '2'])).toBe('K–2');
  });
});

describe('intActivityLabel (FP-17 — badge derives from activity_type)', () => {
  it('gives a craft-only lesson (no cooking/garden skills) a Craft badge — the gap fix', () => {
    const lesson = lessonWith({ activityType: ['craft'], cookingSkills: [], gardenSkills: [] });
    expect(intActivityLabel(lesson)).toEqual({ label: 'Craft', className: 'act-craft' });
  });

  it('combines cooking + garden into Cook + Grow', () => {
    const lesson = lessonWith({ activityType: ['cooking', 'garden'] });
    expect(intActivityLabel(lesson)).toEqual({ label: 'Cook + Grow', className: 'act-both' });
  });

  it('labels the garden+craft "Sunprints" shape as Grow', () => {
    const lesson = lessonWith({ activityType: ['garden', 'craft'] });
    expect(intActivityLabel(lesson)).toEqual({ label: 'Grow', className: 'act-grow' });
  });

  it('labels an academic-only lesson Academic', () => {
    const lesson = lessonWith({ activityType: ['academic'] });
    expect(intActivityLabel(lesson)).toEqual({ label: 'Academic', className: 'act-academic' });
  });

  it('lets activity_type win even when the skills arrays are empty', () => {
    const lesson = lessonWith({ activityType: ['cooking'], cookingSkills: [] });
    expect(intActivityLabel(lesson)).toEqual({ label: 'Cook', className: 'act-cook' });
  });

  it('falls back to the skills heuristic when activity_type is empty', () => {
    const cook = lessonWith({ activityType: [], cookingSkills: ['Chopping'], gardenSkills: [] });
    expect(intActivityLabel(cook)).toEqual({ label: 'Cook', className: 'act-cook' });
    const grow = lessonWith({ activityType: [], cookingSkills: [], gardenSkills: ['Planting'] });
    expect(intActivityLabel(grow)).toEqual({ label: 'Grow', className: 'act-grow' });
    const none = lessonWith({ activityType: [], cookingSkills: [], gardenSkills: [] });
    expect(intActivityLabel(none)).toEqual({ label: 'Academic', className: 'act-academic' });
  });

  it('falls back to skills when activity_type has only unrecognized nouns', () => {
    const lesson = lessonWith({ activityType: ['mystery'], gardenSkills: ['Planting'] });
    expect(intActivityLabel(lesson)).toEqual({ label: 'Grow', className: 'act-grow' });
  });
});

describe('IntListRow heritage badge (FP-16 — collapse to leaf, agrees with drawer)', () => {
  it('shows the leaf, not a broader ancestor, for a 3-deep chain', () => {
    const lesson = lessonWith({ culturalHeritage: ['Asian', 'East Asian', 'Chinese'] });
    render(<IntListRow lesson={lesson} selected={false} onClick={() => {}} />);

    expect(screen.getByText('Chinese')).toBeInTheDocument();
    expect(screen.queryByText('Asian')).not.toBeInTheDocument();
    expect(screen.queryByText('East Asian')).not.toBeInTheDocument();
  });
});
