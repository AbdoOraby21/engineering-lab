import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { BrandDto, CategoryDto } from '@engineering-lab/shared';
import CatalogFilters from './CatalogFilters';

const categories: CategoryDto[] = [
  {
    id: 'c1',
    nameAr: 'أقسام',
    nameEn: 'Category',
    slug: 'electronics',
    descriptionAr: null,
    descriptionEn: null,
    imageUrl: null,
    sortOrder: 0,
    parentId: null,
    productCount: 10,
    icon: null,
    isActive: true,
    children: [
      {
        id: 'c2',
        nameAr: 'لوحات',
        nameEn: 'Boards',
        slug: 'boards',
        descriptionAr: null,
        descriptionEn: null,
        imageUrl: null,
        sortOrder: 0,
        parentId: 'c1',
        productCount: 5,
        icon: null,
        isActive: true,
        children: [],
      },
    ],
  },
];

const brands: BrandDto[] = [
  { id: 'b1', nameAr: 'ماركة', nameEn: 'Brand', slug: 'brand', logoUrl: null, descriptionAr: null, descriptionEn: null, websiteUrl: null, sortOrder: 0, isActive: true, productCount: 4 },
];

function renderFilters(search = '', onParamChange = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[`/en/catalog${search}`]}>
      <CatalogFilters
        categories={categories}
        brands={brands}
        searchParams={new URLSearchParams(search.replace('?', ''))}
        onParamChange={onParamChange}
        onClear={vi.fn()}
      />
    </MemoryRouter>,
  );
  return onParamChange;
}

describe('CatalogFilters URL sync', () => {
  it('toggles category, brand, rating and stock filters through callbacks', () => {
    const onParamChange = renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /أقسام10/ }));
    expect(onParamChange).toHaveBeenCalledWith('category', 'electronics');

    fireEvent.click(screen.getByRole('checkbox', { name: /ماركة4/ }));
    expect(onParamChange).toHaveBeenCalledWith('brand', 'brand');
  });

  it('reflects active filters from the URL', () => {
    renderFilters('?category=electronics&brand=brand&inStock=true&minRating=4');
    expect(screen.getByRole('checkbox', { name: /ماركة4/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /in stock only/i })).toBeChecked();
    expect(screen.getByRole('button', { name: /4★/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
