import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Cpu, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { LogoMark } from '../layout/Logo';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const isRtl = lang !== 'en';
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="container-page py-10 lg:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-surface shadow-card lg:grid-cols-2">
        <div className="relative hidden overflow-hidden border-e border-line bg-surface2 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="hero-grid absolute inset-0 opacity-80" aria-hidden="true" />
          <div className="absolute -top-20 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative">
            <Link to={`/${isRtl ? 'ar' : 'en'}`} className="flex items-center gap-3">
              <LogoMark className="h-11 w-11" />
              <span className="text-xl font-extrabold text-content">
                Engineering <span className="text-brand">Lab</span>
              </span>
            </Link>
            <p className="mt-8 max-w-sm text-2xl font-bold leading-snug text-content">
              {t('home.heroTitle')} <span className="text-brand">{t('home.heroHighlight')}</span>
            </p>
            <p className="mt-3 max-w-sm text-sm leading-7 text-muted">{t('home.heroSubtitle')}</p>
          </div>
          <ul className="relative mt-10 space-y-3 text-sm text-muted">
            {[
              { icon: Truck, label: t('common.fastDelivery') },
              { icon: ShieldCheck, label: t('home.trust.secure') },
              { icon: Sparkles, label: t('home.trust.quality') },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
          <Cpu className="relative h-6 w-6 text-brand/40" />
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Link to={`/${isRtl ? 'ar' : 'en'}`} className="flex items-center gap-2">
              <LogoMark className="h-9 w-9" />
              <span className="text-lg font-extrabold text-content">
                Engineering <span className="text-brand">Lab</span>
              </span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-content sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted">{footer}</div> : null}
          <div className="mt-8 flex items-center gap-2 text-xs text-muted">
            <Arrow className="h-3.5 w-3.5" />
            <Link to={`/${isRtl ? 'ar' : 'en'}`} className="hover:text-brand">
              {t('common.home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
