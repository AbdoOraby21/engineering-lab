import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { changePasswordRequest } from '../../lib/authApi';
import {
  createChangePasswordSchema,
  type ChangePasswordFormValues,
} from '../../lib/validation';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { useErrorMessage } from '../../lib/errors';
import FieldError from '../../components/ui/FieldError';
import PasswordInput from '../../components/ui/PasswordInput';
import Spinner from '../../components/ui/Spinner';

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const setSession = useAuthStore((state) => state.setSession);
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();

  const schema = useMemo(() => createChangePasswordSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      changePasswordRequest({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: (session) => {
      setSession(session);
      addToast(t('account.passwordChanged'));
      reset();
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-content">{t('account.changePasswordTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('account.changePasswordSubtitle')}</p>
      </div>

      <form
        className="max-w-lg space-y-4"
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <div>
          <label className="label" htmlFor="currentPassword">
            {t('account.currentPassword')}
          </label>
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            {...register('currentPassword')}
          />
          <FieldError message={errors.currentPassword?.message} />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">
            {t('auth.newPassword')}
          </label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            {...register('newPassword')}
          />
          <p className="mt-1.5 text-xs text-muted">{t('auth.passwordHint')}</p>
          <FieldError message={errors.newPassword?.message} />
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
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Spinner className="h-4 w-4" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              {t('account.changePasswordTitle')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
