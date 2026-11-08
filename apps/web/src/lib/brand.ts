export const DEFAULT_LOGO_URL = '/images/brand/logo-emblem-512.png';
export const DEFAULT_LOGO_WEBP = '/images/brand/logo-emblem-512.webp';
export const DEFAULT_FAVICON_URL = '/favicon.ico';
export const DEFAULT_OG_IMAGE = '/images/brand/og-image.png';
export const BRAND_GREEN = '#22C55E';

export function resolveLogoUrl(override?: string | null): string {
  const value = override?.trim();
  return value ? value : DEFAULT_LOGO_URL;
}

export function resolveFaviconUrl(override?: string | null): string {
  const value = override?.trim();
  return value ? value : DEFAULT_FAVICON_URL;
}

export function organizationJsonLd(logoUrl?: string | null): Record<string, unknown> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const logo = resolveLogoUrl(logoUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Engineering Lab',
    url: origin || undefined,
    logo: logo.startsWith('http') || !origin ? logo : `${origin}${logo}`,
    sameAs: [
      'https://facebook.com/engineeringlab',
      'https://instagram.com/engineeringlab',
      'https://youtube.com/@engineeringlab',
    ],
  };
}
