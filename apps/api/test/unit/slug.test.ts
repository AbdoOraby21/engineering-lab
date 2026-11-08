import { describe, expect, it } from 'vitest';
import { normalizeSearchText, slugify } from '@engineering-lab/shared';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('normalizeSearchText', () => {
  it('folds alef forms and strips diacritics', () => {
    expect(normalizeSearchText('أَحْمَد')).toBe(normalizeSearchText('أحمد'));
    expect(normalizeSearchText('إبراهيم')).toBe(normalizeSearchText('إبراهيم'));
  });

  it('folds alif maqsura and taa marbuta', () => {
    expect(normalizeSearchText('صحفي')).toBe(normalizeSearchText('صحفي'));
    expect(normalizeSearchText('حكومة')).toBe(normalizeSearchText('حكومة'));
  });

  it('converts Arabic-Indic digits to Latin digits', () => {
    expect(normalizeSearchText('السعر ١٢٣')).toBe('السعر 123');
  });

  it('collapses whitespace', () => {
    expect(normalizeSearchText('وصف   طويل')).toBe('وصف طويل');
  });

  it('removes diacritic marks', () => {
    const withDiacritics = 'مُسْلِمٌ';
    const out = normalizeSearchText(withDiacritics);
    for (const ch of out) {
      const code = ch.charCodeAt(0);
      expect(code < 0x064b || code > 0x065f).toBe(true);
      expect(ch).not.toBe('\u0670');
      expect(ch).not.toBe('\u0640');
    }
  });
});

describe('slugify', () => {
  it('produces a valid slug pattern', () => {
    expect(SLUG_PATTERN.test(slugify('أردوينو أونو'))).toBe(true);
    expect(SLUG_PATTERN.test(slugify('Arduino Uno'))).toBe(true);
  });

  it('is lowercase and contains no spaces', () => {
    const out = slugify('Arduino Uno R3');
    expect(out).toBe(out.toLowerCase());
    expect(out).not.toContain(' ');
  });

  it('collapses and trims separators', () => {
    expect(slugify('---')).toBe('');
    expect(slugify('a   b')).toBe('a-b');
    expect(slugify('  leading  ')).toBe('leading');
  });

  it('truncates long slugs', () => {
    const long = 'x'.repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});
