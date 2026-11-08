import type { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import PageLoader from './ui/PageLoader';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';

  if (status === 'loading') {
    return <PageLoader />;
  }

  if (status !== 'authenticated') {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/${currentLang}/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
