import { describe, it, expect } from 'vitest';
import {
  canonicalizeReviewMetadata,
  COOKING_SKILLS_MAP,
  MAIN_INGREDIENTS_MAP,
} from './canonicalizeReviewMetadata';
import { reviewFormPayloadSchema } from '@/types/reviewFormPayload.zod';
import {
  COOKING_SKILLS_VALUES,
  MAIN_INGREDIENTS_VALUES,
  INGREDIENT_PARENT_MAP,
} from '@/types/lessonMetadata.zod';
import smallerFieldsVocab from '../../scripts/stage2-retag/data/smaller-fields.vocab.json';
import type { ReviewMetadata } from '@/types';

// The complete distinct legacy values present in PROD `submission_reviews.tagged_metadata`
// (113 rows, all decision=approve_new), censused by the supervisor. Every slug below must
// canonicalize to a value byte-identical to an entry in smaller-fields.vocab.json.
const CENSUS = {
  academicIntegration: ['arts', 'health', 'literacy-ela', 'math', 'science', 'social-studies'],
  socialEmotionalLearning: [
    'relationship-skills',
    'responsible-decision-making',
    'self-awareness',
    'self-management',
    'social-awareness',
  ],
  coreCompetencies: [
    'culturally-responsive',
    'environmental-stewardship',
    'garden-skills',
    'kitchen-skills',
    'social-emotional',
    'social-justice',
  ],
  gardenSkills: [
    'beneficial-insect-id',
    'companion-planting',
    'composting',
    'garden-exploration',
    'garden-planning',
    'harvesting',
    'mulching',
    'observing-plant-parts',
    'pest-identification',
    'planting',
    'pollinator-observation',
    'preservation',
    'seed-saving',
    'seed-starting',
    'sensory-exploration',
    'soil-preparation',
    'transplanting',
    'watering-techniques',
    'weeding',
  ],
  // Already canonical in tagged_metadata — no mapping needed.
  cookingMethods: ['basic-prep', 'oven', 'stovetop'],
  observancesHolidays: [
    'AAPI Heritage Month',
    'Black History Month',
    'Eid',
    'Hispanic/Latinx Heritage Month',
    "Indigenous Peoples' Month",
    'Juneteenth',
    'Lunar New Year',
  ],
} as const;

const VOCAB = smallerFieldsVocab.fields;

describe('canonicalizeReviewMetadata', () => {
  describe('legacy slug fields canonicalize to vocab values', () => {
    it('maps academicIntegration legacy slugs to canonical Title forms', () => {
      const result = canonicalizeReviewMetadata({
        academicIntegration: [...CENSUS.academicIntegration],
      });
      expect(result.academicIntegration).toEqual([
        'Arts',
        'Health',
        'Literacy/ELA',
        'Math',
        'Science',
        'Social Studies',
      ]);
      // Every produced value must be a member of the canonical vocab.
      for (const v of result.academicIntegration!) {
        expect(VOCAB.academic_integration).toContain(v);
      }
    });

    it('maps socialEmotionalLearning legacy slugs to canonical forms', () => {
      const result = canonicalizeReviewMetadata({
        socialEmotionalLearning: [...CENSUS.socialEmotionalLearning],
      });
      expect(result.socialEmotionalLearning).toEqual([
        'Relationship skills',
        'Responsible decision-making',
        'Self-awareness',
        'Self-management',
        'Social awareness',
      ]);
      for (const v of result.socialEmotionalLearning!) {
        expect(VOCAB.social_emotional_learning).toContain(v);
      }
    });

    it('maps coreCompetencies legacy slugs to canonical forms', () => {
      const result = canonicalizeReviewMetadata({
        coreCompetencies: [...CENSUS.coreCompetencies],
      });
      expect(result.coreCompetencies).toEqual([
        'Culturally Responsive Education',
        'Environmental and Community Stewardship',
        'Garden Skills and Related Academic Content',
        'Kitchen Skills and Related Academic Content',
        'Social-Emotional Intelligence',
        'Social Justice',
      ]);
      for (const v of result.coreCompetencies!) {
        expect(VOCAB.core_competencies).toContain(v);
      }
    });

    it('maps gardenSkills legacy slugs to canonical Title forms', () => {
      const result = canonicalizeReviewMetadata({
        gardenSkills: [...CENSUS.gardenSkills],
      });
      expect(result.gardenSkills).toEqual([
        'Beneficial insect identification',
        'Companion planting',
        'Composting',
        'Garden exploration',
        'Garden planning',
        'Harvesting',
        'Mulching',
        'Observing plant parts',
        'Pest identification',
        'Planting',
        'Pollinator observation',
        'Preservation techniques',
        'Seed saving',
        'Seed starting',
        'Sensory exploration',
        'Soil preparation and care',
        'Transplanting',
        'Watering techniques',
        'Weeding',
      ]);
      for (const v of result.gardenSkills!) {
        expect(VOCAB.garden_skills).toContain(v);
      }
    });

    it('maps the critical extra gardenSkills slug sensory-exploration explicitly', () => {
      const result = canonicalizeReviewMetadata({ gardenSkills: ['sensory-exploration'] });
      expect(result.gardenSkills).toEqual(['Sensory exploration']);
      expect(VOCAB.garden_skills).toContain('Sensory exploration');
    });
  });

  describe('already-canonical values round-trip unchanged', () => {
    it('leaves canonical academicIntegration / SEL / coreCompetencies / gardenSkills untouched', () => {
      const canonical: ReviewMetadata = {
        academicIntegration: ['Math', 'Science'],
        socialEmotionalLearning: ['Self-awareness'],
        coreCompetencies: ['Social Justice'],
        gardenSkills: ['Composting', 'Sensory exploration'],
      };
      const result = canonicalizeReviewMetadata(canonical);
      expect(result.academicIntegration).toEqual(['Math', 'Science']);
      expect(result.socialEmotionalLearning).toEqual(['Self-awareness']);
      expect(result.coreCompetencies).toEqual(['Social Justice']);
      expect(result.gardenSkills).toEqual(['Composting', 'Sensory exploration']);
    });

    it('leaves already-canonical cookingMethods and observancesHolidays untouched', () => {
      const result = canonicalizeReviewMetadata({
        cookingMethods: ['basic-prep', 'stovetop', 'oven'],
        observancesHolidays: ['AAPI Heritage Month', "Indigenous Peoples' Month", 'Eid'],
      });
      expect(result.cookingMethods).toEqual(['basic-prep', 'stovetop', 'oven']);
      expect(result.observancesHolidays).toEqual([
        'AAPI Heritage Month',
        "Indigenous Peoples' Month",
        'Eid',
      ]);
    });
  });

  describe('defensive passthrough', () => {
    it('passes an unmapped/unknown value through unchanged (never drops, never throws)', () => {
      const result = canonicalizeReviewMetadata({
        academicIntegration: ['math', 'totally-unknown-value'],
        gardenSkills: ['planting', 'some-future-skill'],
      });
      expect(result.academicIntegration).toEqual(['Math', 'totally-unknown-value']);
      expect(result.gardenSkills).toEqual(['Planting', 'some-future-skill']);
    });

    it('passes Object.prototype key names through unchanged (own-property lookup only)', () => {
      // Guards the `hasOwnProperty.call` lookup: a bare `el in map` would match
      // inherited keys like 'toString'/'constructor' and replace them with native
      // function objects. None occur in the controlled vocab, but the lookup must
      // stay own-property-only so any such value survives verbatim.
      const result = canonicalizeReviewMetadata({
        academicIntegration: ['toString', 'constructor', 'hasOwnProperty', 'math'],
      });
      expect(result.academicIntegration).toEqual([
        'toString',
        'constructor',
        'hasOwnProperty',
        'Math',
      ]);
    });

    it('applies cheap defensive folds for cookingMethods and observancesHolidays', () => {
      const result = canonicalizeReviewMetadata({
        cookingMethods: ['basic-prep-only', 'no-cook', 'stovetop'],
        observancesHolidays: ['End of year', 'Earth month', 'Juneteenth'],
      });
      expect(result.cookingMethods).toEqual(['basic-prep', 'basic-prep', 'stovetop']);
      expect(result.observancesHolidays).toEqual([
        'End of year celebrations',
        'Earth Month',
        'Juneteenth',
      ]);
    });
  });

  describe('non-array / undefined / other-key handling', () => {
    it('returns a new object and does not mutate the input', () => {
      const input: ReviewMetadata = { academicIntegration: ['math'] };
      const result = canonicalizeReviewMetadata(input);
      expect(result).not.toBe(input);
      expect(input.academicIntegration).toEqual(['math']);
    });

    it('leaves undefined fields absent', () => {
      const result = canonicalizeReviewMetadata({ gradeLevels: ['3'] });
      expect(result.academicIntegration).toBeUndefined();
      expect(result.gardenSkills).toBeUndefined();
      expect(result.gradeLevels).toEqual(['3']);
    });

    it('leaves non-array field values as-is without throwing', () => {
      const weird = { academicIntegration: 'math' } as unknown as ReviewMetadata;
      const result = canonicalizeReviewMetadata(weird);
      expect((result as unknown as { academicIntegration: string }).academicIntegration).toBe(
        'math'
      );
    });

    it('does not touch unrelated keys (themes, cookingSkills, culturalHeritage, etc.)', () => {
      const input: ReviewMetadata = {
        themes: ['garden-to-cafeteria'],
        cookingSkills: ['knife-skills'],
        culturalHeritage: ['asian'],
        location: 'indoor',
        processingNotes: 'note',
      };
      const result = canonicalizeReviewMetadata(input);
      expect(result.themes).toEqual(['garden-to-cafeteria']);
      expect(result.cookingSkills).toEqual(['knife-skills']);
      expect(result.culturalHeritage).toEqual(['asian']);
      expect(result.location).toBe('indoor');
      expect(result.processingNotes).toBe('note');
    });

    it('handles a completely empty object', () => {
      expect(canonicalizeReviewMetadata({})).toEqual({});
    });
  });

  describe('full census coverage — every distinct PROD legacy value maps to a canonical vocab member or passes through canonical', () => {
    const fieldToVocabKey: Record<string, keyof typeof VOCAB> = {
      academicIntegration: 'academic_integration',
      socialEmotionalLearning: 'social_emotional_learning',
      coreCompetencies: 'core_competencies',
      gardenSkills: 'garden_skills',
      cookingMethods: 'cooking_methods',
      observancesHolidays: 'observances_holidays',
    };

    for (const [field, values] of Object.entries(CENSUS)) {
      it(`every censused ${field} value canonicalizes to a vocab member`, () => {
        const result = canonicalizeReviewMetadata({ [field]: [...values] } as ReviewMetadata);
        const produced = result[field as keyof ReviewMetadata] as string[];
        const vocab = VOCAB[fieldToVocabKey[field]] as readonly string[];
        for (const v of produced) {
          expect(vocab).toContain(v);
        }
      });
    }
  });

  describe('C02 cooking_skills + main_ingredients canonicalization (P4a save-blocker)', () => {
    // Every value that is a specific with a non-null parent must have that
    // parent present in the same array (the closed schema's superRefine).
    const hasNoOrphanSpecific = (arr: readonly string[]) =>
      arr.every((v) => {
        const parent = INGREDIENT_PARENT_MAP[v];
        return !parent || arr.includes(parent);
      });
    const hasNoDuplicates = (arr: readonly string[]) => new Set(arr).size === arr.length;

    it('maps legacy slugs, dedupes cookingSkills, and parent-completes mainIngredients (headline census row)', () => {
      const result = canonicalizeReviewMetadata({
        cookingSkills: ['chopping', 'dicing', 'slicing', 'boiling'],
        mainIngredients: ['alliums', 'carrots', 'pasta', 'ginger'],
      });
      // 5 cutting slugs all collapse to one 'Knife skills' → dedupe (first-seen order).
      expect(result.cookingSkills).toEqual(['Knife skills', 'Boiling & simmering']);
      // map → parent-complete → dedupe, deterministic order: mapped first, parents appended.
      expect(result.mainIngredients).toEqual([
        'Alliums',
        'Carrots',
        'Grains & starches',
        'Ginger',
        'Root vegetables',
        'Spices',
      ]);
      expect(result.mainIngredients).toEqual(
        expect.arrayContaining([
          'Carrots',
          'Root vegetables',
          'Alliums',
          'Grains & starches',
          'Ginger',
          'Spices',
        ])
      );
      expect(hasNoOrphanSpecific(result.mainIngredients!)).toBe(true);
      expect(hasNoDuplicates(result.mainIngredients!)).toBe(true);
      // The whole canonicalized payload must satisfy the now-closed review schema.
      expect(reviewFormPayloadSchema.safeParse(result).success).toBe(true);
    });

    it('parent-completes a lone specific (carrots → Carrots + Root vegetables)', () => {
      const result = canonicalizeReviewMetadata({ mainIngredients: ['carrots'] });
      expect(result.mainIngredients).toEqual(['Carrots', 'Root vegetables']);
    });

    it('maps herbs-aromatics → Fresh herbs (a group — no parent added)', () => {
      const result = canonicalizeReviewMetadata({ mainIngredients: ['herbs-aromatics'] });
      expect(result.mainIngredients).toEqual(['Fresh herbs']);
    });

    it('leaves a null-parent specific alone (celery → Celery, no parent added)', () => {
      const result = canonicalizeReviewMetadata({ mainIngredients: ['celery'] });
      expect(result.mainIngredients).toEqual(['Celery']);
    });

    it('round-trips already-canonical mainIngredients and still enforces parent-completion', () => {
      expect(
        canonicalizeReviewMetadata({ mainIngredients: ['Tomatoes', 'Nightshades'] }).mainIngredients
      ).toEqual(['Tomatoes', 'Nightshades']);
      // A canonical orphan specific gets its group appended.
      expect(canonicalizeReviewMetadata({ mainIngredients: ['Tomatoes'] }).mainIngredients).toEqual(
        ['Tomatoes', 'Nightshades']
      );
    });

    it('dedupes cookingSkills when several cutting slugs collapse to Knife skills', () => {
      const result = canonicalizeReviewMetadata({
        cookingSkills: ['chopping', 'dicing', 'slicing', 'julienning', 'mincing'],
      });
      expect(result.cookingSkills).toEqual(['Knife skills']);
    });

    it('passes an unmapped cooking/ingredient value through unchanged (defensive contract)', () => {
      const result = canonicalizeReviewMetadata({
        cookingSkills: ['boiling', 'some-future-skill'],
        mainIngredients: ['carrots', 'some-future-ingredient'],
      });
      expect(result.cookingSkills).toEqual(['Boiling & simmering', 'some-future-skill']);
      expect(result.mainIngredients).toEqual([
        'Carrots',
        'some-future-ingredient',
        'Root vegetables',
      ]);
    });

    it('leaves undefined cookingSkills / mainIngredients absent (no array materialized)', () => {
      const result = canonicalizeReviewMetadata({ gradeLevels: ['3'] });
      expect(result.cookingSkills).toBeUndefined();
      expect(result.mainIngredients).toBeUndefined();
    });

    describe('drift-lock: every map VALUE is a frozen-vocab member', () => {
      it('every COOKING_SKILLS_MAP value ∈ COOKING_SKILLS_VALUES', () => {
        for (const v of Object.values(COOKING_SKILLS_MAP)) {
          expect(COOKING_SKILLS_VALUES as readonly string[]).toContain(v);
        }
      });
      it('every MAIN_INGREDIENTS_MAP value ∈ MAIN_INGREDIENTS_VALUES', () => {
        for (const v of Object.values(MAIN_INGREDIENTS_MAP)) {
          expect(MAIN_INGREDIENTS_VALUES as readonly string[]).toContain(v);
        }
      });
    });
  });

  describe('integration: a canonicalized legacy payload passes the closed reviewFormPayloadSchema', () => {
    it('a full legacy-slug review payload canonicalizes and then validates', () => {
      const legacyPayload: ReviewMetadata = {
        activityType: ['cooking', 'garden'],
        location: 'indoor',
        gradeLevels: ['3', '4'],
        themes: ['garden-to-cafeteria'],
        season: ['Fall'],
        academicIntegration: [
          'math',
          'science',
          'literacy-ela',
          'social-studies',
          'health',
          'arts',
        ],
        socialEmotionalLearning: ['relationship-skills', 'self-awareness'],
        coreCompetencies: ['environmental-stewardship', 'social-justice', 'garden-skills'],
        gardenSkills: ['composting', 'sensory-exploration', 'beneficial-insect-id'],
        cookingMethods: ['basic-prep', 'stovetop'],
        observancesHolidays: ['AAPI Heritage Month', 'Juneteenth'],
        culturalHeritage: ['asian'],
      };
      const canonicalized = canonicalizeReviewMetadata(legacyPayload);
      const parsed = reviewFormPayloadSchema.safeParse(canonicalized);
      expect(parsed.success).toBe(true);
    });

    it('the raw legacy payload (without canonicalization) is REJECTED by the closed schema', () => {
      const legacyPayload = {
        academicIntegration: ['math'],
        gardenSkills: ['composting'],
      };
      const parsed = reviewFormPayloadSchema.safeParse(legacyPayload);
      expect(parsed.success).toBe(false);
    });
  });
});
