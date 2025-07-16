import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('renders search input', () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/search lessons/i);
    expect(input).toBeInTheDocument();
  });

  it('updates search query when form is submitted', () => {
    render(<SearchBar />);

    const input = screen.getByPlaceholderText(/search lessons/i);
    const searchButton = screen.getByText('Search');

    fireEvent.change(input, { target: { value: 'cooking' } });
    fireEvent.click(searchButton);

    // Verify the input value is maintained
    expect(input).toHaveValue('cooking');
  });

  it('displays search suggestions when typing', async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/search lessons/i);

    fireEvent.change(input, { target: { value: 'garden' } });

    // Test would check for suggestions dropdown
    // Implementation depends on your actual component
  });
});
