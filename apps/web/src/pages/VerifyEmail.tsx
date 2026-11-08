import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, MailCheck } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';
import Spinner from '../components/ui/Spinner';
import { verifyEmailRequest } from '../lib/authApi';
import { useAuthStore } from '../stores/auth.store';

type VerifyState = 'verifying' | 'success' | 'error' | 'missing';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const [state, setState] = useState<VerifyState>('verifying');
  const started = useRef(false);
  const status = useAuthStore((store) => store.status);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    if (!token) {
      setState('missing');
      return;
    }

    verifyEmailRequest(token)
      .then((user) => {
        const store = useAuthStore.getState();
        if (store.user) {
          store.setUser({ ...store.user, emailVerified: user.emailVerified });
        }
        setState('success');
      })
      .catch(() => setState('error'));
  }, [token]);

  const target = status === 'authenticated' ? `/${currentLang}/account` : `/${currentLang}/login`;

  return (
    <AuthShell
      title={t('auth.verifyTitle')}
      subtitle={t('auth.verifying')}
      footer={
        <Link to={target} className="link">
          {status === 'authenticated' ? t('auth.continue') : t('auth.backToLogin')}
        </Link>
      }
    >
      <div className="rounded-2xl border border-line bg-surface2 p-8 text-center">
        {state === 'verifying' ? (
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted">{t('auth.verifying')}</p>
          </div>
        ) : null}

        {state === 'success' ? (
          <div className="flex flex-col items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <p className="text-sm leading-7 text-muted">{t('auth.verifySuccess')}</p>
          </div>
        ) : null}

        {state === 'error' ? (
          <div className="flex flex-col items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <AlertTriangle className="h-7 w-7" />
            </span>
            <p className="text-sm leading-7 text-muted">{t('auth.verifyError')}</p>
          </div>
        ) : null}

        {state === 'missing' ? (
          <div className="flex flex-col items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted">
              <MailCheck className="h-7 w-7" />
            </span>
            <p className="text-sm leading-7 text-muted">{t('auth.verifyMissing')}</p>
          </div>
        ) : null}

        {state === 'success' ? (
          <Link to={target} className="btn-primary mt-6">
            {status === 'authenticated' ? t('auth.continue') : t('auth.backToLogin')}
          </Link>
        ) : null}
      </div>
    </AuthShell>
  );
}
