import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Trash2, Truck, X } from 'lucide-react';
import { cartCount, cartSubtotal, useCartStore } from '../../stores/cart.store';
import { formatEGP } from '../../lib/format';
import { getCurrentLang, pick } from '../../lib/localized';
import QuantityStepper from '../ui/QuantityStepper';
import { fetchByIds } from '../../lib/catalogApi';

export default function CartDrawer() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const items = useCartStore((state) => state.items);
  const open = useCartStore((state) => state.open);
  const setOpen = useCartStore((state) => state.setOpen);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const syncProducts = useCartStore((state) => state.syncProducts);
  const count = cartCount(items);
  const subtotal = cartSubtotal(items);
  const productIds = [...new Set(items.map((item) => item.productId))];

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handler);
    };
  }, [open, setOpen]);

  const syncQuery = useQuery({
    queryKey: ['cart-sync', productIds.join(',')],
    queryFn: () => fetchByIds(productIds),
    enabled: open && productIds.length > 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (syncQuery.data && syncQuery.data.length > 0) {
      syncProducts(syncQuery.data);
    }
  }, [syncQuery.data, syncProducts]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-surface shadow-card transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'} ${open ? '' : 'invisible'}`}
          role="dialog"
          aria-label={t('cart.title')}
          aria-modal="true"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-content">
              <ShoppingCart className="h-5 w-5 text-brand" />
              {t('cart.title')}
              <span className="text-sm font-medium text-muted">({count})</span>
            </h2>
            <button type="button" onClick={() => setOpen(false)} className="icon-btn h-9 w-9" aria-label={t('common.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <ShoppingCart className="h-7 w-7" />
              </span>
              <p className="text-sm text-muted">{t('cart.empty')}</p>
              <Link to={`/${currentLang}/catalog`} onClick={() => setOpen(false)} className="btn-primary">
                {t('home.shopNow')}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-2xl border border-line bg-surface2/60 p-3">
                    <Link to={`/${currentLang}/products/${item.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/${currentLang}/products/${item.slug}`} className="line-clamp-2 text-sm font-semibold text-content">
                        {pick(item.nameAr, item.nameEn, currentLang)}
                      </Link>
                      {item.variantId ? (
                        <p className="mt-0.5 text-xs text-muted">
                          {pick(item.variantNameAr, item.variantNameEn, currentLang)}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <QuantityStepper value={item.qty} max={item.maxStock} small onChange={(qty) => updateQty(item.id, qty)} />
                        <span className="text-sm font-bold text-content" dir="ltr">
                          {formatEGP(item.price * item.qty, currentLang)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={t('cart.remove')}
                      className="self-start rounded-full p-2 text-muted transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t border-line px-5 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">{t('cart.subtotal')}</span>
                  <span className="text-lg font-extrabold text-content" dir="ltr">
                    {formatEGP(subtotal, currentLang)}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Truck className="h-3.5 w-3.5 text-brand" />
                  {t('cart.checkoutHint')}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link to={`/${currentLang}/cart`} onClick={() => setOpen(false)} className="btn-primary min-h-[44px]">
                    {t('cart.viewCart')}
                  </Link>
                  <Link to={`/${currentLang}/support`} onClick={() => setOpen(false)} className="btn-secondary min-h-[44px]">
                    {t('cart.checkout')}
                  </Link>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
