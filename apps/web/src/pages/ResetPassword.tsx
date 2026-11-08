import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, KeyRound } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import PasswordInput from '../components/ui/PasswordInput';
import FieldError from '../components/ui/FieldError';
import Spinner from '../components/ui/Spinner';
import { createResetSchema, type ResetFormValues } from '../lib/validation';
import { resetPasswordRequest } from '../lib/authApi';
import { useUiStore } from '../stores/ui.store';
import { useErrorMessage } from '../lib/errors';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const [done, setDone] = useState(false);
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();

  const schema = useMemo(() => createResetSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetFormValues) => {
      if (!token) {
        throw new Error('Missing token');
      }
      return resetPasswordRequest({ token, password: values.password });
    },
    onSuccess: () => setDone(true),
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  if (!token) {
    return (
      <AuthShell
        title={t('auth.resetTitle')}
        subtitle={t('auth.missingToken')}
        footer={
          <Link to={`/${currentLang}/forgot-password`} className="link">
            {t('auth.forgotPassword')}
          </Link>
        }
      >
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-400">
          {t('auth.missingToken')}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.resetTitle')}
      subtitle={t('auth.resetSubtitle')}
      footer={
        <Link to={`/${currentLang}/login`} className="link">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {done ? (
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm leading-7 text-muted">{t('auth.resetSuccess')}</p>
          <Link to={`/${currentLang}/login`} className="btn-primary mt-5">
            {t('auth.loginButton')}
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div>
            <label className="label" htmlFor="password">
              {t('auth.newPassword')}
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              {...register('password')}
            />
            <p className="mt-1.5 text-xs text-muted">{t('auth.passwordHint')}</p>
            <FieldError message={errors.password?.message} />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              {t('auth.confirmPassword')}
            </label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            <FieldError message={errors.confirmPassword?.message} />
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner className="h-4 w-4" />
                {t('auth.resetting')}
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                {t('auth.resetButton')}
              </>
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
