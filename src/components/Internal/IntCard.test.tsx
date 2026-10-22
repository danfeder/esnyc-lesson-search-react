import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Lesson } from '@/types';
import { makeLesson } from '@/__tests__/helpers/factories';
import { IntCard } from './IntCard';
import { intMetaSegments } from './IntListRow';

function lessonWith(metadata: Partial<Lesson['metadata']>): Lesson {
  const base = makeLesson();
  return { ...base, metadata: { ...base.metadata, ...metadata } };
}

// Sample 3 from the row-labels design pass (facts §3): a Cook lesson with
// year-round timing, group+specific ingredients and three heritage values.
const cookLesson = lessonWith({
  activityType: ['cooking'],
  seasonTiming: ['Fall', 'Winter', 'Spring', 'Summer'],
  thematicCategories: ['Food Systems', 'Food Justice', 'Seed to Table'],
  culturalHeritage: ['African American', 'Black culinary history', 'Southern United States'],
  mainIngredients: ['Black-eyed peas', 'Rice', 'Sweet potatoes', 'Beans & legumes', 'Alliums'],
});

describe('IntCard footer (row labels 2026-10-21 — same segments as the list row)', () => {
  it('shows the seasons, what and heritage segments from intMetaSegments', () => {
    const { container } = render(
      <IntCard lesson={cookLesson} selected={false} onClick={() => {}} />
    );
    const footer = container.querySelector('.int-card-meta');
    expect(footer).not.toBeNull();
    const segments = intMetaSegments(cookLesson);
    expect(segments).toEqual([
      'Year-round',
      'Black-eyed peas, Rice, Sweet potatoes',
      'Black culinary history, Southern United States',
    ]);
    for (const segment of segments) expect(screen.getByText(segment)).toBeInTheDocument();
  });

  it('separates card segments with a dot (one fewer dot than segments, none dangling)', () => {
    const { container } = render(
      <IntCard lesson={cookLesson} selected={false} onClick={() => {}} />
    );
    expect(container.querySelectorAll('.int-card-meta .dot')).toHaveLength(
      intMetaSegments(cookLesson).length - 1
    );
    // Each dot is bound to the segment it precedes (same flex item) — see IntListRow.
    const cookSegments = intMetaSegments(cookLesson);
    container.querySelectorAll('.int-card-meta .dot').forEach((dot, i) => {
      expect(dot.parentElement?.textContent).toBe(`·${cookSegments[i + 1]}`);
    });
    const single = lessonWith({ seasonTiming: ['Spring'] });
    const { container: c2 } = render(
      <IntCard lesson={single} selected={false} onClick={() => {}} />
    );
    expect(c2.querySelectorAll('.int-card-meta .dot')).toHaveLength(0);
    expect(c2.querySelector('.int-card-meta')?.textContent).toBe('Spring');
  });

  it('shows no theme text on the card', () => {
    render(<IntCard lesson={cookLesson} selected={false} onClick={() => {}} />);
    expect(screen.queryByText('Food Systems')).not.toBeInTheDocument();
    expect(screen.queryByText('Food Justice')).not.toBeInTheDocument();
    expect(screen.queryByText('Seed to Table')).not.toBeInTheDocument();
  });

  it('renders no footer at all when the lesson has no segments', () => {
    const { container } = render(
      <IntCard lesson={makeLesson()} selected={false} onClick={() => {}} />
    );
    expect(container.querySelector('.int-card-meta')).toBeNull();
  });
});
