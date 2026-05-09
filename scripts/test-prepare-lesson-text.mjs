#!/usr/bin/env node

/**
 * Verification harness for prepareLessonText (PR 3a Task 3a.3).
 *
 * Exercises the academicConcepts shape-flattening logic against four
 * fixture lesson shapes derived from real TEST corpus rows. Runs without
 * Supabase or OpenAI credentials — the harness imports prepareLessonText
 * via the ESM main-module guard in generate-embeddings.mjs.
 *
 * Why fixtures and not a TEST-DB dry-run: generate-embeddings.mjs's
 * built-in `--test` flag routes to a hardcoded URL for a deleted Supabase
 * project, and the corresponding service key in .env is stale (see
 * project_test_key_stale.md). MCP-derived fixtures are the closest
 * equivalent for verifying the pure shape-flattening behavior.
 *
 * Usage: node scripts/test-prepare-lesson-text.mjs
 */

import { prepareLessonText } from './generate-embeddings.mjs';

let failures = 0;

function assertIncludes(name, output, substring) {
  if (output.includes(substring)) {
    console.log(`  PASS  ${name} contains "${substring}"`);
  } else {
    console.log(`  FAIL  ${name} missing "${substring}"`);
    failures++;
  }
}

function assertExcludes(name, output, substring) {
  if (!output.includes(substring)) {
    console.log(`  PASS  ${name} excludes "${substring}"`);
  } else {
    console.log(`  FAIL  ${name} unexpectedly contains "${substring}"`);
    failures++;
  }
}

// Fixtures derived from a 2026-05-08 mcp__supabase-test__execute_sql probe.
// Only the fields prepareLessonText reads are populated; lesson_ids and
// other identifying data are omitted.
const fixtures = [
  {
    name: 'multi-subject, multi-concept in one subject (Sun Study shape)',
    lesson: {
      title: 'Sun Study',
      summary: 'Photosynthesis and thermal energy',
      grade_levels: ['3', '4'],
      metadata: {
        academicConcepts: {
          Arts: ['visual arts'],
          Science: ['photosynthesis', 'thermal energy'],
        },
      },
      content_text: 'Sample body content.',
    },
    check: (out) => {
      assertIncludes('Sun Study', out,
        'Concepts: Arts, visual arts, Science, photosynthesis, thermal energy');
    },
  },
  {
    name: 'multi-subject, single concept each (Roots and Shoots shape)',
    lesson: {
      title: 'Roots and Shoots',
      summary: 'Plant parts via storytelling',
      grade_levels: ['K', '1'],
      metadata: {
        academicConcepts: {
          Arts: ['visual arts'],
          Science: ['plant parts'],
          'Literacy/ELA': ['storytelling'],
        },
      },
      content_text: 'Sample body content.',
    },
    check: (out) => {
      assertIncludes('Roots and Shoots', out,
        'Concepts: Arts, visual arts, Science, plant parts, Literacy/ELA, storytelling');
    },
  },
  {
    name: 'single subject, multi-concept (Water Cycle and Dumplings shape)',
    lesson: {
      title: 'Water Cycle and Dumplings',
      summary: 'Water cycle and states of matter',
      grade_levels: ['2'],
      metadata: {
        academicConcepts: {
          Science: ['water cycles', 'states of matter'],
        },
      },
      content_text: 'Sample body content.',
    },
    check: (out) => {
      assertIncludes('Water Cycle and Dumplings', out,
        'Concepts: Science, water cycles, states of matter');
    },
  },
  {
    name: 'academicConcepts is null — no Concepts: line should be emitted',
    lesson: {
      title: 'Orientation Lesson',
      summary: 'No concepts present',
      grade_levels: ['K'],
      metadata: {
        academicConcepts: null,
      },
      content_text: 'Sample body content.',
    },
    check: (out) => {
      assertExcludes('Orientation Lesson', out, 'Concepts:');
    },
  },
];

console.log('Verifying prepareLessonText shape handling for academicConcepts\n');

for (const { name, lesson, check } of fixtures) {
  console.log(`Case: ${name}`);
  const out = prepareLessonText(lesson);
  console.log('  Output:');
  console.log(out.split('\n').map((l) => `    ${l}`).join('\n'));
  check(out);
  console.log();
}

if (failures > 0) {
  console.log(`FAILED: ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('OK: all assertions passed');
