import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntLessonSpecCard } from './IntLessonSpecCard';
import type { LessonForReview } from '@/services/duplicateGroupService';

const lessonA: LessonForReview = {
  lesson_id: 'a',
  title: 'Pickling 101',
  summary: 'A simple intro to pickling.',
  content_length: 1234,
  grade_levels: ['3', '4'],
  has_table_format: false,
  has_summary: true,
  file_link: 'https://docs.google.com/document/d/abc/edit',
  content_preview: null,
  activity_type: ['cooking'],
  thematic_categories: ['Garden Basics'],
  season_timing: ['Fall'],
  cultural_heritage: null,
  core_competencies: ['knife_skills'],
  lesson_format: 'lesson',
  updated_at: '2026-04-20T10:00:00Z',
  teacher_name: 'Ms Garcia',
  similarities: { b: 0.9, c: 0.7 },
};

const lessonB: LessonForReview = {
  ...lessonA,
  lesson_id: 'b',
  title: 'Pickling for Beginners',
  teacher_name: null,
  summary: null,
  similarities: { a: 0.9, c: 0.6 },
};

const lessonC: LessonForReview = {
  ...lessonA,
  lesson_id: 'c',
  title: 'Pickle Power',
  similarities: { a: 0.7, b: 0.6 },
};

const groupLessons = [lessonA, lessonB, lessonC];

describe('IntLessonSpecCard', () => {
  it('renders the lesson title, id, and teacher (when present)', () => {
    render(
      <IntLessonSpecCard
        lesson={lessonA}
        groupLessons={groupLessons}
        isCanonical={false}
        onKeep={vi.fn()}
        groupId="group_1"
      />
    );
    expect(screen.getByRole('article', { name: 'Pickling 101' })).toBeInTheDocument();
    // teacher_name shows in both the card-id span and the "Submitted by" row
    expect(screen.getAllByText(/Ms Garcia/).length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to em dash for null teacher_name', () => {
    render(
      <IntLessonSpecCard
        lesson={lessonB}
        groupLessons={groupLessons}
        isCanonical={false}
        onKeep={vi.fn()}
        groupId="group_1"
      />
    );
    // "Submitted by" row uses '—' when teacher is null
    const dl = screen.getByRole('article').querySelector('dl')!;
    expect(dl.textContent).toMatch(/Submitted by\s*—/);
  });

  describe('canonical state', () => {
    it('marks the radio checked + label flips to "Keeping as canonical" when isCanonical', () => {
      render(
        <IntLessonSpecCard
          lesson={lessonA}
          groupLessons={groupLessons}
          isCanonical
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      const radio = screen.getByRole('radio') as HTMLInputElement;
      expect(radio.checked).toBe(true);
      expect(screen.getByText(/keeping as canonical/i)).toBeInTheDocument();
    });

    it('renders the "Canonical" chip when locked + canonical (post-resolve view)', () => {
      const { container } = render(
        <IntLessonSpecCard
          lesson={lessonA}
          groupLessons={groupLessons}
          isCanonical
          locked
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      // chip is the only place using the .adm-spec-card-canonical-chip class
      expect(container.querySelector('.adm-spec-card-canonical-chip')).toBeInTheDocument();
    });

    it('renders the "Archived" chip when locked + non-canonical', () => {
      render(
        <IntLessonSpecCard
          lesson={lessonB}
          groupLessons={groupLessons}
          isCanonical={false}
          locked
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      expect(screen.getByText(/archived/i)).toBeInTheDocument();
    });

    it('does NOT render the canonical/archived chip when dismissed (decision irrelevant)', () => {
      render(
        <IntLessonSpecCard
          lesson={lessonA}
          groupLessons={groupLessons}
          isCanonical
          locked
          dismissed
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      expect(screen.queryByText(/^canonical$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^archived$/i)).not.toBeInTheDocument();
    });
  });

  it('fires onKeep when the radio is clicked', () => {
    const onKeep = vi.fn();
    render(
      <IntLessonSpecCard
        lesson={lessonA}
        groupLessons={groupLessons}
        isCanonical={false}
        onKeep={onKeep}
        groupId="group_1"
      />
    );
    fireEvent.click(screen.getByRole('radio'));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  describe('archive picker visibility', () => {
    it('renders the picker for non-canonical when N >= 3', () => {
      render(
        <IntLessonSpecCard
          lesson={lessonB}
          groupLessons={groupLessons}
          isCanonical={false}
          archiveTargetId="a"
          onKeep={vi.fn()}
          onArchiveTargetChange={vi.fn()}
          groupId="group_1"
        />
      );
      expect(screen.getByRole('combobox', { name: /archive → redirect to/i })).toBeInTheDocument();
    });

    it('hides the picker for the canonical card (no self-archive)', () => {
      render(
        <IntLessonSpecCard
          lesson={lessonA}
          groupLessons={groupLessons}
          isCanonical
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('hides the picker when locked (post-decision view)', () => {
      render(
        <IntLessonSpecCard
          lesson={lessonB}
          groupLessons={groupLessons}
          isCanonical={false}
          locked
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('hides the picker when N=2 (only one archive option = the canonical)', () => {
      render(
        <IntLessonSpecCard
          lesson={lessonB}
          groupLessons={[lessonA, lessonB]}
          isCanonical={false}
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('fires onArchiveTargetChange with the picked target id', () => {
      const onArchiveTargetChange = vi.fn();
      render(
        <IntLessonSpecCard
          lesson={lessonB}
          groupLessons={groupLessons}
          isCanonical={false}
          archiveTargetId="a"
          onKeep={vi.fn()}
          onArchiveTargetChange={onArchiveTargetChange}
          groupId="group_1"
        />
      );
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c' } });
      expect(onArchiveTargetChange).toHaveBeenCalledWith('c');
    });
  });

  describe('similarity siblings', () => {
    it('renders one row per similar sibling, sorted by similarity desc', () => {
      const { container } = render(
        <IntLessonSpecCard
          lesson={lessonA}
          groupLessons={groupLessons}
          isCanonical={false}
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      const rows = container.querySelectorAll('.adm-spec-card-sibs-row');
      expect(rows).toHaveLength(2);
      // first row should be the higher similarity (b: 0.9)
      expect(rows[0].textContent).toContain('Pickling for Beginners');
      expect(rows[0].textContent).toContain('90%');
      expect(rows[1].textContent).toContain('Pickle Power');
      expect(rows[1].textContent).toContain('70%');
    });

    it('handles missing similarities gracefully (no sibling block)', () => {
      const lessonNoSims = { ...lessonA, similarities: undefined };
      const { container } = render(
        <IntLessonSpecCard
          lesson={lessonNoSims}
          groupLessons={groupLessons}
          isCanonical={false}
          onKeep={vi.fn()}
          groupId="group_1"
        />
      );
      expect(container.querySelector('.adm-spec-card-sibs')).toBeNull();
    });
  });

  it('shows the open-doc link only when file_link is provided', () => {
    const { rerender } = render(
      <IntLessonSpecCard
        lesson={lessonA}
        groupLessons={groupLessons}
        isCanonical={false}
        onKeep={vi.fn()}
        groupId="group_1"
      />
    );
    expect(screen.getByRole('link', { name: /open doc/i })).toBeInTheDocument();

    const noLink = { ...lessonA, file_link: null };
    rerender(
      <IntLessonSpecCard
        lesson={noLink}
        groupLessons={groupLessons}
        isCanonical={false}
        onKeep={vi.fn()}
        groupId="group_1"
      />
    );
    expect(screen.queryByRole('link', { name: /open doc/i })).not.toBeInTheDocument();
  });
});
