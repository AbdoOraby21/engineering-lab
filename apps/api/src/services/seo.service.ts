import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { defaultLogoUrl, resolveLogoUrl } from '../lib/brand.js';

const LOCALES: Array<{ code: string; label: string }> = [
  { code: 'ar', label: 'ar-EG' },
  { code: 'en', label: 'en' },
];

function urlFor(locale: string, path: string): string {
  const base = env.API_PUBLIC_URL.replace(/\/$/, '');
  return `${base}/${locale}${path}`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function urlsetEntry(loc: string, lastmod: string, changefreq = 'weekly', priority = 0.5): string {
  const alternates = LOCALES.map((l) => {
    const otherPath = loc.replace(new RegExp(`^${env.API_PUBLIC_URL}/(ar|en)`), `$1`);
    return `<xhtml:link rel="alternate" hreflang="${l.label}" href="${xmlEscape(urlFor(l.code, otherPath))}" />`;
  }).join('');
  return `
  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${xmlEscape(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    ${alternates}
  </url>`;
}

export async function generateSitemapXml(): Promise<string> {
  const now = new Date().toISOString();

  // Products
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, updatedAt: true },
    take: 5000,
  });
  const productUrls = products.map((p) =>
    LOCALES.map((l) => urlsetEntry(urlFor(l.code, `/products/${p.slug}`), p.updatedAt.toISOString(), 'weekly', 0.8)).join(''),
  ).join('');

  // Categories
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, updatedAt: true },
  });
  const categoryUrls = categories.map((c) =>
    LOCALES.map((l) => urlsetEntry(urlFor(l.code, `/catalog?category=${c.slug}`), c.updatedAt.toISOString(), 'weekly', 0.6)).join(''),
  ).join('');

  // Blog posts (published)
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, slug: true, updatedAt: true },
  });
  const postUrls = posts.map((p) =>
    LOCALES.map((l) => urlsetEntry(urlFor(l.code, `/blog/posts/${p.slug}`), p.updatedAt.toISOString(), 'weekly', 0.7)).join(''),
  ).join('');

  // Static pages
  const staticPaths = [
    '', '/catalog', '/about', '/contact', '/faq', '/returns', '/privacy', '/terms', '/blog', '/blog/categories', '/blog/tags',
  ];
  const staticUrls = staticPaths.map((path) =>
    LOCALES.map((l) => urlsetEntry(urlFor(l.code, path), now, 'monthly', 0.4)).join(''),
  ).join('');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${productUrls}${categoryUrls}${postUrls}${staticUrls}
</urlset>`;

  return sitemapXml;
}

export async function generateRobotsTxt(): Promise<string> {
  const base = env.API_PUBLIC_URL.replace(/\/$/, '');
  const sitemapUrl = `${base}/sitemap.xml`;
  return `User-agent: *
Allow: /

Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /cart
Disallow: /search?q=

Disallow: /*?sort=
Disallow: /*?page=

Sitemap: ${sitemapUrl}
`;
}

// ---------------------------------------------------------------------------
// JSON-LD structured data
// ---------------------------------------------------------------------------

export async function jsonLdOrganization(): Promise<object> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Engineering Lab',
    url: env.API_PUBLIC_URL,
    logo: await resolveLogoUrl(),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+20 100 000 0000',
      contactType: 'customer service',
      availableLanguage: ['ar', 'en'],
    },
    sameAs: [
      'https://facebook.com/engineeringlab',
      'https://instagram.com/engineeringlab',
      'https://youtube.com/@engineeringlab',
    ],
  };
}

export function jsonLdWebSite(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Engineering Lab',
    url: env.API_PUBLIC_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${env.API_PUBLIC_URL}/en/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function jsonLdProduct(product: {
  id: string;
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isActive: boolean;
  brand: { nameAr: string; nameEn: string } | null;
  ratingAverage: number;
  ratingCount: number;
  images: { url: string }[];
  locale: 'ar' | 'en';
}): object {
  const locale = product.locale;
  const name = locale === 'ar' ? product.nameAr : product.nameEn;
  const description = locale === 'ar' ? product.descriptionAr : product.descriptionEn;
  const image = product.images[0]?.url
    ? `${env.API_PUBLIC_URL}${product.images[0].url}`
    : undefined;
  const offers: {
    '@type': string;
    priceCurrency: string;
    price: string;
    priceValidUntil: string;
    availability: string;
    seller: { '@type': string; name: string };
  } = {
    '@type': 'Offer',
    priceCurrency: 'EGP',
    price: (product.price / 100).toFixed(2),
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
    availability: product.stock > 0 && product.isActive
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    seller: {
      '@type': 'Organization',
      name: 'Engineering Lab',
    },
  };
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    offers.price = (product.compareAtPrice / 100).toFixed(2);
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    sku: product.sku,
    brand: product.brand
      ? { '@type': 'Brand', name: locale === 'ar' ? product.brand.nameAr : product.brand.nameEn }
      : undefined,
    offers,
    aggregateRating: product.ratingCount > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.ratingAverage,
          reviewCount: product.ratingCount,
        }
      : undefined,
    url: `${env.API_PUBLIC_URL}/${locale}/products/${product.slug}`,
  };
}

export function jsonLdBreadcrumb(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function jsonLdFAQPage(items: Array<{ question: string; answer: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function jsonLdArticle(post: {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: { name: string | null } | null;
  locale: 'ar' | 'en';
}): object {
  const locale = post.locale;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: locale === 'ar' ? post.titleAr : post.titleEn,
    description: (locale === 'ar' ? post.contentAr : post.contentEn).slice(0, 220),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.author
      ? { '@type': 'Person', name: post.author.name ?? 'Engineering Lab' }
      : { '@type': 'Organization', name: 'Engineering Lab' },
    publisher: {
      '@type': 'Organization',
      name: 'Engineering Lab',
      logo: {
        '@type': 'ImageObject',
        url: defaultLogoUrl(),
      },
    },
    url: `${env.API_PUBLIC_URL}/${locale}/blog/posts/${post.slug}`,
  };
}

// ---------------------------------------------------------------------------
// Slug redirect lookup
// ---------------------------------------------------------------------------

export async function findSlugRedirect(source: string): Promise<{ target: string; isPermanent: boolean } | null> {
  const redirect = await prisma.slugRedirect.findUnique({
    where: { source },
    select: { target: true, isPermanent: true },
  });
  if (!redirect) {
    return null;
  }
  return { target: redirect.target, isPermanent: redirect.isPermanent };
}
