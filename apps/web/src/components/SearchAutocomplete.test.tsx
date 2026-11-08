import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AutocompleteSuggestionDto } from '@engineering-lab/shared';

const suggestions: AutocompleteSuggestionDto[] = [
  {
    kind: 'product',
    id: 'p1',
    nameAr: 'أردوينو أونو',
    nameEn: 'Arduino Uno',
    slug: 'arduino-uno',
    price: 50000,
    imageUrl: '/img.jpg',
  },
  {
    kind: 'category',
    id: 'c1',
    nameAr: 'لوحات التطوير',
    nameEn: 'Development Boards',
    slug: 'development-boards',
  },
];

vi.mock('../lib/catalogApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/catalogApi')>();
  return { ...actual, fetchSuggestions: vi.fn(async () => suggestions) };
});

import SearchAutocomplete from './SearchAutocomplete';

function Harness({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/en']}>
        <Routes>
          <Route path="/:lang" element={<SearchAutocomplete value={value} onChange={setValue} onSubmit={onSubmit} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SearchAutocomplete', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows suggestions and supports keyboard navigation', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'uno' } });

    const product = await screen.findByRole('option', { name: /arduino uno/i });
    expect(product).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(input).toHaveAttribute('aria-activedescendant');
    });
  });

  it('submits the query through the results button', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'uno' } });

    fireEvent.click(await screen.findByRole('button', { name: /view all results/i }));
    expect(onSubmit).toHaveBeenCalledWith('uno');
  });
});
