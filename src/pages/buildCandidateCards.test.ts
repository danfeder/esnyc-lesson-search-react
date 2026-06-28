import { describe, it, expect } from 'vitest';
import {
  buildCandidateCards,
  type SimilarityWithLesson,
  type SubmitterTargetLesson,
  type CandidateCard,
} from '@/pages/buildCandidateCards';
import type { LessonSearchResult } from '@/components/LessonSearchPicker';

// Table-driven characterization tests for the duplicate-candidate card
// builder extracted from ReviewDetail's `candidateCards` useMemo (Wave 5
// PR-1a Task 1a.2). These PIN current behavior — the four discrete branches
// the decision panel composes: target-in-list / off-list-prepend / no-target
// / reviewer-searched-append (plus the `!submission` guard). The PR-0
// page-level test (`review-detail-page`) already regression-covers these
// branches end-to-end; this suite gives them a focused, fast unit guardrail
// so the extraction is provably behavior-identical.

const dupA: SimilarityWithLesson = {
  lesson_id: 'lesson-a',
  combined_score: 0.9,
  match_type: 'high',
  title_similarity: 0.8,
  content_similarity: 0.7,
  lesson: { title: 'Apple Pie', grade_levels: ['3', '4'], thematic_categories: ['Food'] },
};

// grade_levels null exercises the "Grades —" fallback branch.
const dupB: SimilarityWithLesson = {
  lesson_id: 'lesson-b',
  combined_score: 0.5,
  match_type: 'medium',
  title_similarity: 0.4,
  content_similarity: 0.3,
  lesson: { title: 'Banana Bread', grade_levels: null, thematic_categories: null },
};

const cardA: CandidateCard = {
  id: 'lesson-a',
  title: 'Apple Pie',
  meta: 'Grades 3, 4 · lesson-a',
  similarity: 0.9,
  matchType: 'high',
  matchLabel: undefined,
};

const cardB: CandidateCard = {
  id: 'lesson-b',
  title: 'Banana Bread',
  meta: 'Grades — · lesson-b',
  similarity: 0.5,
  matchType: 'medium',
  matchLabel: undefined,
};

const offTarget: SubmitterTargetLesson = {
  lesson_id: 'lesson-x',
  title: 'Cherry Cake',
  grade_levels: ['5'],
};

const searchPick: LessonSearchResult = {
  lesson_id: 'lesson-s',
  title: 'Searched Lesson',
  grade_levels: ['K'],
};

interface Case {
  name: string;
  args: Parameters<typeof buildCandidateCards>[0];
  expected: CandidateCard[];
}

const cases: Case[] = [
  {
    name: 'no-target → top duplicates mapped as-is, no matchLabel',
    args: {
      submission: {},
      topDuplicates: [dupA, dupB],
      selectedSearchLesson: null,
    },
    expected: [cardA, cardB],
  },
  {
    name: 'target-in-list → submitter target hoisted to front + "Submitter\'s choice" label, rest preserve order',
    args: {
      submission: { original_lesson_id: 'lesson-b' },
      topDuplicates: [dupA, dupB],
      selectedSearchLesson: null,
    },
    expected: [{ ...cardB, matchLabel: "Submitter's choice" }, cardA],
  },
  {
    name: 'off-list-prepend → synthetic submitter-choice card prepended (similarity 0, matchType null) ahead of the dup list',
    args: {
      submission: { original_lesson_id: 'lesson-x', submitterTargetLesson: offTarget },
      topDuplicates: [dupA],
      selectedSearchLesson: null,
    },
    expected: [
      {
        id: 'lesson-x',
        title: 'Cherry Cake',
        meta: 'Grades 5 · lesson-x',
        similarity: 0,
        matchType: null,
        matchLabel: "Submitter's choice",
      },
      cardA,
    ],
  },
  {
    name: 'reviewer-searched-append → reviewer search pick appended with "Reviewer searched" label when not already present',
    args: {
      submission: {},
      topDuplicates: [dupA],
      selectedSearchLesson: searchPick,
    },
    expected: [
      cardA,
      {
        id: 'lesson-s',
        title: 'Searched Lesson',
        meta: 'Grades K · lesson-s',
        similarity: 0,
        matchType: null,
        matchLabel: 'Reviewer searched',
      },
    ],
  },
];

describe('buildCandidateCards (duplicate-candidate card builder — 4 decision-panel branches)', () => {
  it.each(cases)('$name', ({ args, expected }) => {
    expect(buildCandidateCards(args)).toEqual(expected);
  });

  // Guard branch: no submission yet (still loading) → empty list, even if a
  // reviewer search pick is somehow set. Pinned to preserve the original
  // `if (!submission) return []` short-circuit.
  it('null submission → empty array (guard short-circuit)', () => {
    expect(
      buildCandidateCards({
        submission: null,
        topDuplicates: [],
        selectedSearchLesson: searchPick,
      })
    ).toEqual([]);
  });

  // Off-list target WITHOUT a loaded submitterTargetLesson → no synthetic
  // card; falls back to the raw dup list (the "lookup failed" path).
  it('off-list target but no loaded submitterTargetLesson → dup list as-is', () => {
    expect(
      buildCandidateCards({
        submission: { original_lesson_id: 'lesson-x', submitterTargetLesson: null },
        topDuplicates: [dupA],
        selectedSearchLesson: null,
      })
    ).toEqual([cardA]);
  });

  // Off-list target loaded but WITH null grade_levels → synthetic card is
  // still prepended; its meta uses the "Grades —" fallback. This is the
  // off-list path's OWN grade-format branch (distinct from the dup-list
  // mapping covered by dupB), so it needs its own coverage.
  it('off-list target with null grade_levels → "Grades —" in synthetic-card meta', () => {
    expect(
      buildCandidateCards({
        submission: {
          original_lesson_id: 'lesson-x',
          submitterTargetLesson: { ...offTarget, grade_levels: null },
        },
        topDuplicates: [],
        selectedSearchLesson: null,
      })
    ).toEqual([
      {
        id: 'lesson-x',
        title: 'Cherry Cake',
        meta: 'Grades — · lesson-x',
        similarity: 0,
        matchType: null,
        matchLabel: "Submitter's choice",
      },
    ]);
  });

  // Reviewer search pick that duplicates a card already in base → NOT
  // appended again (de-dup by lesson_id).
  it('reviewer search pick already present in base → not appended twice', () => {
    expect(
      buildCandidateCards({
        submission: {},
        topDuplicates: [dupA],
        selectedSearchLesson: {
          lesson_id: 'lesson-a',
          title: 'Apple Pie',
          grade_levels: ['3', '4'],
        },
      })
    ).toEqual([cardA]);
  });
});
