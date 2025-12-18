import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonModal } from './LessonModal';
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

describe('LessonModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const lesson = createMockLesson();
      render(<LessonModal lesson={lesson} isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('Test Lesson Title')).not.toBeInTheDocument();
    });

    it('should not render when lesson is null', () => {
      render(<LessonModal lesson={null} isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and lesson is provided', () => {
      const lesson = createMockLesson();
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Test Lesson Title')).toBeInTheDocument();
    });

    it('should render lesson title', () => {
      const lesson = createMockLesson({ title: 'My Special Lesson' });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('My Special Lesson')).toBeInTheDocument();
    });

    it('should render grade levels', () => {
      const lesson = createMockLesson({ gradeLevels: ['K', '1', '2'] });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Grades K, 1, 2')).toBeInTheDocument();
    });

    it('should render lesson summary', () => {
      const lesson = createMockLesson({ summary: 'A detailed summary of the lesson' });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('A detailed summary of the lesson')).toBeInTheDocument();
    });

    it('should render location requirements when present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          locationRequirements: ['Indoor', 'Outdoor'],
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Indoor, Outdoor')).toBeInTheDocument();
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
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

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
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

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
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

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
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Academic Only')).toBeInTheDocument();
    });
  });

  describe('Lesson Plan Link', () => {
    it('should render View Complete Lesson link when fileLink is present', () => {
      const lesson = createMockLesson({
        fileLink: 'https://example.com/lesson',
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      const link = screen.getByRole('link', { name: /view complete lesson/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com/lesson');
    });

    it('should open link in new tab', () => {
      const lesson = createMockLesson();
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      const link = screen.getByRole('link', { name: /view complete lesson/i });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Last Modified Date', () => {
    it('should render last modified date when present', () => {
      const lesson = createMockLesson({
        last_modified: '2024-06-15T10:30:00Z',
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/last modified/i)).toBeInTheDocument();
      expect(screen.getByText(/june 15, 2024/i)).toBeInTheDocument();
    });

    it('should not render last modified when not present', () => {
      const lesson = createMockLesson({ last_modified: undefined });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText(/last modified/i)).not.toBeInTheDocument();
    });
  });

  describe('Metadata Sections', () => {
    it('should render thematic categories when present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          thematicCategories: ['Nutrition', 'Ecosystems'],
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Thematic Categories')).toBeInTheDocument();
      expect(screen.getByText('Nutrition')).toBeInTheDocument();
      expect(screen.getByText('Ecosystems')).toBeInTheDocument();
    });

    it('should render season timing when present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          seasonTiming: ['Fall', 'Winter'],
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Seasons & Timing')).toBeInTheDocument();
      expect(screen.getByText('Fall')).toBeInTheDocument();
      expect(screen.getByText('Winter')).toBeInTheDocument();
    });

    it('should render core competencies when present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: ['Environmental and Community Stewardship'],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Core Competencies')).toBeInTheDocument();
      expect(screen.getByText('Environmental and Community Stewardship')).toBeInTheDocument();
    });

    it('should render cultural heritage when present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: ['Mexican', 'Italian'],
          activityType: [],
          lessonFormat: '',
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Cultural Heritage')).toBeInTheDocument();
      expect(screen.getByText('Mexican')).toBeInTheDocument();
      expect(screen.getByText('Italian')).toBeInTheDocument();
    });

    it('should render cooking methods when present', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          cookingMethods: ['Stovetop', 'Oven'],
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Cooking Methods')).toBeInTheDocument();
      expect(screen.getByText('Stovetop')).toBeInTheDocument();
      expect(screen.getByText('Oven')).toBeInTheDocument();
    });

    it('should truncate ingredients when more than 10', () => {
      const ingredients = Array.from({ length: 15 }, (_, i) => `Ingredient ${i + 1}`);
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          mainIngredients: ingredients,
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('+5 more')).toBeInTheDocument();
    });

    it('should truncate skills when more than 8', () => {
      const skills = Array.from({ length: 12 }, (_, i) => `Skill ${i + 1}`);
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          skills: skills,
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('+4 more')).toBeInTheDocument();
    });
  });

  describe('Processing Notes', () => {
    it('should render processing notes when present', () => {
      const lesson = createMockLesson({
        processing_notes: 'This lesson was processed with some notes',
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Processing Notes')).toBeInTheDocument();
      expect(screen.getByText('This lesson was processed with some notes')).toBeInTheDocument();
    });

    it('should not render processing notes section when not present', () => {
      const lesson = createMockLesson({ processing_notes: undefined });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText('Processing Notes')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const lesson = createMockLesson();
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Academic Integration', () => {
    it('should handle array format for academic integration', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          academicIntegration: ['Math', 'Science'],
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Academic Integration')).toBeInTheDocument();
      expect(screen.getByText('Math')).toBeInTheDocument();
      expect(screen.getByText('Science')).toBeInTheDocument();
    });

    it('should handle object format with selected key for academic integration', () => {
      const lesson = createMockLesson({
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          lessonFormat: '',
          academicIntegration: {
            selected: ['Math', 'Science'],
            concepts: { Math: ['fractions'] },
          },
        },
      });
      render(<LessonModal lesson={lesson} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Academic Integration')).toBeInTheDocument();
      expect(screen.getByText('Math')).toBeInTheDocument();
      expect(screen.getByText('Science')).toBeInTheDocument();
    });
  });
});
