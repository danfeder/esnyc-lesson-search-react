import { Loader2, ChevronRight, SkipForward, CheckCheck } from 'lucide-react';

interface ResolutionActionsProps {
  onKeepAll: () => void;
  onSkip: () => void;
  onSaveAndNext: () => void;
  isSubmitting: boolean;
  hasValidSelection: boolean;
  error?: string | null;
}

/**
 * Bottom action bar for the duplicate review page.
 * Provides Keep All, Skip, and Save & Next actions.
 */
export function ResolutionActions({
  onKeepAll,
  onSkip,
  onSaveAndNext,
  isSubmitting,
  hasValidSelection,
  error,
}: ResolutionActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left side: Keep All */}
        <button
          onClick={onKeepAll}
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          Keep All
        </button>

        {/* Right side: Skip and Save & Next */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </button>

          <button
            onClick={onSaveAndNext}
            disabled={isSubmitting || !hasValidSelection}
            className="inline-flex items-center px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
