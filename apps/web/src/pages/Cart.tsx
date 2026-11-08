import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Truck, Trash2, AlertCircle } from 'lucide-react';
import { useCartStore } from '../stores/cart.store';
import { formatEGP } from '../lib/format';
import { getCurrentLang } from '../lib/localized';
import {
  getCart,
  getCheckoutSummary,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../lib/orderApi';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import QuantityStepper from '../components/ui/QuantityStepper';
import SeoHead from '../components/SeoHead';

export default function CartPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);
  const setOpen = useCartStore((state) => state.setOpen);
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
    enabled: !!user,
  });

  const items = cartQuery.data?.items ?? [];
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const updateMutation = useMutation({
    mutationFn: ({ itemId, qty }: { itemId: string; qty: number }) =>
      updateCartItem(itemId, qty),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      setOpen(true);
    },
    onError: () => addToast(t('cart.updateFailed'), 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => addToast(t('cart.removeFailed'), 'error'),
  });

  const clearMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => addToast(t('cart.clearFailed'), 'error'),
  });

  const checkoutSummary = useQuery({
    queryKey: ['checkout-summary'],
    queryFn: () => getCheckoutSummary(),
    enabled: !!user && items.length > 0,
  });

  const shippingFee = checkoutSummary.data?.shippingFee ?? 0;
  const discountTotal = checkoutSummary.data?.discountTotal ?? 0;
  const total = Math.max(0, subtotal - discountTotal + shippingFee);

  return (
    <div className="container-page animate-fade-in py-10">
      <SeoHead title={`${t('cart.title')} | ${t('common.appName')}`} />
      <h1 className="text-3xl font-bold text-content">{t('cart.title')} ({count})</h1>

      {!user && (
        <div className="mt-8 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 text-sm text-amber-700">{t('cart.loginToSync')}</p>
          <Link to={`/${currentLang}/login`} className="btn-primary mt-6">
            {t('common.login')}
          </Link>
        </div>
      )}

      {cartQuery.isFetching && items.length === 0 && (
        <div className="mt-10 flex flex-col items-center">
          <p className="text-muted">{t('cart.loading')}</p>
        </div>
      )}

      {user && items.length === 0 && !cartQuery.isFetching && (
        <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface/40 px-6 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <ShoppingCart className="h-7 w-7" />
          </span>
          <p className="mt-5 text-sm text-muted">{t('cart.empty')}</p>
          <Link to={`/${currentLang}/catalog`} className="btn-primary mt-6">
            {t('home.shopNow')}
          </Link>
        </div>
      )}

      {user && items.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="card flex gap-4 p-4">
                <Link to={`/${currentLang}/products/${item.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface2">
                  {item.product.primaryImage?.url ? (
                    <img src={item.product.primaryImage.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/${currentLang}/products/${item.product.slug}`} className="line-clamp-2 font-semibold text-content hover:text-brand">
                    {item.product.nameEn}
                  </Link>
                  {item.variantId ? (
                    <p className="mt-1 text-xs text-muted">{item.product.nameEn}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted" dir="ltr">
                    {item.product.sku}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <QuantityStepper
                      value={item.qty}
                      max={item.product.stock}
                      onChange={(qty) => updateMutation.mutate({ itemId: item.id, qty })}
                    />
                    <span className="font-bold text-content" dir="ltr">
                      {formatEGP(item.product.price * item.qty, currentLang)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(item.id)}
                  aria-label={t('cart.remove')}
                  className="self-start rounded-full p-2 text-muted transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => clearMutation.mutate()} className="btn-ghost text-sm">
              {t('cart.clear')}
            </button>
          </div>

          <aside className="card h-fit p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold text-content">{t('cart.summary')}</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted">
                <span>{t('cart.subtotal')}</span>
                <span dir="ltr">{formatEGP(subtotal, currentLang)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-brand">
                  <span>{t('cart.discount')}</span>
                  <span dir="ltr">-{formatEGP(discountTotal, currentLang)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <span>{t('cart.shipping')}</span>
                <span dir="ltr">{formatEGP(shippingFee, currentLang)}</span>
              </div>
              <div className="divider flex justify-between pt-3 text-base font-bold text-content">
                <span>{t('cart.total')}</span>
                <span dir="ltr">{formatEGP(total, currentLang)}</span>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-muted">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              {t('cart.checkoutHint')}
            </p>
            <Link to={`/${currentLang}/checkout`} className="btn-primary mt-5 w-full min-h-[44px]">
              {t('cart.checkout')}
            </Link>
            <Link to={`/${currentLang}/catalog`} className="btn-secondary mt-2 w-full min-h-[44px]">
              {t('cart.continueShopping')}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
