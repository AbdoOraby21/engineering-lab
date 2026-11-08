import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { listWishlist } from '../lib/wishlistApi';
import ProductCard from '../components/product/ProductCard';
import Skeleton from '../components/ui/Skeleton';

export default function WishlistPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';

  const wishlistQuery = useQuery({
    queryKey: ['wishlist', 'items'],
    queryFn: listWishlist,
  });

  const items = wishlistQuery.data ?? [];

  return (
    <div className="container-page animate-fade-in py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-content">{t('wishlist.title')}</h1>
        <p className="mt-1 text-sm text-muted">
          {t('wishlist.subtitle', { count: items.length })}
        </p>
      </div>

      {wishlistQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-square" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/40 px-6 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Heart className="h-7 w-7" />
          </span>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted">{t('wishlist.empty')}</p>
          <Link to={`/${currentLang}/catalog`} className="btn-primary mt-6">
            {t('home.shopNow')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
}
