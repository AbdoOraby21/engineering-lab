import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { fetchPage } from '../lib/siteApi';
import { getCurrentLang, pick } from '../lib/localized';
import RichText from '../components/RichText';
import SeoHead from '../components/SeoHead';
import Skeleton from '../components/ui/Skeleton';

export default function StaticPage({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const pageQuery = useQuery({
    queryKey: ['page', slug],
    queryFn: () => fetchPage(slug),
    staleTime: 5 * 60_000,
  });

  if (pageQuery.isLoading) {
    return (
      <div className="container-page max-w-3xl py-14">
        <Skeleton className="h-10 w-2/3" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      </div>
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
    return (
      <div className="container-page max-w-3xl py-20 text-center">
        <SeoHead title={`${t('notFound.title')} | ${t('common.appName')}`} />
        <h1 className="text-3xl font-bold text-content">{t('notFound.title')}</h1>
        <p className="mt-3 text-muted">{t('notFound.subtitle')}</p>
        <Link to={`/${currentLang}`} className="btn-primary mt-6">{t('notFound.goHome')}</Link>
      </div>
    );
  }

  const page = pageQuery.data;
  const title = pick(page.titleAr, page.titleEn, currentLang);
  const content = pick(page.contentAr, page.contentEn, currentLang);

  return (
    <div className="container-page max-w-3xl animate-fade-in py-12">
      <SeoHead title={`${title} | ${t('common.appName')}`} />
      <h1 className="text-4xl font-extrabold text-content">{title}</h1>
      <div className="mt-8">
        <RichText html={content} />
      </div>
    </div>
  );
}
