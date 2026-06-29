import { type IntDuplicateMatchType } from '@/components/Internal';
import { type LessonSearchResult } from '@/components/LessonSearchPicker';
import { normalizeMatchType } from '@/pages/reviewDetailHelpers';

export interface SimilarityWithLesson {
  lesson_id: string;
  combined_score: number | null;
  match_type: string | null;
  title_similarity: number | null;
  content_similarity: number | null;
  lesson: {
    title: string | null;
    grade_levels: string[] | null;
    thematic_categories: string[] | null;
  };
}

// Shape of the off-list submitter-target lookup. lesson_id and title are
// non-null here because the construction site coalesces/guards before
// assigning — even though the underlying lessons_with_metadata view types
// both as nullable. If either is null in the row, the lookup is treated as
// failed (submitterTargetLesson stays null) and the banner falls into the
// "update with id but title couldn't be loaded" amber state.
export interface SubmitterTargetLesson {
  lesson_id: string;
  title: string;
  summary?: string | null;
  file_link?: string | null;
  grade_levels?: string[] | null;
  thematic_categories?: string[] | null;
}

// Shape of a single decision-panel duplicate card — already in
// IntDuplicateCard `dup` prop shape (id, title, meta, similarity,
// matchType, optional matchLabel for "Submitter's choice" / "Reviewer
// searched" badges). NOT raw SimilarityWithLesson — that mapping happens
// in buildCandidateCards.
export interface CandidateCard {
  id: string;
  title: string;
  meta: string;
  similarity: number;
  matchType: IntDuplicateMatchType | null;
  matchLabel: string | undefined;
}

// Minimal structural view of the submission this builder reads. The full
// SubmissionDetail (defined in useReviewSubmission.ts) is structurally assignable
// here, so the page can pass `submission` directly without this module
// depending on the page (which would be a circular import).
interface SubmissionForCards {
  original_lesson_id?: string;
  submitterTargetLesson?: SubmitterTargetLesson | null;
}

export interface BuildCandidateCardsArgs {
  submission: SubmissionForCards | null;
  /** Server orders by combined_score DESC; the top 5 similarities. */
  topDuplicates: SimilarityWithLesson[];
  /** Reviewer's search-escape-hatch pick, if any. */
  selectedSearchLesson: LessonSearchResult | null;
}

// Phase 8b: unified card list for the decision panel. Four cases composed
// as base + optional tail:
// (1) submitter target IS in dup list → hoist + "Submitter's choice";
// (2) submitter target is OFF-list → prepend synthetic card from
//     Task 3.1's off-list lookup; (3) no submitter target → dup list as-is.
// (4) Task 3.6: if reviewer searched and picked a lesson not already
//     present, append it with "Reviewer searched" badge.
// Shared grade-label formatter for the card `meta` line — kept local to this
// module (single use site cluster). Behavior-identical to the three inlined
// ternaries it replaced: a non-empty list → "Grades a, b"; null/empty → "Grades —".
function formatGrades(grades: string[] | null | undefined): string {
  return grades?.length ? `Grades ${grades.join(', ')}` : 'Grades —';
}

export function buildCandidateCards({
  submission,
  topDuplicates,
  selectedSearchLesson,
}: BuildCandidateCardsArgs): CandidateCard[] {
  if (!submission) return [];

  const fromDups = topDuplicates.map((d) => {
    const grades = formatGrades(d.lesson.grade_levels);
    return {
      id: d.lesson_id,
      title: d.lesson.title || 'Untitled',
      meta: `${grades} · ${d.lesson_id}`,
      similarity: d.combined_score ?? 0,
      matchType: normalizeMatchType(d.match_type),
      matchLabel: undefined as string | undefined,
    };
  });

  const submitterTargetId = submission.original_lesson_id ?? null;
  let base: typeof fromDups;

  if (!submitterTargetId) {
    base = fromDups;
  } else {
    // Case 1: target IS in the dup list — hoist + label.
    const inListIdx = fromDups.findIndex((c) => c.id === submitterTargetId);
    if (inListIdx >= 0) {
      const hoisted = { ...fromDups[inListIdx], matchLabel: "Submitter's choice" };
      base = [hoisted, ...fromDups.filter((_, i) => i !== inListIdx)];
    } else {
      // Case 2: target is OFF-list — prepend synthetic card from off-list
      // lookup (loaded by Task 3.1 into submission.submitterTargetLesson).
      const off = submission.submitterTargetLesson;
      if (off) {
        const grades = formatGrades(off.grade_levels);
        base = [
          {
            id: off.lesson_id,
            title: off.title || 'Untitled',
            meta: `${grades} · ${off.lesson_id}`,
            similarity: 0,
            matchType: null as IntDuplicateMatchType | null,
            matchLabel: "Submitter's choice" as string | undefined,
          },
          ...fromDups,
        ];
      } else {
        base = fromDups;
      }
    }
  }

  // Case 4 (Task 3.6): append reviewer's search-picked lesson if not
  // already present in base.
  if (selectedSearchLesson && !base.some((c) => c.id === selectedSearchLesson.lesson_id)) {
    const grades = formatGrades(selectedSearchLesson.grade_levels);
    return [
      ...base,
      {
        id: selectedSearchLesson.lesson_id,
        title: selectedSearchLesson.title,
        meta: `${grades} · ${selectedSearchLesson.lesson_id}`,
        similarity: 0,
        matchType: null as IntDuplicateMatchType | null,
        matchLabel: 'Reviewer searched' as string | undefined,
      },
    ];
  }

  return base;
}
