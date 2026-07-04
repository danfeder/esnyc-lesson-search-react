/**
 * FP5 Brief 3 (owner 2026-07-04): the 2026 template dropped
 * 'Social-Emotional Intelligence' as a Core Competency. The reviewer form must
 * not offer its pill for a lesson that doesn't already carry it — but a lesson
 * whose LOADED metadata carries it keeps the pill (and unticking it must not
 * make it vanish). These tests pin that rendering contract on the form itself.
 *
 * The group's accessible name is sentence-cased to 'Core competencies' (the
 * IntPillGroup ariaLabel) — scope every query to that group, case-exact, so a
 * stale label never silently matches the wrong control.
 */
import { describe, it, expect } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReviewMetadataForm, type ReviewMetadataInputIds } from './ReviewMetadataForm';
import type { ReviewMetadata } from '@/types';

const SEI = 'Social-Emotional Intelligence';

const inputIds: ReviewMetadataInputIds = {
  heritage: 'heritage',
  mainIngredients: 'main-ingredients',
  cookingSkills: 'cooking-skills',
  gardenSkills: 'garden-skills',
  observances: 'observances',
  culturalResponsiveness: 'cultural-responsiveness',
};

/** Controlled harness so untick/re-tick mutate real form state. */
function Harness({
  initialMetadata,
  showLegacySocialEmotionalIntelligence,
}: {
  initialMetadata: ReviewMetadata;
  showLegacySocialEmotionalIntelligence: boolean;
}) {
  const [metadata, setMetadata] = useState<ReviewMetadata>(initialMetadata);
  const errorBannerRef = useRef<HTMLDivElement | null>(null);
  return (
    <ReviewMetadataForm
      metadata={metadata}
      onChange={(key, value) => setMetadata((prev) => ({ ...prev, [key]: value }))}
      inputIds={inputIds}
      showCookingFields={false}
      showGardenFields={false}
      fieldProgress={{ completed: 0, total: 8 }}
      validationErrors={[]}
      errorBannerRef={errorBannerRef}
      legacyDecisionWarning={null}
      docTitleHint={null}
      summaryError={null}
      showLegacySocialEmotionalIntelligence={showLegacySocialEmotionalIntelligence}
    />
  );
}

const competencyGroup = () => screen.getByRole('group', { name: 'Core competencies' });

describe('ReviewMetadataForm — legacy Social-Emotional Intelligence pill (FP5 B3)', () => {
  it('new-lesson review (no SEI in loaded metadata): 5 competency pills, SEI absent', () => {
    render(<Harness initialMetadata={{}} showLegacySocialEmotionalIntelligence={false} />);

    expect(within(competencyGroup()).getAllByRole('button')).toHaveLength(5);
    expect(within(competencyGroup()).queryByRole('button', { name: SEI })).not.toBeInTheDocument();
  });

  it('reopened review carrying SEI: 6 pills incl. SEI pressed; untick keeps it visible + re-tickable', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initialMetadata={{ coreCompetencies: [SEI] }}
        showLegacySocialEmotionalIntelligence
      />
    );

    // Loaded with SEI → 6 pills, SEI present and pressed.
    expect(within(competencyGroup()).getAllByRole('button')).toHaveLength(6);
    expect(within(competencyGroup()).getByRole('button', { name: SEI })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Untick SEI → pill STAYS visible (still 6) and becomes unpressed (no
    // vanishing-checkbox undo trap; the flag is judged from loaded metadata).
    await user.click(within(competencyGroup()).getByRole('button', { name: SEI }));
    expect(within(competencyGroup()).getAllByRole('button')).toHaveLength(6);
    expect(within(competencyGroup()).getByRole('button', { name: SEI })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Re-tick works.
    await user.click(within(competencyGroup()).getByRole('button', { name: SEI }));
    expect(within(competencyGroup()).getByRole('button', { name: SEI })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
