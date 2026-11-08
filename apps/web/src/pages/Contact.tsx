import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Headset, Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import { fetchSettings, submitContact } from '../lib/siteApi';
import { useUiStore } from '../stores/ui.store';
import { useErrorMessage } from '../lib/errors';
import { getCurrentLang, pick } from '../lib/localized';
import SeoHead from '../components/SeoHead';
import FieldError from '../components/ui/FieldError';

export default function ContactPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const settingsQuery = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: fetchSettings,
    staleTime: 5 * 60_000,
  });
  const settings = settingsQuery.data;

  const channels: {
    key: 'email' | 'phone' | 'whatsapp' | 'hours' | 'address';
    icon: typeof Mail;
    value: string;
    ltr?: boolean;
    href?: string;
  }[] = [
    { key: 'email', icon: Mail, value: settings?.contactEmail ?? 'support@engineeringlab.eg', ltr: true, href: settings?.contactEmail ? `mailto:${settings.contactEmail}` : undefined },
    { key: 'phone', icon: Phone, value: settings?.contactPhone ?? '+20 100 000 0000', ltr: true, href: settings?.contactPhone ? `tel:${settings.contactPhone.replace(/\s+/g, '')}` : undefined },
    { key: 'whatsapp', icon: MessageSquare, value: settings?.whatsapp ?? settings?.contactPhone ?? '+20 100 000 0000', ltr: true, href: settings?.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}` : undefined },
    { key: 'hours', icon: Clock, value: settings ? pick(settings.workingHoursAr, settings.workingHoursEn, currentLang) : t('contact.hoursValue') },
    { key: 'address', icon: MapPin, value: settings ? pick(settings.addressAr, settings.addressEn, currentLang) : t('contact.addressValue') },
  ];

  const contactMutation = useMutation({
    mutationFn: () => submitContact({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      subject: subject.trim(),
      message: message.trim(),
      website: website || undefined,
    }),
    onSuccess: () => {
      setSent(true);
      addToast(t('contact.sent'), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = t('validation.required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t('validation.email');
    if (subject.trim().length < 3) next.subject = t('validation.required');
    if (message.trim().length < 10) next.message = t('validation.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!validate()) return;
    contactMutation.mutate();
  }

  return (
    <div className="container-page animate-fade-in py-14">
      <SeoHead title={`${t('contact.title')} | ${t('common.appName')}`} />
      <div className="mx-auto max-w-2xl text-center">
        <span className="badge mx-auto">
          <Headset className="h-3.5 w-3.5" />
          {t('contact.badge')}
        </span>
        <h1 className="mt-5 text-4xl font-extrabold text-content">{t('contact.title')}</h1>
        <p className="mt-4 text-base leading-8 text-muted">{t('contact.subtitle')}</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => {
          const content = (
            <>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <channel.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-content">{t(`contact.channels.${channel.key}`)}</h2>
                <p className="mt-1 break-words text-sm text-muted" {...('ltr' in channel && channel.ltr ? { dir: 'ltr' as const } : {})}>
                  {channel.value}
                </p>
              </div>
            </>
          );
          return channel.href ? (
            <a key={channel.key} href={channel.href} className="card flex items-start gap-4 p-5 transition hover:border-brand/40">
              {content}
            </a>
          ) : (
            <div key={channel.key} className="card flex items-start gap-4 p-5">{content}</div>
          );
        })}
      </div>

      {sent ? (
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center rounded-3xl border border-brand/30 bg-brand/10 p-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-brand" />
          <h2 className="mt-4 text-xl font-bold text-content">{t('contact.sentTitle')}</h2>
          <p className="mt-2 text-sm leading-7 text-muted">{t('contact.sentBody')}</p>
          <button type="button" className="btn-secondary mt-6" onClick={() => setSent(false)}>
            {t('contact.sendAnother')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card mx-auto mt-10 max-w-2xl space-y-4 p-6" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="contact-name">{t('common.name')}</label>
              <input id="contact-name" className="input" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} />
              {errors.name ? <FieldError message={errors.name} /> : null}
            </div>
            <div>
              <label className="label" htmlFor="contact-email">{t('common.email')}</label>
              <input id="contact-email" type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} />
              {errors.email ? <FieldError message={errors.email} /> : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="contact-phone">{t('common.phone')} <span className="font-normal text-muted">({t('common.optional')})</span></label>
              <input id="contact-phone" type="tel" className="input" value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" />
            </div>
            <div>
              <label className="label" htmlFor="contact-subject">{t('contact.subject')}</label>
              <input id="contact-subject" className="input" value={subject} onChange={(event) => setSubject(event.target.value)} aria-invalid={Boolean(errors.subject)} />
              {errors.subject ? <FieldError message={errors.subject} /> : null}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="contact-message">{t('contact.message')}</label>
            <textarea id="contact-message" className="input min-h-32 resize-y" value={message} onChange={(event) => setMessage(event.target.value)} aria-invalid={Boolean(errors.message)} />
            {errors.message ? <FieldError message={errors.message} /> : null}
          </div>
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="contact-website">{t('contact.website')}</label>
            <input id="contact-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full min-h-[44px]" disabled={contactMutation.isPending}>
            {contactMutation.isPending ? t('common.saving') : t('contact.send')}
          </button>
        </form>
      )}

      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/15 via-surface to-surface p-8 text-center">
        <h2 className="text-xl font-bold text-content">{t('contact.supportCtaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted">{t('contact.supportCtaBody')}</p>
        <Link to={`/${currentLang}/support`} className="btn-primary mt-6">{t('contact.openTicket')}</Link>
      </div>
    </div>
  );
}
