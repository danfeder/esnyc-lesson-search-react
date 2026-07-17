import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { Lesson } from '@/types';
import { IntLessonDetail } from './IntLessonDetail';
import { makeLesson } from '@/__tests__/helpers/factories';

function lessonWith(
  metadata: Partial<Lesson['metadata']>,
  overrides: Partial<Lesson> = {}
): Lesson {
  const base = makeLesson(overrides);
  return { ...base, metadata: { ...base.metadata, ...metadata } };
}

// jsdom has no navigator.clipboard — define a controllable stand-in (D2 §5).
const writeTextMock = vi.fn();

describe('IntLessonDetail copy-link (D2)', () => {
  beforeEach(() => {
    writeTextMock.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies the BARE encoded permalink and flips the label to Copied', async () => {
    // An id needing encoding proves encodeURIComponent is applied.
    const lesson = makeLesson({ lessonId: 'salsa lesson/1', title: 'Salsa' });
    render(<IntLessonDetail lesson={lesson} />);

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^copied$/i })).toBeInTheDocument();
    });
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(
      `${window.location.origin}/lesson/${encodeURIComponent('salsa lesson/1')}`
    );
    // Bare permalink: no query string rides along.
    expect(String(writeTextMock.mock.calls[0][0])).not.toContain('?');
  });

  it('reverts the label to Copy link after 2 seconds', async () => {
    vi.useFakeTimers();
    const lesson = makeLesson({ lessonId: 'timer-1' });
    render(<IntLessonDetail lesson={lesson} />);

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));
    // Flush the awaited clipboard promise (microtask — not faked by vi timers).
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: /^copied$/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('shows Copy failed when the clipboard write rejects', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('denied'));
    const lesson = makeLesson({ lessonId: 'fail-1' });
    render(<IntLessonDetail lesson={lesson} />);

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy failed/i })).toBeInTheDocument();
    });
  });

  it('renders the copy button even when the lesson has no doc link', () => {
    const lesson = makeLesson({ lessonId: 'no-doc-1', fileLink: '' });
    render(<IntLessonDetail lesson={lesson} />);

    expect(screen.queryByRole('link', { name: /open lesson plan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });
});

describe('IntLessonDetail meta display (FP-16)', () => {
  it('renders Cooking Methods through friendly labels, not raw kebab', () => {
    const lesson = lessonWith({ cookingMethods: ['basic-prep', 'stovetop'] });
    render(<IntLessonDetail lesson={lesson} />);

    expect(screen.getByText('Basic prep')).toBeInTheDocument();
    expect(screen.getByText('Stovetop')).toBeInTheDocument();
    expect(screen.queryByText('basic-prep')).not.toBeInTheDocument();
  });

  it('collapses an ancestor heritage chain to the leaf under a "Cultural Heritage" label', () => {
    const lesson = lessonWith({ culturalHeritage: ['Asian', 'East Asian', 'Chinese'] });
    render(<IntLessonDetail lesson={lesson} />);

    expect(screen.getByText('Cultural Heritage')).toBeInTheDocument();
    expect(screen.getByText('Chinese')).toBeInTheDocument();
    expect(screen.queryByText('East Asian')).not.toBeInTheDocument();
    // "Asian" must not survive as its own tag (it's an ancestor of Chinese).
    expect(screen.queryByText('Asian')).not.toBeInTheDocument();
  });

  it('renders the Grades meta row in canonical order', () => {
    const lesson = lessonWith({}, { gradeLevels: ['1', '2', '3', 'K'] });
    render(<IntLessonDetail lesson={lesson} />);

    const tags = screen.getAllByText(/^(3K|PK|K|[1-8])$/).map((el) => el.textContent);
    // The eyebrow renders "K–3"; the meta row renders each grade sorted.
    expect(tags).toEqual(['K', '1', '2', '3']);
  });
});

describe('IntLessonDetail Drive provenance block', () => {
  const NATIVE = 'application/vnd.google-apps.document';
  const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const nativeWithCreator: Partial<Lesson> = {
    driveMimeType: NATIVE,
    driveCreatedAt: '2024-01-15T15:00:00.000Z',
    driveModifiedAt: '2026-03-02T15:00:00.000Z',
    driveCreatorName: 'Test Person',
    driveCreatorAttribution: 'created',
    driveCreatorSource: 'drive_activity',
  };

  it('renders creator, Created date, and Last updated for a safe native doc', () => {
    render(<IntLessonDetail lesson={makeLesson(nativeWithCreator)} />);
    expect(screen.getByText(/Created by Test Person/)).toBeInTheDocument();
    expect(screen.getByText(/Created Jan 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Last updated Mar 2, 2026/)).toBeInTheDocument();
  });

  it('renders "Adapted by" for a reviewer-confirmed adapted attribution', () => {
    render(
      <IntLessonDetail
        lesson={makeLesson({
          ...nativeWithCreator,
          driveCreatorAttribution: 'adapted',
          driveCreatorSource: 'reviewer_confirmed',
        })}
      />
    );
    expect(screen.getByText(/Adapted by Test Person/)).toBeInTheDocument();
    expect(screen.queryByText(/Created by/)).not.toBeInTheDocument();
  });

  it('renders "Added to Drive" (never "Created") for an imported Word file, and no creator', () => {
    render(
      <IntLessonDetail
        lesson={makeLesson({
          driveMimeType: WORD,
          driveCreatedAt: '2023-05-05T12:00:00.000Z',
          driveModifiedAt: '2024-06-06T12:00:00.000Z',
          // Even a fully-populated creator tuple must not render on a
          // non-native file (defense in depth — DB constraints forbid this
          // state, but the UI still refuses it).
          driveCreatorName: 'Test Person',
          driveCreatorAttribution: 'created',
          driveCreatorSource: 'drive_activity',
        })}
      />
    );
    expect(screen.getByText(/Added to Drive May 5, 2023/)).toBeInTheDocument();
    expect(screen.queryByText(/Created by/)).not.toBeInTheDocument();
    expect(screen.getByText(/Last updated Jun 6, 2024/)).toBeInTheDocument();
  });

  it('omits the created/added line when MIME is missing but still shows Last updated', () => {
    render(
      <IntLessonDetail
        lesson={makeLesson({
          driveCreatedAt: '2023-05-05T12:00:00.000Z',
          driveModifiedAt: '2024-06-06T12:00:00.000Z',
        })}
      />
    );
    expect(screen.queryByText(/Created /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Added to Drive/)).not.toBeInTheDocument();
    expect(screen.getByText(/Last updated Jun 6, 2024/)).toBeInTheDocument();
  });

  it.each([
    ['unsafe name (email)', { driveCreatorName: 'x@example.org' }],
    ['missing source', { driveCreatorSource: undefined }],
    ['unknown source', { driveCreatorSource: 'guessed' as never }],
    ['missing attribution', { driveCreatorAttribution: undefined }],
  ])('hides the creator line on %s', (_label, overrides) => {
    render(<IntLessonDetail lesson={makeLesson({ ...nativeWithCreator, ...overrides })} />);
    expect(screen.queryByText(/Created by|Adapted by/)).not.toBeInTheDocument();
    // Dates still render — only the creator is withheld.
    expect(screen.getByText(/Last updated Mar 2, 2026/)).toBeInTheDocument();
  });

  it('renders no provenance block at all when the lesson has no Drive metadata', () => {
    const { container } = render(<IntLessonDetail lesson={makeLesson({})} />);
    expect(container.querySelector('.int-detail-provenance')).not.toBeInTheDocument();
  });
});
