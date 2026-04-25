import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntMetadataDiff, type IntDiffField } from './IntMetadataDiff';

type Lesson = {
  lesson_id: string;
  title: string;
  grade_levels: string[] | null;
  has_table: boolean;
  word_count: number;
  format: string | null;
};

const fields: IntDiffField<Lesson>[] = [
  { key: 'title', label: 'Title', kind: 'text' },
  { key: 'grade_levels', label: 'Grades', kind: 'pills' },
  { key: 'has_table', label: 'Has table', kind: 'bool' },
  { key: 'word_count', label: 'Word count', kind: 'number' },
  { key: 'format', label: 'Format', kind: 'text' },
];

const lessonA: Lesson = {
  lesson_id: 'a',
  title: 'Alpha',
  grade_levels: ['3', '4'],
  has_table: true,
  word_count: 1200,
  format: 'lesson',
};

const lessonB: Lesson = {
  lesson_id: 'b',
  title: 'Alpha',
  grade_levels: ['3', '4'],
  has_table: false,
  word_count: 1500,
  format: 'lesson',
};

describe('IntMetadataDiff', () => {
  describe('diff state classification', () => {
    it('marks fields that match across all items as "agree"', () => {
      const { container } = render(
        <IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="all" />
      );
      // 'title' agrees between lessonA + lessonB
      const titleRow = container.querySelector('.adm-metadiff-row.agree');
      expect(titleRow).not.toBeNull();
      expect(titleRow!.textContent).toContain('Title');
    });

    it('marks fields with different values as "differ"', () => {
      const { container } = render(
        <IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="all" />
      );
      const differRows = container.querySelectorAll('.adm-metadiff-row.differ');
      // word_count + has_table differ between A and B
      const labels = Array.from(differRows).map(
        (r) => r.querySelector('.adm-metadiff-row-key')?.textContent
      );
      expect(labels).toEqual(expect.arrayContaining(['Has table', 'Word count']));
    });

    it('treats arrays as agreeing when sorted-and-joined values match', () => {
      // grade_levels: ['3', '4'] vs ['4', '3'] should still agree
      const reordered = { ...lessonB, grade_levels: ['4', '3'] };
      const { container } = render(
        <IntMetadataDiff items={[lessonA, reordered]} fields={fields} mode="all" />
      );
      const gradesRow = Array.from(container.querySelectorAll('.adm-metadiff-row')).find((r) =>
        r.textContent?.includes('Grades')
      );
      expect(gradesRow?.classList.contains('agree')).toBe(true);
    });

    it('treats null and missing values as the same "absent" key', () => {
      const lessonNullFmt = { ...lessonA, format: null };
      const lessonAlsoNullFmt = { ...lessonB, format: null };
      const { container } = render(
        <IntMetadataDiff items={[lessonNullFmt, lessonAlsoNullFmt]} fields={fields} mode="all" />
      );
      const fmtRow = Array.from(container.querySelectorAll('.adm-metadiff-row')).find((r) =>
        r.textContent?.includes('Format')
      );
      expect(fmtRow?.classList.contains('agree')).toBe(true);
    });
  });

  describe('mode toggle', () => {
    it('only-differing mode hides agreeing fields', () => {
      const { container, rerender } = render(
        <IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="all" />
      );
      // mode=all → all 5 rows visible
      expect(container.querySelectorAll('.adm-metadiff-row')).toHaveLength(5);

      rerender(
        <IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="only-differing" />
      );
      const visible = container.querySelectorAll('.adm-metadiff-row');
      // word_count + has_table differ; the rest agree
      expect(visible).toHaveLength(2);
      Array.from(visible).forEach((r) => expect(r.classList.contains('differ')).toBe(true));
    });

    it('renders no toggle when onModeChange is omitted', () => {
      render(<IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="all" />);
      expect(screen.queryByRole('button', { name: /all fields/i })).not.toBeInTheDocument();
    });

    it('renders the toggle and reflects mode via aria-pressed when onModeChange is wired', () => {
      const onModeChange = vi.fn();
      render(
        <IntMetadataDiff
          items={[lessonA, lessonB]}
          fields={fields}
          mode="only-differing"
          onModeChange={onModeChange}
        />
      );
      const allBtn = screen.getByRole('button', { name: /all fields/i });
      const diffBtn = screen.getByRole('button', { name: /only differing/i });
      expect(allBtn).toHaveAttribute('aria-pressed', 'false');
      expect(diffBtn).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(allBtn);
      expect(onModeChange).toHaveBeenCalledWith('all');
    });

    it('shows the empty-state head when every field agrees in only-differing mode', () => {
      const sameLesson = { ...lessonA, lesson_id: 'b' };
      render(
        <IntMetadataDiff
          items={[lessonA, sameLesson]}
          fields={fields}
          mode="only-differing"
          onModeChange={vi.fn()}
        />
      );
      expect(screen.getByText(/no differing metadata across these lessons/i)).toBeInTheDocument();
      // empty state still shows the toggle so the user can flip back to "all"
      expect(screen.getByRole('button', { name: /all fields/i })).toBeInTheDocument();
    });
  });

  describe('cell rendering by kind', () => {
    it('renders pills cells with one span per array entry', () => {
      const { container } = render(
        <IntMetadataDiff
          items={[lessonA, { ...lessonB, grade_levels: ['5'] }]}
          fields={fields}
          mode="all"
        />
      );
      const gradesRow = Array.from(container.querySelectorAll('.adm-metadiff-row')).find((r) =>
        r.textContent?.includes('Grades')
      )!;
      // lesson A has 2 grades, lesson B has 1 — 3 pills total
      expect(gradesRow.querySelectorAll('.adm-metadiff-cell-pill').length).toBeGreaterThanOrEqual(
        3
      );
    });

    it('renders bool cells as Yes / No', () => {
      const { container } = render(
        <IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="all" />
      );
      const tableRow = Array.from(container.querySelectorAll('.adm-metadiff-row')).find((r) =>
        r.textContent?.includes('Has table')
      )!;
      expect(within(tableRow as HTMLDivElement).getByText('Yes')).toBeInTheDocument();
      expect(within(tableRow as HTMLDivElement).getByText('No')).toBeInTheDocument();
    });

    it('renders number cells with locale formatting + monospace class', () => {
      const { container } = render(
        <IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="all" />
      );
      const wcRow = Array.from(container.querySelectorAll('.adm-metadiff-row')).find((r) =>
        r.textContent?.includes('Word count')
      )!;
      // toLocaleString of 1200/1500 inserts a separator (',' in en-US)
      const monoSpans = wcRow.querySelectorAll('.adm-metadiff-num');
      expect(monoSpans).toHaveLength(2);
      expect(monoSpans[0].textContent).toMatch(/1[.,\s]?200/);
      expect(monoSpans[1].textContent).toMatch(/1[.,\s]?500/);
    });

    it('renders the missing-value placeholder for null pill arrays', () => {
      const lessonNoGrades = { ...lessonA, grade_levels: null };
      const { container } = render(
        <IntMetadataDiff items={[lessonNoGrades, lessonB]} fields={fields} mode="all" />
      );
      const gradesRow = Array.from(container.querySelectorAll('.adm-metadiff-row')).find((r) =>
        r.textContent?.includes('Grades')
      )!;
      expect(within(gradesRow as HTMLDivElement).getByText('—')).toBeInTheDocument();
    });
  });

  describe('header counts', () => {
    it('reports the visible-field count, pluralized', () => {
      const { rerender } = render(
        <IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="all" />
      );
      expect(screen.getByText('5 fields')).toBeInTheDocument();

      rerender(
        <IntMetadataDiff items={[lessonA, lessonB]} fields={fields} mode="only-differing" />
      );
      expect(screen.getByText('2 fields')).toBeInTheDocument();
    });
  });
});
