import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { getCurrentLang } from '../../lib/localized';
import SeoHead from '../../components/SeoHead';

export default function AdminNotAuthorized() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);

  return (
    <div className="container-page animate-fade-in py-20 text-center">
      <SeoHead title={t('admin.notAdmin')} />
      <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
      <h1 className="mt-6 text-2xl font-bold text-content">{t('admin.notAdmin')}</h1>
      <p className="mt-3 text-muted max-w-sm mx-auto">{t('admin.notAdminBody')}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to={`/${currentLang}/admin/dashboard`} className="btn-primary">
          {t('admin.dashboard')}
        </Link>
        <Link to={`/${currentLang}/catalog`} className="btn-outline">
          {t('common.shopNow') ?? 'Shop'}
        </Link>
      </div>
    </div>
  );
}
