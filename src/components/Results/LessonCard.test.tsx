import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonCard } from './LessonCard';
import type { Lesson } from '@/types';

// Mock lesson factory
const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  lessonId: 'test-lesson-1',
  title: 'Test Lesson Title',
  summary: 'This is a test lesson summary that describes what the lesson is about.',
  fileLink: 'https://docs.google.com/document/d/test',
  gradeLevels: ['3', '4', '5'],
  metadata: {
    coreCompetencies: ['Environmental and Community Stewardship'],
    culturalHeritage: ['Mexican'],
    activityType: ['cooking'],
    lessonFormat: 'standalone',
    thematicCategories: ['Nutrition'],
    seasonTiming: ['Fall'],
    locationRequirements: ['Indoor'],
    cookingSkills: ['chopping'],
    gardenSkills: [],
    cookingMethods: ['Stovetop'],
    ...overrides.metadata,
  },
  confidence: {
    overall: 0.9,
    title: 0.95,
    summary: 0.85,
    gradeLevels: 0.9,
    ...overrides.confidence,
  },
  ...overrides,
});

describe('LessonCard', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render lesson title', () => {
      const lesson = createMockLesson({ title: 'My Amazing Lesson' });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('My Amazing Lesson')).toBeInTheDocument();
    });

    it('should render lesson summary', () => {
      const lesson = createMockLesson({ summary: 'A great summary' });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('A great summary')).toBeInTheDocument();
    });

    it('should render grade levels', () => {
      const lesson = createMockLesson({ gradeLevels: ['K', '1', '2'] });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('K, 1, 2')).toBeInTheDocument();
    });

    it('should truncate grade levels when more than 3', () => {
      const lesson = createMockLesson({ gradeLevels: ['K', '1', '2', '3', '4'] });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('K, 1, 2...')).toBeInTheDocument();
    });

    it('should render location when present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          locationRequirements: ['Indoor', 'Outdoor'],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Indoor, Outdoor')).toBeInTheDocument();
    });

    it('should not render location when not present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          locationRequirements: [],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.queryByText('Indoor')).not.toBeInTheDocument();
    });
  });

  describe('Activity Type Display', () => {
    it('should show Cooking Only for lessons with only cooking skills', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          cookingSkills: ['chopping', 'mixing'],
          gardenSkills: [],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Cooking Only')).toBeInTheDocument();
    });

    it('should show Garden Only for lessons with only garden skills', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          cookingSkills: [],
          gardenSkills: ['planting', 'weeding'],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Garden Only')).toBeInTheDocument();
    });

    it('should show Cooking + Garden for lessons with both skills', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          cookingSkills: ['chopping'],
          gardenSkills: ['planting'],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Cooking + Garden')).toBeInTheDocument();
    });

    it('should show Academic Only for lessons with neither cooking nor garden skills', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          cookingSkills: [],
          gardenSkills: [],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Academic Only')).toBeInTheDocument();
    });
  });

  describe('Cooking Methods', () => {
    it('should display cooking methods when present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          cookingMethods: ['Stovetop', 'Oven'],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Stovetop, Oven')).toBeInTheDocument();
    });

    it('should display No-cook indicator for no-cook lessons', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          cookingMethods: ['No-cook'],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('No-cook')).toBeInTheDocument();
    });
  });

  describe('Tags Display', () => {
    it('should display season tag', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          seasonTiming: ['Fall'],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Fall')).toBeInTheDocument();
    });

    it('should display thematic category tag', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          thematicCategories: ['Nutrition'],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Nutrition')).toBeInTheDocument();
    });

    it('should display cultural heritage tag', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: ['Mexican'],
          activityType: [],
          lessonFormat: '',
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('Mexican')).toBeInTheDocument();
    });

    it('should show +X more indicator when there are many tags', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: ['Mexican', 'Italian'],
          activityType: [],
          lessonFormat: '',
          seasonTiming: ['Fall', 'Winter'],
          thematicCategories: ['Nutrition', 'Food Systems'],
        },
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      expect(screen.getByText('+3 more')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson();
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      const card = screen.getByText('Test Lesson Title').closest('div');
      await user.click(card!);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when View Plan link is clicked', async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson();
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      const viewPlanLink = screen.getByRole('link', { name: /view.*plan/i });
      await user.click(viewPlanLink);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should have correct href on View Plan link', () => {
      const lesson = createMockLesson({
        fileLink: 'https://example.com/lesson',
      });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      const viewPlanLink = screen.getByRole('link', { name: /view.*plan/i });
      expect(viewPlanLink).toHaveAttribute('href', 'https://example.com/lesson');
    });

    it('should open View Plan link in new tab', () => {
      const lesson = createMockLesson();
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      const viewPlanLink = screen.getByRole('link', { name: /view.*plan/i });
      expect(viewPlanLink).toHaveAttribute('target', '_blank');
      expect(viewPlanLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on View Plan link', () => {
      const lesson = createMockLesson({ title: 'My Lesson' });
      render(<LessonCard lesson={lesson} onClick={mockOnClick} />);

      const viewPlanLink = screen.getByRole('link', { name: /view lesson plan for my lesson/i });
      expect(viewPlanLink).toBeInTheDocument();
    });
  });
});
