import { useCallback, useState } from 'react';
import { GoogleDocEmbed } from '@/components/Review/GoogleDocEmbed';
import { IntDocFrame } from '@/components/Internal';
import { FEATURES } from '@/utils/featureFlags';
import { logger } from '@/utils/logger';
import { sanitizeContent } from '@/utils/sanitize';

interface ReviewDocPanelProps {
  /** Submission display title — derives the `.gdoc` file name shown in the frame head. */
  headerTitle: string;
  googleDocUrl: string;
  googleDocId: string;
  extractedContent: string;
}

/**
 * MIDDLE column of the reviewer screen: the Google-Doc embed vs extracted-text
 * toggle. Owns its `viewMode` state and persists the reviewer's choice to
 * localStorage under the `reviewViewMode` key (default `embed` when the embed
 * feature flag is on; forced `text` when it's off).
 */
export function ReviewDocPanel({
  headerTitle,
  googleDocUrl,
  googleDocId,
  extractedContent,
}: ReviewDocPanelProps) {
  const [viewMode, setViewMode] = useState<'embed' | 'text'>(() => {
    if (!FEATURES.GOOGLE_DOC_EMBED) return 'text';
    if (typeof window !== 'undefined' && window.localStorage) {
      return (window.localStorage.getItem('reviewViewMode') as 'embed' | 'text') || 'embed';
    }
    return 'embed';
  });

  const handleSetViewMode = useCallback((mode: 'embed' | 'text') => {
    setViewMode(mode);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('reviewViewMode', mode);
    }
  }, []);

  return (
    <div>
      <IntDocFrame
        fileName={`${headerTitle.toLowerCase().replace(/\s+/g, '-')}.gdoc`}
        externalHref={googleDocUrl}
        toggle={
          FEATURES.GOOGLE_DOC_EMBED
            ? {
                options: [
                  { value: 'embed', label: 'Doc' },
                  { value: 'text', label: 'Text' },
                ],
                value: viewMode,
                onChange: (v) => handleSetViewMode(v as 'embed' | 'text'),
              }
            : undefined
        }
        padded={viewMode === 'text'}
      >
        {FEATURES.GOOGLE_DOC_EMBED && viewMode === 'embed' ? (
          <GoogleDocEmbed
            docId={googleDocId}
            docUrl={googleDocUrl}
            height="calc(100vh - 18rem)"
            fallbackToText={() => handleSetViewMode('text')}
            onError={(error) => {
              logger.error('Google Doc embed error:', error.message);
            }}
          />
        ) : (
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--esy-font-body)',
              fontSize: 14,
              color: 'var(--color-esy-ink)',
              margin: 0,
            }}
          >
            {sanitizeContent(extractedContent)}
          </pre>
        )}
      </IntDocFrame>
    </div>
  );
}
