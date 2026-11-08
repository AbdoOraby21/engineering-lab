import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import { closeTicket, fetchTicket, replyTicket } from '../lib/supportApi';
import { useErrorMessage } from '../lib/errors';
import { useUiStore } from '../stores/ui.store';
import { formatDate } from '../lib/format';
import type { AppLanguage } from '../lib/i18n';
import Skeleton from '../components/ui/Skeleton';

const statusStyles: Record<string, string> = {
  OPEN: 'border-brand/30 bg-brand/10 text-brand',
  IN_PROGRESS: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  PENDING_CUSTOMER: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  RESOLVED: 'border-sky-500/30 bg-sky-500/10 text-sky-500',
  CLOSED: 'border-line bg-surface2 text-muted',
};

export default function SupportTicketPage() {
  const { t } = useTranslation();
  const { lang, ticketId } = useParams<{ lang: string; ticketId: string }>();
  const currentLang: AppLanguage = lang === 'en' ? 'en' : 'ar';
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();
  const [body, setBody] = useState('');

  const ticketQuery = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicket(ticketId!),
    enabled: Boolean(ticketId),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeTicket(ticketId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticketId], updated);
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      addToast(t('support.closed'), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const replyMutation = useMutation({
    mutationFn: () => replyTicket(ticketId!, body.trim()),
    onSuccess: (ticket) => {
      setBody('');
      queryClient.setQueryData(['ticket', ticketId], ticket);
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const ticket = ticketQuery.data;

  return (
    <div className="container-page max-w-4xl animate-fade-in py-10">
      <Link
        to={`/${currentLang}/support`}
        className="mb-6 inline-flex items-center gap-2 text-sm link"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t('support.backToTickets')}
      </Link>

      {ticketQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      ) : !ticket ? (
        <div className="card p-10 text-center text-sm text-muted">{t('support.notFound')}</div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${statusStyles[ticket.status] ?? ''}`}>
                  {t(`support.status.${ticket.status}`)}
                </span>
                <span className="text-xs text-muted">
                  {t(`support.categories.${ticket.category}`)}
                </span>
                {ticket.orderReference ? (
                  <span className="text-xs text-muted">
                    {t('support.orderReference')}: <span dir="ltr">{ticket.orderReference}</span>
                  </span>
                ) : null}
                {ticket.orderId ? (
                  <span className="text-xs text-muted">
                    {t('support.orderId')}: <span dir="ltr">{ticket.orderId}</span>
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 text-2xl font-bold text-content">{ticket.subject}</h1>
              <p className="mt-1 text-xs text-muted">
                {t('support.openedOn', { date: formatDate(ticket.createdAt, currentLang) })}
              </p>
            </div>
            {ticket.status !== 'CLOSED' ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={closeMutation.isPending}
                onClick={() => closeMutation.mutate()}
              >
                {t('support.closeTicket')}
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            {ticket.messages.map((message) => {
              const isStaff = message.isStaff || message.sender?.role === 'ADMIN';
              return (
                <article
                  key={message.id}
                  className={`card p-5 ${isStaff ? 'border-brand/30 bg-brand-soft/30' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                          isStaff ? 'bg-brand text-brand-fg' : 'bg-surface2 text-content'
                        }`}
                      >
                        {(message.sender?.name ?? '?').charAt(0)}
                      </span>
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-content">
                          {message.sender?.name ?? t('support.unknownSender')}
                          {isStaff ? (
                            <span className="badge">
                              <ShieldCheck className="h-3 w-3" />
                              {t('support.staff')}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDate(message.createdAt, currentLang)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {message.body}
                  </p>
                </article>
              );
            })}
          </div>

          <form
            className="card mt-6 space-y-3 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (body.trim().length < 1) {
                return;
              }
              replyMutation.mutate();
            }}
          >
            <label className="label" htmlFor="ticket-reply">
              {t('support.reply')}
            </label>
            <textarea
              id="ticket-reply"
              className="input min-h-28 resize-y"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              placeholder={t('support.replyPlaceholder')}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary"
                disabled={replyMutation.isPending || body.trim().length < 1}
              >
                <Send className="h-4 w-4" />
                {t('support.sendReply')}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
