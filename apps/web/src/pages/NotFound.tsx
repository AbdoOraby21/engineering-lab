import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand/10 text-brand">
        <Compass className="h-9 w-9" />
      </span>
      <p className="mt-6 text-6xl font-extrabold text-brand">404</p>
      <h1 className="mt-3 text-2xl font-bold text-content">{t('notFound.title')}</h1>
      <p className="mt-2 max-w-md text-sm leading-7 text-muted">{t('notFound.subtitle')}</p>
      <Link to={`/${currentLang}`} className="btn-primary mt-7">
        {t('notFound.goHome')}
      </Link>
    </div>
  );
}
