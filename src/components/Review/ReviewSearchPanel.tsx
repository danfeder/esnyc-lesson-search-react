import { LessonSearchPicker, type LessonSearchResult } from '@/components/LessonSearchPicker';

interface ReviewSearchPanelProps {
  /** Whether the collapsible picker is expanded. */
  showSearch: boolean;
  /** Toggles `showSearch` (wraps the page's `setShowSearch((v) => !v)`). */
  onToggle: () => void;
  /** Contextual help text shown above the picker (derived in the page). */
  searchHelpText: string;
  selectedSearchLesson: LessonSearchResult | null;
  setSelectedSearchLesson: (l: LessonSearchResult | null) => void;
  selectedDuplicate: string | null;
  setSelectedDuplicate: (id: string | null) => void;
  setSaveError: (e: string | null) => void;
}

/**
 * Phase 8b Task 3.6: search escape hatch — a collapsible LessonSearchPicker the
 * reviewer can open to override the submitter's pick or find a target the
 * submitter couldn't. Collapsed by default; the page auto-expands it for the
 * (update, null) and zero-candidate cases via useSearchEscapeHatch. Lifted
 * verbatim from ReviewDetail (Wave 5 PR-1b Task 1b.2) — markup byte-identical.
 */
export function ReviewSearchPanel({
  showSearch,
  onToggle,
  searchHelpText,
  selectedSearchLesson,
  setSelectedSearchLesson,
  selectedDuplicate,
  setSelectedDuplicate,
  setSaveError,
}: ReviewSearchPanelProps) {
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onToggle}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        {showSearch ? '− Hide library search' : '+ Search the library for a different lesson'}
      </button>
      {showSearch && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">{searchHelpText}</p>
          {/* Intentionally NOT passing excludeRetired so the
              reviewer can find retired competitors during dup-review
              escape-hatch search (e.g., "this submission is a
              re-import of retired Stone Soup"). Submitter flows
              (RevisingSubmissionForm) opt in via excludeRetired;
              reviewer flows leave the default false. */}
          <LessonSearchPicker
            selected={selectedSearchLesson}
            onSelect={(l) => {
              setSelectedSearchLesson(l);
              setSelectedDuplicate(l.lesson_id);
              setSaveError(null);
            }}
            onClear={() => {
              // Capture the cleared id BEFORE resetting state to avoid
              // a stale-read race between the two setters.
              const clearedId = selectedSearchLesson?.lesson_id ?? null;
              setSelectedSearchLesson(null);
              if (clearedId && selectedDuplicate === clearedId) {
                setSelectedDuplicate(null);
              }
            }}
            cantFindOption={false}
          />
        </div>
      )}
    </div>
  );
}
