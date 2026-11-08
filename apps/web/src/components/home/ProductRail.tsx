import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProductCardDto } from '@engineering-lab/shared';
import ProductCard from '../product/ProductCard';
import { ArrowRight } from 'lucide-react';

interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: ProductCardDto[];
  viewAllHref?: string;
  fallback?: ReactNode;
  contained?: boolean;
  home?: boolean;
  loading?: boolean;
}

export default function ProductRail({
  title,
  subtitle: _subtitle,
  products,
  viewAllHref,
  fallback: _fallback,
  contained = true,
  home = false,
  loading = false,
}: ProductRailProps) {
  const { t } = useTranslation();

  const header = (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="h-[32px] w-[4px] rounded-[2px] bg-brand shadow-[0_0_24px_rgba(34,197,94,0.35)]" />
        <h2 className="text-[26px] font-bold leading-none text-content">{title}</h2>
      </div>
      {viewAllHref ? (
        <Link
          to={viewAllHref}
          className="flex items-center gap-2 rounded-[10px] border border-brand bg-[rgba(34,197,94,0.06)] px-4 py-2.5 text-[16px] font-semibold text-brand transition hover:bg-brand hover:text-brand-fg"
        >
          {t('common.viewAll')}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      ) : null}
    </div>
  );

  const cardCols = home
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    : 'grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4';

  // Loading state: show skeleton cards so the page never looks blank.
  if (loading) {
    return (
      <section className={`${contained ? 'container-page ' : ''}py-10`}>
        {header}
        <div className={`grid gap-4.5 ${cardCols}`}>
          {Array.from({ length: home ? 6 : 4 }).map((_, index) => (
            <div key={index} className="product-card-skeleton">
              <div className="aspect-square rounded-[14px] bg-surface-2 skeleton" />
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
                <div className="h-3 w-1/3 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className={`${contained ? 'container-page ' : ''}py-10`}>
        {header}
        <div className="rounded-[14px] border border-line bg-surface p-8 text-center">
          <p className="text-muted">{t('home.featuredEmpty')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${contained ? 'container-page ' : ''}py-10`}>
      {header}
      <div className={`grid gap-4.5 ${cardCols}`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} home={home} />
        ))}
      </div>
    </section>
  );
}
