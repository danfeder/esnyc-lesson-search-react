import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntTabs, type IntTab } from './IntTabs';

const tabs: IntTab[] = [
  { key: 'one', label: 'One' },
  { key: 'two', label: 'Two', count: 5 },
  { key: 'three', label: 'Three' },
];

describe('IntTabs', () => {
  it('renders every tab with role="tab" inside a tablist', () => {
    render(<IntTabs tabs={tabs} activeKey="one" onChange={vi.fn()} ariaLabel="Filter" />);
    expect(screen.getByRole('tablist', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('renders the count badge on tabs that supply one', () => {
    render(<IntTabs tabs={tabs} activeKey="one" onChange={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('marks only the active tab with aria-selected and active class', () => {
    render(<IntTabs tabs={tabs} activeKey="two" onChange={vi.fn()} />);
    const [one, two, three] = screen.getAllByRole('tab');
    expect(one).toHaveAttribute('aria-selected', 'false');
    expect(two).toHaveAttribute('aria-selected', 'true');
    expect(three).toHaveAttribute('aria-selected', 'false');
    expect(two.className).toContain('active');
  });

  it('only the active tab is in the tab order (roving tabindex)', () => {
    render(<IntTabs tabs={tabs} activeKey="two" onChange={vi.fn()} />);
    const [one, two, three] = screen.getAllByRole('tab');
    expect(one).toHaveAttribute('tabindex', '-1');
    expect(two).toHaveAttribute('tabindex', '0');
    expect(three).toHaveAttribute('tabindex', '-1');
  });

  it('fires onChange when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<IntTabs tabs={tabs} activeKey="one" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /three/i }));
    expect(onChange).toHaveBeenCalledWith('three');
  });

  it('does not fire onChange for a disabled tab', () => {
    const onChange = vi.fn();
    const tabsWithDisabled: IntTab[] = [
      { key: 'one', label: 'One' },
      { key: 'two', label: 'Two', disabled: true },
    ];
    render(<IntTabs tabs={tabsWithDisabled} activeKey="one" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /two/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('keyboard navigation (WAI-ARIA tablist)', () => {
    it('ArrowRight moves focus + activates the next tab', () => {
      const onChange = vi.fn();
      render(<IntTabs tabs={tabs} activeKey="one" onChange={onChange} />);
      const one = screen.getByRole('tab', { name: /one/i });
      act(() => one.focus());
      fireEvent.keyDown(one, { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith('two');
    });

    it('ArrowLeft moves focus + activates the previous tab', () => {
      const onChange = vi.fn();
      render(<IntTabs tabs={tabs} activeKey="three" onChange={onChange} />);
      const three = screen.getByRole('tab', { name: /three/i });
      act(() => three.focus());
      fireEvent.keyDown(three, { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith('two');
    });

    it('ArrowDown also moves forward (vertical pattern)', () => {
      const onChange = vi.fn();
      render(<IntTabs tabs={tabs} activeKey="one" onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole('tab', { name: /one/i }), { key: 'ArrowDown' });
      expect(onChange).toHaveBeenCalledWith('two');
    });

    it('Home jumps to the first tab', () => {
      const onChange = vi.fn();
      render(<IntTabs tabs={tabs} activeKey="three" onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole('tab', { name: /three/i }), { key: 'Home' });
      expect(onChange).toHaveBeenCalledWith('one');
    });

    it('End jumps to the last tab', () => {
      const onChange = vi.fn();
      render(<IntTabs tabs={tabs} activeKey="one" onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole('tab', { name: /one/i }), { key: 'End' });
      expect(onChange).toHaveBeenCalledWith('three');
    });

    it('ArrowRight wraps from last back to first', () => {
      const onChange = vi.fn();
      render(<IntTabs tabs={tabs} activeKey="three" onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole('tab', { name: /three/i }), { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith('one');
    });

    it('ArrowLeft wraps from first back to last', () => {
      const onChange = vi.fn();
      render(<IntTabs tabs={tabs} activeKey="one" onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole('tab', { name: /one/i }), { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith('three');
    });

    it('skips disabled tabs when arrowing forward', () => {
      const onChange = vi.fn();
      const tabsWithMiddleDisabled: IntTab[] = [
        { key: 'one', label: 'One' },
        { key: 'two', label: 'Two', disabled: true },
        { key: 'three', label: 'Three' },
      ];
      render(<IntTabs tabs={tabsWithMiddleDisabled} activeKey="one" onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole('tab', { name: /one/i }), { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith('three');
    });
  });
});
