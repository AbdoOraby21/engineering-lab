import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { listCategories } from '../../lib/catalogApi';
import { useSiteSettings, DEFAULT_SITE_SETTINGS } from '../../hooks/useSiteSettings';
import { getCurrentLang, pick } from '../../lib/localized';
import Logo from './Logo';

export default function Footer() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = getCurrentLang(lang);
  const year = new Date().getFullYear();

  const categoriesQuery = useQuery({
    queryKey: ['footer-categories'],
    queryFn: listCategories,
    staleTime: 5 * 60 * 1000,
  });
  const settingsQuery = useSiteSettings();
  const settings = settingsQuery.data ?? DEFAULT_SITE_SETTINGS;
  const footerCategories = (categoriesQuery.data ?? []).slice(0, 6);

  return (
    <footer className="mt-20 border-t border-line bg-surface/30">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-7 text-muted">{t('footer.aboutText')}</p>
          <div className="mt-5 flex items-center gap-2">
            {([
              { icon: Facebook, href: settings?.socialLinks.facebook, label: 'Facebook' },
              { icon: Instagram, href: settings?.socialLinks.instagram, label: 'Instagram' },
              { icon: Youtube, href: settings?.socialLinks.youtube, label: 'YouTube' },
            ] as const)
              .filter((item) => Boolean(item.href))
              .map((item) => (
                <a
                  key={item.label}
                  href={item.href!}
                  target="_blank"
                  rel="noreferrer"
                  className="icon-btn h-9 w-9"
                  aria-label={item.label}
                >
                  <item.icon className="h-4 w-4" />
                </a>
              ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-content">
            {t('footer.quickLinks')}
          </h2>
          <ul className="space-y-2.5 text-sm text-muted">
            {[
              { label: t('common.home'), to: '' },
              { label: t('common.categories'), to: 'catalog' },
              { label: t('common.about'), to: 'about' },
              { label: t('common.contact'), to: 'contact' },
              { label: t('common.support'), to: 'support' },
              { label: t('faq.title'), to: 'faq' },
              { label: t('consent.returns'), to: 'returns' },
              { label: t('consent.privacy'), to: 'privacy' },
              { label: t('consent.terms'), to: 'terms' },
              { label: t('wishlist.title'), to: 'wishlist' },
            ].map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to ? `/${currentLang}/${link.to}` : `/${currentLang}`}
                  className="transition hover:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-content">
            {t('footer.categories')}
          </h2>
          <ul className="space-y-2.5 text-sm text-muted">
            {footerCategories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/${currentLang}/catalog?category=${category.slug}`}
                  className="transition hover:text-brand"
                >
                  {currentLang === 'en' ? category.nameEn : category.nameAr}
                </Link>
              </li>
            ))}
            <li>
              <Link to={`/${currentLang}/catalog`} className="transition hover:text-brand">
                {t('common.viewAll')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-content">
            {t('footer.contact')}
          </h2>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" />
              <span dir="ltr">{settings?.contactEmail ?? 'support@engineeringlab.eg'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-brand" />
              <span dir="ltr">{settings?.contactPhone ?? '+20 100 000 0000'}</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand" />
              <span>{settings ? pick(settings.addressAr, settings.addressEn, currentLang) : 'Cairo, Egypt'}</span>
            </li>
          </ul>
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('footer.payments')}
            </p>
            <div className="flex flex-wrap gap-2">
              {(settings?.paymentMethods ?? []).map((method) => (
                <span
                  key={method.key}
                  title={pick(method.valueAr, method.valueEn, currentLang)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-content"
                >
                  {pick(method.labelAr, method.labelEn, currentLang)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col sm:flex-row items-center justify-between gap-3 py-5 text-xs text-muted">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <p className="text-left sm:text-start">
              © {year} {t('common.appName')} — {t('footer.rights')}
            </p>
            {settings.credit.enabled && (
              <p className="flex items-center gap-1.5">
                <span>{t('footer.creditPrefix')}</span>
                <a
                  href={settings.credit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-brand transition underline underline-offset-2"
                  dir="ltr"
                >
                  {currentLang === 'ar' ? settings.credit.nameAr : settings.credit.nameEn}
                </a>
              </p>
            )}
          </div>
          <p>{t('footer.madeIn')}</p>
        </div>
      </div>
    </footer>
  );
}
