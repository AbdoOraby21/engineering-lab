import { useState } from 'react';
import { Link, useParams, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Headphones, House, Info, LayoutGrid, Mail, Truck } from 'lucide-react';
import { listCategories } from '../../lib/catalogApi';
import { localizedName } from '../../lib/localized';

const links = [
  { key: 'common.home', to: '', icon: House },
  { key: 'common.about', to: 'about', icon: Info },
  { key: 'common.contact', to: 'contact', icon: Mail },
  { key: 'common.support', to: 'support', icon: Headphones },
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
    `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand text-brand-fg' : 'text-content hover:bg-surface2 hover:text-brand'
    }`;

  return (
    <div className="container-page relative z-30 pb-3">
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-surface p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {links.slice(0, 1).map((item) => (
          <NavLink
            key={item.key}
            end
            to={`/${currentLang}`}
            className={({ isActive }: { isActive: boolean }) => linkClass(isActive)}
          >
            <item.icon className="h-4 w-4" />
            {t(item.key)}
          </NavLink>
        ))}

        <Link
          to={`/${currentLang}/catalog`}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-medium text-content transition hover:bg-surface2 hover:text-brand lg:hidden"
        >
          <LayoutGrid className="h-4 w-4" />
          {t('common.categories')}
        </Link>

        <div className="relative hidden lg:block">
          <button
            type="button"
            className="flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm font-medium text-content transition hover:bg-surface2 hover:text-brand"
            aria-expanded={megaOpen}
            aria-haspopup="menu"
            onClick={() => setMegaOpen((open) => !open)}
          >
            <LayoutGrid className="h-4 w-4" />
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

        {links.slice(1).map((item) => (
          <NavLink
            key={item.key}
            to={`/${currentLang}/${item.to}`}
            className={({ isActive }: { isActive: boolean }) => linkClass(isActive)}
          >
            <item.icon className="h-4 w-4" />
            {t(item.key)}
          </NavLink>
        ))}

        <Link
          to={`/${currentLang}/support`}
          className="ms-auto hidden items-center gap-2 rounded-full lg:flex border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/15"
        >
          <Truck className="h-4 w-4" />
          <span>{t('common.fastDelivery')}</span>
        </Link>
      </div>
    </div>
  );
}
