import { describe, it, expect } from 'vitest';
import {
  reAddActivityTypeSuffix,
  parseExtractedContent,
  parseTemplateTags,
  normalizeMatchType,
  selectOptionsFromConfig,
  ZOD_FIELD_TO_LABEL,
} from '@/pages/reviewDetailHelpers';
import type { ReviewMetadata } from '@/types';
import { ALL_FIELD_CONFIGS, type FilterConfig } from '@/utils/filterDefinitions';

// Characterization tests for ReviewDetail's module-scope pure helpers.
// These PIN current behavior (PR-0 safety net, Wave 5) — they assert what
// the code does TODAY, not what it arguably "should" do, so the upcoming
// decomposition (PR-1a relocation) can move these helpers verbatim with a
// behavioral guardrail in place.

describe('reAddActivityTypeSuffix (legacy activityType slug round-trip — the crash landmine)', () => {
  it('scalar "cooking" → single-element suffixed array, preserving other fields', () => {
    expect(
      reAddActivityTypeSuffix({
        activityType: 'cooking',
        themes: ['Bread'],
      } as unknown as ReviewMetadata)
    ).toEqual({ activityType: ['cooking-only'], themes: ['Bread'] });
  });

  it('scalar "garden" → ["garden-only"]', () => {
    expect(
      reAddActivityTypeSuffix({ activityType: 'garden' } as unknown as ReviewMetadata)
    ).toEqual({ activityType: ['garden-only'] });
  });

  it('scalar "both" → fans out to ["cooking-only","garden-only"]', () => {
    expect(reAddActivityTypeSuffix({ activityType: 'both' } as unknown as ReviewMetadata)).toEqual({
      activityType: ['cooking-only', 'garden-only'],
    });
  });

  it('scalar already-suffixed "cooking-only" → not double-suffixed', () => {
    expect(
      reAddActivityTypeSuffix({ activityType: 'cooking-only' } as unknown as ReviewMetadata)
    ).toEqual({ activityType: ['cooking-only'] });
  });

  it('array input → each bare value suffixed, already-suffixed left intact', () => {
    expect(
      reAddActivityTypeSuffix({
        activityType: ['cooking', 'garden-only'],
      } as unknown as ReviewMetadata)
    ).toEqual({ activityType: ['cooking-only', 'garden-only'] });
  });

  // EDGE / surprising: an EMPTY array hits neither the string branch nor the
  // `length > 0` array branch, so the input is returned UNCHANGED (activityType
  // stays []). Pinned as-is.
  it('empty array → returned unchanged (NOT transformed)', () => {
    expect(reAddActivityTypeSuffix({ activityType: [] })).toEqual({ activityType: [] });
  });

  // EDGE / surprising: an empty STRING short-circuits to the unchanged raw
  // (activityType stays '' rather than becoming ['-only']). Pinned as-is.
  it('empty string → returned unchanged (NOT transformed)', () => {
    expect(reAddActivityTypeSuffix({ activityType: '' } as unknown as ReviewMetadata)).toEqual({
      activityType: '',
    });
  });

  it('null activityType → returned unchanged', () => {
    expect(reAddActivityTypeSuffix({ activityType: null } as unknown as ReviewMetadata)).toEqual({
      activityType: null,
    });
  });

  it('undefined / missing activityType → returned unchanged', () => {
    expect(reAddActivityTypeSuffix({})).toEqual({});
    expect(reAddActivityTypeSuffix({ themes: ['X'] })).toEqual({ themes: ['X'] });
  });
});

describe('parseExtractedContent', () => {
  it('extracts "Title:" prefix + "Summary:" block (terminated by blank line)', () => {
    expect(
      parseExtractedContent('Title: Apple Pie\n\nSummary: A delicious dessert.\n\nMore content')
    ).toEqual({ title: 'Apple Pie', summary: 'A delicious dessert.' });
  });

  it('extracts markdown "# " title + "Summary:" block', () => {
    expect(parseExtractedContent('# Garden Basics\n\nSummary: Learn to garden.\n\nStep 1')).toEqual(
      { title: 'Garden Basics', summary: 'Learn to garden.' }
    );
  });

  it('falls back to first line as title + first following paragraph as summary when no markers', () => {
    expect(parseExtractedContent('My Lesson\nFirst body line.')).toEqual({
      title: 'My Lesson',
      summary: 'First body line.',
    });
  });

  it('empty content → empty title and summary', () => {
    expect(parseExtractedContent('')).toEqual({ title: '', summary: '' });
  });
});

describe('normalizeMatchType', () => {
  it('passes through the four known match types', () => {
    expect(normalizeMatchType('exact')).toBe('exact');
    expect(normalizeMatchType('high')).toBe('high');
    expect(normalizeMatchType('medium')).toBe('medium');
    expect(normalizeMatchType('low')).toBe('low');
  });

  it('null → null', () => {
    expect(normalizeMatchType(null)).toBeNull();
  });

  it('empty string → null', () => {
    expect(normalizeMatchType('')).toBeNull();
  });

  it('unrecognized / wrong-case value → null', () => {
    expect(normalizeMatchType('unknown')).toBeNull();
    expect(normalizeMatchType('HIGH')).toBeNull();
  });
});

describe('selectOptionsFromConfig', () => {
  it('maps options to {value,label}, dropping extra props', () => {
    const config: FilterConfig = {
      label: 'Activity Type',
      type: 'multiple',
      options: [
        { value: 'cooking-only', label: 'Cooking', category: 'x' },
        { value: 'garden-only', label: 'Garden' },
      ],
    };
    expect(selectOptionsFromConfig(config)).toEqual([
      { value: 'cooking-only', label: 'Cooking' },
      { value: 'garden-only', label: 'Garden' },
    ]);
  });

  it('empty options → empty array', () => {
    const config: FilterConfig = { label: 'Empty', type: 'multiple', options: [] };
    expect(selectOptionsFromConfig(config)).toEqual([]);
  });

  // Brief 5: the promoted Main Ingredients config is a group→specific TREE; the
  // recursive flatten is the only thing keeping the reviewer <Select> from
  // silently losing the 42 nested specifics (offering just the 24 groups).
  it('flattens `children` depth-first, parent before its specifics', () => {
    const config: FilterConfig = {
      label: 'Main Ingredients',
      type: 'hierarchical',
      options: [
        {
          value: 'Beans & legumes',
          label: 'Beans & legumes',
          children: [
            { value: 'Black beans', label: 'Black beans' },
            { value: 'Chickpeas', label: 'Chickpeas' },
          ],
        },
        { value: 'Celery', label: 'Celery' },
      ],
    };
    expect(selectOptionsFromConfig(config)).toEqual([
      { value: 'Beans & legumes', label: 'Beans & legumes' },
      { value: 'Black beans', label: 'Black beans' },
      { value: 'Chickpeas', label: 'Chickpeas' },
      { value: 'Celery', label: 'Celery' },
    ]);
  });

  it('offers the reviewer all 70 Main Ingredients values (24 groups + 46 specifics)', () => {
    const options = selectOptionsFromConfig(ALL_FIELD_CONFIGS.mainIngredients);
    expect(options).toHaveLength(70);
    // Spot-check a nested specific survives the flatten.
    expect(options).toContainEqual({ value: 'Black beans', label: 'Black beans' });
  });
});

describe('ZOD_FIELD_TO_LABEL', () => {
  it('maps known Zod field keys to their human labels', () => {
    expect(ZOD_FIELD_TO_LABEL.activityType).toBe('Activity Type');
    expect(ZOD_FIELD_TO_LABEL.culturalResponsivenessFeatures).toBe(
      'Cultural Responsiveness Features'
    );
    expect(ZOD_FIELD_TO_LABEL.summary).toBe('Summary');
  });
});

describe('parseTemplateTags (FP5 Brief 2 mechanical template prefill)', () => {
  // VERBATIM stock text of the LOCKED 2026 template
  // (Google Doc 1C0tCnRJXgdNxUJtv25aq2ZDnKHjTcjA0H6LIY248xQk), rendered the way
  // the app's Google-Docs extractor emits table cells (label and value split by
  // ` | ` on pipe/text-run boundaries, one row per line, `[Table]` markers). This
  // is the untouched template — a teacher who leaves it has answered NOTHING.
  const STOCK_TEMPLATE = [
    'Lesson Title [DO NOT TYPE ON THIS: MAKE A COPY!!!!]',
    '',
    '[Table]',
    'Summary:',
    '',
    '[Table]',
    'Objectives: | Students will be able to….',
    '',
    '[Table]',
    'Core Competencies: | List all that apply: Environmental and community stewardship, social justice, garden skills and related academic content, kitchen skills and related academic content, cultural diversity.',
    '',
    '[Table]',
    'Cultural Responsiveness | : Are any New York City cultures represented in this lesson? If so, which ones?',
    '',
    '[Table]',
    'Social-Emotional Skills | (pick all that apply or add your own): Bravery, kindness, respect, self-management (safety), collaboration, pride, joy',
    '',
    '[Table]',
    'Garden Connection: How does this lesson make use of the garden?',
    '',
    '[Table]',
    'How Does This Lesson Promote Critical Thinking/Independence?',
    '',
    '[Table]',
    'Food and Nutrition Standard:',
    '',
    '[Table]',
    'Tags–Pick a tag from each category: | For all lessons: monthly theme, holiday or heritage month (if applicable), region of the world (if applicable), food education standard If cooking: Cooking skill(s), Main ingredient(s). Heating element: none, stove or oven. If gardening: garden theme (ie pollinators, soil, seeds, compost, animals, stewardship, vegetables, water, etc)',
    '',
    '[Table]',
    'Agenda/Class Flow: Opening ritual with SEL component AND with emphasis on yearly theme.',
  ].join('\n');

  it('the untouched stock template prefills NOTHING (every guard-b stock list survives)', () => {
    // Core Competencies / SEL still carry all their stock options → unanswered.
    // Heating element still lists none/stove/oven → unanswered. The Tags cell is
    // pure instruction → nothing to match.
    expect(parseTemplateTags(STOCK_TEMPLATE)).toEqual({});
  });

  it('a filled template maps each answered cell to its canonical closed-vocab values', () => {
    const filled = [
      '[Table]',
      'Core Competencies: | List all that apply: social justice, cultural diversity',
      '[Table]',
      'Cultural Responsiveness | : We highlight Chinese heritage.',
      '[Table]',
      'Social-Emotional Skills | (pick all that apply or add your own): kindness, collaboration',
      '[Table]',
      'Tags–Pick a tag from each category: | Lunar New Year, Rice, Knife skills, Composting, Heating element: stove',
      '[Table]',
      'Agenda/Class Flow: Opening ritual.',
    ].join('\n');

    expect(parseTemplateTags(filled)).toEqual({
      // "cultural diversity" → the post-Brief-1 canonical Cultural Diversity.
      coreCompetencies: ['Social Justice', 'Cultural Diversity'],
      socialEmotionalLearning: ['Kindness', 'Collaboration'],
      // Heating element: stove → kebab stovetop (per FILTER_CONFIGS.cookingMethods).
      cookingMethods: ['stovetop'],
      observancesHolidays: ['Lunar New Year'],
      cookingSkills: ['Knife skills'],
      gardenSkills: ['Composting'],
      // Rice auto-adds its parent group (INGREDIENT_PARENT_MAP) so the Zod
      // refinement passes; the group precedes the specific (frozen vocab order).
      mainIngredients: ['Grains & starches', 'Rice'],
    });
  });

  it('half-filled: an untouched stock SEL cell stays UNANSWERED while a real competencies cell is read', () => {
    const halfFilled = [
      '[Table]',
      'Core Competencies: | List all that apply: cultural diversity',
      '[Table]',
      'Social-Emotional Skills | (pick all that apply or add your own): Bravery, kindness, respect, self-management (safety), collaboration, pride, joy',
      '[Table]',
      'Garden Connection: none',
    ].join('\n');

    expect(parseTemplateTags(halfFilled)).toEqual({
      coreCompetencies: ['Cultural Diversity'],
      // socialEmotionalLearning intentionally ABSENT — stock list untouched.
    });
  });

  it('never prefills Social-Emotional Intelligence (the template dropped it) even if the words appear', () => {
    const withSei = [
      '[Table]',
      'Core Competencies: | Social-Emotional Intelligence, social justice',
      '[Table]',
      'Cultural Responsiveness | : n/a',
    ].join('\n');
    // Only Social Justice survives; SEI is not a template option.
    expect(parseTemplateTags(withSei)).toEqual({ coreCompetencies: ['Social Justice'] });
  });

  it('heating element mappings: none → basic-prep, oven → oven, and a stray value is ignored', () => {
    const noneCase = [
      '[Table]',
      'Tags–Pick a tag from each category: | Heating element: none',
    ].join('\n');
    expect(parseTemplateTags(noneCase)).toEqual({ cookingMethods: ['basic-prep'] });

    const ovenCase = [
      '[Table]',
      'Tags–Pick a tag from each category: | Heating element: oven',
    ].join('\n');
    expect(parseTemplateTags(ovenCase)).toEqual({ cookingMethods: ['oven'] });
  });

  it('only EXACT closed-vocab tokens match — a substring or off-vocab phrase never prefills', () => {
    // "composting soil" is one token (never split across words) and does not
    // equal "Composting"; "region of the world" is instruction boilerplate.
    const fuzzy = [
      '[Table]',
      'Tags–Pick a tag from each category: | composting soil, region of the world, Rices',
    ].join('\n');
    expect(parseTemplateTags(fuzzy)).toEqual({});
  });

  it('a non-template doc (plain lesson body, no labeled cells) prefills nothing', () => {
    const legacyBody =
      'Compost Cake\n\nSummary: Students practice kindness and respect while learning to plant seeds and measure ingredients.';
    // No "Core Competencies:" / "Social-Emotional Skills" / "pick a tag" labels,
    // so the incidental words ("kindness", "respect", "measure", "seeds") never
    // leak in — matching is bounded to the template's labeled cells.
    expect(parseTemplateTags(legacyBody)).toEqual({});
  });

  it('is tolerant of empty / null-ish content', () => {
    expect(parseTemplateTags('')).toEqual({});
    expect(parseTemplateTags(undefined as unknown as string)).toEqual({});
  });

  // Autocorrect / delimiter robustness (adversarial review). All fold BOTH sides,
  // so they absorb keyboard variance without widening the closed vocab.
  it('matches a directly-typed comma-containing group value (the comma is not an item separator here)', () => {
    const content = [
      '[Table]',
      'Tags–Pick a tag from each category: | Squash, cucumbers & melons',
    ].join('\n');
    // The one vocab value with an internal comma must still match as a whole.
    expect(parseTemplateTags(content)).toEqual({ mainIngredients: ['Squash, cucumbers & melons'] });
  });

  it('matches an accent-dropped cooking skill (Sauteing → Sautéing)', () => {
    const content = [
      '[Table]',
      'Tags–Pick a tag from each category: | Sauteing & stir-frying',
    ].join('\n');
    expect(parseTemplateTags(content)).toEqual({ cookingSkills: ['Sautéing & stir-frying'] });
  });

  it("matches a Google-Docs curly apostrophe against straight-apostrophe vocab (Women's History Month)", () => {
    const content = ['[Table]', 'Tags–Pick a tag from each category: | Women’s History Month'].join(
      '\n'
    );
    expect(parseTemplateTags(content)).toEqual({
      observancesHolidays: ["Women's History Month"],
    });
  });
});
