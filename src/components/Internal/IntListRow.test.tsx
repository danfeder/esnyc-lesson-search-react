import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Lesson } from '@/types';
import { makeLesson } from '@/__tests__/helpers/factories';
import {
  IntListRow,
  ROW_LABEL_MAX,
  intActivityLabel,
  intGradesLabel,
  intMetaSegments,
  intSeasonLabel,
  sortGradeLevels,
} from './IntListRow';

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

describe('intSeasonLabel (row labels 2026-10-21 — every season, vocab order, Year-round)', () => {
  it('collapses all four seasons to the single word Year-round', () => {
    expect(intSeasonLabel(['Fall', 'Winter', 'Spring', 'Summer'])).toBe('Year-round');
    // Order and duplicates in storage do not matter.
    expect(intSeasonLabel(['Summer', 'Spring', 'Winter', 'Fall', 'Fall'])).toBe('Year-round');
  });

  it('lists a stored [Spring, Fall] in vocab order as "Fall, Spring"', () => {
    expect(intSeasonLabel(['Spring', 'Fall'])).toBe('Fall, Spring');
  });

  it('renders a single season as itself', () => {
    expect(intSeasonLabel(['Winter'])).toBe('Winter');
  });

  it('de-duplicates repeated seasons', () => {
    expect(intSeasonLabel(['Fall', 'Fall', 'Winter'])).toBe('Fall, Winter');
  });

  it('returns undefined for an empty / undefined array (segment omitted)', () => {
    expect(intSeasonLabel([])).toBeUndefined();
    expect(intSeasonLabel(undefined)).toBeUndefined();
  });
});

// The five PROD sample lessons from the row-labels design pass (facts §3) —
// the expected strings are the AFTER rows mocked in the proposal §4.
const sample1BookerWhatley = lessonWith({
  activityType: ['garden', 'craft'],
  seasonTiming: ['Spring', 'Fall'],
  thematicCategories: ['Food Systems', 'Food Justice', 'Garden Basics'],
  culturalHeritage: ['African American'],
  gardenSkills: ['Harvesting', 'Tool use and maintenance', 'Stewardship tasks'],
  cookingSkills: [],
  mainIngredients: [],
  academicIntegration: ['Social Studies', 'Literacy/ELA', 'Science'],
});
const sample2IndoorSprouts = lessonWith({
  activityType: ['garden'],
  seasonTiming: ['Fall', 'Winter', 'Spring', 'Summer'],
  thematicCategories: ['Plant Growth'],
  culturalHeritage: [],
  gardenSkills: ['Seed starting'],
  mainIngredients: [],
  academicIntegration: ['Science'],
});
const sample3AfricanAmericanFoodTraditions = lessonWith({
  activityType: ['cooking'],
  seasonTiming: ['Fall', 'Winter', 'Spring', 'Summer'],
  thematicCategories: ['Food Systems', 'Food Justice', 'Seed to Table'],
  culturalHeritage: ['African American', 'Black culinary history', 'Southern United States'],
  mainIngredients: [
    'Black-eyed peas',
    'Rice',
    'Sweet potatoes',
    'Alliums',
    'Bell peppers',
    'Beans & legumes',
    'Parsley',
    'Grains & starches',
    'Root vegetables',
    'Peppers',
    'Fresh herbs',
  ],
  gardenSkills: [],
  academicIntegration: ['Literacy/ELA', 'Social Studies'],
});
const sample4AllAboutSeeds = lessonWith({
  activityType: ['cooking', 'garden'],
  seasonTiming: ['Fall', 'Winter'],
  thematicCategories: ['Plant Growth', 'Seed to Table', 'Garden Basics'],
  culturalHeritage: [],
  mainIngredients: [
    'Black beans',
    'Corn/masa',
    'Nightshades',
    'Alliums',
    'Cilantro',
    'Beans & legumes',
    'Grains & starches',
    'Fresh herbs',
  ],
  gardenSkills: ['Observing plant parts', 'Sensory exploration'],
  academicIntegration: ['Math', 'Science'],
});
const sample5AnimalDefenses = lessonWith({
  activityType: ['craft'],
  seasonTiming: ['Fall', 'Winter', 'Spring', 'Summer'],
  thematicCategories: ['Garden Communities', 'Ecosystems'],
  culturalHeritage: [],
  mainIngredients: [],
  gardenSkills: [],
  academicIntegration: ['Science'],
});

describe('intMetaSegments (row labels 2026-10-21 — seasons · what · heritage)', () => {
  it('Sample 1 (Grow, garden+craft): both seasons in vocab order, garden skills, heritage', () => {
    expect(intMetaSegments(sample1BookerWhatley)).toEqual([
      'Fall, Spring',
      'Harvesting, Tool use and maintenance, Stewardship tasks',
      'African American',
    ]);
  });

  it('Sample 2 (Grow, the typical bare row): Year-round and the garden skill, no theme', () => {
    expect(intMetaSegments(sample2IndoorSprouts)).toEqual(['Year-round', 'Seed starting']);
  });

  it('Sample 3 (Cook): Year-round, leaf-collapsed ingredients capped at 3, both heritage leaves', () => {
    expect(intMetaSegments(sample3AfricanAmericanFoodTraditions)).toEqual([
      'Year-round',
      'Black-eyed peas, Rice, Sweet potatoes',
      'Black culinary history, Southern United States',
    ]);
  });

  it('Sample 4 (Cook + Grow): ingredients win over garden skills; a childless group survives', () => {
    expect(intMetaSegments(sample4AllAboutSeeds)).toEqual([
      'Fall, Winter',
      'Black beans, Corn/masa, Nightshades',
    ]);
  });

  it('Sample 5 (Craft): no ingredients or garden skills, so the subject fills the What slot', () => {
    expect(intMetaSegments(sample5AnimalDefenses)).toEqual(['Year-round', 'Science']);
  });

  it('never includes the theme (dropped from rows and cards; drawer + filter keep it)', () => {
    for (const lesson of [
      sample1BookerWhatley,
      sample2IndoorSprouts,
      sample3AfricanAmericanFoodTraditions,
    ]) {
      const joined = intMetaSegments(lesson).join(' | ');
      for (const theme of lesson.metadata.thematicCategories ?? []) {
        expect(joined).not.toContain(theme);
      }
    }
  });

  it('collapses heritage to leaves BEFORE capping (FP-16 × cap): ancestors never spend a slot', () => {
    const lesson = lessonWith({
      seasonTiming: [],
      culturalHeritage: ['Asian', 'East Asian', 'Chinese', 'Mexican'],
    });
    expect(intMetaSegments(lesson)).toEqual(['Chinese, Mexican']);
  });

  it('caps heritage at ROW_LABEL_MAX leaves, label-mapped', () => {
    const lesson = lessonWith({
      seasonTiming: [],
      culturalHeritage: ['chinese', 'mexican', 'japanese', 'korean'],
    });
    expect(ROW_LABEL_MAX).toBe(3);
    expect(intMetaSegments(lesson)).toEqual(['Chinese, Mexican, Japanese']);
  });

  it('keeps the segment order seasons → what → heritage and omits empty segments', () => {
    const seasonless = lessonWith({
      seasonTiming: [],
      gardenSkills: ['Composting', 'Soil preparation and care'],
      culturalHeritage: ['Mexican'],
    });
    expect(intMetaSegments(seasonless)).toEqual([
      'Composting, Soil preparation and care',
      'Mexican',
    ]);
    const noHeritage = lessonWith({
      seasonTiming: ['Summer', 'Spring'],
      mainIngredients: ['Cucumbers', 'Mint', 'Yogurt'],
    });
    expect(intMetaSegments(noHeritage)).toEqual(['Spring, Summer', 'Cucumbers, Mint, Yogurt']);
  });

  it('reads the object form of academicIntegration ({ selected }) for the subject fallback', () => {
    const lesson = lessonWith({
      seasonTiming: [],
      academicIntegration: { concepts: {}, selected: ['Math', 'Science'] },
    });
    expect(intMetaSegments(lesson)).toEqual(['Math, Science']);
  });

  it('returns [] for a lesson with no seasons, no what and no heritage', () => {
    expect(intMetaSegments(makeLesson())).toEqual([]);
  });
});

describe('IntListRow meta line render (row labels 2026-10-21)', () => {
  it('shows no theme text and exactly one dot per segment', () => {
    const { container } = render(
      <IntListRow
        lesson={sample3AfricanAmericanFoodTraditions}
        selected={false}
        onClick={() => {}}
      />
    );
    const metaText = container.querySelector('.int-row-meta')?.textContent ?? '';
    expect(metaText).toContain('Year-round');
    expect(metaText).toContain('Black-eyed peas, Rice, Sweet potatoes');
    expect(metaText).toContain('Black culinary history, Southern United States');
    expect(screen.queryByText('Food Systems')).not.toBeInTheDocument();
    expect(screen.queryByText('Seed to Table')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.int-row-meta .dot')).toHaveLength(
      intMetaSegments(sample3AfricanAmericanFoodTraditions).length
    );
  });

  it('Sample 2 reads "Year-round · Seed starting" with no "Plant Growth"', () => {
    const { container } = render(
      <IntListRow lesson={sample2IndoorSprouts} selected={false} onClick={() => {}} />
    );
    const metaText = container.querySelector('.int-row-meta')?.textContent ?? '';
    expect(metaText).toContain('Year-round');
    expect(metaText).toContain('Seed starting');
    expect(metaText).not.toContain('Plant Growth');
    expect(container.querySelectorAll('.int-row-meta .dot')).toHaveLength(2);
  });

  it('renders no dangling dot when every segment is empty (badge only)', () => {
    const { container } = render(
      <IntListRow lesson={makeLesson()} selected={false} onClick={() => {}} />
    );
    expect(container.querySelectorAll('.int-row-meta .dot')).toHaveLength(0);
  });
});
