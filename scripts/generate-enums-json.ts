#!/usr/bin/env npx tsx
/**
 * Generates src/types/generated/enums.json from the canonical Zod source
 * (src/types/lessonMetadata.zod.ts).
 *
 * Single writer — SQL CHECK constraints (PR 1 Task 1.6; PR 6c2 small fields),
 * the edge mirror `supabase/functions/_shared/metadataSchemas.ts`, and the
 * Vitest freshness test (`enums.json.test.ts`) all consume this file.
 * Hand-synced SQL constants carry a `-- SOURCE: enums.json["<key>"]` comment
 * marker (per validator architecture doc Decision 6) so a sync test can
 * string-match them.
 *
 * Run via: npm run generate:enums
 *
 * The file is also committed to git so consumers don't need to run the
 * generator themselves; CI fails if the committed file drifts from the
 * canonical source.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  ACTIVITY_TYPE_VALUES,
  TAG_VALUES,
  SEASON_TIMING_VALUES,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES,
  ACADEMIC_INTEGRATION_VALUES,
  SOCIAL_EMOTIONAL_LEARNING_VALUES,
  CORE_COMPETENCIES_VALUES,
  COOKING_METHODS_VALUES,
  OBSERVANCES_HOLIDAYS_VALUES,
  GARDEN_SKILLS_VALUES,
} from '../src/types/lessonMetadata.zod.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, '../src/types/generated/enums.json');

const enums = {
  activity_type: [...ACTIVITY_TYPE_VALUES],
  tags: [...TAG_VALUES],
  season_timing: [...SEASON_TIMING_VALUES],
  cultural_responsiveness_features: [...CULTURAL_RESPONSIVENESS_FEATURE_VALUES],
  academic_integration: [...ACADEMIC_INTEGRATION_VALUES],
  social_emotional_learning: [...SOCIAL_EMOTIONAL_LEARNING_VALUES],
  core_competencies: [...CORE_COMPETENCIES_VALUES],
  cooking_methods: [...COOKING_METHODS_VALUES],
  observances_holidays: [...OBSERVANCES_HOLIDAYS_VALUES],
  garden_skills: [...GARDEN_SKILLS_VALUES],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(enums, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outputPath}`);
