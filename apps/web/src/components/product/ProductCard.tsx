import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Tag, GitCompareArrows, Cpu as CpuIcon } from 'lucide-react';
import type { ProductCardDto } from '@engineering-lab/shared';
import PriceTag from './PriceTag';
import RatingStars from '../ui/RatingStars';
import WishlistButton from './WishlistButton';
import { useCartStore } from '../../stores/cart.store';
import { useCompareStore } from '../../stores/compare.store';
import { useUiStore } from '../../stores/ui.store';
import { localizedAlt, localizedName, getCurrentLang } from '../../lib/localized';
import { fetchProduct } from '../../lib/catalogApi';

interface ProductCardProps {
  product: ProductCardDto;
  home?: boolean;
}

export default function ProductCard({ product, home = false }: ProductCardProps) {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const currentLang = getCurrentLang(lang);
  const addToCart = useCartStore((state) => state.addItem);
  const setCartOpen = useCartStore((state) => state.setOpen);
  const compareToggle = useCompareStore((state) => state.toggle);
  const compared = useCompareStore((state) => state.items.some((item) => item.id === product.id));
  const addToast = useUiStore((state) => state.addToast);
  const queryClient = useQueryClient();
  const name = localizedName(product, currentLang);
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const discount = onSale ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100) : 0;
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const compare = () => {
    const result = compareToggle(product);
    if (!result.ok && result.message === 'full') {
      addToast(t('compare.limitReached'), 'error');
    } else {
      addToast(compared ? t('compare.removed') : t('compare.added'), 'success');
    }
  };

  if (home) {
    return (
      <Link
        to={`/${currentLang}/products/${product.slug}`}
        className="group relative flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface transition hover:border-brand/50"
        onMouseEnter={() => {
          void queryClient.prefetchQuery({
            queryKey: ['product', product.slug],
            queryFn: () => fetchProduct(product.slug),
            staleTime: 60_000,
          });
        }}
      >
        {/* Image area: pure white, object-contain, padded */}
        <div className="relative h-[235px] w-full overflow-hidden rounded-[14px] bg-white">
          <div className="absolute inset-[14px] flex h-full w-full items-center justify-center">
            {product.primaryImage ? (
              <>
                <img
                  src={product.primaryImage.url}
                  alt={localizedAlt(product.primaryImage, name, currentLang)}
                  loading="lazy"
                  decoding="async"
                  width={600}
                  height={600}
                  className="h-full w-full max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                />
                {product.secondaryImage ? (
                  <img
                    src={product.secondaryImage.url}
                    alt={localizedAlt(product.secondaryImage, name, currentLang)}
                    loading="lazy"
                    decoding="async"
                    width={600}
                    height={600}
                    className="h-full w-full max-h-full max-w-full object-contain opacity-0 transition duration-300 group-hover:opacity-100"
                  />
                ) : null}
              </>
            ) : (
              <span className="text-muted">
                <CpuIcon className="h-12 w-12" />
              </span>
            )}
          </div>
          {/* Badges top-start */}
          <span className="absolute start-3 top-3 flex flex-col gap-1.5">
            {onSale ? (
              <span className="badge bg-red-500/15 text-red-400" dir="ltr">
                -{discount}%
              </span>
            ) : null}
            {product.isNew ? <span className="badge">{t('product.new')}</span> : null}
            {product.isFeatured ? <span className="badge">{t('product.featured')}</span> : null}
            {outOfStock ? (
              <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-500">
                {t('product.outOfStock')}
              </span>
            ) : lowStock ? (
              <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-500">
                {t('product.lowStock', { count: product.stock })}
              </span>
            ) : null}
          </span>
          {/* Floating wishlist/compare icons */}
          <div className="absolute end-3 top-3 z-10 flex flex-col gap-2">
            <WishlistButton productId={product.id} className="h-8 w-8" />
            <button
              type="button"
              onClick={compare}
              aria-pressed={compared}
              aria-label={t('compare.addToCompare')}
              title={t('compare.addToCompare')}
              className={`flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/90 shadow-card backdrop-blur transition hover:border-brand/50 hover:text-brand ${compared ? 'text-brand' : 'text-muted'}`}
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dark info panel */}
        <div className="relative flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted">
              {product.brand
                ? localizedName(product.brand, currentLang)
                : product.category
                  ? localizedName(product.category, currentLang)
                  : ''}
            </span>
            {product.ratingCount > 0 ? (
              <RatingStars value={product.ratingAverage} count={product.ratingCount} size={12} />
            ) : null}
          </div>

          <Link
            to={`/${currentLang}/products/${product.slug}`}
            className="line-clamp-2 min-h-[3rem] text-[15px] font-semibold leading-1.25 text-content transition hover:text-brand"
          >
            {name}
          </Link>

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="flex min-w-0 flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-brand font-bold text-[18px]">{formatPrice(product.price)}</span>
                {onSale ? (
                  <span className="text-muted text-[13px] line-through">
                    {formatPrice(product.compareAtPrice!)}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => {
                addToCart({ product, qty: 1 });
                addToast(t('cart.added'), 'success');
                setCartOpen(true);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[#06110A] font-bold text-xs disabled:opacity-50 transition hover:bg-brand-hover"
              aria-label={t('cart.addToCart')}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant (unchanged behavior)
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-glow-sm">
      <div className="absolute end-3 top-3 z-10 flex flex-col gap-2">
        <WishlistButton productId={product.id} />
        <button
          type="button"
          onClick={compare}
          aria-pressed={compared}
          aria-label={t('compare.addToCompare')}
          title={t('compare.addToCompare')}
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 shadow-card backdrop-blur transition hover:border-brand/50 hover:text-brand ${compared ? 'text-brand' : 'text-muted'}`}
        >
          <GitCompareArrows className="h-4 w-4" />
        </button>
      </div>

      <Link
        to={`/${currentLang}/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-surface2"
        onMouseEnter={() => {
          void queryClient.prefetchQuery({
            queryKey: ['product', product.slug],
            queryFn: () => fetchProduct(product.slug),
            staleTime: 60_000,
          });
        }}
      >
        {product.primaryImage ? (
          <>
            <img
              src={product.primaryImage.url}
              alt={localizedAlt(product.primaryImage, name, currentLang)}
              loading="lazy"
              decoding="async"
              width={600}
              height={600}
              className={`absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105 ${product.secondaryImage ? 'group-hover:opacity-0' : ''}`}
            />
            {product.secondaryImage ? (
              <img
                src={product.secondaryImage.url}
                alt={localizedAlt(product.secondaryImage, name, currentLang)}
                loading="lazy"
                decoding="async"
                width={600}
                height={600}
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100"
              />
            ) : null}
          </>
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <CpuIcon className="h-12 w-12" />
          </span>
        )}

        <span className="absolute start-3 top-3 flex max-w-[60%] flex-col items-start gap-1.5">
          {onSale ? (
            <span className="badge bg-red-500/15 text-red-400" dir="ltr">
              -{discount}%
            </span>
          ) : null}
          {product.isNew ? <span className="badge">{t('product.new')}</span> : null}
          {product.isFeatured ? <span className="badge">{t('product.featured')}</span> : null}
          {outOfStock ? (
            <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-500">
              {t('product.outOfStock')}
            </span>
          ) : lowStock ? (
            <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-500">
              {t('product.lowStock', { count: product.stock })}
            </span>
          ) : null}
        </span>
      </Link>

      <div className="relative flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted">
            {product.brand
              ? localizedName(product.brand, currentLang)
              : product.category
                ? localizedName(product.category, currentLang)
                : ''}
          </span>
          {product.ratingCount > 0 ? (
            <RatingStars value={product.ratingAverage} count={product.ratingCount} size={12} />
          ) : null}
        </div>

        <Link
          to={`/${currentLang}/products/${product.slug}`}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-content transition hover:text-brand"
        >
          {name}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} lang={currentLang} />
          </div>
          {product.isBundle ? (
            <span className="flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-[11px] font-medium text-brand">
              <Tag className="h-3 w-3" />
              {t('product.bundle')}
            </span>
          ) : null}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => {
              addToCart({ product, qty: 1 });
              addToast(t('cart.added'), 'success');
              setCartOpen(true);
            }}
            className="btn-primary min-h-[44px] px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {t('cart.addToCart')}
          </button>
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => {
              addToCart({ product, qty: 1 });
              navigate(`/${currentLang}/cart`);
            }}
            className="btn-secondary min-h-[44px] px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('cart.buyNow')}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatPrice(piasters: number): string {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(piasters / 100);
}
