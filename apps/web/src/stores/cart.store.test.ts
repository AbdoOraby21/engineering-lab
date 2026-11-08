import { beforeEach, describe, expect, it } from 'vitest';
import type { ProductCardDto } from '@engineering-lab/shared';
import { cartCount, cartSubtotal, useCartStore } from './cart.store';

function product(overrides: Partial<ProductCardDto> = {}): ProductCardDto {
  return {
    id: 'p1',
    nameAr: 'منتج',
    nameEn: 'Product',
    slug: 'product',
    sku: 'SKU-1',
    price: 10000,
    compareAtPrice: null,
    discountPercent: null,
    stock: 5,
    isFeatured: false,
    isNew: false,
    isBundle: false,
    type: 'SIMPLE',
    ratingAverage: 4,
    ratingCount: 2,
    tags: [],
    primaryImage: { id: 'i1', url: '/img.jpg', altAr: null, altEn: null, sortOrder: 0 },
    secondaryImage: null,
    brand: null,
    category: { id: 'c1', nameAr: 'فئة', nameEn: 'Category', slug: 'category' },
    soldCount: 0,
    ...overrides,
  };
}

describe('cart store', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [], open: false });
  });

  it('adds, merges, caps quantity and totals items', () => {
    const store = useCartStore.getState();
    store.addItem({ product: product(), qty: 2 });
    store.addItem({ product: product(), qty: 10 });

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]?.qty).toBe(5);
    expect(cartCount(items)).toBe(5);
    expect(cartSubtotal(items)).toBe(50000);
  });

  it('updates quantity, removes and persists', () => {
    const store = useCartStore.getState();
    store.addItem({ product: product(), qty: 1 });
    useCartStore.getState().updateQty('p1', 3);
    expect(useCartStore.getState().items[0]?.qty).toBe(3);

    const stored = JSON.parse(localStorage.getItem('el_cart') ?? '{}') as {
      state?: { items?: unknown[] };
    };
    expect(stored.state?.items).toHaveLength(1);

    useCartStore.getState().removeItem('p1');
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('applies variant price deltas and caps at variant stock', () => {
    useCartStore.getState().addItem({
      product: product(),
      variant: { id: 'v1', nameAr: 'متغير', nameEn: 'Variant', priceDelta: 2500, stock: 2 },
      qty: 5,
    });
    const item = useCartStore.getState().items[0];
    expect(item?.price).toBe(12500);
    expect(item?.qty).toBe(2);
  });
});
