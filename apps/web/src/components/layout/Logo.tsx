import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LogoProps {
  showText?: boolean;
  className?: string;
}

export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={`text-brand ${className}`}
    >
      <rect
        x="12.5"
        y="12.5"
        width="23"
        height="23"
        rx="6"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M18 12V6.5M24 12V6.5M30 12V6.5M18 41.5V36M24 41.5V36M30 41.5V36M12 18H6.5M12 24H6.5M12 30H6.5M41.5 18H36M41.5 24H36M41.5 30H36"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="6.5" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="24" cy="24" r="1.8" fill="currentColor" />
    </svg>
  );
}

export default function Logo({ showText = true, className = '' }: LogoProps) {
  const { lang } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const target = lang === 'en' ? 'en' : 'ar';

  return (
    <Link
      to={`/${target}`}
      className={`group flex items-center gap-3 ${className}`}
      aria-label={t('common.appName')}
    >
      <span className="relative">
        <span className="absolute inset-0 -z-10 rounded-2xl bg-brand/20 blur-xl transition group-hover:bg-brand/30" />
        <LogoMark className="h-10 w-10 drop-shadow-[0_0_10px_rgba(34,197,94,0.45)]" />
      </span>
      {showText ? (
        <span className="leading-tight">
          <span className="block text-lg font-extrabold tracking-tight text-content">
            Engineering <span className="text-brand">Lab</span>
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            {t('common.tagline')}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
