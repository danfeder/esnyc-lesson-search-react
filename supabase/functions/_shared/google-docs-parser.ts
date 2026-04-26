/**
 * Extract content from Google Docs
 */

// Extract plain text from Google Doc structure
export function extractTextFromGoogleDoc(doc: any): string {
  let text = '';

  if (doc.body?.content) {
    for (const element of doc.body.content) {
      if (element.paragraph?.elements) {
        for (const textRun of element.paragraph.elements) {
          if (textRun.textRun?.content) {
            text += textRun.textRun.content;
          }
        }
      } else if (element.table) {
        // Handle tables
        text += '\n[Table]\n';
        if (element.table.tableRows) {
          for (const row of element.table.tableRows) {
            if (row.tableCells) {
              for (const cell of row.tableCells) {
                if (cell.content) {
                  for (const cellElement of cell.content) {
                    if (cellElement.paragraph?.elements) {
                      for (const textRun of cellElement.paragraph.elements) {
                        if (textRun.textRun?.content) {
                          text += textRun.textRun.content.trim() + ' | ';
                        }
                      }
                    }
                  }
                }
              }
              text = text.slice(0, -3) + '\n'; // Remove last ' | '
            }
          }
        }
      } else if (element.sectionBreak) {
        text += '\n\n---\n\n';
      }
    }
  }

  return text.trim();
}

/**
 * Metadata sketch produced by heuristic extraction over Google Doc content.
 *
 * Field names match the submission-side keys consumed by detect-duplicates'
 * calculateMetadataOverlap (gradeLevels, thematicCategories, activityType,
 * culturalHeritage, seasonTiming, cookingMethods). Values match the canonical
 * filter values defined in src/utils/filterDefinitions.ts so that Jaccard
 * comparison against lessons.metadata aligns case-insensitively.
 *
 * This is intentionally conservative: a missing field is preferable to a
 * wrong one, since detect-duplicates skips fields that are missing on either
 * side and weighted overlap defaults to zero — same as today's empty-object
 * baseline.
 */
export interface MetadataSketch {
  gradeLevels?: string[];
  thematicCategories?: string[];
  activityType?: string;
  culturalHeritage?: string[];
  seasonTiming?: string[];
  cookingMethods?: string[];
}

// --- Vocabulary (mirrors src/utils/filterDefinitions.ts canonical values) ---

const ORDINAL_GRADE_PATTERNS: Array<[RegExp, string]> = [
  [/\b(?:1st|first)\s+grade\b/i, '1'],
  [/\b(?:2nd|second)\s+grade\b/i, '2'],
  [/\b(?:3rd|third)\s+grade\b/i, '3'],
  [/\b(?:4th|fourth)\s+grade\b/i, '4'],
  [/\b(?:5th|fifth)\s+grade\b/i, '5'],
  [/\b(?:6th|sixth)\s+grade\b/i, '6'],
  [/\b(?:7th|seventh)\s+grade\b/i, '7'],
  [/\b(?:8th|eighth)\s+grade\b/i, '8'],
  [/\bkindergarten\b/i, 'K'],
  [/\bpre-?kindergarten\b/i, 'PK'],
];

const THEMATIC_CATEGORIES = [
  'Garden Basics',
  'Plant Growth',
  'Garden Communities',
  'Ecosystems',
  'Seed to Table',
  'Food Systems',
  'Food Justice',
];

// Order matters: most specific (multi-word) first so a doc mentioning
// "East Asian" emits both 'east-asian' and 'asian' (parent membership matches
// the hierarchical filter semantics in filterDefinitions.ts).
const CULTURAL_PATTERNS: Array<[RegExp, string]> = [
  [/\beast\s+asian\b/i, 'east-asian'],
  [/\bsoutheast\s+asian\b/i, 'southeast-asian'],
  [/\bsouth\s+asian\b/i, 'south-asian'],
  [/\bcentral\s+asian\b/i, 'central-asian'],
  [/\blatin\s+american\b/i, 'latin-american'],
  [/\bcaribbean\b/i, 'caribbean'],
  [/\bnorth\s+american\b/i, 'north-american'],
  [/\bwest\s+african\b/i, 'west-african'],
  [/\bethiopian\b/i, 'ethiopian'],
  [/\bnigerian\b/i, 'nigerian'],
  [/\beastern\s+european\b/i, 'eastern-european'],
  [/\bmediterranean\b/i, 'mediterranean'],
  [/\blevantine\b/i, 'levantine'],
  [/\bmiddle\s+eastern\b/i, 'middle-eastern'],
  [/\basian\b/i, 'asian'],
  [/\bafrican\b/i, 'african'],
  [/\beuropean\b/i, 'european'],
];

const COOKING_METHOD_PATTERNS: Array<[RegExp, string]> = [
  [/\bstovetop\b/i, 'Stovetop'],
  [/\b(?:oven|baking|baked|bake)\b/i, 'Oven'],
  [/\bbasic\s+prep\b/i, 'Basic prep only'],
];

// --- Extraction helpers ---

function findLabeledLine(content: string, headerPattern: RegExp): string | null {
  const m = content.match(headerPattern);
  return m ? m[1] : null;
}

function extractGradeLevels(content: string): string[] {
  const found = new Set<string>();

  // Phase 1: labeled list — "Grade Levels: 3, 4, 5" / "Grades: K-2"
  const list = findLabeledLine(
    content,
    /\bgrade(?:\s+levels?|s)?\s*[:=]\s*([^\n]+)/i
  );
  if (list) {
    // Bare tokens
    const tokens = list.match(/\b(?:3K|PK|Pre-?K|Kindergarten|[1-8]|K)\b/gi) || [];
    for (const tok of tokens) {
      const lower = tok.toLowerCase();
      if (lower === '3k') found.add('3K');
      else if (lower === 'pk' || lower === 'pre-k' || lower === 'prek') found.add('PK');
      else if (lower === 'kindergarten' || lower === 'k') found.add('K');
      else if (/^[1-8]$/.test(lower)) found.add(lower);
    }
    // Ranges: "K-2", "3-5"
    const rangeMatches = list.matchAll(/\b([1-8K])\s*[-–]\s*([1-8])\b/gi);
    for (const m of rangeMatches) {
      const startToken = m[1].toUpperCase();
      const start = startToken === 'K' ? 0 : parseInt(startToken, 10);
      const end = parseInt(m[2], 10);
      for (let i = start; i <= end; i++) {
        if (i === 0) found.add('K');
        else if (i >= 1 && i <= 8) found.add(String(i));
      }
    }
  }

  // Phase 2: ordinal phrases anywhere in content
  for (const [pattern, value] of ORDINAL_GRADE_PATTERNS) {
    if (pattern.test(content)) found.add(value);
  }

  return Array.from(found);
}

function extractSeasons(content: string): string[] {
  const found = new Set<string>();

  // Labeled list: "Season: Fall" / "Season & Timing: Fall, Winter"
  const list = findLabeledLine(
    content,
    /\b(?:season(?:\s*(?:&|and)\s*timing)?|timing)\s*[:=]\s*([^\n]+)/i
  );
  if (list) {
    const lower = list.toLowerCase();
    if (/\bfall\b|\bautumn\b/.test(lower)) found.add('Fall');
    if (/\bwinter\b/.test(lower)) found.add('Winter');
    if (/\bspring\b/.test(lower)) found.add('Spring');
    if (/\bsummer\b/.test(lower)) found.add('Summer');
  }

  // Phrase forms (strict — require seasonal context so "fall down" doesn't
  // emit Fall). Autumn is unambiguous, so it's accepted bare.
  if (/\bautumn\b/i.test(content)) found.add('Fall');
  if (
    /\bfall\s+(?:season|harvest|planting|garden|lesson|equinox|weather)\b/i.test(
      content
    ) ||
    /\b(?:in|during)\s+(?:the\s+)?fall\b/i.test(content)
  ) {
    found.add('Fall');
  }
  if (
    /\bwinter\s+(?:season|harvest|garden|lesson|solstice|weather)\b/i.test(
      content
    ) ||
    /\b(?:in|during)\s+(?:the\s+)?winter\b/i.test(content)
  ) {
    found.add('Winter');
  }
  if (
    /\bspring\s+(?:season|harvest|planting|garden|lesson|equinox|weather)\b/i.test(
      content
    ) ||
    /\b(?:in|during)\s+(?:the\s+)?spring\b/i.test(content)
  ) {
    found.add('Spring');
  }
  if (
    /\bsummer\s+(?:season|harvest|garden|lesson|solstice|weather)\b/i.test(
      content
    ) ||
    /\b(?:in|during)\s+(?:the\s+)?summer\b/i.test(content)
  ) {
    found.add('Summer');
  }

  return Array.from(found);
}

function extractActivityType(content: string): string | undefined {
  const list = findLabeledLine(content, /\bactivity\s+type\s*[:=]\s*([^\n]+)/i);
  if (list) {
    const lower = list.toLowerCase();
    const cooking = /cooking|kitchen/.test(lower);
    const garden = /garden/.test(lower);
    const academic = /academic/.test(lower);
    if (cooking && garden) return 'both';
    if (cooking) return 'cooking-only';
    if (garden) return 'garden-only';
    if (academic) return 'academic-only';
  }
  // Frequency-based inference. Threshold ≥3 to require strong signal.
  const cookingHits = (
    content.match(
      /\b(?:cooking|recipe|stovetop|oven|kitchen|knife\s+skills|chopping|sautéing|sauteing|simmer)\b/gi
    ) || []
  ).length;
  const gardenHits = (
    content.match(
      /\b(?:garden|planting|harvest|soil|compost|seedling|seed-?starting|sowing|transplant)\b/gi
    ) || []
  ).length;
  if (cookingHits >= 3 && gardenHits >= 3) return 'both';
  if (cookingHits >= 3 && gardenHits === 0) return 'cooking-only';
  if (gardenHits >= 3 && cookingHits === 0) return 'garden-only';
  return undefined;
}

function extractMatches(
  content: string,
  patterns: Array<[RegExp, string]>
): string[] {
  const found = new Set<string>();
  for (const [pattern, value] of patterns) {
    if (pattern.test(content)) found.add(value);
  }
  return Array.from(found);
}

function extractThematicCategories(content: string): string[] {
  const found = new Set<string>();
  const lower = content.toLowerCase();
  for (const val of THEMATIC_CATEGORIES) {
    if (lower.includes(val.toLowerCase())) found.add(val);
  }
  return Array.from(found);
}

/**
 * Heuristic metadata sketch from lesson content. Used to seed the metadata-
 * overlap component of detect-duplicates' scoring formula at submission time.
 *
 * This is intentionally not LLM-quality: it only needs to be better than the
 * empty-object baseline. Tier-3 #17 (AI-assisted metadata pre-fill) is the
 * higher-quality successor for reviewer-facing pre-fill.
 *
 * Fields are omitted (not empty-array-set) when no signal is found, so that
 * detect-duplicates' calculateMetadataOverlap skips them rather than treating
 * them as authoritatively empty.
 */
export function extractMetadataFromContent(content: string): MetadataSketch {
  if (!content || typeof content !== 'string') return {};

  const sketch: MetadataSketch = {};

  const grades = extractGradeLevels(content);
  if (grades.length > 0) sketch.gradeLevels = grades;

  const themes = extractThematicCategories(content);
  if (themes.length > 0) sketch.thematicCategories = themes;

  const activity = extractActivityType(content);
  if (activity) sketch.activityType = activity;

  const cultural = extractMatches(content, CULTURAL_PATTERNS);
  if (cultural.length > 0) sketch.culturalHeritage = cultural;

  const seasons = extractSeasons(content);
  if (seasons.length > 0) sketch.seasonTiming = seasons;

  const methods = extractMatches(content, COOKING_METHOD_PATTERNS);
  if (methods.length > 0) sketch.cookingMethods = methods;

  return sketch;
}
