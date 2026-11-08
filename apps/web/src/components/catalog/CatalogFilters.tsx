import { useState, useEffect, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { BrandDto, CategoryDto, ProductFacets } from '@engineering-lab/shared';
import { formatEGP } from '../../lib/format';
import { getCurrentLang, localizedName } from '../../lib/localized';

interface CatalogFiltersProps {
  categories: CategoryDto[];
  brands: BrandDto[];
  facets?: ProductFacets | null;
  searchParams: URLSearchParams;
  onParamChange: (key: string, value: string | null) => void;
  onClear: () => void;
}

export default function CatalogFilters({
  categories,
  brands,
  facets,
  searchParams,
  onParamChange,
  onClear,
}: CatalogFiltersProps) {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);

  const activeCategory = searchParams.get('category');
  const activeBrand = searchParams.get('brand');
  const activeInStock = searchParams.get('inStock') === 'true';
  const activeMinRating = searchParams.get('minRating');
  const activeMin = searchParams.get('minPrice') ?? '';
  const activeMax = searchParams.get('maxPrice') ?? '';

  const [minPrice, setMinPrice] = useState(activeMin);
  const [maxPrice, setMaxPrice] = useState(activeMax);

  useEffect(() => setMinPrice(activeMin), [activeMin]);
  useEffect(() => setMaxPrice(activeMax), [activeMax]);

  const facetBrands = facets?.brands ?? brands.map((brand) => ({
    slug: brand.slug,
    nameAr: brand.nameAr,
    nameEn: brand.nameEn,
    logoUrl: brand.logoUrl,
    count: brand.productCount,
  }));
  const priceMaxPiasters = facets?.price?.max ?? 0;
  const priceMax = Math.round(priceMaxPiasters / 100);

  function applyPrice(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onParamChange('minPrice', minPrice.trim() || null);
    onParamChange('maxPrice', maxPrice.trim() || null);
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content">{t('catalog.categories')}</h3>
          {activeCategory ? (
            <button type="button" onClick={() => onParamChange('category', null)} className="text-xs link">
              {t('catalog.clear')}
            </button>
          ) : null}
        </div>
        <ul className="space-y-1">
          {categories.map((root) => (
            <li key={root.id}>
              <button
                type="button"
                onClick={() => onParamChange('category', root.slug)}
                className={`block w-full rounded-lg px-3 py-2 text-start text-sm transition ${
                  activeCategory === root.slug
                    ? 'bg-brand/10 font-semibold text-brand'
                    : 'text-content hover:bg-surface2'
                }`}
              >
                {localizedName(root, currentLang)}
                <span className="ms-2 text-xs text-muted">{root.productCount}</span>
              </button>
              {root.children.length > 0 ? (
                <ul className="mt-1 space-y-1 border-s border-line ps-3 ms-3">
                  {root.children.map((child) => (
                    <li key={child.id}>
                      <button
                        type="button"
                        onClick={() => onParamChange('category', child.slug)}
                        className={`block w-full rounded-lg px-3 py-1.5 text-start text-sm transition ${
                          activeCategory === child.slug
                            ? 'font-semibold text-brand'
                            : 'text-muted hover:text-content'
                        }`}
                      >
                        {localizedName(child, currentLang)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="divider pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content">{t('catalog.brands')}</h3>
          {activeBrand ? (
            <button type="button" onClick={() => onParamChange('brand', null)} className="text-xs link">
              {t('catalog.clear')}
            </button>
          ) : null}
        </div>
        <ul className="space-y-1.5">
          {facetBrands.map((brand) => (
            <li key={brand.slug}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-content transition hover:bg-surface2">
                <input
                  type="checkbox"
                  checked={activeBrand === brand.slug}
                  onChange={() => onParamChange('brand', activeBrand === brand.slug ? null : brand.slug)}
                  className="h-4 w-4 rounded border-line accent-brand"
                />
                <span className="truncate">{currentLang === 'en' ? brand.nameEn : brand.nameAr}</span>
                <span className="ms-auto text-xs text-muted">{brand.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="divider pt-5">
        <h3 className="mb-3 text-sm font-semibold text-content">{t('catalog.price')}</h3>
        {priceMax > 0 ? (
          <div className="mb-3">
            <label className="label" htmlFor="price-range">
              {t('catalog.maxPrice')}
            </label>
            <input
              id="price-range"
              type="range"
              min={0}
              max={priceMax}
              step={100}
              value={Number(maxPrice || priceMax)}
              onChange={(event) => setMaxPrice(event.target.value)}
              className="w-full accent-brand"
            />
            <p className="mt-1 text-xs text-muted" dir="ltr">
              {formatEGP(priceMaxPiasters, currentLang)}
            </p>
          </div>
        ) : null}
        <form onSubmit={applyPrice} className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder={t('catalog.minPrice')}
            aria-label={t('catalog.minPrice')}
            className="input"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder={t('catalog.maxPrice')}
            aria-label={t('catalog.maxPrice')}
            className="input"
          />
          <button type="submit" className="btn-secondary shrink-0 px-3 py-2.5">
            {t('catalog.apply')}
          </button>
        </form>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-content">
          <input
            type="checkbox"
            checked={activeInStock}
            onChange={() => onParamChange('inStock', activeInStock ? null : 'true')}
            className="h-4 w-4 rounded border-line accent-brand"
          />
          {t('catalog.inStockOnly')}
          {facets ? <span className="text-xs text-muted">({facets.inStockCount})</span> : null}
        </label>
      </section>

      <section className="divider pt-5">
        <h3 className="mb-3 text-sm font-semibold text-content">{t('catalog.rating')}</h3>
        <div className="flex flex-wrap gap-2">
          {[undefined, '3', '4', '5'].map((value) => {
            const selected = (activeMinRating ?? undefined) === value;
            return (
              <button
                key={value ?? 'all'}
                type="button"
                onClick={() => onParamChange('minRating', value ?? null)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${selected ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface text-muted hover:text-content'}`}
                aria-pressed={selected}
              >
                {value ? `${value}★` : t('catalog.allRatings')}
              </button>
            );
          })}
        </div>
      </section>

      <button type="button" onClick={onClear} className="btn-ghost w-full">
        {t('catalog.resetFilters')}
      </button>
    </div>
  );
}
