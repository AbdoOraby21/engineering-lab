import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ProductCardDto } from '@engineering-lab/shared';
import ProductCard from './ProductCard';
import { useCartStore } from '../../stores/cart.store';
import { useCompareStore } from '../../stores/compare.store';

function product(overrides: Partial<ProductCardDto> = {}): ProductCardDto {
  return {
    id: 'p1',
    nameAr: 'أردوينو أونو',
    nameEn: 'Arduino Uno',
    slug: 'arduino-uno',
    sku: 'SKU-1',
    price: 50000,
    compareAtPrice: 65000,
    discountPercent: 23,
    stock: 2,
    isFeatured: true,
    isNew: true,
    isBundle: false,
    type: 'SIMPLE',
    ratingAverage: 4.5,
    ratingCount: 12,
    tags: [],
    primaryImage: { id: 'i1', url: '/img.jpg', altAr: null, altEn: null, sortOrder: 0 },
    secondaryImage: { id: 'i2', url: '/img2.jpg', altAr: null, altEn: null, sortOrder: 1 },
    brand: { id: 'b1', nameAr: 'أردوينو', nameEn: 'Arduino', slug: 'arduino', logoUrl: null },
    category: { id: 'c1', nameAr: 'فئة', nameEn: 'Category', slug: 'category' },
    soldCount: 10,
    ...overrides,
  };
}

function renderCard(item = product()) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/en/products/arduino-uno']}>
        <Routes>
          <Route path="/:lang/products/:slug" element={<ProductCard product={item} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductCard', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [], open: false });
    useCompareStore.setState({ items: [] });
    vi.restoreAllMocks();
  });

  it('renders localized name, prices and sale badge', () => {
    renderCard();
    expect(screen.getByText('Arduino Uno')).toBeInTheDocument();
    expect(screen.getByText('-23%')).toBeInTheDocument();
  });

  it('adds the product to the cart and opens the drawer', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
    expect(useCartStore.getState().items[0]?.productId).toBe('p1');
    expect(useCartStore.getState().open).toBe(true);
  });

  it('toggles compare state', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /compare/i }));
    expect(useCompareStore.getState().items).toHaveLength(1);
  });
});
