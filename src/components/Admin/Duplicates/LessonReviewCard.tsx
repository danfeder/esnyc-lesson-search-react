import { ExternalLink, Check, AlertTriangle } from 'lucide-react';
import type { LessonForReview } from '@/services/duplicateGroupService';

export type Selection = { action: 'keep' } | { action: 'archive'; archiveTo: string };

interface LessonReviewCardProps {
  lesson: LessonForReview;
  selection: Selection;
  keptLessons: LessonForReview[];
  onSelectionChange: (selection: Selection) => void;
  onQuickKeep?: () => void;
}

/**
 * Card displaying a single lesson for review with Keep/Archive selector.
 * Shows lesson metadata and content preview to help admins decide.
 */
export function LessonReviewCard({
  lesson,
  selection,
  keptLessons,
  onSelectionChange,
  onQuickKeep,
}: LessonReviewCardProps) {
  const isKept = selection.action === 'keep';

  // Build dropdown options
  const archiveOptions = keptLessons.filter((l) => l.lesson_id !== lesson.lesson_id);

  const handleDropdownChange = (value: string) => {
    if (value === 'keep') {
      onSelectionChange({ action: 'keep' });
    } else {
      onSelectionChange({ action: 'archive', archiveTo: value });
    }
  };

  // Current dropdown value
  const dropdownValue = isKept ? 'keep' : selection.archiveTo;

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-colors ${
        isKept ? 'border-green-500 shadow-md' : 'border-gray-200'
      }`}
    >
      {/* Selection dropdown */}
      <div className="p-3 border-b border-gray-100">
        <select
          value={dropdownValue}
          onChange={(e) => handleDropdownChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-md border text-sm font-medium ${
            isKept
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-gray-50 border-gray-300 text-gray-700'
          }`}
        >
          <option value="keep">Keep</option>
          {archiveOptions.length > 0 && (
            <optgroup label="Archive to...">
              {archiveOptions.map((opt) => (
                <option key={opt.lesson_id} value={opt.lesson_id}>
                  Archive → {truncateTitle(opt.title, 30)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Lesson content - clickable for quick keep */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onQuickKeep}
        title="Click to keep only this lesson"
      >
        {/* Title */}
        <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{lesson.title}</h4>

        {/* Metadata indicators */}
        <div className="space-y-1 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-4">
            <span>{lesson.content_length.toLocaleString()} chars</span>
            {lesson.grade_levels && lesson.grade_levels.length > 0 && (
              <span>Grades: {lesson.grade_levels.join(', ')}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lesson.has_summary ? (
              <span className="inline-flex items-center text-green-600">
                <Check className="h-3.5 w-3.5 mr-1" />
                Has summary
              </span>
            ) : (
              <span className="inline-flex items-center text-gray-400">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                No summary
              </span>
            )}

            {lesson.has_table_format && (
              <span className="inline-flex items-center text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Table format
              </span>
            )}
          </div>
        </div>

        {/* Content preview */}
        {lesson.content_preview && (
          <p className="text-sm text-gray-500 line-clamp-3 mb-3">
            "{lesson.content_preview.trim()}..."
          </p>
        )}

        {/* Google Doc link */}
        {lesson.file_link && (
          <a
            href={lesson.file_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            Open Doc
            <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Truncate title for dropdown display
 */
function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 3) + '...';
}
