import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Heart, Headset, KeyRound, MailWarning, MapPin, UserRound } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { resendVerificationRequest } from '../../lib/authApi';
import { useUiStore } from '../../stores/ui.store';
import { useErrorMessage } from '../../lib/errors';
import Spinner from '../../components/ui/Spinner';

const links = [
  { to: 'profile', icon: UserRound, key: 'account.profile' },
  { to: 'addresses', icon: MapPin, key: 'account.addresses' },
  { to: 'password', icon: KeyRound, key: 'account.password' },
  { to: '/wishlist', icon: Heart, key: 'wishlist.title', outside: true },
  { to: '/support', icon: Headset, key: 'account.myTickets', outside: true },
] as const;

export default function AccountLayout() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const user = useAuthStore((state) => state.user);
  const addToast = useUiStore((state) => state.addToast);
  const getErrorMessage = useErrorMessage();

  const resendMutation = useMutation({
    mutationFn: resendVerificationRequest,
    onSuccess: () => addToast(t('account.resendSuccess')),
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  if (!user) {
    return null;
  }

  const initials = user.name.trim().slice(0, 2).toUpperCase();

  return (
    <div className="container-page py-10">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="shrink-0 lg:w-64">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-base font-bold text-brand">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-content">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            {user.emailVerified ? (
              <span className="badge mt-4">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {t('account.emailVerified')}
              </span>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="flex items-start gap-2 text-xs leading-5 text-amber-500">
                  <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                  {t('account.verifyBanner')}
                </p>
                <button
                  type="button"
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:underline disabled:opacity-60"
                >
                  {resendMutation.isPending ? <Spinner className="h-3 w-3" /> : null}
                  {t('account.resend')}
                </button>
              </div>
            )}
          </div>

          <nav className="card mt-4 flex gap-1 overflow-x-auto p-2 lg:flex-col">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={'outside' in link && link.outside ? `/${currentLang}${link.to}` : `/${currentLang}/account/${link.to}`}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-muted hover:bg-surface2 hover:text-content'
                  }`
                }
              >
                <link.icon className="h-4 w-4" />
                {t(link.key)}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
