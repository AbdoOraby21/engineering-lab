import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, AlertCircle, Phone, CreditCard, Loader2, Copy, Check } from 'lucide-react';
import { formatEGP } from '../lib/format';
import { getCurrentLang } from '../lib/localized';
import { getOrder, submitPaymentProof } from '../lib/orderApi';
import { fetchSettings } from '../lib/siteApi';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import SeoHead from '../components/SeoHead';

export default function OrderPayPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);
  const queryClient = useQueryClient();

  const [senderPhone, setSenderPhone] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [transferredAt, setTransferredAt] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const orderNumber = useParams<{ orderNumber: string }>().orderNumber!;

  const orderQuery = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => getOrder(orderNumber),
    enabled: !!orderNumber,
  });

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const proofMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('senderPhone', senderPhone);
      formData.append('referenceNumber', referenceNumber || '');
      formData.append('transferredAt', transferredAt);
      formData.append('screenshot', screenshot!);
      return submitPaymentProof(orderQuery.data!.orderNumber, formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      navigate(`/${currentLang}/orders/${orderQuery.data!.orderNumber}`);
    },
    onError: () => addToast(t('order.proofFailed'), 'error'),
  });

  const order = orderQuery.data;
  const settings = settingsQuery.data;
  const method = order?.paymentMethod === 'VODAFONE_CASH' ? 'vodafone_cash' : 'instapay';
  const paymentInfo = settings?.paymentMethods.find((m) => m.key === method);
  const receivingValue = paymentInfo ? (currentLang === 'ar' ? paymentInfo.valueAr : paymentInfo.valueEn) : '';
  const amount = order?.total ?? 0;
  const deadline = order?.paymentDeadlineAt ? new Date(order.paymentDeadlineAt) : null;
  const expired = deadline ? deadline < new Date() : false;
  const timeLeft = deadline ? Math.max(0, deadline.getTime() - Date.now()) : 0;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const statusLabel: Record<string, { ar: string; en: string }> = {
    PENDING_PAYMENT: { ar: 'في انتظار الدفع', en: 'Awaiting payment' },
    PENDING_PAYMENT_REVIEW: { ar: 'قيد المراجعة', en: 'Under review' },
    CONFIRMED: { ar: 'مؤكد', en: 'Confirmed' },
    PROCESSING: { ar: 'قيد المعالجة', en: 'Processing' },
    SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
    DELIVERED: { ar: 'تم التوصيل', en: 'Delivered' },
    CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
    EXPIRED: { ar: 'منتهي الصلاحية', en: 'Expired' },
  };

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
        <div className="mt-10 flex flex-col items-center"><Loader2 className="h-6 w-6 animate-spin" /><p className="mt-3 text-muted">{t('cart.loading')}</p></div>
      </div>
    );
  }

  const canSubmitProof = order.status === 'PENDING_PAYMENT' || order.status === 'PENDING_PAYMENT_REVIEW';
  const showInstructions = order.status === 'PENDING_PAYMENT' || order.status === 'PENDING_PAYMENT_REVIEW';
  const statusText = statusLabel[order.status]?.[currentLang === 'ar' ? 'ar' : 'en'] || order.status;

  return (
    <div className="container-page animate-fade-in py-10">
      <SeoHead title={`${order.orderNumber} | ${t('order.title')}`} />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-content">{t('order.title')}</h1>
          <p className="text-muted">{t('order.orderNumber', { number: order.orderNumber })}</p>

          <div className="mt-6 card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-muted">{t('order.status')}</span>
              <span className={`text-sm font-bold ${order.status === 'CONFIRMED' ? 'text-brand' : 'text-content'}`}>
                {statusText}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>{t('order.paymentMethod')}</span><span>{order.paymentMethod}</span></div>
              <div className="flex justify-between"><span>{t('order.total')}</span><span dir="ltr" className="font-bold">{formatEGP(order.total, currentLang)}</span></div>
              {order.contactPhone && <div className="flex justify-between"><span>{t('order.contactPhone')}</span><span dir="ltr">{order.contactPhone}</span></div>}
            </div>
          </div>

          {showInstructions && !expired && (
            <section className="mt-6 card p-5">
              <h2 className="text-lg font-bold text-content mb-4">{t('order.paymentInstructions')}</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10">
                  <Phone className="mt-0.5 h-5 w-5 text-brand shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-content">{t('order.sendTo')}</div>
                    <div className="text-base font-mono font-bold text-brand dir-ltr" dir="ltr">{receivingValue}</div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(receivingValue);
                        addToast(t('order.copied'), 'success');
                      }}
                      className="ml-2 h-8 w-8 rounded-lg border border-line bg-white text-sm transition hover:bg-brand/5"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10">
                  <CreditCard className="mt-0.5 h-5 w-5 text-brand shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-content">{t('order.amount')}</div>
                    <div className="text-base font-mono font-bold text-brand dir-ltr" dir="ltr">{formatEGP(amount, currentLang)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10">
                  <Clock className="mt-0.5 h-5 w-5 text-brand shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-content">{t('order.deadline')}</div>
                    <div className="text-sm font-mono text-muted dir-ltr" dir="ltr">{deadline?.toLocaleString()}</div>
                    <div className="text-xs text-brand font-bold">{hoursLeft}h {minsLeft}m {t('order.remaining')}</div>
                  </div>
                </div>
                <p className="text-sm text-muted">{t('order.putOrderNumberInNote', { number: order.orderNumber })}</p>
              </div>
            </section>
          )}

          {expired && showInstructions && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
              <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
              <h3 className="mt-3 text-lg font-bold text-red-800">{t('order.expired')}</h3>
              <p className="text-sm text-red-700">{t('order.expiredDetail')}</p>
            </div>
          )}

          {canSubmitProof && !expired && (
            <section className="mt-6 card p-5">
              <h2 className="text-lg font-bold text-content mb-4">{t('order.uploadProof')}</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!senderPhone || !transferredAt || !screenshot) {
                  addToast(t('order.fillProof'), 'error');
                  return;
                }
                proofMutation.mutate();
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-content mb-1">{t('order.senderPhone')}</label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="+20 100 000 0000"
                    className="w-full px-3 py-2 rounded-lg border border-line bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-content mb-1">{t('order.referenceNumber')}</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder={t('order.referencePlaceholder')}
                    className="w-full px-3 py-2 rounded-lg border border-line bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-content mb-1">{t('order.transferredAt')}</label>
                  <input
                    type="datetime-local"
                    value={transferredAt}
                    onChange={(e) => setTransferredAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-content mb-1">{t('order.screenshot')}</label>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => (document.getElementById('screenshot-input') as HTMLInputElement).click()}
                      className="btn-outline px-4 py-2"
                    >
                      {t('order.chooseScreenshot')}
                    </button>
                    <input
                      id="screenshot-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setScreenshot(file);
                          setScreenshotPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    {screenshotPreview && (
                      <img src={screenshotPreview} alt="" className="h-24 w-24 rounded-lg object-cover border border-line" />
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={proofMutation.isPending}
                  className="btn-primary w-full min-h-[44px] disabled:opacity-50"
                >
                  {proofMutation.isPending ? <Loader2 className="h-5 w-5" /> : null}
                  {t('order.submitProof')}
                </button>
              </form>
            </section>
          )}

          {order.status === 'CONFIRMED' && (
            <div className="mt-6 rounded-xl border border-brand/30 bg-brand/5 p-5">
              <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
              <h3 className="mt-3 text-lg font-bold text-brand">{t('order.confirmed')}</h3>
              <p className="text-sm text-brand/80">{t('order.confirmedDetail')}</p>
              <div className="mt-4 flex gap-2">
                <Link to={`/${currentLang}/orders/${order.orderNumber}/invoice`} className="btn-outline flex-1">
                  {t('order.downloadInvoice')}
                </Link>
                <Link to={`/${currentLang}/orders/${order.orderNumber}`} className="btn-outline flex-1">
                  {t('order.viewDetails')}
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="lg:w-96">
          {order.status === 'CONFIRMED' && (
            <div className="sticky top-28 card p-5">
              <h3 className="text-sm font-semibold text-muted uppercase mb-3">{t('order.nextSteps')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand" />
                  <span>{t('order.stepPaymentApproved')}</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="h-4 w-4 text-muted" />
                  <span>{t('order.stepProcessing')}</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="h-4 w-4 text-muted" />
                  <span>{t('order.stepShipped')}</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="h-4 w-4 text-muted" />
                  <span>{t('order.stepDelivered')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
