import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiError } from './api';

export function useErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation();

  return useCallback(
    (error: unknown) => {
      const normalized = getApiError(error);
      if (normalized.code === 'NETWORK') {
        return t('errors.network');
      }
      const key = `errors.${normalized.code}`;
      const translated = t(key);
      if (translated === key) {
        return t('errors.generic');
      }
      return translated;
    },
    [t],
  );
}
