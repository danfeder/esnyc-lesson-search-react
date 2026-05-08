import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonSearchPicker } from '@/components/LessonSearchPicker';

// Mock chain shape: from → select → ilike → [is when excludeRetired=true] →
// order → limit. `is` is included so the chain resolves regardless of
// excludeRetired value (component conditionally invokes it).
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            lesson_id: 'lesson_1',
            title: 'Apple Crisp Lesson',
            grade_levels: ['3', '4'],
            season_timing: ['Fall'],
          },
          {
            lesson_id: 'lesson_2',
            title: 'Pumpkin Pie Math',
            grade_levels: ['5'],
            season_timing: ['Fall'],
          },
        ],
        error: null,
      }),
    })),
  },
}));

describe('LessonSearchPicker', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { supabase } = await import('@/lib/supabase');
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            lesson_id: 'lesson_1',
            title: 'Apple Crisp Lesson',
            grade_levels: ['3', '4'],
            season_timing: ['Fall'],
          },
          {
            lesson_id: 'lesson_2',
            title: 'Pumpkin Pie Math',
            grade_levels: ['5'],
            season_timing: ['Fall'],
          },
        ],
        error: null,
      }),
    }));
  });

  it('renders empty state with placeholder + example', () => {
    render(<LessonSearchPicker selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByPlaceholderText(/search by lesson title/i)).toBeInTheDocument();
    expect(screen.getByText(/three sisters/i)).toBeInTheDocument();
  });

  it('debounces input and queries lessons after typing', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LessonSearchPicker selected={null} onSelect={onSelect} onClear={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'apple');
    await waitFor(() => expect(screen.getByText('Apple Crisp Lesson')).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it('calls onSelect when a result card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<LessonSearchPicker selected={null} onSelect={onSelect} onClear={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'apple');
    await waitFor(() => screen.getByText('Apple Crisp Lesson'));
    await user.click(screen.getByText('Apple Crisp Lesson'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ lesson_id: 'lesson_1', title: 'Apple Crisp Lesson' })
    );
  });

  it('renders a chip with × clear when selected is non-null', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <LessonSearchPicker
        selected={{ lesson_id: 'lesson_1', title: 'Apple Crisp Lesson' }}
        onSelect={vi.fn()}
        onClear={onClear}
      />
    );

    expect(screen.getByText(/apple crisp lesson/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/clear selected lesson/i));
    expect(onClear).toHaveBeenCalled();
  });

  it("renders can't-find affordance after any query when cantFindOption=true (zero-results case)", async () => {
    const { supabase } = await import('@/lib/supabase');
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const user = userEvent.setup();
    const onCantFind = vi.fn();
    render(
      <LessonSearchPicker
        selected={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        cantFindOption
        onCantFind={onCantFind}
      />
    );

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'nonsense');
    await waitFor(() => screen.getByText(/can't find it/i));
    await user.click(screen.getByText(/can't find it/i));
    expect(onCantFind).toHaveBeenCalled();
  });

  it("renders can't-find affordance after a query that returns irrelevant matches (non-zero results)", async () => {
    const user = userEvent.setup();
    const onCantFind = vi.fn();
    render(
      <LessonSearchPicker
        selected={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        cantFindOption
        onCantFind={onCantFind}
      />
    );

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'soil');
    await waitFor(() => screen.getByText('Apple Crisp Lesson'));
    await waitFor(() => screen.getByText(/can't find it/i));
    await user.click(screen.getByText(/can't find it/i));
    expect(onCantFind).toHaveBeenCalled();
  });

  it("does not render can't-find affordance before any query (initial state)", async () => {
    const onCantFind = vi.fn();
    render(
      <LessonSearchPicker
        selected={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        cantFindOption
        onCantFind={onCantFind}
      />
    );
    expect(screen.queryByText(/can't find it/i)).not.toBeInTheDocument();
  });

  it('discards stale response when input is cleared mid-flight', async () => {
    const { supabase } = await import('@/lib/supabase');
    let resolveSearch!: (value: {
      data: Array<{
        lesson_id: string;
        title: string;
        grade_levels: string[];
        season_timing: string[];
      }>;
      error: null;
    }) => void;
    const searchPromise = new Promise<{
      data: Array<{
        lesson_id: string;
        title: string;
        grade_levels: string[];
        season_timing: string[];
      }>;
      error: null;
    }>((resolve) => {
      resolveSearch = resolve;
    });

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(searchPromise),
    }));

    const user = userEvent.setup();
    render(<LessonSearchPicker selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);

    const input = screen.getByPlaceholderText(/search by lesson title/i);
    await user.type(input, 'apple');
    await waitFor(() => expect(supabase.from).toHaveBeenCalled(), { timeout: 1000 });

    await user.clear(input);

    await act(async () => {
      resolveSearch({
        data: [
          {
            lesson_id: 'lesson_1',
            title: 'Apple Crisp Lesson',
            grade_levels: ['3'],
            season_timing: ['Fall'],
          },
        ],
        error: null,
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('Apple Crisp Lesson')).not.toBeInTheDocument();
    });
  });

  it("does not render can't-find option when cantFindOption=false", async () => {
    const user = userEvent.setup();
    render(
      <LessonSearchPicker
        selected={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        cantFindOption={false}
      />
    );
    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'nonsense');
    await waitFor(() => {}, { timeout: 500 });
    expect(screen.queryByText(/can't find it/i)).not.toBeInTheDocument();
  });

  it('applies retired_at IS NULL filter when excludeRetired=true (PR 4)', async () => {
    const { supabase } = await import('@/lib/supabase');
    const isMock = vi.fn().mockReturnThis();
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: isMock,
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const user = userEvent.setup();
    render(
      <LessonSearchPicker
        selected={null}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        excludeRetired
      />
    );

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'apple');
    await waitFor(() => expect(isMock).toHaveBeenCalledWith('retired_at', null), {
      timeout: 1000,
    });
  });

  it('does NOT apply retired_at filter when excludeRetired is unset (default false)', async () => {
    const { supabase } = await import('@/lib/supabase');
    const isMock = vi.fn().mockReturnThis();
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: isMock,
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const user = userEvent.setup();
    render(<LessonSearchPicker selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search by lesson title/i), 'apple');
    // Wait for the debounced query to fire by waiting for `from` to be called.
    await waitFor(() => expect(supabase.from).toHaveBeenCalled(), { timeout: 1000 });
    expect(isMock).not.toHaveBeenCalled();
  });
});
