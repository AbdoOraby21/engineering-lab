import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Tags } from 'lucide-react';
import { listBrands, listProducts } from '../lib/catalogApi';
import { getCurrentLang, localizedName } from '../lib/localized';
import ProductCard from '../components/product/ProductCard';
import Pagination from '../components/ui/Pagination';
import SeoHead from '../components/SeoHead';
import Skeleton from '../components/ui/Skeleton';

export default function BrandPage() {
  const { t } = useTranslation();
  const { lang, slug } = useParams<{ lang: string; slug: string }>();
  const currentLang = getCurrentLang(lang);
  const [page, setPage] = useState(1);

  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: listBrands, staleTime: 5 * 60_000 });
  const brand = brandsQuery.data?.find((item) => item.slug === slug);
  const productsQuery = useQuery({
    queryKey: ['brand-products', slug, page],
    queryFn: () => listProducts({ brand: slug!, page, pageSize: 24 }),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  if (brandsQuery.isLoading || !brand) {
    return (
      <div className="container-page py-10">
        <SeoHead title={`${t('brand.title')} | ${t('common.appName')}`} />
        {brandsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-square" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted">{t('brand.notFound')}</div>
        )}
      </div>
    );
  }

  const products = productsQuery.data?.items ?? [];
  const pagination = productsQuery.data?.pagination;

  return (
    <div className="container-page animate-fade-in py-10">
      <SeoHead title={`${localizedName(brand, currentLang)} | ${t('common.appName')}`} />
      <div className="mb-8 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-brand">
          {brand.logoUrl ? <img src={brand.logoUrl} alt={localizedName(brand, currentLang)} className="h-full w-full object-cover" /> : <Tags className="h-7 w-7" />}
        </span>
        <div>
          <h1 className="text-3xl font-bold text-content">{localizedName(brand, currentLang)}</h1>
          <p className="mt-1 text-sm text-muted">{t('brand.productCount', { count: brand.productCount })}</p>
        </div>
      </div>

      {productsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-square" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center text-sm text-muted">
          {t('brand.empty')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {pagination ? (
            <Pagination pagination={pagination} onPageChange={setPage} />
          ) : null}
          <p className="mt-4 text-center text-xs text-muted">
            <Link to={`/${currentLang}/catalog?brand=${brand.slug}`} className="link">{t('common.viewAll')}</Link>
          </p>
        </>
      )}
    </div>
  );
}
