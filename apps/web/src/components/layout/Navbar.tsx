import { useState } from 'react';
import { Link, useParams, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Truck } from 'lucide-react';
import { listCategories } from '../../lib/catalogApi';
import { localizedName } from '../../lib/localized';

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

  const [megaOpen, setMegaOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['navbar-categories'],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });
  const categories = categoriesQuery.data ?? [];

  const linkClass = (isActive: boolean) =>
    `rounded-[10px] px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-surface text-brand' : 'text-content hover:bg-surface hover:text-brand'
    }`;

  return (
    <div className="relative z-30 hidden border-b border-line bg-bg lg:block">
      <div className="container-page flex h-12 items-center gap-1">
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-content transition hover:bg-surface hover:text-brand"
            aria-expanded={megaOpen}
            aria-haspopup="menu"
            onClick={() => setMegaOpen((open) => !open)}
          >
            <GridIcon className="h-4 w-4" />
            <span>{t('common.categories')}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${megaOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {megaOpen ? (
            <>
              <button
                type="button"
                aria-label={t('common.close')}
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMegaOpen(false)}
              />
              <div className="absolute start-0 top-full z-50 mt-2 w-[34rem] rounded-[14px] border border-line bg-surface p-4 shadow-card">
                {categories.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted">{t('home.featuredEmpty')}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {categories.slice(0, 8).map((category) => (
                      <div key={category.id} className="rounded-[12px] p-2 hover:bg-surface2">
                        <Link
                          to={`/${currentLang}/catalog?category=${category.slug}`}
                          className="block rounded-[8px] px-2 py-1.5 text-sm font-medium text-content transition hover:text-brand"
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
                                  className="block rounded-[8px] px-2 py-1 text-xs text-muted transition hover:text-brand"
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
                )}
                <Link
                  to={`/${currentLang}/catalog`}
                  onClick={() => setMegaOpen(false)}
                  className="btn-secondary mt-3 w-full rounded-[10px] px-3 py-2"
                >
                  {t('common.viewAll')}
                </Link>
              </div>
            </>
          ) : null}
        </div>

        {links.map((item) => (
          <NavLink
            key={item.key}
            end={item.to === ''}
            to={item.to ? `/${currentLang}/${item.to}` : `/${currentLang}`}
            className={({ isActive }: { isActive: boolean }) => linkClass(isActive)}
          >
            {t(item.key)}
          </NavLink>
        ))}

        <Link
          to={`/${currentLang}/support`}
          className="ms-auto flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/15"
        >
          <Truck className="h-4 w-4" />
          <span>{t('common.fastDelivery')}</span>
        </Link>
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
