import React, { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink, FileText } from 'lucide-react';

interface GoogleDocEmbedProps {
  docId: string;
  docUrl?: string;
  onError?: (error: Error) => void;
  height?: string;
  fallbackToText?: () => void;
}

export const GoogleDocEmbed: React.FC<GoogleDocEmbedProps> = ({
  docId,
  docUrl,
  onError,
  height = '600px',
  fallbackToText,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [iframeWidth, setIframeWidth] = useState<number>(0);
  const [shouldLoadIframe, setShouldLoadIframe] = useState(false);
  const [userReady, setUserReady] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    const error = new Error(
      'Failed to load Google Doc. You may not have permission to view this document.'
    );
    setError(error);
    setLoading(false);
    onError?.(error);
  };

  const openInGoogleDocs = () => {
    const url = docUrl || `https://docs.google.com/document/d/${docId}/edit`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Calculate zoom level based on container width
  // Google Docs default width is ~816px, we'll scale based on that
  const calculateZoom = (containerWidth: number) => {
    const googleDocsDefaultWidth = 816;
    const padding = 40; // Account for some padding
    const availableWidth = containerWidth - padding;
    const zoomLevel = Math.min((availableWidth / googleDocsDefaultWidth) * 100, 100);
    return Math.floor(zoomLevel);
  };

  // Check if user has previously opted to load Google Docs
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const hasUsedGoogleDocs = localStorage.getItem('hasUsedGoogleDocsEmbed');
      if (hasUsedGoogleDocs === 'true') {
        setUserReady(true);
        setShouldLoadIframe(true);
      }
    }
  }, []);

  // Set up resize observer to adjust zoom when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setIframeWidth(width);
      }
    });

    resizeObserver.observe(containerRef.current);

    // Initial measurement
    const initialWidth = containerRef.current.offsetWidth;
    setIframeWidth(initialWidth);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 rounded-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Document</h3>
        <p className="text-gray-600 text-center mb-6 max-w-md">{error.message}</p>
        <div className="flex gap-4">
          <button
            onClick={openInGoogleDocs}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Docs
          </button>
          {fallbackToText && (
            <button
              onClick={fallbackToText}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Show Text View
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleContinue = () => {
    setUserReady(true);
    setShouldLoadIframe(true);
    // Remember user's choice
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('hasUsedGoogleDocsEmbed', 'true');
    }
  };

  const zoomLevel = iframeWidth > 0 ? calculateZoom(iframeWidth) : 100;

  // Show the pre-flight screen if user hasn't opted in yet
  if (!userReady && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 rounded-lg">
        <div className="max-w-md text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View in Google Docs Editor</h3>
            <p className="text-gray-600 mb-4">
              This lesson is stored in Google Docs. You'll need to be signed in to your Google
              account to view and edit it.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              First time users may see a "Sign in" prompt from Google.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Continue to Google Docs
            </button>
            {fallbackToText && (
              <button
                onClick={fallbackToText}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View as Text
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4">We'll remember your choice for next time</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="space-y-4 w-full max-w-2xl px-8">
            {/* Google Docs-like loading skeleton */}
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            </div>
            <div className="h-64 bg-gray-100 rounded animate-pulse mt-6" />
            <div className="text-center text-sm text-gray-500 mt-4">Loading Google Doc...</div>
          </div>
        </div>
      )}
      <div className="relative overflow-hidden" style={{ height }}>
        {shouldLoadIframe && (
          <iframe
            src={`https://docs.google.com/document/d/${docId}/edit?embedded=true&rm=minimal&ui=2&chrome=false`}
            className={`border-0 ${loading ? 'invisible' : 'visible'}`}
            style={{
              height: `${100 / (zoomLevel / 100)}%`,
              width: `${100 / (zoomLevel / 100)}%`,
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
            }}
            onLoad={handleLoad}
            onError={handleError}
            title="Lesson Document"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        )}
      </div>
      {/* Always show the "Open in Google Docs" button for easy access */}
      <div className="mt-4 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {zoomLevel < 100 && `Scaled to ${zoomLevel}% to fit width`}
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem('hasUsedGoogleDocsEmbed');
                window.location.reload();
              }
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Reset Google Docs preferences"
          >
            Reset
          </button>
          <button
            onClick={openInGoogleDocs}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Docs
          </button>
        </div>
      </div>
    </div>
  );
};
