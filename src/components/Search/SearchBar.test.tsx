import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('renders search input', () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/search lessons/i);
    expect(input).toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText(/search lessons/i);
    const form = screen.getByRole('form');
    
    fireEvent.change(input, { target: { value: 'cooking' } });
    fireEvent.submit(form);
    
    expect(mockOnSearch).toHaveBeenCalledWith('cooking');
  });

  it('displays search suggestions when typing', async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/search lessons/i);
    
    fireEvent.change(input, { target: { value: 'garden' } });
    
    // Test would check for suggestions dropdown
    // Implementation depends on your actual component
  });
});