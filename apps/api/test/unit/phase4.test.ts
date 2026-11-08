import { describe, expect, it } from 'vitest';
import { shapeArabic } from '../../src/services/invoice.service.js';
import { availableStock } from '../../src/services/inventory.service.js';

describe('shapeArabic (invoice Arabic shaping)', () => {
  it('connects dual-joining letters in medial position', () => {
    // 'كمية' (quantity): ك م ي ة — the middle letters should be medial forms.
    const out = shapeArabic('كمية');
    expect(out).not.toBe('كمية');
    // At least one letter should map to a presentation form (connected).
    const hasPresentation = [...out].some((ch) => ch.charCodeAt(0) >= 0xfe70);
    expect(hasPresentation).toBe(true);
  });

  it('leaves non-Arabic text untouched', () => {
    expect(shapeArabic('Invoice #123')).toBe('Invoice #123');
    expect(shapeArabic('Total: 250.00 EGP')).toBe('Total: 250.00 EGP');
  });

  it('handles empty string', () => {
    expect(shapeArabic('')).toBe('');
  });
});

describe('availableStock (bundle stock deduction)', () => {
  it('computes bundle availability as the limiting component', () => {
    const stock = availableStock({
      type: 'BUNDLE',
      stock: 100,
      reservedStock: 0,
      bundleItems: [
        { quantity: 2, component: { stock: 10, reservedStock: 0 } },
        { quantity: 1, component: { stock: 100, reservedStock: 0 } },
      ],
    });
    expect(stock).toBe(5); // floor(10 / 2) = 5
  });

  it('returns 0 for simple product with no stock', () => {
    expect(
      availableStock({ type: 'SIMPLE', stock: 0, reservedStock: 0, bundleItems: [] }),
    ).toBe(0);
  });

  it('accounts for reserved stock in simple products', () => {
    expect(
      availableStock({ type: 'SIMPLE', stock: 10, reservedStock: 6, bundleItems: [] }),
    ).toBe(4);
  });
});
