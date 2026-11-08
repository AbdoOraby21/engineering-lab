import type { AppLanguage } from './i18n';

export function formatEGP(piasters: number, language: AppLanguage): string {
  const amount = piasters / 100;
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
  }).format(new Date(value));
}
