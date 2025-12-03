import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { DuplicateGroupForReview } from '@/services/duplicateGroupService';

interface DuplicateGroupCardProps {
  group: DuplicateGroupForReview;
  isResolved?: boolean;
}

/**
 * Card displaying a duplicate group summary in the list view.
 * Shows title, lesson count, confidence, and detection method.
 */
export function DuplicateGroupCard({ group, isResolved = false }: DuplicateGroupCardProps) {
  // Get primary title from first lesson
  const primaryTitle = group.lessons[0]?.title || 'Unknown';

  // Format detection method for display
  const detectionLabel = getDetectionLabel(group.detectionMethod, group.avgSimilarity);

  // Confidence indicator
  const confidenceLabel = group.confidence === 'high' ? 'High' : 'Medium';
  const confidenceColor =
    group.confidence === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <div
      className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
        isResolved ? 'opacity-60' : ''
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">{primaryTitle}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${confidenceColor}`}
            >
              {confidenceLabel} confidence
            </span>
            <span className="text-gray-500">{group.lessons.length} lessons</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{detectionLabel}</span>
            {isResolved && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-green-600 font-medium">Resolved</span>
              </>
            )}
          </div>
        </div>
        <Link
          to={`/admin/duplicates-new/${group.groupId}`}
          className="ml-4 inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          Review
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Format detection method for user-friendly display
 */
function getDetectionLabel(
  method: DuplicateGroupForReview['detectionMethod'],
  similarity: number | null
): string {
  const similarityStr = similarity ? ` (${Math.round(similarity * 100)}%)` : '';

  switch (method) {
    case 'both':
      return `Same title + Similar content${similarityStr}`;
    case 'same_title':
      return 'Same title';
    case 'embedding':
      return `Similar content${similarityStr}`;
    case 'mixed':
      return `Multiple signals${similarityStr}`;
    default:
      return 'Unknown';
  }
}
