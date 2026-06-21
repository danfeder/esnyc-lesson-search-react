import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntToolbar } from './IntToolbar';

/** Minimal required-props render of the toolbar. */
function renderToolbar() {
  return render(
    <IntToolbar
      count={0}
      query=""
      activeFilterCount={0}
      sortBy="relevance"
      view="list"
      density="comfy"
      onSortChange={vi.fn()}
      onViewChange={vi.fn()}
      onDensityChange={vi.fn()}
      onOpenMobileFilters={vi.fn()}
    />
  );
}

describe('IntToolbar — sort options (C58)', () => {
  it('offers relevance, title, and modified sort options', () => {
    renderToolbar();
    const select = screen.getByRole('combobox', { name: /sort results/i });
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(values).toEqual(expect.arrayContaining(['relevance', 'title', 'modified']));
  });

  it('no longer offers the removed "grade" sort option', () => {
    renderToolbar();
    const select = screen.getByRole('combobox', { name: /sort results/i });
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(values).not.toContain('grade');
  });
});
