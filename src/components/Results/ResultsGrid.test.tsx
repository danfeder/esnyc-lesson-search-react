import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsGrid } from './ResultsGrid';
import type { Lesson } from '@/types';

// Mock lesson factory
const createMockLesson = (id: string, title: string): Lesson => ({
  lessonId: id,
  title,
  summary: `Summary for ${title}`,
  fileLink: `https://docs.google.com/document/d/${id}`,
  gradeLevels: ['3', '4', '5'],
  metadata: {
    coreCompetencies: ['Environmental and Community Stewardship'],
    culturalHeritage: ['Mexican'],
    activityType: ['cooking'],
    lessonFormat: ['standalone'],
    thematicCategories: ['Nutrition'],
    seasonTiming: ['Fall'],
    locationRequirements: ['Indoor'],
    cookingSkills: ['chopping'],
    gardenSkills: [],
    cookingMethods: ['Stovetop'],
  },
  confidence: {
    overall: 0.9,
    title: 0.95,
    summary: 0.85,
    gradeLevels: 0.9,
  },
});

describe('ResultsGrid', () => {
  const mockOnLessonClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should render loading skeletons when isLoading is true', () => {
      render(<ResultsGrid lessons={[]} onLessonClick={mockOnLessonClick} isLoading={true} />);

      // Should render 6 skeleton cards with animate-pulse class
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(6);
    });

    it('should not render lessons when loading', () => {
      const lessons = [createMockLesson('1', 'Test Lesson')];
      render(<ResultsGrid lessons={lessons} onLessonClick={mockOnLessonClick} isLoading={true} />);

      expect(screen.queryByText('Test Lesson')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when lessons array is empty', () => {
      render(<ResultsGrid lessons={[]} onLessonClick={mockOnLessonClick} />);

      expect(screen.getByText('No lessons found')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search terms or filters to find more lessons.')
      ).toBeInTheDocument();
    });

    it('should render search emoji in empty state', () => {
      render(<ResultsGrid lessons={[]} onLessonClick={mockOnLessonClick} />);

      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('should not render loading skeletons in empty state', () => {
      render(<ResultsGrid lessons={[]} onLessonClick={mockOnLessonClick} />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(0);
    });
  });

  describe('Rendering Lessons', () => {
    it('should render lesson cards when lessons are provided', () => {
      const lessons = [
        createMockLesson('1', 'First Lesson'),
        createMockLesson('2', 'Second Lesson'),
      ];
      render(<ResultsGrid lessons={lessons} onLessonClick={mockOnLessonClick} />);

      expect(screen.getByText('First Lesson')).toBeInTheDocument();
      expect(screen.getByText('Second Lesson')).toBeInTheDocument();
    });

    it('should render correct number of lesson cards', () => {
      const lessons = [
        createMockLesson('1', 'Lesson 1'),
        createMockLesson('2', 'Lesson 2'),
        createMockLesson('3', 'Lesson 3'),
      ];
      render(<ResultsGrid lessons={lessons} onLessonClick={mockOnLessonClick} />);

      // Each lesson card has a View Plan link
      const viewPlanLinks = screen.getAllByRole('link', { name: /view.*plan/i });
      expect(viewPlanLinks.length).toBe(3);
    });

    it('should render lessons in a grid layout', () => {
      const lessons = [createMockLesson('1', 'Test Lesson')];
      const { container } = render(
        <ResultsGrid lessons={lessons} onLessonClick={mockOnLessonClick} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-1', 'lg:grid-cols-2');
    });
  });

  describe('User Interactions', () => {
    it('should call onLessonClick with correct lesson when card is clicked', async () => {
      const user = userEvent.setup();
      const lessons = [createMockLesson('test-id', 'Clickable Lesson')];
      render(<ResultsGrid lessons={lessons} onLessonClick={mockOnLessonClick} />);

      const lessonCard = screen.getByText('Clickable Lesson').closest('div');
      await user.click(lessonCard!);

      expect(mockOnLessonClick).toHaveBeenCalledTimes(1);
      expect(mockOnLessonClick).toHaveBeenCalledWith(
        expect.objectContaining({
          lessonId: 'test-id',
          title: 'Clickable Lesson',
        })
      );
    });

    it('should call onLessonClick with different lessons', async () => {
      const user = userEvent.setup();
      const lessons = [
        createMockLesson('id-1', 'First Lesson'),
        createMockLesson('id-2', 'Second Lesson'),
      ];
      render(<ResultsGrid lessons={lessons} onLessonClick={mockOnLessonClick} />);

      // Click first lesson
      const firstCard = screen.getByText('First Lesson').closest('div');
      await user.click(firstCard!);

      expect(mockOnLessonClick).toHaveBeenCalledWith(expect.objectContaining({ lessonId: 'id-1' }));

      // Click second lesson
      const secondCard = screen.getByText('Second Lesson').closest('div');
      await user.click(secondCard!);

      expect(mockOnLessonClick).toHaveBeenCalledWith(expect.objectContaining({ lessonId: 'id-2' }));
    });
  });

  describe('Accessibility', () => {
    it('should have proper grid structure', () => {
      const lessons = [createMockLesson('1', 'Test Lesson')];
      const { container } = render(
        <ResultsGrid lessons={lessons} onLessonClick={mockOnLessonClick} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('should render empty state with semantic heading', () => {
      render(<ResultsGrid lessons={[]} onLessonClick={mockOnLessonClick} />);

      const heading = screen.getByRole('heading', { name: /no lessons found/i });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Default Props', () => {
    it('should default isLoading to false', () => {
      const lessons = [createMockLesson('1', 'Test Lesson')];
      render(<ResultsGrid lessons={lessons} onLessonClick={mockOnLessonClick} />);

      // Should render lessons, not skeletons
      expect(screen.getByText('Test Lesson')).toBeInTheDocument();
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(0);
    });
  });
});
