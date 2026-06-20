import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IntFormField } from './IntFormField';

describe('IntFormField', () => {
  it('renders the label and required marker', () => {
    render(
      <IntFormField label="Email" required>
        <input type="email" />
      </IntFormField>
    );
    const label = screen.getByText('Email');
    expect(label).toBeInTheDocument();
    expect(label.className).toContain('adm-label-req');
  });

  it('renders a hint when provided + no error', () => {
    render(
      <IntFormField label="Email" hint="We never share this">
        <input type="email" />
      </IntFormField>
    );
    expect(screen.getByText('We never share this')).toBeInTheDocument();
  });

  it('renders the error message in place of the hint when error is set', () => {
    render(
      <IntFormField label="Email" hint="We never share this" error="Invalid email">
        <input type="email" />
      </IntFormField>
    );
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.queryByText('We never share this')).not.toBeInTheDocument();
  });

  it('auto-wires a generated id onto a single child without one', () => {
    render(
      <IntFormField label="Email">
        <input data-testid="auto" type="email" />
      </IntFormField>
    );
    const input = screen.getByTestId('auto');
    const label = screen.getByText('Email');
    const id = input.id;
    expect(id).toBeTruthy();
    expect(label).toHaveAttribute('for', id);
  });

  it('does NOT overwrite an explicit id on the child', () => {
    render(
      <IntFormField label="Email">
        <input id="explicit-input" data-testid="explicit" type="email" />
      </IntFormField>
    );
    expect(screen.getByTestId('explicit')).toHaveAttribute('id', 'explicit-input');
  });

  it('uses an explicit htmlFor as both label target and child id', () => {
    render(
      <IntFormField label="Email" htmlFor="explicit-id">
        <input data-testid="auto" type="email" />
      </IntFormField>
    );
    expect(screen.getByText('Email')).toHaveAttribute('for', 'explicit-id');
    expect(screen.getByTestId('auto')).toHaveAttribute('id', 'explicit-id');
  });

  it('does not auto-wire when given multiple children (caller controls id)', () => {
    render(
      <IntFormField label="Range">
        <input data-testid="from" id="from" />
        <input data-testid="to" id="to" />
      </IntFormField>
    );
    // both children are explicit, neither gets overwritten
    expect(screen.getByTestId('from')).toHaveAttribute('id', 'from');
    expect(screen.getByTestId('to')).toHaveAttribute('id', 'to');
  });

  it('accepts a string child (ReactNode) without crashing', () => {
    render(<IntFormField label="Just text">plain string content</IntFormField>);
    expect(screen.getByText('Just text')).toBeInTheDocument();
    expect(screen.getByText('plain string content')).toBeInTheDocument();
  });

  it('wires aria-required/invalid/describedby onto a single input with required + error', () => {
    render(
      <IntFormField label="Email" required error="Invalid email">
        <input data-testid="control" type="email" />
      </IntFormField>
    );
    const input = screen.getByTestId('control');
    const errorEl = screen.getByText('Invalid email');

    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // aria-describedby points at the error/hint <p>'s id
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(errorEl).toHaveAttribute('id', describedBy);
  });

  it('points aria-describedby at the hint <p> when a hint (no error) is present', () => {
    render(
      <IntFormField label="Email" hint="We never share this">
        <input data-testid="control" type="email" />
      </IntFormField>
    );
    const input = screen.getByTestId('control');
    const hintEl = screen.getByText('We never share this');
    expect(input).toHaveAttribute('aria-describedby', hintEl.id);
    expect(hintEl.id).toBeTruthy();
  });

  it('omits aria-required/invalid when not required and no error', () => {
    render(
      <IntFormField label="Email">
        <input data-testid="control" type="email" />
      </IntFormField>
    );
    const input = screen.getByTestId('control');
    expect(input).not.toHaveAttribute('aria-required');
    expect(input).not.toHaveAttribute('aria-invalid');
    // no hint/error <p> rendered → no describedby reference
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('merges aria-describedby with an existing one the child already carries', () => {
    render(
      <IntFormField label="Email" error="Invalid email">
        <input data-testid="control" type="email" aria-describedby="external-help" />
      </IntFormField>
    );
    const input = screen.getByTestId('control');
    const errorEl = screen.getByText('Invalid email');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const ids = describedBy.split(/\s+/);
    expect(ids).toContain('external-help');
    expect(ids).toContain(errorEl.id);
  });
});
