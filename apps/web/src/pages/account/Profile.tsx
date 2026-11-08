import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { BadgeCheck, Save } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { updateProfileRequest } from '../../lib/authApi';
import { createProfileSchema, type ProfileFormValues } from '../../lib/validation';
import { useUiStore } from '../../stores/ui.store';
import { useErrorMessage } from '../../lib/errors';
import FieldError from '../../components/ui/FieldError';
import Spinner from '../../components/ui/Spinner';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();

  const schema = useMemo(() => createProfileSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      locale: user?.locale ?? 'ar',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateProfileRequest({
        name: values.name,
        phone: values.phone?.trim() ? values.phone : null,
        locale: values.locale,
      }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      addToast(t('account.saved'));
      if (updatedUser.locale !== currentLang) {
        navigate(`/${updatedUser.locale}/account/profile`);
      }
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  if (!user) {
    return null;
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-content">{t('account.profileTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('account.profileSubtitle')}</p>
      </div>

      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              {t('common.name')}
            </label>
            <input id="name" autoComplete="name" className="input" {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              {t('common.phone')}
            </label>
            <input
              id="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              className="input"
              {...register('phone')}
            />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="label">{t('common.email')}</span>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface2 px-4 py-2.5">
              <span className="flex-1 truncate text-sm text-muted" dir="ltr">
                {user.email}
              </span>
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                  <BadgeCheck className="h-3 w-3" />
                  {t('account.emailVerified')}
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                  {t('account.emailNotVerified')}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="locale">
              {t('account.preferredLanguage')}
            </label>
            <select id="locale" className="input" {...register('locale')}>
              <option value="ar">{t('common.arabic')}</option>
              <option value="en">{t('common.english')}</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Spinner className="h-4 w-4" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t('account.saveChanges')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
