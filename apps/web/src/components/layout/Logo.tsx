import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { DEFAULT_LOGO_URL, DEFAULT_LOGO_WEBP } from '../../lib/brand';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  showText?: boolean;
  className?: string;
  size?: LogoSize;
}

const EMBLEM_CLASSES: Record<LogoSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-11 w-11 sm:h-[88px] sm:w-[88px]',
};

const TITLE_CLASSES: Record<LogoSize, string> = {
  sm: 'text-base whitespace-nowrap',
  md: 'text-xl whitespace-nowrap',
  lg: 'text-xs leading-tight sm:text-[42px] sm:leading-none sm:whitespace-nowrap',
};

const TAGLINE_CLASSES: Record<LogoSize, string> = {
  sm: 'text-[9px] whitespace-nowrap',
  md: 'text-[11px] whitespace-nowrap',
  lg: 'hidden sm:block sm:text-[15px] sm:whitespace-nowrap',
};

const TEXT_VISIBILITY: Record<LogoSize, string> = {
  sm: 'block',
  md: 'block',
  lg: 'hidden min-[380px]:block',
};

export function LogoEmblem({ className = 'h-12 w-12' }: { className?: string }) {
  const settingsQuery = useSiteSettings();
  const override = settingsQuery.data?.logoUrl?.trim();
  const imageClass = `${className} shrink-0 object-contain`;

  if (override) {
    return (
      <img
        src={override}
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        className={imageClass}
      />
    );
  }

  return (
    <picture>
      <source srcSet={DEFAULT_LOGO_WEBP} type="image/webp" />
      <img
        src={DEFAULT_LOGO_URL}
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        className={imageClass}
      />
    </picture>
  );
}

export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return <LogoEmblem className={className} />;
}

export default function Logo({ showText = true, className = '', size = 'md' }: LogoProps) {
  const { lang } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const target = lang === 'en' ? 'en' : 'ar';

  return (
    <Link
      to={`/${target}`}
      className={`group flex shrink-0 items-center gap-3 ${className}`}
      aria-label={t('common.appName')}
    >
      <span className="relative flex shrink-0 items-center">
        <span className="absolute inset-0 -z-10 rounded-full bg-brand/20 blur-xl transition group-hover:bg-brand/30" />
        <LogoEmblem className={`${EMBLEM_CLASSES[size]} drop-shadow-[0_0_10px_rgba(34,197,94,0.35)]`} />
      </span>
      {showText ? (
        <span className={`leading-tight ${TEXT_VISIBILITY[size]}`}>
          <span className={`block font-extrabold tracking-tight text-content ${TITLE_CLASSES[size]}`}>
            Engineering <span className="text-brand">Lab</span>
          </span>
          <span className={`block font-medium tracking-[0.08em] text-muted ${TAGLINE_CLASSES[size]}`}>
            {t('common.tagline')}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
