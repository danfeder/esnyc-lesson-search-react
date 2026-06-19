import { describe, it, expect } from 'vitest';
import { canonicalizeReviewMetadata } from './canonicalizeReviewMetadata';
import { reviewFormPayloadSchema } from '@/types/reviewFormPayload.zod';
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
