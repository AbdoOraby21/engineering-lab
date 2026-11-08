import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wrench } from 'lucide-react';

interface PlaceholderPageProps {
  titleKey: string;
}

export default function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-10 text-center shadow-card">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Wrench className="h-7 w-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-content">{t(titleKey)}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">{t('common.comingSoonDesc')}</p>
        <Link to={`/${currentLang}`} className="btn-primary mt-7">
          {t('notFound.goHome')}
        </Link>
      </div>
    </div>
  );
}
