import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDuplicates } from './AdminDuplicates';

// Mock the hooks and dependencies
vi.mock('@/hooks/useEnhancedAuth', () => ({
  useEnhancedAuth: vi.fn(() => ({
    user: { role: 'admin', id: 'test-user' },
  })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked modules for manipulation
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { supabase } from '@/lib/supabase';

const mockV3Report = {
  version: '3.0',
  categorizedGroups: {
    FORMATTING_ONLY: [
      {
        groupId: 'group_1',
        category: 'FORMATTING_ONLY',
        recommendedAction: 'auto_merge',
        confidence: 'high',
        lessonCount: 2,
        recommendedCanonical: 'lesson-001',
        lessons: [
          { lessonId: 'lesson-001', title: 'Garden to Table: Tomatoes' },
          { lessonId: 'lesson-002', title: 'Garden to Table: Tomatos' },
        ],
        similarityMatrix: {
          'lesson-001': { 'lesson-002': 0.99 },
          'lesson-002': { 'lesson-001': 0.99 },
        },
        insights: {
          keyDifferences: ['Typo in title'],
          commonElements: [],
          qualityIssues: [],
          pedagogicalNotes: [],
        },
      },
    ],
    GRADE_ADAPTATIONS: [
      {
        groupId: 'group_2',
        category: 'GRADE_ADAPTATIONS',
        recommendedAction: 'keep_all',
        confidence: 'high',
        lessonCount: 3,
        recommendedCanonical: ['lesson-003', 'lesson-004', 'lesson-005'],
        lessons: [
          { lessonId: 'lesson-003', title: 'Bread Making K-2' },
          { lessonId: 'lesson-004', title: 'Bread Making 3-5' },
          { lessonId: 'lesson-005', title: 'Bread Making 6-8' },
        ],
        similarityMatrix: {
          'lesson-003': { 'lesson-004': 0.85, 'lesson-005': 0.82 },
          'lesson-004': { 'lesson-003': 0.85, 'lesson-005': 0.88 },
          'lesson-005': { 'lesson-003': 0.82, 'lesson-004': 0.88 },
        },
        insights: {
          keyDifferences: ['Grade-level adaptations'],
          commonElements: [],
          qualityIssues: [],
          pedagogicalNotes: ['Grade-specific adaptations detected'],
        },
      },
    ],
    PEDAGOGICAL_VARIATIONS: [
      {
        groupId: 'group_3',
        category: 'PEDAGOGICAL_VARIATIONS',
        recommendedAction: 'split_group',
        confidence: 'low',
        lessonCount: 2,
        recommendedCanonical: ['lesson-006', 'lesson-007'],
        lessons: [
          { lessonId: 'lesson-006', title: 'Salsa Making - Traditional' },
          { lessonId: 'lesson-007', title: 'Salsa Making - Modern' },
        ],
        similarityMatrix: {
          'lesson-006': { 'lesson-007': 0.91 },
          'lesson-007': { 'lesson-006': 0.91 },
        },
        insights: {
          keyDifferences: [],
          commonElements: [],
          qualityIssues: [],
          pedagogicalNotes: ['Significant pedagogical differences'],
        },
      },
    ],
  },
};

const mockV2Report = {
  version: '2.0',
  groups: [
    {
      groupId: 'group_v2_1',
      type: 'near',
      similarityScore: 0.95,
      lessonCount: 2,
      recommendedCanonical: 'lesson-v2-001',
      lessons: [
        { lessonId: 'lesson-v2-001', title: 'V2 Lesson 1', isRecommendedCanonical: true },
        { lessonId: 'lesson-v2-002', title: 'V2 Lesson 2', isRecommendedCanonical: false },
      ],
    },
  ],
};

describe('AdminDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRouter = (initialEntries = ['/admin/duplicates']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AdminDuplicates />
      </MemoryRouter>
    );
  };

  describe('Access Control', () => {
    it('shows access denied message for non-admin users', async () => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'teacher', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      renderWithRouter();

      expect(
        screen.getByText(/you need admin privileges to access this page/i)
      ).toBeInTheDocument();
    });

    it('allows access for admin users', async () => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/duplicate resolution/i)).toBeInTheDocument();
      });
    });

    it('allows access for reviewer users', async () => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'reviewer', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/duplicate resolution/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton while fetching data', () => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      // Never resolve the fetch to keep loading state
      vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));

      renderWithRouter();

      // Check for loading skeleton elements
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when report fails to load', async () => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: false } as Response) // V3 fails
        .mockResolvedValueOnce({ ok: false } as Response); // V2 fails

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/error:/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: false } as Response)
        .mockResolvedValueOnce({ ok: false } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('V3 Report Loading', () => {
    beforeEach(() => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);
    });

    it('loads and displays V3 report data', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/garden to table: tomatoes/i)).toBeInTheDocument();
      });
    });

    it('displays category badges for V3 groups', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/formatting only/i)).toBeInTheDocument();
        expect(screen.getByText(/grade adaptations/i)).toBeInTheDocument();
      });
    });

    it('displays recommended action badges', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        // Use getAllByText since there are multiple occurrences (stats + badges)
        expect(screen.getAllByText(/auto-merge/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/keep all/i)).toBeInTheDocument();
        // "Split" appears in both stats and badges
        expect(screen.getAllByText(/split/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('V2 Report Fallback', () => {
    beforeEach(() => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);
    });

    it('falls back to V2 report when V3 fails', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: false } as Response) // V3 fails
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockV2Report),
        } as Response);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/v2 lesson 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    beforeEach(() => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);
    });

    it('displays total groups count', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Total groups
      });
    });

    it('displays auto-merge count', async () => {
      renderWithRouter();

      await waitFor(() => {
        // Look for the count in the stats area
        const autoMergeStat = screen.getByText('Auto-merge Safe').closest('div');
        expect(autoMergeStat).toHaveTextContent('1');
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);
    });

    it('has filter buttons for all, pending, and resolved', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /resolved/i })).toBeInTheDocument();
      });
    });

    it('filters groups when clicking filter buttons', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/garden to table: tomatoes/i)).toBeInTheDocument();
      });

      // Click "Resolved" filter
      fireEvent.click(screen.getByRole('button', { name: /resolved/i }));

      // With our mock data, no groups are resolved
      expect(screen.getByText(/no resolved duplicate groups found/i)).toBeInTheDocument();
    });

    it('shows all groups when clicking All filter', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/garden to table: tomatoes/i)).toBeInTheDocument();
      });

      // Click "All" filter
      fireEvent.click(screen.getByRole('button', { name: /all/i }));

      // Should show all groups
      expect(screen.getByText(/garden to table: tomatoes/i)).toBeInTheDocument();
      expect(screen.getByText(/bread making k-2/i)).toBeInTheDocument();
    });
  });

  describe('Group Cards', () => {
    beforeEach(() => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);
    });

    it('displays lesson count for each group', async () => {
      renderWithRouter();

      await waitFor(() => {
        // There are multiple groups with 2 lessons
        expect(screen.getAllByText(/2 lessons/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/3 lessons/i)).toBeInTheDocument();
      });
    });

    it('displays similarity percentage', async () => {
      renderWithRouter();

      await waitFor(() => {
        // The similarity score is calculated from the matrix
        expect(screen.getByText(/99% similar/i)).toBeInTheDocument();
      });
    });

    it('has review links for each group', async () => {
      renderWithRouter();

      await waitFor(() => {
        const reviewLinks = screen.getAllByRole('link', { name: /review/i });
        expect(reviewLinks.length).toBe(3);
      });
    });

    it('review links point to correct detail pages', async () => {
      renderWithRouter();

      await waitFor(() => {
        const reviewLinks = screen.getAllByRole('link', { name: /review/i });
        expect(reviewLinks[0]).toHaveAttribute('href', '/admin/duplicates/group_1');
      });
    });
  });

  describe('Resolved Groups', () => {
    beforeEach(() => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);
    });

    it('marks groups as resolved when found in database', async () => {
      // Mock supabase to return a resolved group
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() =>
          Promise.resolve({
            data: [{ group_id: 'group_1' }],
            error: null,
          })
        ),
      } as unknown as ReturnType<typeof supabase.from>);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);

      renderWithRouter();

      await waitFor(() => {
        // Check for resolved status - the text is split across elements
        const resolvedIndicator = screen.getByText('Resolved', { exact: false });
        expect(resolvedIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Success Message', () => {
    beforeEach(() => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);
    });

    it('displays success message from navigation state', async () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/admin/duplicates',
              state: { message: 'Duplicate group resolved successfully!' },
            },
          ]}
        >
          <AdminDuplicates />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/duplicate group resolved successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Confidence Indicators', () => {
    beforeEach(() => {
      vi.mocked(useEnhancedAuth).mockReturnValue({
        user: { role: 'admin', id: 'test-user' },
      } as ReturnType<typeof useEnhancedAuth>);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockV3Report),
      } as Response);
    });

    it('displays high confidence indicator', async () => {
      renderWithRouter();

      await waitFor(() => {
        // Multiple groups may have high confidence
        expect(screen.getAllByText('●●●').length).toBeGreaterThan(0);
      });
    });

    it('displays low confidence indicator', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('●○○')).toBeInTheDocument();
      });
    });
  });
});
