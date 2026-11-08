import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { formatEGP } from '../lib/format';
import { getCurrentLang } from '../lib/localized';
import { getMyOrders } from '../lib/orderApi';
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

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'text-amber-700 bg-amber-50',
  PENDING_PAYMENT_REVIEW: 'text-amber-700 bg-amber-50',
  CONFIRMED: 'text-brand bg-brand/10',
  PROCESSING: 'text-blue-700 bg-blue-50',
  SHIPPED: 'text-blue-700 bg-blue-50',
  DELIVERED: 'text-green-700 bg-green-50',
  CANCELLED: 'text-red-700 bg-red-50',
  EXPIRED: 'text-red-700 bg-red-50',
};

export default function MyOrdersPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const user = useAuthStore((state) => state.user);

  const ordersQuery = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => getMyOrders({ page: 1, pageSize: 50 }),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container-page animate-fade-in py-10">
        <SeoHead title={t('orders.title')} />
        <h1 className="text-3xl font-bold text-content">{t('orders.title')}</h1>
        <div className="mt-10 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 text-sm text-amber-700">{t('orders.loginRequired')}</p>
          <Link to={`/${currentLang}/login`} className="btn-primary mt-6">{t('common.login')}</Link>
        </div>
      </div>
    );
  }

  if (ordersQuery.isFetching) {
    return (
      <div className="container-page animate-fade-in py-10">
        <SeoHead title={t('orders.title')} />
        <h1 className="text-3xl font-bold text-content">{t('orders.title')}</h1>
        <div className="mt-10 flex flex-col items-center"><RefreshCw className="h-6 w-6 animate-spin" /><p className="mt-3 text-muted">{t('cart.loading')}</p></div>
      </div>
    );
  }

  const orders = ordersQuery.data?.orders ?? [];

  return (
    <div className="container-page animate-fade-in py-10">
      <SeoHead title={t('orders.title')} />
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <h1 className="text-3xl font-bold text-content">{t('orders.title')}</h1>
        <Link to={`/${currentLang}/catalog`} className="btn-outline self-start lg:self-end">
          {t('home.shopNow')}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface/40 p-12 text-center">
          <Clock className="mx-auto h-16 w-16 text-brand/20" />
          <p className="mt-5 text-sm text-muted">{t('orders.empty')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface/30">
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">{t('orders.orderNumber')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">{t('orders.date')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">{t('orders.status')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase text-right">{t('orders.total')}</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase">{t('orders.action')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const label = STATUS_LABEL[order.status]?.[currentLang === 'ar' ? 'ar' : 'en'] || order.status;
                return (
                  <tr key={order.orderNumber} className="border-b border-line/50 hover:bg-surface/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-content dir-ltr">{order.orderNumber}</div>
                      <div className="text-xs text-muted">{order.contactName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted dir-ltr">
                      {new Date(order.createdAt).toLocaleDateString(currentLang)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold dir-ltr">{formatEGP(order.total, currentLang)}</td>
                    <td className="px-4 py-3">
                      {order.status === 'PENDING_PAYMENT' || order.status === 'PENDING_PAYMENT_REVIEW' ? (
                        <Link to={`/${currentLang}/orders/${order.orderNumber}/pay`} className="btn-outline px-3 py-2 text-sm">
                          {t('orders.pay')}
                        </Link>
                      ) : (
                        <Link to={`/${currentLang}/orders/${order.orderNumber}`} className="btn-outline px-3 py-2 text-sm">
                          {t('orders.view')}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
