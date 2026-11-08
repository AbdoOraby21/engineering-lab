import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { fetchFaq } from '../lib/siteApi';
import { getCurrentLang, pick } from '../lib/localized';
import SeoHead from '../components/SeoHead';
import Skeleton from '../components/ui/Skeleton';

export default function FaqPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const faqQuery = useQuery({
    queryKey: ['faq', activeCategory],
    queryFn: () => fetchFaq(activeCategory ?? undefined),
    staleTime: 5 * 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['faq', 'categories'],
    queryFn: () => fetchFaq(),
    staleTime: 5 * 60_000,
  });

  const categories = categoriesQuery.data?.categories ?? [];
  const items = faqQuery.data?.items ?? [];

  return (
    <div className="container-page max-w-3xl animate-fade-in py-12">
      <SeoHead title={`${t('faq.title')} | ${t('common.appName')}`} />
      <div className="text-center">
        <span className="badge mx-auto">
          <HelpCircle className="h-3.5 w-3.5" />
          {t('faq.badge')}
        </span>
        <h1 className="mt-4 text-4xl font-extrabold text-content">{t('faq.title')}</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">{t('faq.subtitle')}</p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2" role="tablist" aria-label={t('faq.categories')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${activeCategory === null ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface text-muted'}`}
        >
          {t('faq.all')}
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${activeCategory === category ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface text-muted'}`}
          >
            {t(`faq.categories.${category}`, { defaultValue: category })}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {faqQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : items.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">{t('faq.empty')}</p>
        ) : (
          items.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 p-5 text-start text-sm font-semibold text-content"
                >
                  {pick(item.questionAr, item.questionEn, currentLang)}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-brand transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open ? (
                  <p className="border-t border-line p-5 text-sm leading-7 text-muted">
                    {pick(item.answerAr, item.answerEn, currentLang)}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-10 rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/15 via-surface to-surface p-8 text-center">
        <h2 className="font-bold text-content">{t('faq.stillNeedHelp')}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('faq.stillNeedHelpBody')}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to={`/${currentLang}/contact`} className="btn-primary">{t('common.contact')}</Link>
          <Link to={`/${currentLang}/support`} className="btn-secondary">{t('common.support')}</Link>
        </div>
      </div>
    </div>
  );
}
