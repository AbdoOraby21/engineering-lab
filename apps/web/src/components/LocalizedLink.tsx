import { Link, useParams, type LinkProps } from 'react-router-dom';
import type { ComponentPropsWithoutRef } from 'react';

export function LocalizedText({
  ar,
  en,
}: {
  ar: string | null | undefined;
  en: string | null | undefined;
}) {
  const { lang } = useParams<{ lang: string }>();
  return <>{lang === 'en' ? en ?? ar : ar ?? en}</>;
}

export default function LocalizedLink({
  to,
  children,
  ...rest
}: Omit<LinkProps, 'to'> & { to: string } & ComponentPropsWithoutRef<typeof Link>) {
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const path = to.startsWith('/') ? to : `/${to}`;
  const [pathname] = path.split('?');
  const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
  const localePrefixed = `/${currentLang}${pathname === '/' ? '' : pathname}${query}`;
  return (
    <Link to={localePrefixed} {...rest}>
      {children}
    </Link>
  );
}
