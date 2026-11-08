import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/ui/Spinner';
import { fetchMe } from '../lib/authApi';
import { ensureSession } from '../lib/session';
import { useAuthStore } from '../stores/auth.store';

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const redirectParam = searchParams.get('redirect');
    const safeRedirect =
      redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
        ? redirectParam
        : `/${currentLang}/account`;

    function finish(target: string, error?: string): void {
      navigate(
        error
          ? `/${currentLang}/login?error=${encodeURIComponent(error)}&redirect=${encodeURIComponent(target)}`
          : target,
        { replace: true },
      );
    }

    void (async () => {
      await ensureSession();

      const store = useAuthStore.getState();
      if (store.status === 'authenticated' && store.user) {
        finish(safeRedirect);
        return;
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const token = hash.get('access_token');
      if (!token) {
        finish(safeRedirect, 'missing_token');
        return;
      }

      try {
        useAuthStore.getState().setAccessToken(token);
        const user = await fetchMe();
        const expiresIn = Number(hash.get('expires_in')) || 900;
        useAuthStore.getState().setSession({
          user,
          accessToken: token,
          accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        });
        finish(safeRedirect);
      } catch {
        useAuthStore.getState().clear();
        finish(safeRedirect, 'missing_token');
      }
    })();
  }, [currentLang, navigate, searchParams]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-6 w-6" />
      <p className="text-sm text-muted">{t('auth.completingSignIn')}</p>
    </div>
  );
}
