import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

export const supportedLanguages = ['ar', 'en'] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'ar' || value === 'en';
}

export function getStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem('el_lang');
    if (isAppLanguage(stored)) {
      return stored;
    }
  } catch {
    return 'ar';
  }
  return 'ar';
}

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
