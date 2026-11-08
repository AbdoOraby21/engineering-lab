import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import PageLoader from '../ui/PageLoader';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === 'loading') return <PageLoader />;
  if (status !== 'authenticated' || !user) {
    const redirect = encodeURIComponent(`/admin`);
    return <Navigate to={`/${currentLang}/login?redirect=${redirect}`} replace />;
  }
  if (user.role !== 'ADMIN') {
    return <Navigate to={`/${currentLang}/admin/forbidden`} replace />;
  }
  return <>{children}</>;
}
