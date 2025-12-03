import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { DuplicateGroupForReview } from '@/services/duplicateGroupService';

interface DuplicateReviewHeaderProps {
  group: DuplicateGroupForReview;
  currentIndex: number;
  totalGroups: number;
}

/**
 * Header for the duplicate review detail page.
 * Shows back link, progress indicator, and detection info.
 */
export function DuplicateReviewHeader({
  group,
  currentIndex,
  totalGroups,
}: DuplicateReviewHeaderProps) {
  // Format detection method for display
  const detectionLabel = getDetectionLabel(group.detectionMethod, group.avgSimilarity);

  // Confidence styling
  const confidenceLabel = group.confidence === 'high' ? 'High' : 'Medium';
  const confidenceColor =
    group.confidence === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="mb-6">
      {/* Top row: back link and progress */}
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/admin/duplicates-new"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to list
        </Link>

        <div className="text-sm text-gray-600">
          Group{' '}
          <span className="font-semibold">
            {currentIndex + 1} of {totalGroups}
          </span>
        </div>
      </div>

      {/* Detection info bar */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${confidenceColor}`}
        >
          {confidenceLabel} confidence
        </span>

        <span className="text-gray-700">
          <span className="font-medium">Detected by:</span> {detectionLabel}
        </span>

        <span className="text-gray-500">{group.lessons.length} lessons in this group</span>
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
      return `Multiple detection methods${similarityStr}`;
    default:
      return 'Unknown';
  }
}
