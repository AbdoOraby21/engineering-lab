import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { GitCompareArrows, ShoppingCart, Trash2 } from 'lucide-react';
import { fetchProduct } from '../lib/catalogApi';
import { useCompareStore } from '../stores/compare.store';
import { useCartStore } from '../stores/cart.store';
import { formatEGP } from '../lib/format';
import { getCurrentLang, localizedName } from '../lib/localized';
import RatingStars from '../components/ui/RatingStars';
import SeoHead from '../components/SeoHead';

export default function ComparePage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const items = useCompareStore((state) => state.items);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  const detailsQuery = useQuery({
    queryKey: ['compare-details', items.map((item) => item.slug).join(',')],
    queryFn: async () => Promise.all(items.map((item) => fetchProduct(item.slug))),
    enabled: items.length > 0,
    staleTime: 60_000,
  });
  const details = new Map((detailsQuery.data ?? []).map((product) => [product.id, product]));
  const addToCart = useCartStore((state) => state.addItem);
  const setCartOpen = useCartStore((state) => state.setOpen);

  if (items.length === 0) {
    return (
      <div className="container-page animate-fade-in py-16 text-center">
        <SeoHead title={`${t('compare.title')} | ${t('common.appName')}`} />
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <GitCompareArrows className="h-7 w-7" />
        </span>
        <p className="mt-5 text-muted">{t('compare.empty')}</p>
        <Link to={`/${currentLang}/catalog`} className="btn-primary mt-6">{t('home.shopNow')}</Link>
      </div>
    );
  }

  const allSpecs = new Map<string, { ar: string; en: string }>();
  items.forEach((item) =>
    details.get(item.id)?.specs.forEach((spec) => allSpecs.set(spec.keyAr, { ar: spec.keyAr, en: spec.keyEn })),
  );
  const specKeys = [...allSpecs.values()];

  return (
    <div className="container-page animate-fade-in py-10">
      <SeoHead title={`${t('compare.title')} | ${t('common.appName')}`} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold text-content">{t('compare.title')}</h1>
        <button type="button" onClick={clear} className="btn-ghost">{t('common.clear')}</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr>
              <th className="w-40 p-4 text-start text-muted">{t('compare.compare')}</th>
              {items.map((product) => (
                <th key={product.id} className="p-4 align-top">
                  <div className="space-y-2">
                    <div className="relative h-32 overflow-hidden rounded-xl bg-surface2">
                      {product.primaryImage ? <img src={product.primaryImage.url} alt={localizedName(product, currentLang)} loading="lazy" className="h-full w-full object-cover" /> : null}
                      <button type="button" onClick={() => remove(product.id)} aria-label={t('cart.remove')} className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Link to={`/${currentLang}/products/${product.slug}`} className="line-clamp-2 text-start font-semibold text-content hover:text-brand">
                      {localizedName(product, currentLang)}
                    </Link>
                    <button
                      type="button"
                      disabled={product.stock <= 0}
                      onClick={() => { addToCart({ product, qty: 1 }); setCartOpen(true); }}
                      className="btn-primary w-full px-3 py-2 text-xs disabled:opacity-50"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> {t('cart.addToCart')}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <td className="p-4 font-medium text-muted">{t('compare.price')}</td>
              {items.map((product) => <td key={product.id} className="p-4 font-bold text-content" dir="ltr">{formatEGP(product.price, currentLang)}</td>)}
            </tr>
            <tr className="border-t border-line bg-surface2/40">
              <td className="p-4 font-medium text-muted">{t('compare.rating')}</td>
              {items.map((product) => <td key={product.id} className="p-4"><RatingStars value={product.ratingAverage} count={product.ratingCount} /></td>)}
            </tr>
            <tr className="border-t border-line">
              <td className="p-4 font-medium text-muted">{t('compare.stock')}</td>
              {items.map((product) => <td key={product.id} className="p-4 text-content">{product.stock > 0 ? t('product.stockCount', { count: product.stock }) : t('product.outOfStock')}</td>)}
            </tr>
            <tr className="border-t border-line bg-surface2/40">
              <td className="p-4 font-medium text-muted">SKU</td>
              {items.map((product) => <td key={product.id} className="p-4 text-content" dir="ltr">{product.sku}</td>)}
            </tr>
            {specKeys.map((spec) => {
              const values = items.map((product) =>
                details.get(product.id)?.specs.find((entry) => entry.keyAr === spec.ar),
              );
              const unique = new Set(values.map((value) => (value ? (currentLang === 'en' ? value.valueEn : value.valueAr) : '')));
              const different = unique.size > 1;
              return (
                <tr key={spec.ar} className={`border-t border-line ${different ? 'bg-brand/5' : ''}`}>
                  <td className="p-4 font-medium text-muted">{currentLang === 'en' ? spec.en : spec.ar}</td>
                  {values.map((value, index) => (
                    <td key={items[index]!.id} className="p-4 text-content">{value ? (currentLang === 'en' ? value.valueEn : value.valueAr) : '—'}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
