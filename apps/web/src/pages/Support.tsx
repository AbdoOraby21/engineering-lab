import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headset, Mail, MapPin, MessageSquarePlus, Phone, Clock } from 'lucide-react';
import { createTicket, listTickets } from '../lib/supportApi';
import { useErrorMessage } from '../lib/errors';
import { useUiStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { formatDate } from '../lib/format';
import type { AppLanguage } from '../lib/i18n';
import Pagination from '../components/ui/Pagination';
import Skeleton from '../components/ui/Skeleton';

const statusStyles: Record<string, string> = {
  OPEN: 'border-brand/30 bg-brand/10 text-brand',
  IN_PROGRESS: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  PENDING_CUSTOMER: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  RESOLVED: 'border-sky-500/30 bg-sky-500/10 text-sky-500',
  CLOSED: 'border-line bg-surface2 text-muted',
};

export default function SupportPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang: AppLanguage = lang === 'en' ? 'en' : 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'authenticated';

  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [orderReference, setOrderReference] = useState('');
  const [message, setMessage] = useState('');

  const ticketsQuery = useQuery({
    queryKey: ['tickets', page],
    queryFn: () => listTickets({ page, pageSize: 10 }),
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTicket({
        subject: subject.trim(),
        category,
        orderReference: orderReference.trim() || undefined,
        message: message.trim(),
      }),
    onSuccess: (ticket) => {
      addToast(t('support.created'), 'success');
      setShowForm(false);
      setSubject('');
      setOrderReference('');
      setMessage('');
      setCategory('OTHER');
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/${currentLang}/support/${ticket.id}`);
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const tickets = ticketsQuery.data?.items ?? [];
  const pagination = ticketsQuery.data?.pagination;

  return (
    <div className="container-page animate-fade-in py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-content">{t('support.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('support.subtitle')}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (!isAuthenticated) {
              navigate(`/${currentLang}/login?redirect=${encodeURIComponent(`/${currentLang}/support`)}`);
              return;
            }
            setShowForm((open) => !open);
          }}
        >
          <MessageSquarePlus className="h-4 w-4" />
          {t('support.newTicket')}
        </button>
      </div>

      {showForm ? (
        <form
          className="card mb-8 space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (subject.trim().length < 3 || message.trim().length < 2) {
              addToast(t('support.validationError'), 'error');
              return;
            }
            createMutation.mutate();
          }}
        >
          <h2 className="text-lg font-semibold text-content">{t('support.newTicket')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ticket-subject">
                {t('support.subject')}
              </label>
              <input
                id="ticket-subject"
                className="input"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={160}
              />
            </div>
            <div>
              <label className="label" htmlFor="ticket-category">
                {t('support.category')}
              </label>
              <select
                id="ticket-category"
                className="input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {['ORDER', 'PAYMENT', 'PRODUCT', 'SHIPPING', 'OTHER'].map((value) => (
                  <option key={value} value={value}>
                    {t(`support.categories.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ticket-order">
              {t('support.orderReference')}{' '}
              <span className="text-xs font-normal text-muted">({t('common.optional')})</span>
            </label>
            <input
              id="ticket-order"
              className="input"
              value={orderReference}
              onChange={(event) => setOrderReference(event.target.value)}
              maxLength={40}
              placeholder="ORD-1234"
            />
          </div>
          <div>
            <label className="label" htmlFor="ticket-message">
              {t('support.message')}
            </label>
            <textarea
              id="ticket-message"
              className="input min-h-32 resize-y"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={4000}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t('common.saving') : t('support.send')}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-content">{t('support.myTickets')}</h2>
          {!isAuthenticated ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center">
              <Headset className="h-10 w-10 text-brand" />
              <p className="mt-4 text-sm text-muted">{t('support.loginPrompt')}</p>
              <Link
                to={`/${currentLang}/login?redirect=${encodeURIComponent(`/${currentLang}/support`)}`}
                className="btn-primary mt-5"
              >
                {t('common.login')}
              </Link>
            </div>
          ) : ticketsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center">
              <Headset className="h-10 w-10 text-brand" />
              <p className="mt-4 text-sm text-muted">{t('support.empty')}</p>
              <button type="button" className="btn-secondary mt-5" onClick={() => setShowForm(true)}>
                {t('support.newTicket')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/${currentLang}/support/${ticket.id}`}
                  className="card flex flex-wrap items-center justify-between gap-3 p-5 transition hover:border-brand/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${statusStyles[ticket.status] ?? ''}`}>
                        {t(`support.status.${ticket.status}`)}
                      </span>
                      <span className="text-xs text-muted">
                        {t(`support.categories.${ticket.category}`)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-content">
                      {ticket.subject}
                    </p>
                    {ticket.lastMessage ? (
                      <p className="mt-1 truncate text-xs text-muted">
                        {ticket.lastMessage.body}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-end text-xs text-muted">
                    <p>{formatDate(ticket.createdAt, currentLang)}</p>
                    <p>{t('support.messageCount', { count: ticket.messageCount })}</p>
                  </div>
                </Link>
              ))}
              {pagination ? <Pagination pagination={pagination} onPageChange={setPage} /> : null}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-content">
              {t('support.contactInfo')}
            </h3>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-brand" />
                support@engineering-lab.local
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-brand" />
                <span dir="ltr">+20 100 000 0000</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 shrink-0 text-brand" />
                {t('support.hours')}
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-brand" />
                {t('support.location')}
              </li>
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="mb-2 text-sm font-semibold text-content">{t('support.faqTitle')}</h3>
            <p className="text-xs leading-6 text-muted">{t('support.faqBody')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
