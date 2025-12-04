import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonReviewCard } from './LessonReviewCard';
import type { LessonForReview } from '@/services/duplicateGroupService';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

function makeMockLesson(overrides: Partial<LessonForReview> = {}): LessonForReview {
  return {
    lesson_id: overrides.lesson_id ?? 'lesson-1',
    title: overrides.title ?? 'Test Lesson Title',
    summary: overrides.summary ?? 'Test summary text',
    content_length: overrides.content_length ?? 1500,
    content_preview: overrides.content_preview ?? 'This is the content preview for the lesson...',
    has_summary: overrides.has_summary ?? true,
    has_table_format: overrides.has_table_format ?? false,
    grade_levels: overrides.grade_levels ?? ['3-5', '6-8'],
    file_link: overrides.file_link ?? 'https://docs.google.com/document/d/test',
  };
}

describe('LessonReviewCard', () => {
  const defaultProps = {
    lesson: makeMockLesson(),
    selection: { action: 'keep' as const },
    keptLessons: [makeMockLesson()],
    onSelectionChange: vi.fn(),
    onQuickKeep: vi.fn(),
  };

  it('renders lesson title', () => {
    render(<LessonReviewCard {...defaultProps} />);
    expect(screen.getByText('Test Lesson Title')).toBeInTheDocument();
  });

  it('renders content length', () => {
    render(<LessonReviewCard {...defaultProps} />);
    expect(screen.getByText(/1,500 chars/)).toBeInTheDocument();
  });

  it('renders grade levels', () => {
    render(<LessonReviewCard {...defaultProps} />);
    expect(screen.getByText(/Grades: 3-5, 6-8/)).toBeInTheDocument();
  });

  it('renders content preview', () => {
    render(<LessonReviewCard {...defaultProps} />);
    // Content preview is wrapped in quotes and has "..." added
    expect(screen.getByText(/This is the content preview for the lesson/)).toBeInTheDocument();
  });

  it('renders "Has summary" indicator when has_summary is true', () => {
    render(<LessonReviewCard {...defaultProps} />);
    expect(screen.getByText('Has summary')).toBeInTheDocument();
  });

  it('renders "No summary" indicator when has_summary is false', () => {
    const lesson = makeMockLesson({ has_summary: false });
    render(<LessonReviewCard {...defaultProps} lesson={lesson} />);
    expect(screen.getByText('No summary')).toBeInTheDocument();
  });

  it('renders "Table format" indicator when has_table_format is true', () => {
    const lesson = makeMockLesson({ has_table_format: true });
    render(<LessonReviewCard {...defaultProps} lesson={lesson} />);
    expect(screen.getByText('Table format')).toBeInTheDocument();
  });

  it('renders Open Doc link when file_link is provided', () => {
    render(<LessonReviewCard {...defaultProps} />);
    const link = screen.getByRole('link', { name: /open doc/i });
    expect(link).toHaveAttribute('href', 'https://docs.google.com/document/d/test');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders dropdown with Keep selected when selection is keep', () => {
    render(<LessonReviewCard {...defaultProps} selection={{ action: 'keep' }} />);
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toHaveValue('keep');
  });

  it('calls onSelectionChange when dropdown value changes to keep', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const keptLessons = [
      makeMockLesson({ lesson_id: 'lesson-1', title: 'Lesson 1' }),
      makeMockLesson({ lesson_id: 'lesson-2', title: 'Lesson 2' }),
    ];

    render(
      <LessonReviewCard
        {...defaultProps}
        lesson={makeMockLesson({ lesson_id: 'lesson-1' })}
        selection={{ action: 'archive', archiveTo: 'lesson-2' }}
        keptLessons={keptLessons}
        onSelectionChange={onSelectionChange}
      />
    );

    const dropdown = screen.getByRole('combobox');
    await user.selectOptions(dropdown, 'keep');

    expect(onSelectionChange).toHaveBeenCalledWith({ action: 'keep' });
  });

  it('calls onSelectionChange when dropdown value changes to archive', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const keptLessons = [
      makeMockLesson({ lesson_id: 'lesson-1', title: 'Lesson 1' }),
      makeMockLesson({ lesson_id: 'lesson-2', title: 'Lesson 2' }),
    ];

    render(
      <LessonReviewCard
        {...defaultProps}
        lesson={makeMockLesson({ lesson_id: 'lesson-1' })}
        selection={{ action: 'keep' }}
        keptLessons={keptLessons}
        onSelectionChange={onSelectionChange}
      />
    );

    const dropdown = screen.getByRole('combobox');
    await user.selectOptions(dropdown, 'lesson-2');

    expect(onSelectionChange).toHaveBeenCalledWith({
      action: 'archive',
      archiveTo: 'lesson-2',
    });
  });

  it('calls onQuickKeep when card content is clicked', async () => {
    const user = userEvent.setup();
    const onQuickKeep = vi.fn();
    render(<LessonReviewCard {...defaultProps} onQuickKeep={onQuickKeep} />);

    // Click on the lesson title area
    await user.click(screen.getByText('Test Lesson Title'));
    expect(onQuickKeep).toHaveBeenCalledTimes(1);
  });

  it('does not call onQuickKeep when Open Doc link is clicked', async () => {
    const user = userEvent.setup();
    const onQuickKeep = vi.fn();
    render(<LessonReviewCard {...defaultProps} onQuickKeep={onQuickKeep} />);

    // Click on the Open Doc link - event propagation should be stopped
    await user.click(screen.getByRole('link', { name: /open doc/i }));
    expect(onQuickKeep).not.toHaveBeenCalled();
  });

  it('applies green border styling when selection is keep', () => {
    const { container } = render(
      <LessonReviewCard {...defaultProps} selection={{ action: 'keep' }} />
    );
    const card = container.firstChild;
    expect(card).toHaveClass('border-green-500');
  });

  it('applies gray border styling when selection is archive', () => {
    const { container } = render(
      <LessonReviewCard
        {...defaultProps}
        selection={{ action: 'archive', archiveTo: 'lesson-2' }}
      />
    );
    const card = container.firstChild;
    expect(card).toHaveClass('border-gray-200');
  });

  it('excludes current lesson from archive options', () => {
    const keptLessons = [
      makeMockLesson({ lesson_id: 'lesson-1', title: 'Current Lesson' }),
      makeMockLesson({ lesson_id: 'lesson-2', title: 'Other Lesson' }),
    ];

    render(
      <LessonReviewCard
        {...defaultProps}
        lesson={makeMockLesson({ lesson_id: 'lesson-1', title: 'Current Lesson' })}
        keptLessons={keptLessons}
      />
    );

    const dropdown = screen.getByRole('combobox');
    const options = dropdown.querySelectorAll('option');

    // Should have "Keep" and one archive option (not including current lesson)
    const optionTexts = Array.from(options).map((opt) => opt.textContent);
    expect(optionTexts).toContain('Keep');
    expect(optionTexts.some((text) => text?.includes('Other Lesson'))).toBe(true);
    expect(optionTexts.filter((text) => text?.includes('Current Lesson'))).toHaveLength(0);
  });
});
