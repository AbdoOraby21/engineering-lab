import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import GoogleButton from '../components/auth/GoogleButton';
import PasswordInput from '../components/ui/PasswordInput';
import FieldError from '../components/ui/FieldError';
import Spinner from '../components/ui/Spinner';
import { createRegisterSchema, type RegisterFormValues } from '../lib/validation';
import { registerRequest } from '../lib/authApi';
import { useAuthStore } from '../stores/auth.store';
import { useUiStore } from '../stores/ui.store';
import { useErrorMessage } from '../lib/errors';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();

  const schema = useMemo(() => createRegisterSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (session) => {
      setSession(session);
      addToast(t('auth.accountCreated'));
      addToast(t('auth.emailVerificationHint'), 'info');
      navigate(`/${currentLang}/account`, { replace: true });
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  return (
    <AuthShell
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <span>
          {t('auth.haveAccount')}{' '}
          <Link to={`/${currentLang}/login`} className="link">
            {t('auth.signIn')}
          </Link>
        </span>
      }
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit((values) =>
          mutation.mutate({
            name: values.name,
            email: values.email,
            phone: values.phone?.trim() ? values.phone : undefined,
            password: values.password,
            locale: currentLang,
          }),
        )}
      >
        <div>
          <label className="label" htmlFor="name">
            {t('common.name')}
          </label>
          <input id="name" autoComplete="name" className="input" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>
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
          <label className="label" htmlFor="phone">
            {t('common.phone')}{' '}
            <span className="text-xs font-normal text-muted">({t('common.optional')})</span>
          </label>
          <input
            id="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel"
            className="input"
            placeholder="+201234567890"
            {...register('phone')}
          />
          <FieldError message={errors.phone?.message} />
        </div>
        <div>
          <label className="label" htmlFor="password">
            {t('common.password')}
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
              {t('auth.registering')}
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              {t('auth.registerButton')}
            </>
          )}
        </button>
      </form>
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">{t('auth.or')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton locale={currentLang} />
    </AuthShell>
  );
}
