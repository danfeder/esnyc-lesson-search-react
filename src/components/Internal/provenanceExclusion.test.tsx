/**
 * Drive provenance is DRAWER-ONLY (locked product decision 2): search-result
 * cards and list rows must never render creator names or Drive dates, even
 * when the lesson carries a full, safe provenance tuple.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IntCard } from './IntCard';
import { IntListRow } from './IntListRow';
import { makeLesson } from '@/__tests__/helpers/factories';

const lessonWithFullProvenance = makeLesson({
  driveMimeType: 'application/vnd.google-apps.document',
  driveCreatedAt: '2024-01-15T15:00:00.000Z',
  driveModifiedAt: '2026-03-02T15:00:00.000Z',
  driveCreatorName: 'Test Person',
  driveCreatorAttribution: 'created',
  driveCreatorSource: 'drive_activity',
});

const PROVENANCE_TEXT = /Created by|Adapted by|Added to Drive|Last updated|Test Person/;

describe('provenance never renders on search surfaces', () => {
  it('IntCard renders no provenance text or block', () => {
    const { container } = render(
      <IntCard lesson={lessonWithFullProvenance} selected={false} onClick={() => {}} />
    );
    expect(container.textContent).not.toMatch(PROVENANCE_TEXT);
    expect(container.querySelector('.int-detail-provenance')).toBeNull();
  });

  it('IntListRow renders no provenance text or block', () => {
    const { container } = render(
      <IntListRow lesson={lessonWithFullProvenance} selected={false} onClick={() => {}} />
    );
    expect(container.textContent).not.toMatch(PROVENANCE_TEXT);
    expect(container.querySelector('.int-detail-provenance')).toBeNull();
  });
});
