import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotFound } from './NotFound';

describe('NotFound (FP-12 404 page)', () => {
  it('renders friendly copy and a Back to search link to /', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    const back = screen.getByRole('link', { name: /back to search/i });
    expect(back).toHaveAttribute('href', '/');
  });

  it('a catch-all route renders NotFound for an unknown path', () => {
    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          {/* Mirrors production App.tsx's trailing catch-all. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.queryByText('home')).not.toBeInTheDocument();
  });
});
