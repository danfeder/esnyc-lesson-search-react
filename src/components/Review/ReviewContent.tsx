import { Monitor, FileCode } from 'lucide-react';
import { FEATURES } from '@/utils/featureFlags';
import { GoogleDocEmbed } from './GoogleDocEmbed';
import { logger } from '@/utils/logger';

interface ReviewContentProps {
  submission: {
    google_doc_id: string;
    google_doc_url: string;
    extracted_content: string;
  };
  viewMode: 'embed' | 'text';
  setViewMode: (mode: 'embed' | 'text') => void;
}

export function ReviewContent({ submission, viewMode, setViewMode }: ReviewContentProps) {
  const handleSetViewMode = (mode: 'embed' | 'text') => {
    setViewMode(mode);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('reviewViewMode', mode);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Lesson Content</h2>
        {FEATURES.GOOGLE_DOC_EMBED && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetViewMode('embed')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'embed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="View in Google Docs editor"
            >
              <Monitor size={16} />
              <span className="text-sm">Editor View</span>
            </button>
            <button
              onClick={() => handleSetViewMode('text')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'text'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="View extracted text"
            >
              <FileCode size={16} />
              <span className="text-sm">Text View</span>
            </button>
          </div>
        )}
      </div>

      {/* Conditional rendering based on view mode and feature flag */}
      {FEATURES.GOOGLE_DOC_EMBED && viewMode === 'embed' ? (
        <GoogleDocEmbed
          docId={submission.google_doc_id}
          docUrl={submission.google_doc_url}
          height="calc(100vh - 16rem)"
          fallbackToText={() => handleSetViewMode('text')}
          onError={(error) => {
            logger.error('Google Doc embed error:', error.message);
          }}
        />
      ) : (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-gray-700 text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
            {submission.extracted_content}
          </pre>
        </div>
      )}
    </div>
  );
}
