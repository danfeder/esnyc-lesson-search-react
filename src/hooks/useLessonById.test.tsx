import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase with a per-link chain so each step's arguments are assertable.
const maybeSingleMock = vi.fn();
const isMock = vi.fn((..._args: unknown[]) => ({ maybeSingle: () => maybeSingleMock() }));
const eqMock = vi.fn((..._args: unknown[]) => ({ is: isMock }));
const selectMock = vi.fn((..._args: unknown[]) => ({ eq: eqMock }));
const fromMock = vi.fn((..._args: unknown[]) => ({ select: selectMock }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

// Import after mocks
import { useLessonById } from '@/hooks/useLessonById';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useLessonById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
  });

  it('maps a snake_case row to the app Lesson shape', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        lesson_id: 'abc-123',
        title: 'Garden Salsa',
        summary: 'Make salsa from garden tomatoes.',
        file_link: 'https://docs.google.com/doc-1',
        grade_levels: ['3', '4'],
        metadata: { thematicCategories: ['Food Systems'], cookingSkills: ['Chopping'] },
      },
      error: null,
    });

    const { result } = renderHook(() => useLessonById('abc-123'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      lessonId: 'abc-123',
      title: 'Garden Salsa',
      summary: 'Make salsa from garden tomatoes.',
      fileLink: 'https://docs.google.com/doc-1',
      gradeLevels: ['3', '4'],
    });
    // Mapped through the shared normalizeMetadata (same as search rows).
    expect(result.current.data?.metadata.thematicCategories).toEqual(['Food Systems']);
    expect(result.current.data?.metadata.cookingSkills).toEqual(['Chopping']);
  });

  it('resolves null (not an error) for an unknown id', async () => {
    const { result } = renderHook(() => useLessonById('no-such-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('queries lessons by lesson_id AND excludes retired rows (retired-resurrection guard)', async () => {
    const { result } = renderHook(() => useLessonById('guard-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('lessons');
    expect(eqMock).toHaveBeenCalledWith('lesson_id', 'guard-1');
    // THE public-visibility pin: dropping .is('retired_at', null) would let
    // permalinks resurrect the 61 soft-retired duplicate lessons that the
    // search RPC deliberately hides.
    expect(isMock).toHaveBeenCalledWith('retired_at', null);
  });

  it('does not fetch when lessonId is null', async () => {
    const { result } = renderHook(() => useLessonById(null), { wrapper: createWrapper() });

    // Give any (wrong) fetch a chance to fire.
    await new Promise((r) => setTimeout(r, 0));
    expect(fromMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('does not fetch when enabled is false', async () => {
    const { result } = renderHook(() => useLessonById('present-in-results', { enabled: false }), {
      wrapper: createWrapper(),
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(fromMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('surfaces a supabase error as query error state', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: new Error('connection lost') });

    const { result } = renderHook(() => useLessonById('err-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('connection lost');
    expect(result.current.data).toBeUndefined();
  });
});
