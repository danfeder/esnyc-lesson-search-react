import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntPillGroup, type IntPillOption } from './IntPillGroup';

const options: IntPillOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('IntPillGroup', () => {
  it('renders one button per option inside a role="group"', () => {
    render(<IntPillGroup options={options} selected={[]} onChange={vi.fn()} ariaLabel="Tags" />);
    expect(screen.getByRole('group', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('uses aria-pressed to reflect the selection state', () => {
    render(<IntPillGroup options={options} selected={['b']} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-pressed', 'true');
  });

  describe('multi mode (default)', () => {
    it('toggles a value into the existing selection', () => {
      const onChange = vi.fn();
      render(<IntPillGroup options={options} selected={['a']} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
      expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    });

    it('removes a value when the active pill is clicked', () => {
      const onChange = vi.fn();
      render(<IntPillGroup options={options} selected={['a', 'b']} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: 'Beta' }));
      expect(onChange).toHaveBeenLastCalledWith(['a']);
    });
  });

  describe('single mode', () => {
    it('replaces the selection with the clicked value', () => {
      const onChange = vi.fn();
      render(<IntPillGroup options={options} selected={['a']} onChange={onChange} mode="single" />);
      fireEvent.click(screen.getByRole('button', { name: 'Gamma' }));
      expect(onChange).toHaveBeenLastCalledWith(['c']);
    });

    it('clicking the active pill clears the selection', () => {
      const onChange = vi.fn();
      render(<IntPillGroup options={options} selected={['a']} onChange={onChange} mode="single" />);
      fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
      expect(onChange).toHaveBeenLastCalledWith([]);
    });
  });

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn();
    render(<IntPillGroup options={options} selected={[]} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeDisabled();
  });

  it('forwards id onto the wrapping group so a sibling label resolves', () => {
    render(
      <>
        <label htmlFor="tagset">Tags</label>
        <IntPillGroup id="tagset" options={options} selected={[]} onChange={vi.fn()} />
      </>
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('id', 'tagset');
  });
});
