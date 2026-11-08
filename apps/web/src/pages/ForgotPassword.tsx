import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, MailCheck, Send } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import FieldError from '../components/ui/FieldError';
import Spinner from '../components/ui/Spinner';
import { createForgotSchema, type ForgotFormValues } from '../lib/validation';
import { forgotPasswordRequest } from '../lib/authApi';
import { useUiStore } from '../stores/ui.store';
import { useErrorMessage } from '../lib/errors';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const isRtl = currentLang === 'ar';
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const [sent, setSent] = useState(false);
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();

  const schema = useMemo(() => createForgotSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotFormValues) => forgotPasswordRequest(values.email),
    onSuccess: () => setSent(true),
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  return (
    <AuthShell
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      footer={
        <Link to={`/${currentLang}/login`} className="link">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm leading-7 text-muted">{t('auth.forgotSent')}</p>
          <Link to={`/${currentLang}/login`} className="btn-secondary mt-5">
            <Arrow className="h-4 w-4" />
            {t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div>
            <label className="label" htmlFor="email">
              {t('common.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              {...register('email')}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner className="h-4 w-4" />
                {t('auth.sending')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t('auth.sendResetLink')}
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
