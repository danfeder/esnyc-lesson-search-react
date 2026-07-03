import type { ReactNode } from 'react';
import { IntAlert } from './IntAlert';
import { IntButton } from './IntButton';

interface IntFetchErrorProps {
  /** Plain-language description of what failed, e.g. "Couldn't load the review queue." */
  children: ReactNode;
  onRetry: () => void;
  retryLabel?: string;
}

/**
 * Honest-error card for failed fetches (FP-05/FP-07): an error alert plus a
 * Retry button, so a failed load is never presented as a legitimate empty
 * state. Mirrors the duplicate-cards retry banner precedent in
 * ReviewDecisionPanel.
 */
export function IntFetchError({ children, onRetry, retryLabel = 'Retry' }: IntFetchErrorProps) {
  return (
    <div>
      <IntAlert variant="error">{children}</IntAlert>
      <div className="mt-3">
        <IntButton variant="primary" onClick={onRetry}>
          {retryLabel}
        </IntButton>
      </div>
    </div>
  );
}
