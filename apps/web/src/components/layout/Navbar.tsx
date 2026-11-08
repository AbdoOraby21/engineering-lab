import { useState } from 'react';
import { Link, useParams, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  GitCompareArrows,
  Home,
  ShoppingCart,
  Truck,
  UserRound,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { cartCount, useCartStore } from '../../stores/cart.store';
import { useCompareStore } from '../../stores/compare.store';
import { listCategories } from '../../lib/catalogApi';
import { localizedName } from '../../lib/localized';

const NAVBAR_HEIGHT = 56;

const links = [
  { key: 'common.home', to: '' },
  { key: 'common.about', to: 'about' },
  { key: 'common.contact', to: 'contact' },
  { key: 'common.support', to: 'support' },
] as const;

export default function Navbar() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const cartItems = useCartStore((state) => state.items);
  const compareItems = useCompareStore((state) => state.items);
  const cartTotal = cartCount(cartItems);
  const isAuthenticated = status === 'authenticated' && user;

  const [megaOpen, setMegaOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['navbar-categories'],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });
  const categories = categoriesQuery.data ?? [];

  return (
    <div className={`hidden border-b border-line bg-bg h-[${NAVBAR_HEIGHT}px] lg:block`}>
      <div className="container-page flex h-[${NAVBAR_HEIGHT}px] items-center justify-between gap-3">
        {/* Home button (active) */}
        <Link
          to={`/${currentLang}`}
          className="flex items-center gap-2 rounded-[12px] px-4 py-[17px] bg-gradient-to-b from-brand via-brand-hover to-brand text-white font-bold text-[18px] leading-none shadow-[0_0_24px_rgba(34,197,94,0.35)] transition"
          aria-current="page"
        >
          <Home className="h-7 w-7" />
          <span className="hidden sm:inline">{t('common.home')}</span>
        </Link>

        {/* Nav group pill */}
        <div className="flex items-center gap-3 rounded-[12px] bg-surface px-3 py-[17px]">
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-content transition hover:text-brand hover:bg-surface/50"
              aria-expanded={megaOpen}
              aria-haspopup="menu"
              onClick={() => setMegaOpen((open) => !open)}
            >
              <GridIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.categories')}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${megaOpen ? 'rotate-180' : ''}`} />
            </button>
            {megaOpen ? (
              <div className="absolute left-0 top-full mt-2 w-[34rem] rounded-[14px] border border-line bg-surface p-4 shadow-card z-50">
                <div className="grid grid-cols-2 gap-2">
                  {categories.slice(0, 8).map((category) => (
                    <div key={category.id} className="rounded-[12px] p-2 hover:bg-surface/50">
                      <Link
                        to={`/${currentLang}/catalog?category=${category.slug}`}
                        className="block rounded-[8px] px-2 py-1.5 text-sm font-medium text-content transition hover:bg-surface hover:text-brand"
                        onClick={() => setMegaOpen(false)}
                      >
                        {localizedName(category, currentLang)}
                      </Link>
                      {category.children.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {category.children.slice(0, 5).map((child) => (
                            <li key={child.id}>
                              <Link
                                to={`/${currentLang}/catalog?category=${child.slug}`}
                                className="block rounded-[8px] px-2 py-1 text-xs text-muted transition hover:bg-surface hover:text-brand"
                                onClick={() => setMegaOpen(false)}
                              >
                                {localizedName(child, currentLang)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
                <Link
                  to={`/${currentLang}/catalog`}
                  onClick={() => setMegaOpen(false)}
                  className="mt-3 w-full rounded-[10px] px-3 py-2 btn-secondary"
                >
                  {t('common.viewAll')}
                </Link>
              </div>
            ) : null}
          </div>
          {links
            .filter((item) => item.key !== 'common.home')
            .map((item) => (
              <NavLink
                key={item.key}
                to={item.to ? `/${currentLang}/${item.to}` : `/${currentLang}`}
                className={({ isActive }: { isActive: boolean }) => `rounded-[10px] px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-surface/50 text-brand' : 'text-content hover:text-brand hover:bg-surface/50'}`}
              >
                {t(item.key)}
              </NavLink>
            ))}
        </div>

        {/* Delivery pill */}
        <Link
          to={`/${currentLang}/support`}
          className="flex items-center gap-2 rounded-full border border-brand bg-[rgba(34,197,94,0.08)] px-3 py-[10px] text-[15px] font-semibold text-brand transition hover:bg-[rgba(34,197,94,0.12)]"
        >
          <Truck className="h-5 w-5" />
          <span className="hidden sm:inline">{t('common.fastDelivery')}</span>
        </Link>

        {/* Account / cart area (mini, mirrors header for consistency) */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-content transition hover:bg-surface/50"
            >
              <UserRound className="h-4 w-4" />
            </button>
          ) : (
            <span className="flex h-[34px] items-center gap-2 rounded-full border border-line bg-surface px-2 py-[10px] text-[13px] font-medium text-content transition hover:bg-surface/50">
              <svg className="h-[32px] w-[32px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="hidden sm:inline">Login /</span>
              <span className="hidden sm:inline">Register</span>
            </span>
          )}
          <Link
            to={`/${currentLang}/compare`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:bg-surface/50 hover:text-brand relative"
            aria-label={t('compare.title')}
          >
            <GitCompareArrows className="h-4 w-4" />
            {compareItems.length > 0 ? (
              <span className="absolute -end-[2px] -top-[2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold text-brand-fg" dir="ltr">
                {compareItems.length}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:bg-surface/50 hover:text-brand"
            aria-label={`${t('common.cart')}: ${cartTotal}`}
            aria-live="polite"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartTotal > 0 ? (
              <span className="absolute -end-[2px] -top-[2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-brand text-[#06110A] text-[10px] font-bold border border-white/40">
                {cartTotal}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}

function GridIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
