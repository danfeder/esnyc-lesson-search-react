import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IntLessonDetail } from './IntLessonDetail';
import { makeLesson } from '@/__tests__/helpers/factories';

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
