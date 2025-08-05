import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterModal } from './FilterModal';
import type { SearchFilters } from '@/types';

describe('FilterModal', () => {
  const mockOnClose = vi.fn();
  const mockOnFiltersChange = vi.fn();

  const defaultFilters: SearchFilters = {
    query: '',
    gradeLevels: [],
    thematicCategories: [],
    seasons: [],
    coreCompetencies: [],
    culturalHeritage: [],
    location: [],
    activityType: [],
    lessonFormat: '',
    academicIntegration: [],
    socialEmotionalLearning: [],
    cookingMethods: '',
    includeAllSeasons: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <FilterModal
        isOpen={true}
        onClose={mockOnClose}
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('should render when open', () => {
      renderComponent();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render all three tabs', () => {
      renderComponent();
      expect(screen.getByRole('tab', { name: /basic filters/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /educational/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /cultural & seasonal/i })).toBeInTheDocument();
    });

    it('should render close and apply buttons', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
    });

    it('should display filter count when filters are applied', () => {
      const filters = {
        ...defaultFilters,
        gradeLevels: ['3', '4', '5'],
        seasons: ['Spring', 'Summer'],
      };
      renderComponent({ filters });

      // Should show total count of active filters (5)
      expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
    });
  });

  describe('Basic Filters Tab', () => {
    it('should render grade level options', () => {
      renderComponent();

      expect(screen.getByText('Grade Levels')).toBeInTheDocument();
      expect(screen.getByLabelText('3K')).toBeInTheDocument();
      expect(screen.getByLabelText('Pre-K')).toBeInTheDocument();
      expect(screen.getByLabelText('Kindergarten')).toBeInTheDocument();
      expect(screen.getByLabelText('1st Grade')).toBeInTheDocument();
      expect(screen.getByLabelText('8th Grade')).toBeInTheDocument();
    });

    it('should render activity type options', () => {
      renderComponent();

      expect(screen.getByText('Activity Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Cooking Only')).toBeInTheDocument();
      expect(screen.getByLabelText('Garden Only')).toBeInTheDocument();
      expect(screen.getByLabelText('Cooking + Garden')).toBeInTheDocument();
      expect(screen.getByLabelText('Academic Only')).toBeInTheDocument();
    });

    it('should render location options', () => {
      renderComponent();

      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByLabelText('Indoor')).toBeInTheDocument();
      expect(screen.getByLabelText('Outdoor')).toBeInTheDocument();

      // "Both" appears twice (activity and location), need to be specific
      const locationSection = screen.getByText('Location').closest('div');
      expect(within(locationSection!).getByLabelText('Both')).toBeInTheDocument();
    });

    it('should render lesson format dropdown', () => {
      renderComponent();

      expect(screen.getByText('Lesson Format')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /lesson format/i })).toBeInTheDocument();
    });

    it('should handle grade selection', async () => {
      const user = userEvent.setup();
      renderComponent();

      const grade3 = screen.getByLabelText('3rd Grade');
      await user.click(grade3);

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          gradeLevels: ['3'],
        })
      );
    });

    it('should handle grade group selection', async () => {
      const user = userEvent.setup();
      renderComponent();

      const earlyChildhood = screen.getByRole('button', { name: /early childhood/i });
      await user.click(earlyChildhood);

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          gradeLevels: expect.arrayContaining(['3K', 'PK', 'K']),
        })
      );
    });
  });

  describe('Educational Tab', () => {
    it('should render thematic categories', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Switch to Educational tab
      const educationalTab = screen.getByRole('tab', { name: /educational/i });
      await user.click(educationalTab);

      expect(screen.getByText('Thematic Categories')).toBeInTheDocument();
      expect(screen.getByLabelText('Garden Basics')).toBeInTheDocument();
      expect(screen.getByLabelText('Plant Growth')).toBeInTheDocument();
      expect(screen.getByLabelText('Food Systems')).toBeInTheDocument();
    });

    it('should render core competencies', async () => {
      const user = userEvent.setup();
      renderComponent();

      const educationalTab = screen.getByRole('tab', { name: /educational/i });
      await user.click(educationalTab);

      expect(screen.getByText('Core Competencies')).toBeInTheDocument();
      expect(screen.getByLabelText(/critical thinking/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/healthy habits/i)).toBeInTheDocument();
    });

    it('should render academic integration options', async () => {
      const user = userEvent.setup();
      renderComponent();

      const educationalTab = screen.getByRole('tab', { name: /educational/i });
      await user.click(educationalTab);

      expect(screen.getByText('Academic Integration')).toBeInTheDocument();
      expect(screen.getByLabelText('Math')).toBeInTheDocument();
      expect(screen.getByLabelText('Science')).toBeInTheDocument();
      expect(screen.getByLabelText('Literacy/ELA')).toBeInTheDocument();
    });

    it('should render SEL competencies', async () => {
      const user = userEvent.setup();
      renderComponent();

      const educationalTab = screen.getByRole('tab', { name: /educational/i });
      await user.click(educationalTab);

      expect(screen.getByText('Social-Emotional Learning')).toBeInTheDocument();
      expect(screen.getByLabelText('Self-Awareness')).toBeInTheDocument();
      expect(screen.getByLabelText('Social Awareness')).toBeInTheDocument();
    });
  });

  describe('Cultural & Seasonal Tab', () => {
    it('should render season options', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Switch to Cultural & Seasonal tab
      const culturalTab = screen.getByRole('tab', { name: /cultural & seasonal/i });
      await user.click(culturalTab);

      expect(screen.getByText('Season & Timing')).toBeInTheDocument();
      expect(screen.getByLabelText('Fall')).toBeInTheDocument();
      expect(screen.getByLabelText('Winter')).toBeInTheDocument();
      expect(screen.getByLabelText('Spring')).toBeInTheDocument();
      expect(screen.getByLabelText('Summer')).toBeInTheDocument();
    });

    it('should render include all seasons checkbox', async () => {
      const user = userEvent.setup();
      renderComponent();

      const culturalTab = screen.getByRole('tab', { name: /cultural & seasonal/i });
      await user.click(culturalTab);

      expect(screen.getByLabelText(/include year-round lessons/i)).toBeInTheDocument();
    });

    it('should render cooking methods dropdown', async () => {
      const user = userEvent.setup();
      renderComponent();

      const culturalTab = screen.getByRole('tab', { name: /cultural & seasonal/i });
      await user.click(culturalTab);

      expect(screen.getByText('Cooking Methods')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /cooking methods/i })).toBeInTheDocument();
    });

    it('should render cultural heritage filter', async () => {
      const user = userEvent.setup();
      renderComponent();

      const culturalTab = screen.getByRole('tab', { name: /cultural & seasonal/i });
      await user.click(culturalTab);

      expect(screen.getByText('Cultural Heritage')).toBeInTheDocument();
      // Cultural heritage uses virtualized list, so options may not all be visible
      expect(screen.getByText(/select cultural backgrounds/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should apply filters when apply button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Select some filters
      const grade3 = screen.getByLabelText('3rd Grade');
      await user.click(grade3);

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should clear all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const filters = {
        ...defaultFilters,
        gradeLevels: ['3', '4'],
        seasons: ['Spring'],
      };
      renderComponent({ filters });

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);

      const applyButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(defaultFilters);
    });

    it('should switch tabs when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Initially on Basic Filters tab
      expect(screen.getByText('Grade Levels')).toBeInTheDocument();

      // Switch to Educational tab
      const educationalTab = screen.getByRole('tab', { name: /educational/i });
      await user.click(educationalTab);

      expect(screen.getByText('Thematic Categories')).toBeInTheDocument();

      // Switch to Cultural tab
      const culturalTab = screen.getByRole('tab', { name: /cultural & seasonal/i });
      await user.click(culturalTab);

      expect(screen.getByText('Season & Timing')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal on Escape key', () => {
      renderComponent();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate tabs with Ctrl+Arrow keys', () => {
      renderComponent();

      // Move to next tab with Ctrl+Right
      fireEvent.keyDown(document, { key: 'ArrowRight', ctrlKey: true });

      // Should show Educational tab content
      waitFor(() => {
        expect(screen.getByText('Thematic Categories')).toBeInTheDocument();
      });

      // Move to previous tab with Ctrl+Left
      fireEvent.keyDown(document, { key: 'ArrowLeft', ctrlKey: true });

      // Should show Basic Filters tab content
      waitFor(() => {
        expect(screen.getByText('Grade Levels')).toBeInTheDocument();
      });
    });

    it('should navigate tabs with Cmd+Arrow keys on Mac', () => {
      renderComponent();

      // Move to next tab with Cmd+Right
      fireEvent.keyDown(document, { key: 'ArrowRight', metaKey: true });

      waitFor(() => {
        expect(screen.getByText('Thematic Categories')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dialog structure', () => {
      renderComponent();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have accessible tab structure', () => {
      renderComponent();

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);

      // First tab should be selected by default
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('should have accessible form controls', () => {
      renderComponent();

      // Checkboxes should have labels
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAccessibleName();
      });
    });

    it('should manage focus correctly', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Tab through elements
      await user.tab();

      // Should be able to tab to interactive elements
      const activeElement = document.activeElement;
      expect(activeElement?.tagName).toMatch(/BUTTON|INPUT|SELECT/i);
    });
  });

  describe('Filter Persistence', () => {
    it('should preserve selected filters when switching tabs', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Select grade in Basic tab
      const grade3 = screen.getByLabelText('3rd Grade');
      await user.click(grade3);
      expect(grade3).toBeChecked();

      // Switch to Educational tab
      const educationalTab = screen.getByRole('tab', { name: /educational/i });
      await user.click(educationalTab);

      // Switch back to Basic tab
      const basicTab = screen.getByRole('tab', { name: /basic filters/i });
      await user.click(basicTab);

      // Grade should still be selected
      expect(screen.getByLabelText('3rd Grade')).toBeChecked();
    });

    it('should show existing filters when modal opens', () => {
      const filters = {
        ...defaultFilters,
        gradeLevels: ['3', '4'],
        seasons: ['Spring', 'Summer'],
        activityType: ['cooking-only'],
      };

      renderComponent({ filters });

      expect(screen.getByLabelText('3rd Grade')).toBeChecked();
      expect(screen.getByLabelText('4th Grade')).toBeChecked();
      expect(screen.getByLabelText('Cooking Only')).toBeChecked();
    });
  });

  describe('Facet Display', () => {
    it('should display facet counts when provided', () => {
      const facets = {
        gradeLevels: {
          '3': 25,
          '4': 30,
          '5': 15,
        },
        activityType: {
          'cooking-only': 45,
          'garden-only': 38,
        },
      };

      renderComponent({ facets });

      // Should show counts next to options
      expect(screen.getByText(/3rd Grade.*\(25\)/)).toBeInTheDocument();
      expect(screen.getByText(/4th Grade.*\(30\)/)).toBeInTheDocument();
      expect(screen.getByText(/Cooking Only.*\(45\)/)).toBeInTheDocument();
    });

    it('should not show counts when facets not provided', () => {
      renderComponent();

      // Should not show counts
      expect(screen.queryByText(/3rd Grade.*\(\d+\)/)).not.toBeInTheDocument();
    });
  });
});
