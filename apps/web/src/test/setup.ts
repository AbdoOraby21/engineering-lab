import '@testing-library/jest-dom/vitest';
import i18n from '../lib/i18n';

await i18n.changeLanguage('en');
window.localStorage.setItem('el_lang', 'en');
