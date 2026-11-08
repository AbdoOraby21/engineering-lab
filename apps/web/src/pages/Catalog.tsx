import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, PackageSearch, LayoutGrid, List } from 'lucide-react';
import type { ProductSort } from '@engineering-lab/shared';
import { getCategory, listBrands, listCategories, listProducts } from '../lib/catalogApi';
import ProductCard from '../components/product/ProductCard';
import CatalogFilters from '../components/catalog/CatalogFilters';
import Pagination from '../components/ui/Pagination';
import Skeleton from '../components/ui/Skeleton';
import SeoHead from '../components/SeoHead';
import { getCurrentLang, localizedName } from '../lib/localized';

const SORT_OPTIONS: ProductSort[] = [
  'relevance',
  'newest',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
  'popular',
  'rating',
];

export default function CatalogPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const params = useMemo(() => {
    const sort = searchParams.get('sort');
    const page = Number(searchParams.get('page') ?? '1');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    return {
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      brand: searchParams.get('brand') ?? undefined,
      minPrice: minPrice ? Number(minPrice) * 100 : undefined,
      maxPrice: maxPrice ? Number(maxPrice) * 100 : undefined,
      inStock: searchParams.get('inStock') === 'true' ? true : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      onSale: searchParams.get('onSale') === 'true' ? true : undefined,
      sort: (SORT_OPTIONS.includes(sort as ProductSort) ? sort : undefined) as ProductSort | undefined,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: 12,
    };
  }, [searchParams]);

  const productsQuery = useQuery({
    queryKey: ['products', 'list', params],
    queryFn: () => listProducts(params),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });

  const brandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: listBrands,
    staleTime: 5 * 60_000,
  });

  const categorySlug = params.category;
  const categoryQuery = useQuery({
    queryKey: ['category', categorySlug],
    queryFn: () => getCategory(categorySlug!),
    enabled: Boolean(categorySlug),
    staleTime: 5 * 60_000,
  });

  function setParam(key: string, value: string | null): void {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key !== 'page') {
      next.delete('page');
    }
    setSearchParams(next, { replace: false });
  }

  function clearFilters(): void {
    const next = new URLSearchParams();
    const q = searchParams.get('q');
    if (q) next.set('q', q);
    setSearchParams(next);
  }

  const title = params.q
    ? t('catalog.resultsFor', { query: params.q })
    : categoryQuery.data
      ? localizedName(categoryQuery.data, currentLang)
      : t('catalog.title');

  const products = productsQuery.data?.items ?? [];
  const pagination = productsQuery.data?.pagination;
  const facets = productsQuery.data?.facets ?? null;

  return (
    <div className="container-page animate-fade-in py-8">
      <SeoHead title={`${title} | ${t('common.appName')}`} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content sm:text-3xl">{title}</h1>
          {pagination ? (
            <p className="mt-1 text-sm text-muted">
              {t('catalog.itemCount', { count: pagination.total })}
            </p>
          ) : null}
          {categoryQuery.data?.descriptionAr || categoryQuery.data?.descriptionEn ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {currentLang === 'en' ? categoryQuery.data.descriptionEn : categoryQuery.data.descriptionAr}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-line bg-surface p-1" role="group" aria-label={t('catalog.view')}>
            <button
              type="button"
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
              aria-label={t('catalog.gridView')}
              className={`flex h-9 w-9 items-center justify-center rounded-full ${view === 'grid' ? 'bg-brand text-brand-fg' : 'text-muted'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              aria-label={t('catalog.listView')}
              className={`flex h-9 w-9 items-center justify-center rounded-full ${view === 'list' ? 'bg-brand text-brand-fg' : 'text-muted'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button type="button" className="btn-secondary lg:hidden" onClick={() => setFiltersOpen((open) => !open)}>
            <SlidersHorizontal className="h-4 w-4" />
            {t('catalog.filters')}
          </button>
          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">{t('catalog.sortBy')}</span>
            <select
              value={params.sort ?? 'relevance'}
              onChange={(event) => setParam('sort', event.target.value)}
              className="input w-auto"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`catalog.sort.${option}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="card sticky top-28 p-5">
            <CatalogFilters
              categories={categoriesQuery.data ?? []}
              brands={brandsQuery.data ?? []}
              facets={facets}
              searchParams={searchParams}
              onParamChange={setParam}
              onClear={clearFilters}
            />
          </div>
        </aside>

        <div>
          {productsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="aspect-square" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/40 px-6 py-20 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <PackageSearch className="h-7 w-7" />
              </span>
              <p className="mt-5 max-w-md text-sm leading-7 text-muted">{t('catalog.empty')}</p>
              {params.q ? (
                <p className="mt-3">
                  <Link to={`/${currentLang}/catalog`} className="link">
                    {t('catalog.browseAll')}
                  </Link>
                </p>
              ) : null}
              <button type="button" onClick={clearFilters} className="btn-secondary mt-6">
                {t('catalog.resetFilters')}
              </button>
            </div>
          ) : (
            <>
              <div className={view === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3' : 'space-y-4'}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {pagination ? <Pagination pagination={pagination} onPageChange={(page) => setParam('page', String(page))} /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
