import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserRound, X } from 'lucide-react';
import { useUiStore } from '../stores/ui.store';
import { getCurrentLang } from '../lib/localized';

export default function LoginPrompt() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const open = useUiStore((state) => state.loginPromptOpen);
  const redirect = useUiStore((state) => state.loginRedirect);
  const setOpen = useUiStore((state) => state.setLoginPrompt);

  if (!open) return null;

  const loginHref = `/${currentLang}/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label={t('common.close')} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-card">
        <button type="button" onClick={() => setOpen(false)} className="icon-btn absolute end-3 top-3 h-9 w-9" aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <UserRound className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-content">{t('auth.loginRequiredTitle')}</h2>
        <p className="mt-2 text-sm leading-7 text-muted">{t('auth.loginRequiredBody')}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link to={loginHref} className="btn-primary" onClick={() => setOpen(false)}>
            {t('common.login')}
          </Link>
          <Link to={`/${currentLang}/register`} className="btn-secondary" onClick={() => setOpen(false)}>
            {t('common.register')}
          </Link>
        </div>
      </div>
    </div>
  );
}
