import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { AddressDto, AddressInput, AddressUpdateInput } from '@engineering-lab/shared';
import {
  createAddressRequest,
  deleteAddressRequest,
  listAddressesRequest,
  setDefaultAddressRequest,
  updateAddressRequest,
} from '../../lib/authApi';
import { createAddressSchema, type AddressFormValues } from '../../lib/validation';
import { useUiStore } from '../../stores/ui.store';
import { useErrorMessage } from '../../lib/errors';
import FieldError from '../../components/ui/FieldError';
import Spinner from '../../components/ui/Spinner';

interface AddressFormProps {
  initial?: AddressDto;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: AddressInput) => void;
}

function AddressForm({ initial, isSaving, onCancel, onSubmit }: AddressFormProps) {
  const { t } = useTranslation();
  const schema = useMemo(() => createAddressSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: initial?.label ?? '',
      governorate: initial?.governorate ?? '',
      city: initial?.city ?? '',
      street: initial?.street ?? '',
      building: initial?.building ?? '',
      notes: initial?.notes ?? '',
      isDefault: initial?.isDefault ?? false,
    },
  });

  return (
    <form
      className="card mb-6 p-6"
      noValidate
      onSubmit={handleSubmit((values) =>
        onSubmit({
          label: values.label?.trim() ? values.label : undefined,
          governorate: values.governorate,
          city: values.city,
          street: values.street,
          building: values.building,
          notes: values.notes?.trim() ? values.notes : undefined,
          isDefault: values.isDefault,
        }),
      )}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-content">
          {initial ? t('account.editAddress') : t('account.newAddress')}
        </h2>
        <button type="button" onClick={onCancel} className="icon-btn h-8 w-8" aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="label">
            {t('account.addressLabel')}{' '}
            <span className="text-xs font-normal text-muted">({t('common.optional')})</span>
          </label>
          <input id="label" className="input" {...register('label')} />
          <FieldError message={errors.label?.message} />
        </div>
        <div>
          <label className="label" htmlFor="governorate">
            {t('account.governorate')}
          </label>
          <input id="governorate" className="input" {...register('governorate')} />
          <FieldError message={errors.governorate?.message} />
        </div>
        <div>
          <label className="label" htmlFor="city">
            {t('account.city')}
          </label>
          <input id="city" className="input" {...register('city')} />
          <FieldError message={errors.city?.message} />
        </div>
        <div>
          <label className="label" htmlFor="building">
            {t('account.building')}
          </label>
          <input id="building" className="input" {...register('building')} />
          <FieldError message={errors.building?.message} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="street">
            {t('account.street')}
          </label>
          <input id="street" className="input" {...register('street')} />
          <FieldError message={errors.street?.message} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">
            {t('account.notes')}{' '}
            <span className="text-xs font-normal text-muted">({t('common.optional')})</span>
          </label>
          <textarea id="notes" rows={2} className="input resize-none" {...register('notes')} />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-content">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-line bg-surface2 text-brand focus:ring-brand/40"
          {...register('isDefault')}
        />
        {t('account.isDefault')}
      </label>

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AddressDto | null>(null);

  const addressesQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: listAddressesRequest,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['addresses'] });

  const createMutation = useMutation({
    mutationFn: createAddressRequest,
    onSuccess: () => {
      addToast(t('account.addressSaved'));
      setFormOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddressUpdateInput }) =>
      updateAddressRequest(id, input),
    onSuccess: () => {
      addToast(t('account.addressSaved'));
      setFormOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddressRequest,
    onSuccess: () => {
      addToast(t('account.addressDeleted'));
      void invalidate();
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const defaultMutation = useMutation({
    mutationFn: setDefaultAddressRequest,
    onSuccess: () => {
      addToast(t('account.defaultUpdated'));
      void invalidate();
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(address: AddressDto) {
    setEditing(address);
    setFormOpen(true);
  }

  function handleSubmit(values: AddressInput) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, input: values });
    } else {
      createMutation.mutate(values);
    }
  }

  function handleDelete(address: AddressDto) {
    if (window.confirm(t('account.deleteConfirm'))) {
      deleteMutation.mutate(address.id);
    }
  }

  const addresses = addressesQuery.data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-content">{t('account.addressesTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('account.addressesSubtitle')}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          {t('account.addAddress')}
        </button>
      </div>

      {formOpen ? (
        <AddressForm
          key={editing?.id ?? 'new'}
          initial={editing ?? undefined}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {addressesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-40" />
          <div className="skeleton h-40" />
        </div>
      ) : null}

      {addressesQuery.isError ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-muted">{getErrorMessage(addressesQuery.error)}</p>
          <button
            type="button"
            onClick={() => void addressesQuery.refetch()}
            className="btn-secondary mt-4"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      {!addressesQuery.isLoading && !addressesQuery.isError && addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <MapPin className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm text-muted">{t('account.noAddresses')}</p>
          <button type="button" onClick={openCreate} className="btn-primary mt-5">
            <Plus className="h-4 w-4" />
            {t('account.addAddress')}
          </button>
        </div>
      ) : null}

      {addresses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-content">
                      {address.label || address.governorate}
                    </h2>
                    {address.isDefault ? (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                        {t('account.default')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {address.street}, {address.building}
                    <br />
                    {address.city}, {address.governorate}
                  </p>
                  {address.notes ? (
                    <p className="mt-1 text-xs text-muted/80">{address.notes}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                {!address.isDefault ? (
                  <button
                    type="button"
                    onClick={() => defaultMutation.mutate(address.id)}
                    disabled={defaultMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand/50 hover:text-brand disabled:opacity-60"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {t('account.setDefault')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openEdit(address)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand/50 hover:text-brand"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(address)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
