import { Helmet } from 'react-helmet-async';
import { DEFAULT_OG_IMAGE } from '../lib/brand';

interface SeoHeadProps {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  canonical?: string | null;
  jsonLd?: unknown;
}

function siteOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export default function SeoHead({ title, description, image, canonical, jsonLd }: SeoHeadProps) {
  const origin = siteOrigin();
  const url = canonical ?? (typeof window !== 'undefined' ? window.location.href : '');
  const alternateAr = origin ? `${origin}/ar${typeof window !== 'undefined' ? window.location.pathname.replace(/^\/[^/]+/, '') : ''}` : undefined;
  const alternateEn = origin ? `${origin}/en${typeof window !== 'undefined' ? window.location.pathname.replace(/^\/[^/]+/, '') : ''}` : undefined;
  const rawImage = image?.trim() || DEFAULT_OG_IMAGE;
  const ogImage = rawImage.startsWith('http') || !origin ? rawImage : `${origin}${rawImage}`;

  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={url} />
      {alternateAr ? <link rel="alternate" hrefLang="ar" href={alternateAr} /> : null}
      {alternateEn ? <link rel="alternate" hrefLang="en" href={alternateEn} /> : null}
      {alternateAr ? <link rel="alternate" hrefLang="x-default" href={alternateAr} /> : null}
      {title ? <meta property="og:title" content={title} /> : null}
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Engineering Lab" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Engineering Lab emblem" />
      {title ? <meta name="twitter:card" content="summary_large_image" /> : null}
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? <meta name="twitter:description" content={description} /> : null}
      <meta name="twitter:image" content={ogImage} />
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
