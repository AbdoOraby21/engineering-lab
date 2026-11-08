import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useUiStore } from '../../stores/ui.store';
import {
  getSettings,
  updateSettings,
  listAdminPages,
  updateAdminPage,
} from '../../lib/adminApi';
import Card from '../../components/ui/Card';
import FieldError from '../../components/ui/FieldError';
import Spinner from '../../components/ui/Spinner';

type FormValues = {
  'store.name': string;
  'store.nameAr': string;
  'store.tagline': string;
  'store.taglineAr': string;
  'store.logoUrl': string;
  'store.faviconUrl': string;
  'contact.phone': string;
  'contact.phone2': string;
  'contact.email': string;
  'contact.whatsapp': string;
  'contact.addressAr': string;
  'contact.addressEn': string;
  'contact.hoursAr': string;
  'contact.hoursEn': string;
  'social.facebook': string;
  'social.instagram': string;
  'social.youtube': string;
  'social.tiktok': string;
  'social.x': string;
  'social.linkedin': string;
  'social.telegram': string;
  'site.credit.enabled': boolean;
  'site.credit.nameAr': string;
  'site.credit.nameEn': string;
  'site.credit.url': string;
};

const optionalUrl = () => z.string().trim().url('Enter a valid URL').optional().or(z.literal(''));
const optionalPhone = () =>
  z.string().trim().regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number').optional().or(z.literal(''));

function buildSchema(t: ReturnType<typeof useTranslation>['t']) {
  return z.object({
    'store.name': z.string().trim().min(1, t('admin.settings.fields.name')).max(160).optional(),
    'store.nameAr': z.string().trim().min(1, t('admin.settings.fields.nameAr')).max(160).optional(),
    'store.tagline': z.string().trim().max(300).optional(),
    'store.taglineAr': z.string().trim().max(300).optional(),
    'store.logoUrl': optionalUrl(),
    'store.faviconUrl': optionalUrl(),
    'contact.phone': optionalPhone(),
    'contact.phone2': optionalPhone(),
    'contact.email': z.string().trim().email(t('validation.email')).max(254).optional().or(z.literal('')),
    'contact.whatsapp': optionalPhone(),
    'contact.addressAr': z.string().trim().max(500).optional(),
    'contact.addressEn': z.string().trim().max(500).optional(),
    'contact.hoursAr': z.string().trim().max(200).optional(),
    'contact.hoursEn': z.string().trim().max(200).optional(),
    'social.facebook': optionalUrl(),
    'social.instagram': optionalUrl(),
    'social.youtube': optionalUrl(),
    'social.tiktok': optionalUrl(),
    'social.x': optionalUrl(),
    'social.linkedin': optionalUrl(),
    'social.telegram': optionalUrl(),
    'site.credit.enabled': z.boolean(),
    'site.credit.nameAr': z.string().trim().min(1, t('admin.settings.fields.creditNameAr')).max(80).optional(),
    'site.credit.nameEn': z.string().trim().min(1, t('admin.settings.fields.creditNameEn')).max(80).optional(),
    'site.credit.url': z.string().trim().url(t('admin.settings.fields.creditUrl')),
  });
}

const DEFAULT_FORM: FormValues = {
  'store.name': '',
  'store.nameAr': '',
  'store.tagline': '',
  'store.taglineAr': '',
  'store.logoUrl': '',
  'store.faviconUrl': '',
  'contact.phone': '',
  'contact.phone2': '',
  'contact.email': '',
  'contact.whatsapp': '',
  'contact.addressAr': '',
  'contact.addressEn': '',
  'contact.hoursAr': '',
  'contact.hoursEn': '',
  'social.facebook': '',
  'social.instagram': '',
  'social.youtube': '',
  'social.tiktok': '',
  'social.x': '',
  'social.linkedin': '',
  'social.telegram': '',
  'site.credit.enabled': true,
  'site.credit.nameAr': '',
  'site.credit.nameEn': '',
  'site.credit.url': '',
};

function flatten(values: FormValues): Record<string, unknown> {
  const socialLinks: Record<string, string> = {};
  for (const key of ['facebook', 'instagram', 'youtube', 'tiktok', 'x', 'linkedin', 'telegram'] as const) {
    const v = values[`social.${key}`];
    if (v) socialLinks[key] = v;
  }
  return {
    'store.name': values['store.name'],
    'store.nameAr': values['store.nameAr'],
    'store.tagline': values['store.tagline'],
    'store.taglineAr': values['store.taglineAr'],
    'store.logoUrl': values['store.logoUrl'],
    'store.faviconUrl': values['store.faviconUrl'],
    'contact.phone': values['contact.phone'],
    'contact.phone2': values['contact.phone2'],
    'contact.email': values['contact.email'],
    'contact.whatsapp': values['contact.whatsapp'],
    'contact.addressAr': values['contact.addressAr'],
    'contact.addressEn': values['contact.addressEn'],
    'contact.hoursAr': values['contact.hoursAr'],
    'contact.hoursEn': values['contact.hoursEn'],
    'social.links': Object.keys(socialLinks).length > 0 ? socialLinks : {},
    'site.credit': {
      enabled: values['site.credit.enabled'],
      nameAr: values['site.credit.nameAr'],
      nameEn: values['site.credit.nameEn'],
      url: values['site.credit.url'],
    },
  };
}

function unflatten(raw: Record<string, unknown> | undefined): FormValues {
  const social = (raw?.['social.links'] as Record<string, string> | undefined) ?? {};
  const credit = raw?.['site.credit'] as {
    enabled?: boolean;
    nameAr?: string;
    nameEn?: string;
    url?: string;
  } | undefined;
  return {
    ...DEFAULT_FORM,
    'store.name': String(raw?.['store.name'] ?? ''),
    'store.nameAr': String(raw?.['store.nameAr'] ?? ''),
    'store.tagline': String(raw?.['store.tagline'] ?? ''),
    'store.taglineAr': String(raw?.['store.taglineAr'] ?? ''),
    'store.logoUrl': String(raw?.['store.logoUrl'] ?? ''),
    'store.faviconUrl': String(raw?.['store.faviconUrl'] ?? ''),
    'contact.phone': String(raw?.['contact.phone'] ?? ''),
    'contact.phone2': String(raw?.['contact.phone2'] ?? ''),
    'contact.email': String(raw?.['contact.email'] ?? ''),
    'contact.whatsapp': String(raw?.['contact.whatsapp'] ?? ''),
    'contact.addressAr': String(raw?.['contact.addressAr'] ?? ''),
    'contact.addressEn': String(raw?.['contact.addressEn'] ?? ''),
    'contact.hoursAr': String(raw?.['contact.hoursAr'] ?? ''),
    'contact.hoursEn': String(raw?.['contact.hoursEn'] ?? ''),
    'social.facebook': social.facebook ?? '',
    'social.instagram': social.instagram ?? '',
    'social.youtube': social.youtube ?? '',
    'social.tiktok': social.tiktok ?? '',
    'social.x': social.x ?? '',
    'social.linkedin': social.linkedin ?? '',
    'social.telegram': social.telegram ?? '',
    'site.credit.enabled': credit?.enabled ?? true,
    'site.credit.nameAr': String(credit?.nameAr ?? ''),
    'site.credit.nameEn': String(credit?.nameEn ?? ''),
    'site.credit.url': String(credit?.url ?? ''),
  };
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const addToast = useUiStore((state) => state.addToast);
  const [tab, setTab] = useState<'store' | 'pages'>('store');

  const settingsQuery = useQuery({
    queryKey: ['admin-settings', 'store'],
    queryFn: () => getSettings('store').then((r) => r.data.settings),
  });

  const schema = useCallback(() => buildSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema()),
    defaultValues: DEFAULT_FORM,
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => updateSettings('store', flatten(values)),
    onSuccess: () => {
      addToast(t('admin.settingsUpdated'), 'success');
      void settingsQuery.refetch();
    },
    onError: (error: unknown) => {
      addToast(error instanceof Error ? error.message : 'Failed to save settings', 'error');
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await saveMutation.mutateAsync(values);
  });

  const creditEnabled = watch('site.credit.enabled');

  // ---------------------------------------------------------------------------
  // Pages CMS hooks (kept unconditional to satisfy the rules of hooks)
  // ---------------------------------------------------------------------------

  type PageFormValues = {
    titleAr: string;
    titleEn: string;
    contentAr: string;
    contentEn: string;
    isPublished: boolean;
  };

  const pagesQuery = useQuery({
    queryKey: ['admin-pages'],
    queryFn: () => listAdminPages().then((r) => r.data.pages ?? []),
  });

  const [editingPage, setEditingPage] = useState<{ id: string; slug: string } | null>(null);

  const pageSchema = z.object({
    titleAr: z.string().trim().min(1, t('validation.required')).max(200),
    titleEn: z.string().trim().min(1, t('validation.required')).max(200),
    contentAr: z.string().trim().max(20000).optional(),
    contentEn: z.string().trim().max(20000).optional(),
    isPublished: z.boolean(),
  });
  const {
    register: pRegister,
    handleSubmit: pHandleSubmit,
    formState: { errors: pErrors, isSubmitting: pIsSubmitting },
    reset: pReset,
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: { titleAr: '', titleEn: '', contentAr: '', contentEn: '', isPublished: true },
  });

  const pageSaveMutation = useMutation({
    mutationFn: async (values: PageFormValues) => {
      if (!editingPage) throw new Error('No page selected');
      return updateAdminPage(editingPage.slug, values);
    },
    onSuccess: () => {
      addToast(t('admin.settingsUpdated'), 'success');
      void pagesQuery.refetch();
      setEditingPage(null);
    },
    onError: (error: unknown) => {
      addToast(error instanceof Error ? error.message : 'Failed to save page', 'error');
    },
  });

  const onPageSubmit = pHandleSubmit(async (values) => {
    await pageSaveMutation.mutateAsync(values);
  });

  useEffect(() => {
    if (settingsQuery.isSuccess && settingsQuery.data) {
      reset(unflatten(settingsQuery.data as Record<string, unknown>));
    }
  }, [settingsQuery.isSuccess, settingsQuery.data, reset]);

  if (settingsQuery.isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-content">{t('admin.settings.title')}</h1>
          <p className="text-sm text-muted">{t('admin.settings.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setTab('store')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === 'store' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-content'
          }`}
        >
          {t('admin.settings.storeTab')}
        </button>
        <button
          type="button"
          onClick={() => setTab('pages')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === 'pages' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-content'
          }`}
        >
          {t('admin.settings.pagesTab')}
        </button>
      </div>

      {tab === 'store' ? (
        <Card title={t('admin.settings.title')} className="overflow-x-auto">
          <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 min-w-[720px]">
            <div className="col-span-full flex items-center gap-2 text-sm font-semibold text-content border-b border-line pb-2 mb-3">
              Store identity
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.name')}</label>
              <input {...register('store.name')} className="input" placeholder={t('admin.settings.fields.name')} />
              <FieldError message={errors['store.name']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.nameAr')}</label>
              <input {...register('store.nameAr')} className="input" placeholder={t('admin.settings.fields.nameAr')} />
              <FieldError message={errors['store.nameAr']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.tagline')}</label>
              <input {...register('store.tagline')} className="input" placeholder={t('admin.settings.fields.tagline')} />
              <FieldError message={errors['store.tagline']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.taglineAr')}</label>
              <input {...register('store.taglineAr')} className="input" placeholder={t('admin.settings.fields.taglineAr')} />
              <FieldError message={errors['store.taglineAr']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.logoUrl')}</label>
              <input {...register('store.logoUrl')} className="input" placeholder="https://..." />
              <FieldError message={errors['store.logoUrl']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.faviconUrl')}</label>
              <input {...register('store.faviconUrl')} className="input" placeholder="https://..." />
              <FieldError message={errors['store.faviconUrl']?.message} />
            </div>
            <div className="col-span-full flex items-center gap-2 text-sm font-semibold text-content border-b border-line pb-2 mb-3">
              Contact
            </div>
            <div className="col-span-full">
              <label className="label">{t('admin.settings.fields.phone')}</label>
              <input {...register('contact.phone')} className="input" placeholder="+20 100 000 0000" />
              <FieldError message={errors['contact.phone']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.phone2')}</label>
              <input {...register('contact.phone2')} className="input" placeholder="+20 100 000 0000" />
              <FieldError message={errors['contact.phone2']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.email')}</label>
              <input {...register('contact.email')} className="input" type="email" placeholder="support@store.example" />
              <FieldError message={errors['contact.email']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.whatsapp')}</label>
              <input {...register('contact.whatsapp')} className="input" placeholder="+20 100 000 0000" />
              <FieldError message={errors['contact.whatsapp']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.addressAr')}</label>
              <input {...register('contact.addressAr')} className="input" />
              <FieldError message={errors['contact.addressAr']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.addressEn')}</label>
              <input {...register('contact.addressEn')} className="input" />
              <FieldError message={errors['contact.addressEn']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.hoursAr')}</label>
              <input {...register('contact.hoursAr')} className="input" />
              <FieldError message={errors['contact.hoursAr']?.message} />
            </div>
            <div>
              <label className="label">{t('admin.settings.fields.hoursEn')}</label>
              <input {...register('contact.hoursEn')} className="input" />
              <FieldError message={errors['contact.hoursEn']?.message} />
            </div>
            <div className="col-span-full flex items-center gap-2 text-sm font-semibold text-content border-b border-line pb-2 mb-3">
              {t('admin.settings.fields.socialLinks')}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {(['facebook', 'instagram', 'youtube', 'tiktok', 'x', 'linkedin', 'telegram'] as const).map((key) => (
                <div key={key} className="flex flex-col">
                  <label className="label text-xs">{key}</label>
                  <input {...register(`social.${key}`)} className="input" placeholder="https://..." />
                  <FieldError message={errors[`social.${key}`]?.message} />
                </div>
              ))}
            </div>
            <div className="col-span-full pt-3 border-t border-line">
              <div className="flex items-center gap-2 text-sm font-semibold text-content">
                <input id="credit-enabled" type="checkbox" {...register('site.credit.enabled')} className="rounded border-brand text-brand focus:ring-brand" />
                <label htmlFor="credit-enabled" className="label cursor-pointer">
                  {t('admin.settings.fields.creditEnabled')}
                </label>
              </div>
              {creditEnabled ? (
                <div className="grid gap-3 md:grid-cols-3 mt-3">
                  <div>
                    <label className="label">{t('admin.settings.fields.creditNameAr')}</label>
                    <input {...register('site.credit.nameAr')} className="input" />
                    <FieldError message={errors['site.credit.nameAr']?.message} />
                  </div>
                  <div>
                    <label className="label">{t('admin.settings.fields.creditNameEn')}</label>
                    <input {...register('site.credit.nameEn')} className="input" />
                    <FieldError message={errors['site.credit.nameEn']?.message} />
                  </div>
                  <div>
                    <label className="label">{t('admin.settings.fields.creditUrl')}</label>
                    <input {...register('site.credit.url')} className="input" placeholder="https://..." />
                    <FieldError message={errors['site.credit.url']?.message} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="col-span-full flex justify-end gap-2 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => reset(unflatten(settingsQuery.data as Record<string, unknown> | undefined))}
                disabled={isSubmitting}
                className="btn-secondary disabled:opacity-60"
              >
                {t('admin.reset')}
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
                {isSubmitting ? t('admin.saving') : t('admin.settings.save')}
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <Card title={t('admin.settings.pagesTab')}>
          {editingPage ? (
            <div className="space-y-4">
              <button type="button" onClick={() => setEditingPage(null)} className="text-sm link mb-2">
                ← {t('admin.goBack')}
              </button>
              <form onSubmit={onPageSubmit} className="space-y-3">
                <div>
                  <label className="label">{t('admin.settings.fields.titleEn')}</label>
                  <input {...pRegister('titleEn')} className="input" />
                  <FieldError message={pErrors.titleEn?.message} />
                </div>
                <div>
                  <label className="label">{t('admin.settings.fields.titleAr')}</label>
                  <input {...pRegister('titleAr')} className="input" />
                  <FieldError message={pErrors.titleAr?.message} />
                </div>
                <div>
                  <label className="label">Content (English)</label>
                  <textarea {...pRegister('contentEn')} className="input" rows={6} />
                </div>
                <div>
                  <label className="label">المحتوى (العربية)</label>
                  <textarea {...pRegister('contentAr')} className="input" rows={6} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="is-published" type="checkbox" {...pRegister('isPublished')} className="rounded border-brand text-brand focus:ring-brand" />
                  <label htmlFor="is-published" className="label cursor-pointer">Published</label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingPage(null)} className="btn-secondary disabled:opacity-60">
                    {t('admin.cancel')}
                  </button>
                  <button type="submit" disabled={pIsSubmitting} className="btn-primary disabled:opacity-60">
                    {pIsSubmitting ? t('admin.saving') : t('admin.settings.save')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-content">{t('admin.settings.pagesTab')}</h2>
              </div>
              {pagesQuery.isLoading ? (
                <Spinner />
              ) : (
                <div className="border border-line rounded-xl">
                  {(pagesQuery.data?.length ?? 0) === 0 ? (
                    <div className="p-4 text-center text-sm text-muted">
                      No pages yet. Create one via the database or the API.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line/50 bg-surface/30 text-xs">
                          <th className="px-4 py-3 text-left text-muted">Slug</th>
                          <th className="px-4 py-3 text-left text-muted">Title (EN)</th>
                          <th className="px-4 py-3 text-left text-muted">Title (AR)</th>
                          <th className="px-4 py-3 text-center text-muted">Published</th>
                          <th className="px-4 py-3 text-right text-muted">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagesQuery.data?.map((page) => (
                          <tr key={page.id} className="border-b border-line/50 hover:bg-surface/30 transition">
                            <td className="px-4 py-3 font-semibold text-muted dir-ltr">{page.slug}</td>
                            <td className="px-4 py-3 text-content">{page.titleEn}</td>
                            <td className="px-4 py-3 text-content">{page.titleAr}</td>
                            <td className="px-4 py-3 text-center">
                              {page.isPublished ? (
                                <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-muted">No</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  pReset({
                                    titleAr: page.titleAr,
                                    titleEn: page.titleEn,
                                    contentAr: page.contentAr ?? '',
                                    contentEn: page.contentEn ?? '',
                                    isPublished: page.isPublished,
                                  });
                                  setEditingPage({ id: page.id, slug: page.slug });
                                }}
                                className="link text-sm"
                              >
                                {t('admin.edit')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
