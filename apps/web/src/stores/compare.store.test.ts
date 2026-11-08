import { beforeEach, describe, expect, it } from 'vitest';
import type { ProductCardDto } from '@engineering-lab/shared';
import { COMPARE_MAX, useCompareStore } from './compare.store';

function product(id: string): ProductCardDto {
  return {
    id,
    nameAr: `منتج ${id}`,
    nameEn: `Product ${id}`,
    slug: `product-${id}`,
    sku: `SKU-${id}`,
    price: 1000,
    compareAtPrice: null,
    discountPercent: null,
    stock: 1,
    isFeatured: false,
    isNew: false,
    isBundle: false,
    type: 'SIMPLE',
    ratingAverage: 4,
    ratingCount: 1,
    tags: [],
    primaryImage: null,
    secondaryImage: null,
    brand: null,
    category: { id: 'c1', nameAr: 'فئة', nameEn: 'Category', slug: 'category' },
    soldCount: 0,
  };
}

describe('compare store', () => {
  beforeEach(() => {
    localStorage.clear();
    useCompareStore.setState({ items: [] });
  });

  it('toggles products and enforces the limit of 4', () => {
    const store = useCompareStore.getState();
    expect(store.toggle(product('1')).ok).toBe(true);
    expect(store.toggle(product('2')).ok).toBe(true);
    expect(store.toggle(product('3')).ok).toBe(true);
    expect(store.toggle(product('4')).ok).toBe(true);

    const blocked = useCompareStore.getState().toggle(product('5'));
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toBe('full');
    expect(useCompareStore.getState().items).toHaveLength(COMPARE_MAX);

    useCompareStore.getState().toggle(product('2'));
    expect(useCompareStore.getState().items.map((item) => item.id)).toEqual(['1', '3', '4']);
  });
});
