/**
 * IntDuplicateCard — pins the T4b/D7/D11 plain-language match-label map and the
 * matchLabel override. The four DEFAULT_MATCH_LABELS strings are reviewer-facing
 * copy locked in the T4 design walkthrough; a silent regression back to the old
 * jargon ("Near-duplicate" for exact, etc.) is what this suite catches.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { IntDuplicateCard, type IntDuplicateMatchType } from './IntDuplicateCard';

function renderCard(matchType: IntDuplicateMatchType | null, matchLabel?: string) {
  return render(
    <IntDuplicateCard
      dup={{ id: 'l-1', title: 'Some Lesson', similarity: 0.87, matchType, matchLabel }}
      selected={false}
      onSelect={vi.fn()}
    />
  );
}

describe('IntDuplicateCard match labels (T4b/D11)', () => {
  it.each([
    ['exact', 'Identical copy'],
    ['high', 'Nearly identical'],
    ['medium', 'Very similar'],
    ['low', 'Some overlap'],
  ] as [IntDuplicateMatchType, string][])('%s → "%s"', (matchType, label) => {
    renderCard(matchType);
    expect(screen.getByText(label)).toBeInTheDocument();
    // The score % stays as small secondary text alongside the label.
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('an explicit matchLabel overrides the default map', () => {
    renderCard('high', "Submitter's choice");
    expect(screen.getByText("Submitter's choice")).toBeInTheDocument();
    expect(screen.queryByText('Nearly identical')).not.toBeInTheDocument();
  });

  it('no matchType → no label chip, score still renders', () => {
    renderCard(null);
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.queryByText(/identical|similar|overlap/i)).not.toBeInTheDocument();
  });
});
