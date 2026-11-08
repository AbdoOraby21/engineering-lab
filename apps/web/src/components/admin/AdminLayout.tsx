import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams, NavLink, Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store';
import { LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { getCurrentLang } from '../../lib/localized';
import LanguageSwitcher from '../layout/LanguageSwitcher';
import ThemeToggle from '../layout/ThemeToggle';

const NAV = [
  { key: 'admin.overview', to: 'overview', icon: 'layout-dashboard' },
  { key: 'admin.sales', to: 'sales', icon: 'credit-card' },
  { key: 'admin.catalog', to: 'catalog', icon: 'package' },
  { key: 'admin.customers', to: 'customers', icon: 'users' },
  { key: 'admin.content', to: 'content', icon: 'file-text' },
  { key: 'admin.support', to: 'support', icon: 'headphones' },
  { key: 'admin.settings', to: 'settings', icon: 'settings' },
] as const;

export default function AdminLayout() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = getCurrentLang(lang);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clear);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = useCallback(() => {
    clearSession();
    navigate(`/${currentLang}/login`);
  }, [clearSession, navigate, currentLang]);

  useEffect(() => {
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  if (user && user.role !== 'ADMIN') {
    return <Navigate to={`/${currentLang}/admin/forbidden`} replace />;
  }

  const isActive = (to: string) => location.pathname === `/${currentLang}/admin/${to}`;

  return (
    <div className="flex min-h-screen bg-bg">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-surface transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-line">
          <div className="text-sm font-bold text-content">Engineering Lab</div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-muted transition hover:bg-surface2 lg:hidden"
            aria-label={t('header.closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="px-3 space-y-1" aria-label="main">
          {NAV.map((item) => {
            const active = isActive(item.to);
            return (
              <NavLink
                key={item.key}
                to={`/${currentLang}/admin/${item.to}`}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                    isActive
                      ? 'bg-brand/10 text-brand border-r-2 border-brand'
                      : 'text-muted hover:bg-surface2 hover:text-content'
                  }`
                }
              >
                <span className={`h-5 w-5 shrink-0 ${active ? 'text-brand' : 'text-muted'}`}>
                  {item.icon === 'layout-dashboard' && <LayoutDashboardIcon />}
                  {item.icon === 'credit-card' && <CreditCardIcon />}
                  {item.icon === 'package' && <PackageIcon />}
                  {item.icon === 'users' && <UsersIcon />}
                  {item.icon === 'file-text' && <FileTextIcon />}
                  {item.icon === 'headphones' && <HeadphonesIcon />}
                  {item.icon === 'settings' && <SettingsIcon />}
                </span>
                {t(item.key)}
                {active && <ChevronDown className="ml-auto h-4 w-4 text-brand" />}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto px-4 pb-6 border-t border-line">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl text-sm border border-line/50">
            <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold text-content truncate">{user?.name}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/5 transition flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" /> {t('admin.logout')}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-3 rounded-lg text-muted transition hover:bg-surface2 lg:hidden absolute left-4 top-4 z-20"
          aria-label={t('header.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>

        <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur px-6 py-3 flex items-center justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-content">{t('admin.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="container-page">
            <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted">
              <NavLink
                to={`/${currentLang}/admin`}
                end
                className="nav-link hover:text-brand"
              >
                {t('admin.overview')}
              </NavLink>
              <span className="mx-1 text-line">/</span>
              <span className="text-content">{location.pathname.split('/').pop()}</span>
            </nav>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function LayoutDashboardIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="3"/></svg>
  );
}
function CreditCardIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="10" x="3" y="7" rx="2" ry="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
  );
}
function PackageIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 8v8.5h0 0 0 0 0 0 0 0 0V12h8v4l-4-6z"/><path d="M20.5 4v-1.5A0.5 0.5 0 0 0 20 2h-12A0.5 0.5 0 0 0 8 2.5V4"/></svg>
  );
}
function UsersIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
}
function FileTextIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="9" y1="15" x2="9" y2="15"/><line x1="15" y1="15" x2="15" y2="15"/></svg>
  );
}
function HeadphonesIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 9-9v0a9 9 0 0 1 9 9v0"/><path d="M3 18V9a9 9 0 0 1 9-9v0a9 9 0 0 1 9 9v9"/><path d="M18 15V3"/><path d="M3 3v9"/></svg>
  );
}
function SettingsIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2v-0.9A2 2 0 0 1 18 10a2 2 0 0 1 2 2v0.9a1.65 1.65 0 0 0-1 1.51"/><path d="M9.4 15a1.65 1.65 0 0 1-.33 1.82l-.06.06a2 2 0 0 0 0 2.83 2 2 0 0 0 2.83 0l.06-.06a1.65 1.65 0 0 1 1.82-.33 1.65 1.65 0 0 1 1-1.51V3a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2v0.9a1.65 1.65 0 0 1 1 1.51"/></svg>
  );
}
