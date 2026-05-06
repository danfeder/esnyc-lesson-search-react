import { describe, it, expect } from 'vitest';
import { extractMetadataFromContent } from './google-docs-parser';

describe('extractMetadataFromContent', () => {
  describe('grade levels', () => {
    it('parses labeled list of bare digits', () => {
      const sketch = extractMetadataFromContent('Grade Levels: 3, 4, 5');
      expect(sketch.gradeLevels?.sort()).toEqual(['3', '4', '5']);
    });

    it('parses labeled list with K and ranges', () => {
      const sketch = extractMetadataFromContent('Grades: K-2');
      expect(sketch.gradeLevels?.sort()).toEqual(['1', '2', 'K']);
    });

    it('parses labeled list with PK', () => {
      const sketch = extractMetadataFromContent('Grade: Pre-K, K, 1');
      expect(sketch.gradeLevels?.sort()).toEqual(['1', 'K', 'PK']);
    });

    it('parses ordinal phrases in prose', () => {
      const sketch = extractMetadataFromContent(
        'This lesson is designed for 3rd grade and fourth grade students.'
      );
      expect(sketch.gradeLevels?.sort()).toEqual(['3', '4']);
    });

    it('omits gradeLevels when no signal', () => {
      const sketch = extractMetadataFromContent('A lesson about apples.');
      expect(sketch.gradeLevels).toBeUndefined();
    });

    it('emits only K for bare "Kindergarten" in prose', () => {
      const sketch = extractMetadataFromContent(
        'Designed for Kindergarten students.'
      );
      expect(sketch.gradeLevels).toEqual(['K']);
    });

    it('emits only PK for "Pre-Kindergarten" in prose (no K spillover)', () => {
      const sketch = extractMetadataFromContent(
        'Designed for Pre-Kindergarten students.'
      );
      expect(sketch.gradeLevels).toEqual(['PK']);
    });

    it('emits only PK for "prekindergarten" (no hyphen, no K spillover)', () => {
      const sketch = extractMetadataFromContent(
        'A prekindergarten lesson.'
      );
      expect(sketch.gradeLevels).toEqual(['PK']);
    });

    it('parses 3K from labeled list', () => {
      const sketch = extractMetadataFromContent('Grade Levels: 3K, PK');
      expect(sketch.gradeLevels?.sort()).toEqual(['3K', 'PK']);
    });
  });

  describe('seasons', () => {
    it('parses labeled season header', () => {
      const sketch = extractMetadataFromContent('Season: Fall, Winter');
      expect(sketch.seasonTiming?.sort()).toEqual(['Fall', 'Winter']);
    });

    it('parses "Season & Timing" header', () => {
      const sketch = extractMetadataFromContent('Season & Timing: Spring');
      expect(sketch.seasonTiming).toEqual(['Spring']);
    });

    it('emits Fall on autumn (unambiguous)', () => {
      const sketch = extractMetadataFromContent(
        'Students explore changes during the autumn season.'
      );
      expect(sketch.seasonTiming).toContain('Fall');
    });

    it('emits Fall on contextual phrase "in the fall"', () => {
      const sketch = extractMetadataFromContent(
        'This lesson works well in the fall when leaves change color.'
      );
      expect(sketch.seasonTiming).toContain('Fall');
    });

    it('does NOT emit Fall on bare "fall down" (false-positive guard)', () => {
      const sketch = extractMetadataFromContent(
        'Be careful not to fall down or drop the equipment.'
      );
      expect(sketch.seasonTiming).toBeUndefined();
    });

    it('does NOT emit Spring on "spring up" without seasonal context', () => {
      const sketch = extractMetadataFromContent(
        'Watch the seedlings spring up from the soil.'
      );
      expect(sketch.seasonTiming).toBeUndefined();
    });
  });

  describe('thematic categories', () => {
    it('matches multi-word phrases case-insensitively', () => {
      const sketch = extractMetadataFromContent(
        'A unit on plant growth and food justice.'
      );
      expect(sketch.thematicCategories?.sort()).toEqual([
        'Food Justice',
        'Plant Growth',
      ]);
    });

    it('omits when no theme phrase appears', () => {
      const sketch = extractMetadataFromContent(
        'A lesson about ovens and recipes.'
      );
      expect(sketch.thematicCategories).toBeUndefined();
    });
  });

  describe('activity type', () => {
    it('emits ["cooking", "garden"] when labeled with cooking + garden', () => {
      const sketch = extractMetadataFromContent('Activity Type: Cooking + Garden');
      expect(sketch.activityType).toEqual(['cooking', 'garden']);
    });

    it('emits ["cooking"] from labeled header', () => {
      const sketch = extractMetadataFromContent('Activity Type: Cooking Only');
      expect(sketch.activityType).toEqual(['cooking']);
    });

    it('emits ["garden"] from frequency when threshold met and no cooking', () => {
      const content =
        'Students will be planting seeds in the garden. They will harvest and observe seedlings. Add compost to the garden bed.';
      const sketch = extractMetadataFromContent(content);
      expect(sketch.activityType).toEqual(['garden']);
    });

    it('does NOT emit when below frequency threshold', () => {
      const sketch = extractMetadataFromContent(
        'A short mention of garden once.'
      );
      expect(sketch.activityType).toBeUndefined();
    });

    it('emits ["academic"] from labeled header', () => {
      const sketch = extractMetadataFromContent('Activity Type: Academic Only');
      expect(sketch.activityType).toEqual(['academic']);
    });

    it('emits ["cooking", "garden"] from frequency inference when both signals are strong', () => {
      const content =
        'Students cook a recipe in the kitchen using a stovetop. ' +
        'They harvest tomatoes from the garden after planting seedlings, ' +
        'then add compost to the soil bed.';
      const sketch = extractMetadataFromContent(content);
      expect(sketch.activityType).toEqual(['cooking', 'garden']);
    });
  });

  describe('cultural heritage', () => {
    it('emits child + parent for "East Asian"', () => {
      const sketch = extractMetadataFromContent(
        'Explore East Asian culinary traditions.'
      );
      expect(sketch.culturalHeritage?.sort()).toEqual(['asian', 'east-asian']);
    });

    it('emits "mediterranean" via word match', () => {
      const sketch = extractMetadataFromContent(
        'A lesson on Mediterranean herbs.'
      );
      expect(sketch.culturalHeritage).toContain('mediterranean');
    });

    it('omits when no cultural keyword', () => {
      const sketch = extractMetadataFromContent('A lesson about composting.');
      expect(sketch.culturalHeritage).toBeUndefined();
    });
  });

  describe('cooking methods', () => {
    it('matches Stovetop and Oven', () => {
      const sketch = extractMetadataFromContent(
        'Use the stovetop to simmer; finish in the oven.'
      );
      expect(sketch.cookingMethods?.sort()).toEqual(['Oven', 'Stovetop']);
    });

    it('matches "baking" → Oven', () => {
      const sketch = extractMetadataFromContent('Students will be baking bread.');
      expect(sketch.cookingMethods).toContain('Oven');
    });

    it('matches "Basic prep" → Basic prep only', () => {
      const sketch = extractMetadataFromContent(
        'No heat required — basic prep with knife skills.'
      );
      expect(sketch.cookingMethods).toContain('Basic prep only');
    });

    it('omits when no cooking-method keyword', () => {
      const sketch = extractMetadataFromContent('A garden observation walk.');
      expect(sketch.cookingMethods).toBeUndefined();
    });
  });

  describe('robustness', () => {
    it('returns empty object on empty input', () => {
      expect(extractMetadataFromContent('')).toEqual({});
    });

    it('returns empty object on non-string input', () => {
      // @ts-expect-error testing runtime guard
      expect(extractMetadataFromContent(null)).toEqual({});
      // @ts-expect-error testing runtime guard
      expect(extractMetadataFromContent(undefined)).toEqual({});
    });

    it('handles a realistic mock lesson with multiple fields', () => {
      const content = `
Grade Levels: 3, 4, 5
Theme: Plant Growth
Season: Fall

Overview: Students measure plant growth in the autumn garden.
They will be planting and harvesting seeds. Compost is added.
      `.trim();
      const sketch = extractMetadataFromContent(content);
      expect(sketch.gradeLevels?.sort()).toEqual(['3', '4', '5']);
      expect(sketch.thematicCategories).toEqual(['Plant Growth']);
      expect(sketch.seasonTiming).toEqual(['Fall']);
      expect(sketch.activityType).toEqual(['garden']);
    });
  });
});
