import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, CreditCard, Phone, AlertCircle, CheckCircle2, Loader2, ShoppingCart } from 'lucide-react';
import { formatEGP } from '../lib/format';
import { getCurrentLang } from '../lib/localized';
import {
  getCheckoutSummary,
  validateCoupon,
  placeOrder,
  getCart,
} from '../lib/orderApi';
import { listAddressesRequest } from '../lib/authApi';
import SeoHead from '../components/SeoHead';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';

type PaymentMethod = 'VODAFONE_CASH' | 'INSTAPAY' | 'COD';

const PAYMENT_METHODS: { key: PaymentMethod; labelKey: string; icon: React.ElementType }[] = [
  { key: 'VODAFONE_CASH', labelKey: 'checkout.paymentVodafoneCash', icon: Phone },
  { key: 'INSTAPAY', labelKey: 'checkout.paymentInstaPay', icon: CreditCard },
  { key: 'COD', labelKey: 'checkout.paymentCod', icon: CreditCard },
];

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);
  const queryClient = useQueryClient();
  const [addressId, setAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
    enabled: !!user,
  });

  const addressesQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: listAddressesRequest,
    enabled: !!user,
  });

  const summaryQuery = useQuery({
    queryKey: ['checkout-summary', addressId, couponCode],
    queryFn: () => getCheckoutSummary(addressId || undefined, couponCode || undefined),
    enabled: !!user && !!addressId,
  });

  const validateCouponMutation = useMutation({
    mutationFn: validateCoupon,
    onSuccess: (result) => {
      if (result.valid) {
        setApplyingCoupon(false);
        void queryClient.invalidateQueries({ queryKey: ['checkout-summary'] });
      } else {
        setApplyingCoupon(false);
        addToast(result.reason ?? t('checkout.couponInvalid'), 'error');
      }
    },
    onError: () => setApplyingCoupon(false),
  });

  const placeOrderMutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: ({ order }) => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      navigate(`/${currentLang}/orders/${order.orderNumber}/pay`);
    },
    onError: () => addToast(t('checkout.placeFailed'), 'error'),
  });

  const shippingFee = summaryQuery.data?.shippingFee ?? 0;
  const discountTotal = summaryQuery.data?.discountTotal ?? 0;
  const subtotal = cartQuery.data?.items.reduce((sum, item) => sum + item.product.price * item.qty, 0) ?? 0;
  const total = Math.max(0, subtotal - discountTotal + shippingFee);

  const shippingZone = summaryQuery.data?.shippingZone;
  const estimatedDays = shippingZone
    ? `${shippingZone.estimatedDaysMin}-${shippingZone.estimatedDaysMax} ${t('checkout.days')}`
    : null;

  const handlePlaceOrder = () => {
    if (!addressId) {
      addToast(t('checkout.chooseAddress'), 'error');
      return;
    }
    if (!paymentMethod) {
      addToast(t('checkout.choosePayment'), 'error');
      return;
    }
    placeOrderMutation.mutate({
      addressId,
      paymentMethod,
      customerNote: null,
      idempotencyKey: `checkout-${Date.now()}`,
    });
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    validateCouponMutation.mutate(couponCode.trim());
  };

  if (!user) {
    return (
      <div className="container-page animate-fade-in py-10">
        <SeoHead title={t('checkout.title')} />
        <h1 className="text-3xl font-bold text-content">{t('checkout.title')}</h1>
        <div className="mt-10 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 text-sm text-amber-700">{t('checkout.loginRequired')}</p>
          <Link to={`/${currentLang}/login`} className="btn-primary mt-6">
            {t('common.login')}
          </Link>
        </div>
      </div>
    );
  }

  if (cartQuery.isFetching || (!cartQuery.data && !cartQuery.error)) {
    return (
      <div className="container-page animate-fade-in py-10">
        <SeoHead title={t('checkout.title')} />
        <h1 className="text-3xl font-bold text-content">{t('checkout.title')}</h1>
        <div className="mt-10 flex flex-col items-center"><Loader2 className="h-6 w-6 animate-spin" /><p className="mt-3 text-muted">{t('cart.loading')}</p></div>
      </div>
    );
  }

  const cartItems = cartQuery.data?.items ?? [];
  if (cartItems.length === 0) {
    return (
      <div className="container-page animate-fade-in py-10">
        <SeoHead title={t('checkout.title')} />
        <h1 className="text-3xl font-bold text-content">{t('checkout.title')}</h1>
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-surface/40 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <ShoppingCart className="h-7 w-7" />
          </span>
          <p className="mt-5 text-sm text-muted">{t('cart.empty')}</p>
          <Link to={`/${currentLang}/catalog`} className="btn-primary mt-6">{t('home.shopNow')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page animate-fade-in py-10">
      <SeoHead title={t('checkout.title')} />
      <h1 className="text-3xl font-bold text-content">{t('checkout.title')}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-bold text-content mb-4">{t('checkout.deliverTo')}</h2>
            <div className="space-y-3">
              {(addressesQuery.data ?? []).map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => setAddressId(addr.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    addressId === addr.id ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/50'
                  }`}
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-content">{addr.label || addr.governorate}</div>
                    <div className="text-xs text-muted">{[addr.governorate, addr.city, addr.street, addr.building].filter(Boolean).join(', ')}</div>
                  </div>
                  {addressId === addr.id && <CheckCircle2 className="ml-auto h-4 w-4 text-brand" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => navigate(`/${currentLang}/account/addresses`)}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-line text-sm text-muted hover:border-brand/50"
              >
                <MapPin className="h-4 w-4 shrink-0 mr-2" />
                {t('checkout.addAddress')}
              </button>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-content mb-4">{t('checkout.paymentMethod')}</h2>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => {
                const disabled = method.key === 'COD';
                return (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => setPaymentMethod(method.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                      paymentMethod === method.key
                        ? 'border-brand bg-brand/5'
                        : 'border-line hover:border-brand/50'
                    } ${disabled ? 'opacity-50 text-muted pointer-events-none' : ''}`}
                  >
                    {method.icon ? <method.icon className="h-4 w-4 shrink-0" /> : null}
                    <div>
                      <div className="text-sm font-semibold">{t(method.labelKey)}</div>
                      {disabled && <div className="text-xs text-muted">Coming soon</div>}
                    </div>
                    {paymentMethod === method.key && <CheckCircle2 className="ml-auto h-4 w-4 text-brand" />}
                  </button>
                );
              })}
            </div>
          </section>

          {paymentMethod === 'VODAFONE_CASH' || paymentMethod === 'INSTAPAY' ? (
            <section className="card p-6">
              <h2 className="text-lg font-bold text-content mb-4">{t('checkout.proofNotice')}</h2>
              <p className="text-sm text-muted">{t('checkout.proofNoticeDetail')}</p>
            </section>
          ) : null}

          <div className="mt-6">
            <label className="flex items-center gap-2 text-sm text-content cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-brand text-brand focus:ring-brand"
              />
              {t('checkout.terms')}
            </label>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={placeOrderMutation.isPending || !addressId || paymentMethod === 'COD'}
            className="btn-primary mt-8 w-full min-h-[44px] disabled:opacity-50"
          >
            {placeOrderMutation.isPending ? <Loader2 className="h-5 w-5" /> : null}
            {t('checkout.placeOrder')}
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
            {shippingZone && estimatedDays && (
              <div className="flex justify-between text-xs text-muted">
                <span>{t('checkout.estimatedDelivery')}</span>
                <span>{estimatedDays}</span>
              </div>
            )}
            <div className="divider flex justify-between pt-3 text-base font-bold text-content">
              <span>{t('cart.total')}</span>
              <span dir="ltr">{formatEGP(total, currentLang)}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-line p-3 bg-surface/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted uppercase">{t('checkout.coupon')} </span>
              {summaryQuery.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('checkout.couponPlaceholder')}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-sm"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={applyingCoupon || !couponCode.trim()}
                className="btn-outline px-4 disabled:opacity-50"
              >
                {applyingCoupon ? t('checkout.applying') : t('checkout.apply')}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
