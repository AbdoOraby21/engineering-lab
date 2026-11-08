import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Clock, CheckCircle2, AlertCircle, Download, Trash2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { formatEGP } from '../lib/format';
import { getCurrentLang } from '../lib/localized';
import { getOrder, cancelOrder } from '../lib/orderApi';
import { useUiStore } from '../stores/ui.store';
import SeoHead from '../components/SeoHead';

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  PENDING_PAYMENT: { ar: 'في انتظار الدفع', en: 'Awaiting payment' },
  PENDING_PAYMENT_REVIEW: { ar: 'قيد المراجعة', en: 'Under review' },
  CONFIRMED: { ar: 'مؤكد', en: 'Confirmed' },
  PROCESSING: { ar: 'قيد المعالجة', en: 'Processing' },
  SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
  DELIVERED: { ar: 'تم التوصيل', en: 'Delivered' },
  CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
  EXPIRED: { ar: 'منتهي الصلاحية', en: 'Expired' },
};

const STATUS_STEPS: string[] = [
  'PENDING_PAYMENT',
  'PENDING_PAYMENT_REVIEW',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

export default function OrderDetailsPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);
  const queryClient = useQueryClient();

  const orderNumber = useParams<{ orderNumber: string }>().orderNumber!;

  const orderQuery = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => getOrder(orderNumber),
    enabled: !!orderNumber,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderNumber),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      navigate(`/${currentLang}/orders`);
    },
    onError: () => addToast(t('order.cancelFailed'), 'error'),
  });

  const order = orderQuery.data;

  if (!user) {
    return (
      <div className="container-page animate-fade-in py-10">
        <SeoHead title={t('order.title')} />
        <h1 className="text-3xl font-bold text-content">{t('order.title')}</h1>
        <div className="mt-10 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 text-sm text-amber-700">{t('order.loginRequired')}</p>
          <Link to={`/${currentLang}/login`} className="btn-primary mt-6">{t('common.login')}</Link>
        </div>
      </div>
    );
  }

  if (orderQuery.isFetching || !order) {
    return (
      <div className="container-page animate-fade-in py-10">
        <SeoHead title={t('order.title')} />
        <h1 className="text-3xl font-bold text-content">{t('order.title')}</h1>
        <div className="mt-10 flex flex-col items-center"><Clock className="h-6 w-6 animate-spin" /><p className="mt-3 text-muted">{t('cart.loading')}</p></div>
      </div>
    );
  }

  const statusText = STATUS_LABEL[order.status]?.[currentLang === 'ar' ? 'ar' : 'en'] || order.status;
  void statusText;
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const canCancel = ['PENDING_PAYMENT', 'PENDING_PAYMENT_REVIEW', 'CONFIRMED', 'PROCESSING'].includes(order.status);

  return (
    <div className="container-page animate-fade-in py-10">
      <SeoHead title={`${order.orderNumber} | ${t('order.title')}`} />
      <nav className="mb-6 flex gap-1 overflow-x-auto pb-2">
        <Link to={`/${currentLang}/orders`} className="text-sm text-muted hover:text-brand">{t('orders.myOrders')}</Link>
        <ChevronRight className="h-3 w-3 ml-1 text-muted" />
        <span className="text-sm font-semibold text-content">{order.orderNumber}</span>
      </nav>

      <h1 className="text-3xl font-bold text-content">{t('order.orderDetails')}</h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          <section className="card p-5">
            <h2 className="text-lg font-bold text-content mb-3">{t('order.statusAndTimeline')}</h2>
            <div className="space-y-4">
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentStepIndex;
                const label = STATUS_LABEL[step]?.[currentLang === 'ar' ? 'ar' : 'en'] || step;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 shrink-0 ${
                      done ? 'border-brand bg-brand text-brand' : 'border-line bg-surface2 text-muted'
                    }`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${done ? 'text-content' : 'text-muted'}`}>{label}</div>
                      {done && order.statusHistory.find((h) => h.to === step) && (
                        <div className="text-xs text-muted">
                          {new Date(order.statusHistory.find((h) => h.to === step)!.createdAt).toLocaleString(currentLang)}
                        </div>
                      )}
                    </div>
                    {idx < STATUS_STEPS.length - 1 && <div className="h-px w-3 bg-line mx-2" />}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-bold text-content mb-3">{t('order.items')}</h2>
            <div className="border border-line rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface/30 text-xs">
                    <th className="px-4 py-3 font-semibold text-muted">{t('order.product')}</th>
                    <th className="px-4 py-3 font-semibold text-muted text-right">{t('order.qty')}</th>
                    <th className="px-4 py-3 font-semibold text-muted text-right">{t('order.unitPrice')}</th>
                    <th className="px-4 py-3 font-semibold text-muted text-right">{t('order.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-line/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-content dir-ltr">{item.nameEn}</div>
                        <div className="text-xs text-muted dir-ltr">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-muted text-right dir-ltr">{item.qty}</td>
                      <td className="px-4 py-3 text-muted text-right dir-ltr">{formatEGP(item.unitPrice, currentLang)}</td>
                      <td className="px-4 py-3 text-muted text-right dir-ltr">{formatEGP(item.lineTotal, currentLang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <section className="card p-5">
            <h2 className="text-lg font-bold text-content mb-3">{t('order.summary')}</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span>{t('cart.subtotal')}</span><span dir="ltr" className="text-muted">{formatEGP(order.subtotal, currentLang)}</span></div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between"><span>{t('cart.discount')}</span><span dir="ltr" className="text-brand">-{formatEGP(order.discountTotal, currentLang)}</span></div>
              )}
              <div className="flex justify-between"><span>{t('cart.shipping')}</span><span dir="ltr" className="text-muted">{formatEGP(order.shippingFee, currentLang)}</span></div>
              <div className="divider flex justify-between pt-3 text-base font-bold text-content">
                <span>{t('cart.total')}</span><span dir="ltr" className="text-brand">{formatEGP(order.total, currentLang)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface/30 text-sm">
              <span className="text-muted">{t('order.paymentMethod')}</span>
              <span className="text-content font-semibold">{order.paymentMethod}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Link to={`/${currentLang}/orders/${order.orderNumber}/invoice`} className="btn-outline w-full min-h-[44px]">
                <Download className="h-4 w-4 mr-2" /> {t('order.downloadInvoice')}
              </Link>
              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('order.confirmCancel'))) {
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={cancelMutation.isPending}
                  className="btn-outline w-full min-h-[44px] text-red-600 border-red-600/50 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? <Loader2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}{' '}
                  {t('order.cancelOrder')}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {order.status === 'CONFIRMED' && (
        <div className="mt-8 rounded-xl border border-brand/30 bg-brand/5 p-5">
          <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
          <h3 className="mt-3 text-lg font-bold text-brand">{t('order.confirmed')}</h3>
          <p className="text-sm text-brand/80">{t('order.confirmedDetail')}</p>
        </div>
      )}
    </div>
  );
}
