import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Cpu,
  Download,
  Heart,
  Layers,
  PackageCheck,
  Share2,
  ShoppingCart,
  Star,
  GitCompareArrows,
  X,
  ZoomIn,
} from 'lucide-react';
import { createReview, fetchProduct, fetchRelated, fetchReviews } from '../lib/catalogApi';
import { formatDate } from '../lib/format';
import { getCurrentLang, localizedAlt, localizedName } from '../lib/localized';
import { useToggleWishlist } from '../hooks/useWishlist';
import { useCompareStore } from '../stores/compare.store';
import { useRecentStore } from '../stores/recent.store';
import { useCartStore } from '../stores/cart.store';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import { useErrorMessage } from '../lib/errors';
import PriceTag from '../components/product/PriceTag';
import QuantityStepper from '../components/ui/QuantityStepper';
import ProductCard from '../components/product/ProductCard';
import RatingStars from '../components/ui/RatingStars';
import Pagination from '../components/ui/Pagination';
import Skeleton from '../components/ui/Skeleton';
import SeoHead from '../components/SeoHead';

export default function ProductPage() {
  const { t } = useTranslation();
  const { lang, slug } = useParams<{ lang: string; slug: string }>();
  const currentLang = getCurrentLang(lang);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const [imageIndex, setImageIndex] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  const productQuery = useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProduct(slug!),
    enabled: Boolean(slug),
  });

  const product = productQuery.data;

  const relatedQuery = useQuery({
    queryKey: ['product', slug, 'related'],
    queryFn: () => fetchRelated(slug!, 8),
    enabled: Boolean(slug),
  });

  const reviewsQuery = useQuery({
    queryKey: ['product', slug, 'reviews', reviewPage],
    queryFn: () => fetchReviews(slug!, reviewPage, 5),
    enabled: Boolean(slug),
    staleTime: 30_000,
  });

  const addRecent = useRecentStore((state) => state.add);
  const addToCart = useCartStore((state) => state.addItem);
  const setCartOpen = useCartStore((state) => state.setOpen);
  const compareToggle = useCompareStore((state) => state.toggle);

  useEffect(() => {
    setImageIndex(0);
    setReviewPage(1);
    setVariantId(null);
    setQty(1);
  }, [slug]);

  useEffect(() => {
    if (product) addRecent(product.id);
  }, [product, addRecent]);

  const wishlist = useToggleWishlist(product?.id ?? '');
  const selectedVariant = useMemo(
    () => product?.variants.find((variant) => variant.id === variantId) ?? null,
    [product, variantId],
  );
  const unitPrice = product ? product.price + (selectedVariant?.priceDelta ?? 0) : 0;
  const stock = selectedVariant ? selectedVariant.stock : product?.availableStock ?? product?.stock ?? 0;
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && product && stock <= product.lowStockThreshold;

  const createReviewMutation = useMutation({
    mutationFn: () =>
      createReview(slug!, {
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
      }),
    onSuccess: () => {
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
      addToast(t('reviews.submitted'), 'success');
      void queryClient.invalidateQueries({ queryKey: ['product', slug, 'reviews'] });
    },
    onError: (error) => {
      const code = String((error as { code?: string }).code ?? '');
      if (code === 'PURCHASE_REQUIRED') addToast(t('reviews.purchaseRequired'), 'error');
      else if (code === 'REVIEW_ALREADY_EXISTS') addToast(t('reviews.alreadyExists'), 'error');
      else addToast(getErrorMessage(error), 'error');
    },
  });

  if (productQuery.isLoading) {
    return (
      <div className="container-page grid gap-8 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-content">{t('product.notFound')}</p>
        <Link to={`/${currentLang}/catalog`} className="btn-primary mt-6">
          {t('common.categories')}
        </Link>
      </div>
    );
  }

  const name = localizedName(product, currentLang);
  const description = currentLang === 'en' ? product.descriptionEn : product.descriptionAr;
  const images = product.images.length > 0 ? product.images : [];
  const activeImage = images[imageIndex] ?? images[0] ?? null;
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const discount = onSale ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100) : 0;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const imageUrl = activeImage?.url?.startsWith('http') ? activeImage.url : activeImage?.url ? `${origin}${activeImage.url}` : undefined;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: currentLang === 'en' ? product.seoDescriptionEn ?? description : product.seoDescriptionAr ?? description,
    sku: product.sku,
    image: imageUrl,
    brand: product.brand ? { '@type': 'Brand', name: localizedName(product.brand, currentLang) } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EGP',
      price: (unitPrice / 100).toFixed(2),
      availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
    aggregateRating: product.ratingCount > 0 ? { '@type': 'AggregateRating', ratingValue: product.ratingAverage, reviewCount: product.ratingCount } : undefined,
  };

  function compare() {
    const result = compareToggle(product!);
    if (!result.ok) addToast(t('compare.limitReached'), 'error');
    else addToast(t('compare.added'), 'success');
  }

  function addToCartAndOpen() {
    addToCart({ product: product!, variant: selectedVariant, qty });
    addToast(t('cart.added'), 'success');
    setCartOpen(true);
  }

  function buyNow() {
    addToCart({ product: product!, variant: selectedVariant, qty });
    navigate(`/${currentLang}/cart`);
  }

  function share() {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: name, url });
    } else {
      void navigator.clipboard.writeText(url);
      addToast(t('product.linkCopied'), 'success');
    }
  }

  return (
    <div className="container-page animate-fade-in py-8 pb-24 lg:pb-8">
      <SeoHead
        title={(currentLang === 'en' ? product.seoTitleEn : product.seoTitleAr) ?? `${name} | ${t('common.appName')}`}
        description={currentLang === 'en' ? product.seoDescriptionEn : product.seoDescriptionAr}
        image={imageUrl}
        jsonLd={jsonLd}
      />
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="breadcrumb">
        <Link to={`/${currentLang}`} className="hover:text-brand">
          {t('common.home')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <Link to={`/${currentLang}/catalog`} className="hover:text-brand">
          {t('catalog.title')}
        </Link>
        {product.breadcrumb.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
            <Link to={`/${currentLang}/catalog?category=${item.slug}`} className="hover:text-brand">
              {localizedName(item, currentLang)}
            </Link>
          </span>
        ))}
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="truncate text-content">{name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div
            className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-surface2"
            onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => {
              if (touchStartX === null || images.length < 2) return;
              const diff = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
              if (Math.abs(diff) > 40) {
                setImageIndex((index) => (index + (diff > 0 ? -1 : 1) + images.length) % images.length);
              }
              setTouchStartX(null);
            }}
          >
            {activeImage ? (
              <img
                src={activeImage.url}
                alt={localizedAlt(activeImage, name, currentLang)}
                className="h-full w-full object-cover transition-transform duration-300 lg:hover:scale-125"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-muted">
                <Cpu className="h-16 w-16" />
              </span>
            )}
            <button type="button" onClick={() => setZoomOpen(true)} aria-label={t('product.zoom')} className="absolute bottom-4 end-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-content shadow-card">
              <ZoomIn className="h-5 w-5" />
            </button>
            <span className="absolute start-4 top-4 flex flex-col items-start gap-1.5">
              {onSale ? <span className="badge bg-red-500/15 text-red-400" dir="ltr">-{discount}%</span> : null}
              {product.isNew ? <span className="badge">{t('product.new')}</span> : null}
              {product.isFeatured ? <span className="badge">{t('product.featured')}</span> : null}
            </span>
          </div>

          {images.length > 1 ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label={t('product.gallery')}>
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  role="tab"
                  aria-selected={index === imageIndex}
                  onClick={() => setImageIndex(index)}
                  aria-label={`${t('product.image')} ${index + 1}`}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${index === imageIndex ? 'border-brand' : 'border-line hover:border-muted'}`}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              {product.brand ? (
                <Link to={`/${currentLang}/catalog?brand=${product.brand.slug}`} className="link">
                  {localizedName(product.brand, currentLang)}
                </Link>
              ) : null}
              <span className="rounded bg-surface2 px-2 py-0.5 text-xs" dir="ltr">{product.sku}</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-content">{name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <RatingStars value={product.ratingAverage} count={product.ratingCount} size={16} />
              <span className="text-sm text-muted">{t('product.soldCount', { count: product.soldCount })}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-end gap-3">
              <PriceTag price={unitPrice} compareAtPrice={product.compareAtPrice} lang={currentLang} size="lg" />
              {selectedVariant ? (
                <span className="text-xs text-muted">
                  {t('product.variant')}: {localizedName(selectedVariant, currentLang)} <span dir="ltr">({selectedVariant.sku})</span>
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={`badge ${outOfStock ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-brand/30 bg-brand/10 text-brand'}`}>
                <PackageCheck className="h-3.5 w-3.5" />
                {outOfStock ? t('product.outOfStock') : lowStock ? t('product.lowStock', { count: stock }) : t('product.inStock')}
              </span>
            </div>

            {product.variants.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-content">{t('product.variants')}</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('product.variants')}>
                  {product.variants.map((variant) => {
                    const selected = variant.id === variantId;
                    const disabled = variant.stock <= 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => {
                          setVariantId(variant.id);
                          setQty(1);
                        }}
                        className={`rounded-xl border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${selected ? 'border-brand bg-brand/10 font-semibold text-brand' : 'border-line bg-surface2 text-content hover:border-brand/50'}`}
                      >
                        {localizedName(variant, currentLang)}
                        <span className="ms-2 text-xs text-muted" dir="ltr">
                          {variant.priceDelta === 0 ? t('product.basePrice') : `${variant.priceDelta > 0 ? '+' : ''}${variant.priceDelta / 100} ${currentLang === 'ar' ? 'ج.م' : 'EGP'}`}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setVariantId(null)}
                    className={`rounded-xl border px-3 py-2 text-sm ${variantId === null ? 'border-brand bg-brand/10 font-semibold text-brand' : 'border-line bg-surface2 text-content'}`}
                  >
                    {t('product.baseVariant')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <QuantityStepper value={qty} max={Math.max(stock, 1)} onChange={setQty} />
              <button type="button" disabled={outOfStock} onClick={addToCartAndOpen} className="btn-primary min-h-[44px] flex-1 px-4 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
                <ShoppingCart className="h-4 w-4" />
                {t('cart.addToCart')}
              </button>
              <button type="button" disabled={outOfStock} onClick={buyNow} className="btn-secondary min-h-[44px] disabled:cursor-not-allowed disabled:opacity-50">
                {t('cart.buyNow')}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={wishlist.toggle}
                disabled={wishlist.isPending}
                className={`btn min-h-[44px] ${wishlist.isWishlisted ? 'border border-brand/50 bg-brand/10 text-brand' : 'btn-secondary'}`}
                aria-pressed={wishlist.isWishlisted}
              >
                <Heart className={`h-4 w-4 ${wishlist.isWishlisted ? 'fill-current' : ''}`} />
                {wishlist.isWishlisted ? t('product.inWishlist') : t('product.addToWishlist')}
              </button>
              <button type="button" onClick={compare} className="btn-secondary min-h-[44px]">
                <GitCompareArrows className="h-4 w-4" />
                {t('compare.addToCompare')}
              </button>
              <button type="button" onClick={share} className="btn-secondary min-h-[44px]">
                <Share2 className="h-4 w-4" />
                {t('product.share')}
              </button>
              {product.datasheetUrl ? (
                <a href={product.datasheetUrl} target="_blank" rel="noreferrer" className="btn-secondary min-h-[44px]">
                  <Download className="h-4 w-4" />
                  {t('product.datasheet')}
                </a>
              ) : null}
            </div>
          </div>

          <p className="text-sm leading-7 text-muted">{description}</p>
        </div>
      </div>

      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-bold text-content">{t('product.description')}</h2>
          <div className="card whitespace-pre-wrap p-5 text-sm leading-8 text-muted">{description}</div>
        </div>
        <div>
          {product.specs.length > 0 ? (
            <>
              <h2 className="mb-4 text-xl font-bold text-content">{t('product.specs')}</h2>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {product.specs.map((spec, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-surface2/50' : ''}>
                        <th className="w-1/3 px-4 py-3 text-start font-medium text-muted">{currentLang === 'en' ? spec.keyEn : spec.keyAr}</th>
                        <td className="px-4 py-3 text-content" dir="auto">{currentLang === 'en' ? spec.valueEn : spec.valueAr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {product.bundleItems.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-content">
            <Layers className="h-5 w-5 text-brand" />
            {t('product.bundleContents')}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {product.bundleItems.map((item) => (
              <div key={item.id} className="relative">
                <span className="absolute -start-2 -top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-brand-fg" dir="ltr">
                  ×{item.quantity}
                </span>
                <ProductCard product={item.component} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-content">{t('product.reviews')}</h2>
        {reviewsQuery.data ? (
          <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <div className="card flex h-fit flex-col items-center gap-3 p-6 text-center">
              <span className="text-5xl font-extrabold text-content">{reviewsQuery.data.summary.average.toFixed(1)}</span>
              <RatingStars value={reviewsQuery.data.summary.average} size={18} />
              <span className="text-sm text-muted">{t('product.reviewCount', { count: reviewsQuery.data.summary.count })}</span>
              <div className="mt-2 w-full space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviewsQuery.data!.summary.distribution[star as keyof typeof reviewsQuery.data.summary.distribution];
                  const percent = reviewsQuery.data!.summary.count > 0 ? (count / reviewsQuery.data!.summary.count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs text-muted">
                      <span className="w-3">{star}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                        <span className="block h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                      </span>
                      <span className="w-6 text-end">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {reviewsQuery.data.reviews.length === 0 ? <p className="card p-6 text-sm text-muted">{t('product.noReviews')}</p> : null}
              {reviewsQuery.data.reviews.map((review) => (
                <article key={review.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                        {review.user.name.charAt(0)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-content">{review.user.name}</p>
                        <p className="text-xs text-muted">{formatDate(review.createdAt, currentLang)}</p>
                      </div>
                    </div>
                    <RatingStars value={review.rating} size={13} />
                  </div>
                  {review.isVerifiedPurchase ? <span className="badge mt-3">{t('product.verifiedPurchase')}</span> : null}
                  {review.title ? <h3 className="mt-3 text-sm font-semibold text-content">{review.title}</h3> : null}
                  {review.comment ? <p className="mt-1 text-sm leading-7 text-muted">{review.comment}</p> : null}
                </article>
              ))}
              <Pagination pagination={reviewsQuery.data.pagination} onPageChange={setReviewPage} />

              {authStatus === 'authenticated' && user?.role === 'CUSTOMER' ? (
                <form
                  className="card space-y-4 p-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (reviewComment.trim().length < 2) return;
                    createReviewMutation.mutate();
                  }}
                >
                  <h3 className="text-sm font-semibold text-content">{t('reviews.writeReview')}</h3>
                  <div>
                    <span className="label">{t('reviews.rating')}</span>
                    <div className="flex gap-1" role="radiogroup" aria-label={t('reviews.rating')}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={reviewRating === star}
                          aria-label={`${star}`}
                          onClick={() => setReviewRating(star)}
                          className="p-1"
                        >
                          <Star className={`h-6 w-6 ${star <= reviewRating ? 'fill-current text-amber-400' : 'text-line'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="review-title">{t('reviews.title')}</label>
                    <input id="review-title" className="input" value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} maxLength={120} />
                  </div>
                  <div>
                    <label className="label" htmlFor="review-comment">{t('reviews.comment')}</label>
                    <textarea id="review-comment" className="input min-h-24 resize-y" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={2000} required />
                  </div>
                  <button type="submit" className="btn-primary" disabled={createReviewMutation.isPending}>
                    {createReviewMutation.isPending ? t('common.saving') : t('reviews.submit')}
                  </button>
                </form>
              ) : authStatus !== 'authenticated' ? (
                <p className="card p-5 text-sm text-muted">{t('reviews.loginRequired')}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        )}
      </section>

      {relatedQuery.data && relatedQuery.data.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-content">{t('product.related')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relatedQuery.data.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <PriceTag price={unitPrice} compareAtPrice={product.compareAtPrice} lang={currentLang} size="sm" />
          <button type="button" disabled={outOfStock} onClick={addToCartAndOpen} className="btn-primary min-h-[44px] px-4 disabled:cursor-not-allowed disabled:opacity-50">
            <ShoppingCart className="h-4 w-4" />
            {t('cart.addToCart')}
          </button>
        </div>
      </div>

      {zoomOpen && activeImage ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" onClick={() => setZoomOpen(false)}>
          <button type="button" aria-label={t('common.close')} className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-content">
            <X className="h-5 w-5" />
          </button>
          <img src={activeImage.url} alt={localizedAlt(activeImage, name, currentLang)} className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
        </div>
      ) : null}
    </div>
  );
}
