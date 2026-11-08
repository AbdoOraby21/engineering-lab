import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  GitCompareArrows,
  Heart,
  LogOut,
  Menu,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { cartCount, useCartStore } from '../../stores/cart.store';
import { useCompareStore } from '../../stores/compare.store';
import { logoutRequest } from '../../lib/authApi';
import { listCategories } from '../../lib/catalogApi';
import { getCurrentLang, localizedName } from '../../lib/localized';
import { useErrorMessage } from '../../lib/errors';
import SearchAutocomplete from '../SearchAutocomplete';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

const HEADER_HEIGHT = 143;

const navItems = [
  { key: 'common.home', to: '' },
  { key: 'common.categories', to: 'catalog', mega: true },
  { key: 'common.about', to: 'about' },
  { key: 'common.contact', to: 'contact' },
  { key: 'common.support', to: 'support' },
] as const;

const headerLogoMark = (
  <svg viewBox="0 0 180 110" fill="none" aria-hidden="true" className="w-[150px] h-[110px] shrink-0">
    <defs>
      <filter id="headerGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Orbit swoosh */}
    <path
      d="M28 56 Q90 8 152 56 Q90 104 28 56"
      stroke="rgba(34,197,94,0.55)"
      strokeWidth="3"
      fill="none"
    />
    {/* Gear body */}
    <path
      d="M82 18 a30 30 0 0 0 -14.5 4.3 L62 18 L62 10 L72 10 L72 26 L62 26 L62 18 L52 18 L52 8 L42 8 L42 18 L42 26 L32 26 L32 18 L32 8 L22 8 L22 18 L22 26 L12 26 L12 36 L22 36 L22 44 L12 44 L12 52 L22 52 L22 60 L32 60 L32 52 L42 52 L42 60 L52 60 L52 52 L62 52 L62 60 L72 60 L72 52 L82 52 L82 60 L92 60 L92 52 L102 52 L102 60 L112 60 L112 52 L112 44 L122 44 L122 36 L112 36 L112 26 L122 26 L122 18 L112 18 L112 10 L102 10 L102 18 L102 26 L92 26 L92 18 L92 10 L82 10 Z"
      stroke="currentColor"
      strokeWidth="5"
      fill="none"
      strokeLinejoin="round"
    />
    {/* Chip in center */}
    <rect x="64" y="44" width="28" height="18" rx="4" fill="currentColor" />
    <rect x="70" y="48" width="6" height="4" fill="none" stroke="#04130A" strokeWidth="1.5" />
    <rect x="80" y="48" width="6" height="4" fill="none" stroke="#04130A" strokeWidth="1.5" />
    <rect x="70" y="54" width="6" height="4" fill="none" stroke="#04130A" strokeWidth="1.5" />
    <rect x="80" y="54" width="6" height="4" fill="none" stroke="#04130A" strokeWidth="1.5" />
  </svg>
);

export default function Header() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentLang = getCurrentLang(lang);
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const clearSession = useAuthStore((state) => state.clear);
  const mobileMenuOpen = useUiStore((state) => state.mobileMenuOpen);
  const setMobileMenu = useUiStore((state) => state.setMobileMenu);
  const addToast = useUiStore((state) => state.addToast);
  const setCartOpen = useCartStore((state) => state.setOpen);
  const cartItems = useCartStore((state) => state.items);
  const compareItems = useCompareStore((state) => state.items);
  const getErrorMessage = useErrorMessage();
  const [query, setQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });
  const categories = categoriesQuery.data ?? [];

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      clearSession();
      queryClient.clear();
      setUserMenuOpen(false);
      setMobileMenu(false);
      navigate(`/${currentLang}`);
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  function submitSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setMobileMenu(false);
    navigate(`/${currentLang}/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch(query);
  }

  const isAuthenticated = status === 'authenticated' && user;
  const cartTotal = cartCount(cartItems);

  return (
    <header className={`sticky top-0 z-40 border-b border-line bg-bg h-[${HEADER_HEIGHT}px]`}>
      <div className="container-page flex h-[${HEADER_HEIGHT}px] items-center gap-3 lg:gap-6">
        {/* Logo block */}
        <Link
          to={`/${currentLang}`}
          className="flex items-center gap-3 group"
          aria-label={t('common.appName')}
        >
          <span className="relative">
            {headerLogoMark}
          </span>
          <span className="hidden sm:block leading-tight">
            <span className="block text-[44px] font-bold leading-1 tracking-tight text-content">
              Engineering{' '}
              <span className="text-brand italic">Lab</span>
            </span>
            <span className="block italic text-[17px] font-medium text-muted/90">
              <span className="text-brand">·</span> Build &middot; Innovate &middot; Create{' '}
              <span className="text-brand">·</span>
            </span>
          </span>
        </Link>

        {/* Vertical divider */}
        <span className="hidden sm:w-px sm:h-[80px] bg-border mx-1" />

        {/* Search pill */}
        <form
          role="search"
          onSubmit={handleSearchSubmit}
          className="hidden sm:flex w-full max-w-[686px] mx-0"
        >
          <div className="relative flex w-full items-center rounded-full bg-surface-2 px-3 py-[17px] focus-within:ring-2 focus-within:ring-brand focus-within:shadow-[0_0_24px_rgba(34,197,94,0.35)] transition-all duration-200">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/85">
              <svg className="h-[26px] w-[26px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              id="header-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[20px] text-muted placeholder:text-muted placeholder-opacity-100 pr-10 pl-[48px] outline-none"
              placeholder={t('header.searchPlaceholder')}
            />
          </div>
        </form>

        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher />
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-2.5 text-sm font-medium text-content transition hover:border-brand/50"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <UserRound className="h-3.5 w-3.5" />
                </span>
                <span className="hidden max-w-[7rem] truncate sm:inline">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
              {userMenuOpen ? (
                <div
                  role="menu"
                  className="absolute end-0 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-card"
                >
                  <div className="border-b border-line px-3 py-2">
                    <p className="truncate text-sm font-semibold text-content">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <Link
                    to={`/${currentLang}/account/profile`}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-content transition hover:bg-surface2"
                    role="menuitem"
                  >
                    <UserRound className="h-4 w-4 text-muted" />
                    {t('header.myAccount')}
                  </Link>
                  <Link
                    to={`/${currentLang}/wishlist`}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-content transition hover:bg-surface2"
                    role="menuitem"
                  >
                    <Heart className="h-4 w-4 text-muted" />
                    {t('wishlist.title')}
                  </Link>
                  <Link
                    to={`/${currentLang}/support`}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-content transition hover:bg-surface2"
                    role="menuitem"
                  >
                    <UserRound className="h-4 w-4 text-muted" />
                    {t('account.myTickets')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => logoutMutation.mutate()}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('common.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-[34px] items-center gap-2 rounded-full border border-line bg-surface px-2 py-[12px] text-sm font-medium text-content transition hover:bg-surface2">
                <svg className="h-[34px] w-[34px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Login /</span>
                <span>Register</span>
              </span>
            </div>
          )}

          <Link
            to={`/${currentLang}/compare`}
            className="icon-btn relative"
            aria-label={t('compare.title')}
          >
            <GitCompareArrows className="h-4 w-4" />
            {compareItems.length > 0 ? (
              <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-fg" dir="ltr">
                {compareItems.length}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative"
            aria-label={`${t('common.cart')}: ${cartTotal}`}
            aria-live="polite"
          >
            <ShoppingCart className="h-[42px] w-[42px]" />
            <span className={`absolute -end-[6px] -top-[10px] flex h-[34px] min-w-[34px] items-center justify-center rounded-full bg-brand text-[#06110A] text-[17px] font-bold border border-white/40`}>
              {cartTotal > 0 ? cartTotal : 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenu(!mobileMenuOpen)}
            className="icon-btn lg:hidden"
            aria-label={mobileMenuOpen ? t('header.closeMenu') : t('header.openMenu')}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <form role="search" onSubmit={handleSearchSubmit} className="pb-3 md:hidden">
        <SearchAutocomplete id="mobile-search" value={query} onChange={setQuery} onSubmit={submitSearch} />
      </form>

      {mobileMenuOpen ? (
        <div className="max-h-[70vh] overflow-auto border-t border-line py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="mobile">
            {navItems.map((item) => (
              <div key={item.key}>
                <Link
                  to={item.to ? `/${currentLang}/${item.to}` : `/${currentLang}`}
                  onClick={() => setMobileMenu(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface2 hover:text-content"
                >
                  {t(item.key)}
                  {'mega' in item && item.mega && categories.length > 0 ? (
                    <button
                      type="button"
                      aria-label={`${t('common.categories')} ${mobileAccordion ? '−' : '+'}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      onClick={(event) => {
                        event.preventDefault();
                        setMobileAccordion((current) => (current ? null : 'categories'));
                      }}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${mobileAccordion ? 'rotate-180' : ''}`} />
                    </button>
                  ) : null}
                </Link>
                {item.key === 'common.categories' && mobileAccordion ? (
                  <ul className="ms-3 space-y-1 border-s border-line ps-3">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link
                          to={`/${currentLang}/catalog?category=${category.slug}`}
                          onClick={() => setMobileMenu(false)}
                          className="block rounded-lg px-3 py-2 text-sm text-content hover:bg-surface2"
                        >
                          {localizedName(category, currentLang)}
                        </Link>
                        {category.children.slice(0, 4).map((child) => (
                          <Link
                            key={child.id}
                            to={`/${currentLang}/catalog?category=${child.slug}`}
                            onClick={() => setMobileMenu(false)}
                            className="ms-2 block rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface2"
                          >
                            {localizedName(child, currentLang)}
                          </Link>
                        ))}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            <nav className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="badge">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {t('common.fastDelivery')}
              </span>
              <ThemeToggle />
            </nav>
            {!isAuthenticated ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to={`/${currentLang}/login`} onClick={() => setMobileMenu(false)} className="btn-secondary py-2">
                  {t('common.login')}
                </Link>
                <Link to={`/${currentLang}/register`} onClick={() => setMobileMenu(false)} className="btn-primary py-2">
                  {t('common.register')}
                </Link>
              </div>
            ) : null}
          </nav>
          </div>
        ) : null}
    </header>
  );
}
