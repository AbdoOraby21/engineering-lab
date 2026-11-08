import type { AppLanguage } from './i18n';

export function pick(ar: string | null | undefined, en: string | null | undefined, lang: AppLanguage): string {
  return (lang === 'en' ? en : ar) ?? en ?? ar ?? '';
}

export function localizedName<T extends { nameAr: string; nameEn: string }>(
  entity: T | null | undefined,
  lang: AppLanguage,
): string {
  if (!entity) return '';
  return lang === 'en' ? entity.nameEn : entity.nameAr;
}

export function localizedAlt(
  image: { altAr: string | null; altEn: string | null } | null | undefined,
  fallback: string,
  lang: AppLanguage,
): string {
  if (!image) return fallback;
  return (lang === 'en' ? image.altEn : image.altAr) ?? fallback;
}

export function getCurrentLang(lang: string | undefined): AppLanguage {
  return lang === 'en' ? 'en' : 'ar';
}
