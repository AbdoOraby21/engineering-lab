import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import GoogleButton from '../components/auth/GoogleButton';
import PasswordInput from '../components/ui/PasswordInput';
import FieldError from '../components/ui/FieldError';
import Spinner from '../components/ui/Spinner';
import { createLoginSchema, type LoginFormValues } from '../lib/validation';
import { loginRequest } from '../lib/authApi';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import { useErrorMessage } from '../lib/errors';

const GOOGLE_ERROR_CODES = [
  'invalid_state',
  'provider_error',
  'provider_unavailable',
  'missing_profile',
  'missing_token',
  'ACCOUNT_DISABLED',
  'FORBIDDEN',
  'CONFLICT',
  'INTERNAL_ERROR',
];

function googleErrorKey(code: string): string {
  return GOOGLE_ERROR_CODES.includes(code) ? `auth.errors.${code}` : 'auth.errors.generic';
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();

  const schema = useMemo(() => createLoginSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (session) => {
      setSession(session);
      addToast(t('auth.welcomeBack'));
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      const safeRedirect =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//')
          ? redirect
          : `/${currentLang}/account`;
      navigate(safeRedirect, { replace: true });
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const oauthError = new URLSearchParams(location.search).get('error');
  const shownOauthError = useRef<string | null>(null);
  useEffect(() => {
    if (oauthError && shownOauthError.current !== oauthError) {
      shownOauthError.current = oauthError;
      addToast(t(googleErrorKey(oauthError)), 'error');
    }
  }, [oauthError, addToast, t]);

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <span>
          {t('auth.noAccount')}{' '}
          <Link to={`/${currentLang}/register`} className="link">
            {t('auth.createAccount')}
          </Link>
        </span>
      }
    >
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
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className="label mb-0" htmlFor="password">
              {t('common.password')}
            </label>
            <Link to={`/${currentLang}/forgot-password`} className="text-xs link">
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            {...register('password')}
          />
          <FieldError message={errors.password?.message} />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Spinner className="h-4 w-4" />
              {t('auth.loggingIn')}
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              {t('auth.loginButton')}
            </>
          )}
        </button>
      </form>
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">{t('auth.or')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton
        locale={currentLang}
        redirect={new URLSearchParams(location.search).get('redirect')}
      />
    </AuthShell>
  );
}
