import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IntAlert } from './IntAlert';

describe('IntAlert', () => {
  describe('role mapping by variant', () => {
    it('uses role="alert" for error', () => {
      render(<IntAlert variant="error">Boom</IntAlert>);
      expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    });

    it('uses role="alert" for warn', () => {
      render(<IntAlert variant="warn">Careful</IntAlert>);
      expect(screen.getByRole('alert')).toHaveTextContent('Careful');
    });

    it('uses role="status" for info', () => {
      render(<IntAlert variant="info">FYI</IntAlert>);
      expect(screen.getByRole('status')).toHaveTextContent('FYI');
    });

    it('uses role="status" for success', () => {
      render(<IntAlert variant="success">Saved</IntAlert>);
      expect(screen.getByRole('status')).toHaveTextContent('Saved');
    });
  });

  it('renders title before children when both are provided', () => {
    const { container } = render(
      <IntAlert variant="info" title="Heads up">
        details below
      </IntAlert>
    );
    const body = container.querySelector('.adm-alert-body')!;
    expect(body.querySelector('strong')).toHaveTextContent('Heads up');
    expect(body.textContent).toContain('details below');
  });

  it('renders without a title when none is given', () => {
    const { container } = render(<IntAlert variant="info">just body</IntAlert>);
    expect(container.querySelector('.adm-alert-body strong')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('just body');
  });

  it('applies the variant CSS class', () => {
    const { container } = render(<IntAlert variant="warn">x</IntAlert>);
    expect(container.querySelector('.adm-alert--warn')).toBeInTheDocument();
  });

  it('renders a custom icon when supplied, replacing the default', () => {
    const { container } = render(
      <IntAlert variant="info" icon={<span data-testid="custom-icon">🦊</span>}>
        body
      </IntAlert>
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    // default icon is a lucide SVG; with custom icon supplied, no <svg> in the icon slot
    const iconSlot = container.querySelector('.adm-alert-icon')!;
    expect(iconSlot.querySelector('svg')).toBeNull();
  });

  it('renders a default icon when no custom icon is given', () => {
    const { container } = render(<IntAlert variant="error">x</IntAlert>);
    const iconSlot = container.querySelector('.adm-alert-icon')!;
    expect(iconSlot.querySelector('svg')).toBeInTheDocument();
  });

  it('forwards className alongside the variant class', () => {
    const { container } = render(
      <IntAlert variant="info" className="extra">
        body
      </IntAlert>
    );
    const root = container.querySelector('.adm-alert')!;
    expect(root.className).toContain('extra');
    expect(root.className).toContain('adm-alert--info');
  });
});
