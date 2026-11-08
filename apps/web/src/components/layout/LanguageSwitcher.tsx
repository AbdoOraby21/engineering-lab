import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { isAppLanguage } from '../../lib/i18n';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const current = isAppLanguage(i18n.language) ? i18n.language : 'ar';
  const target = current === 'ar' ? 'en' : 'ar';

  function switchLanguage() {
    try {
      localStorage.setItem('el_lang', target);
    } catch {
      return;
    }
    const nextPath = location.pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${target}`);
    navigate(`${nextPath}${location.search}${location.hash}`);
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-muted transition hover:border-brand/50 hover:text-brand"
      aria-label={t('common.language')}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">{target === 'ar' ? t('common.arabic') : t('common.english')}</span>
    </button>
  );
}
