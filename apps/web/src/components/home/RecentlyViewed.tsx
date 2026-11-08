import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { fetchByIds } from '../../lib/catalogApi';
import { useRecentStore } from '../../stores/recent.store';
import ProductCard from '../product/ProductCard';
import Skeleton from '../ui/Skeleton';

export default function RecentlyViewed() {
  const { t } = useTranslation();
  const ids = useRecentStore((state) => state.ids);
  const query = useQuery({
    queryKey: ['recent', ids.join(',')],
    queryFn: () => fetchByIds(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  if (ids.length === 0) return null;
  if (query.isLoading) {
    return (
      <section className="container-page py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-square" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const products = (query.data ?? []).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  if (products.length === 0) return null;

  return (
    <section className="container-page py-10">
      <div className="mb-6 flex items-center gap-2">
        <Clock className="h-5 w-5 text-brand" />
        <h2 className="text-2xl font-bold text-content">{t('recent.title')}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
