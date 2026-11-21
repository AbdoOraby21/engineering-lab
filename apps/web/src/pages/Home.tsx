import React, { ComponentType, Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
} from 'lucide-react';
import {
  ChipIcon,
  SensorIcon,
  ResistorIcon,
  LedsIcon,
  PlugIcon,
  MotorIcon,
  CablesIcon,
  GridIcon as MoreIcon,
  ShieldCheckIcon,
  ReturnsIcon,
  SupportIcon,
  QualityIcon,
} from '../components/icons/category';
import {
  fetchBestSellers,
  fetchFeaturedProducts,
  fetchNewArrivals,
  listCategories,
} from '../lib/catalogApi';
import { fetchBanners } from '../lib/contentApi';
import { localizedName } from '../lib/localized';
import { organizationJsonLd } from '../lib/brand';
import { useAuthStore } from '../stores/auth.store';
import ProductRail from '../components/home/ProductRail';
import RecentlyViewed from '../components/home/RecentlyViewed';
import SeoHead from '../components/SeoHead';
import Skeleton from '../components/ui/Skeleton';
import type { SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const categoryIcons: Record<string, IconComponent> = {
  'microcontrollers-development-boards': ChipIcon,
  'sensors-modules': SensorIcon,
  'passive-components': ResistorIcon,
  'leds-displays': LedsIcon,
  'power-supplies': PlugIcon,
  'motors-actuators': MotorIcon,
  'cables-connectors': CablesIcon,
};

const trustItems: Array<{
  key: 'secure' | 'returns' | 'support' | 'quality';
  icon: IconComponent;
}> = [
  { key: 'secure', icon: ShieldCheckIcon },
  { key: 'returns', icon: ReturnsIcon },
  { key: 'support', icon: SupportIcon },
  { key: 'quality', icon: QualityIcon },
];

export default function HomePage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang === 'en' ? 'en' : 'ar';
  const isRtl = currentLang === 'ar';
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const status = useAuthStore((state) => state.status);

  const [bannerIndex, setBannerIndex] = useState(0);

  const bannersQuery = useQuery({
    queryKey: ['banners', 'HOME_HERO'],
    queryFn: () => fetchBanners('HOME_HERO'),
    staleTime: 5 * 60_000,
  });
  const stripQuery = useQuery({
    queryKey: ['banners', 'HOME_STRIP'],
    queryFn: () => fetchBanners('HOME_STRIP'),
    staleTime: 5 * 60_000,
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });
  const featuredQuery = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => fetchFeaturedProducts(8),
    staleTime: 60_000,
  });
  const newArrivalsQuery = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: () => fetchNewArrivals(8),
    staleTime: 60_000,
  });
  const bestSellersQuery = useQuery({
    queryKey: ['products', 'best-sellers'],
    queryFn: () => fetchBestSellers(8),
    staleTime: 60_000,
  });
  const bundlesQuery = useQuery({
    queryKey: ['products', 'bundles'],
    queryFn: async () => (await fetchFeaturedProducts(12)).filter((product) => product.isBundle),
    staleTime: 60_000,
  });

  const banners = useMemo(() => bannersQuery.data ?? [], [bannersQuery.data]);
  const activeBanner = banners[bannerIndex] ?? banners[0];
  const rootCategories = (categoriesQuery.data ?? []).filter((category) => !category.parentId);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(
      () => setBannerIndex((index) => (index + 1) % banners.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    const first = banners[0]?.imageUrl;
    if (!first) return;
    const image = new Image();
    image.src = first;
  }, [banners]);

  function bannerTitle(banner: { titleAr: string; titleEn: string }): string {
    return currentLang === 'en' ? banner.titleEn : banner.titleAr;
  }

  function bannerSubtitle(banner: { subtitleAr: string | null; subtitleEn: string | null }): string | null {
    return currentLang === 'en' ? banner.subtitleEn : banner.subtitleAr;
  }

  function bannerHighlight(banner: { highlightAr: string | null; highlightEn: string | null }): string | null {
    return currentLang === 'en' ? banner.highlightEn : banner.highlightAr;
  }

  function renderHeroSubtitle(): React.ReactNode {
    const subtitle = activeBanner ? bannerSubtitle(activeBanner) : t('home.heroSubtitle');
    const highlight = activeBanner ? bannerHighlight(activeBanner) : null;
    if (!subtitle) return null;
    if (!highlight || !subtitle.includes(highlight)) {
      return subtitle;
    }
    const before = subtitle.slice(0, subtitle.indexOf(highlight));
    const after = subtitle.slice(subtitle.indexOf(highlight) + highlight.length);
    return (
      <>
        {before}
        <span className="text-brand">{highlight}</span>
        {after}
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <SeoHead
        title={`${t('home.heroTitle')} ${t('home.heroHighlight')} | ${t('common.appName')}`}
        description={t('home.heroSubtitle')}
        jsonLd={organizationJsonLd()}
      />
      <section className="relative w-full overflow-hidden bg-[#050d0a]">
        <div
          className="pointer-events-none absolute -start-24 top-1/3 h-[420px] w-[420px] rounded-full bg-brand/20 blur-[110px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute end-0 top-0 h-[360px] w-[360px] rounded-full bg-brand/15 blur-[100px]"
          aria-hidden="true"
        />
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-8 py-10 sm:py-14 lg:min-h-[420px] lg:grid-cols-2 lg:gap-12 lg:py-12">
          <div className="relative z-10 text-start">
            <span className="inline-block rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
              {t('home.heroBadge')}
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.15] text-white sm:text-5xl lg:text-6xl rtl:leading-[1.35]">
              {activeBanner ? bannerTitle(activeBanner) : t('home.heroTitle')}{' '}
              <span className="text-brand">
                {activeBanner ? bannerHighlight(activeBanner) : t('home.heroHighlight')}
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-white/85 sm:text-lg">
              {renderHeroSubtitle()}
            </p>
            <p className="mt-3 text-sm font-medium text-white/60">{t('home.heroFeatures')}</p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                to={`/${currentLang}/catalog`}
                className="btn-primary inline-flex items-center gap-2 px-7 py-3 text-base shadow-glow"
              >
                <ShoppingCart className="h-5 w-5" />
                {t('home.shopNow')}
                <Arrow className="h-5 w-5" />
              </Link>
            </div>

            {banners.length > 1 ? (
              <div className="mt-8 flex items-center gap-2" role="tablist">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    role="tab"
                    aria-selected={index === bannerIndex}
                    aria-label={bannerTitle(banner)}
                    onClick={() => setBannerIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === bannerIndex
                        ? 'w-6 bg-brand shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                        : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[640px] lg:max-w-none">
            <img
              src={activeBanner?.imageUrl || '/images/hero/hero-components.svg'}
              alt={activeBanner ? bannerTitle(activeBanner) : ''}
              loading="eager"
              fetchPriority="high"
              width={880}
              height={370}
              className="h-auto w-full object-contain [mask-image:radial-gradient(ellipse_at_center,#000_55%,transparent_100%)]"
            />
          </div>
        </div>
      </section>

      {stripQuery.data && stripQuery.data.length > 0 ? (
        <section className="container-page flex flex-wrap items-center gap-3 pt-8">
          {stripQuery.data.map((banner) => (
            <Link
              key={banner.id}
              to={`/${currentLang}${banner.href ?? '/catalog'}`}
              className="badge hover:border-brand hover:text-brand"
            >
              {bannerTitle(banner)}
              <Arrow className="h-3.5 w-3.5" />
            </Link>
          ))}
        </section>
      ) : null}

      <section className="container-page py-14">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-bold text-content">{t('home.categoriesTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('home.categoriesSubtitle')}</p>
          </div>
          <Link to={`/${currentLang}/catalog`} className="hidden text-sm link sm:inline-flex">
            {t('common.viewAll')}
          </Link>
        </div>
        {categoriesQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-[117px] rounded-[14px]" />
            ))}
          </div>
        ) : rootCategories.length === 0 ? (
          <div className="rounded-[14px] border border-line bg-surface p-8 text-center">
            <p className="text-muted">{t('home.featuredEmpty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {rootCategories.slice(0, 7).map((category) => {
              const Icon = categoryIcons[category.slug] ?? MoreIcon;
              return (
                <Link
                  key={category.id}
                  to={`/${currentLang}/catalog?category=${category.slug}`}
                  className="group flex flex-col items-center gap-2 rounded-[14px] border border-line bg-surface px-3 py-4 text-center transition hover:border-brand hover:shadow-glow"
                >
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl text-brand transition group-hover:scale-105 duration-200">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={localizedName(category, currentLang)}
                        className="h-[34px] w-[34px] object-contain"
                      />
                    ) : (
                      <Icon className="h-[34px] w-[34px]" />
                    )}
                  </span>
                  <span className="text-[15px] font-medium leading-snug text-content max-w-[190px] line-clamp-2">
                    {localizedName(category, currentLang)}
                  </span>
                </Link>
              );
            })}
            <Link
              to={`/${currentLang}/catalog`}
              className="group flex flex-col items-center justify-center gap-2 rounded-[14px] border border-line bg-surface px-3 py-4 text-center transition hover:border-brand hover:shadow-glow"
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl text-brand transition group-hover:scale-105 duration-200">
                <MoreIcon className="h-[34px] w-[34px]" />
              </span>
              <span className="text-[15px] font-medium leading-snug text-content max-w-[190px] line-clamp-2">
                {t('categories.more')}
              </span>
            </Link>
          </div>
        )}
      </section>

      <ProductRail
        title={t('home.featuredTitle')}
        subtitle={t('home.featuredSubtitle')}
        products={featuredQuery.data ?? []}
        viewAllHref={`/${currentLang}/catalog?featured=true`}
        home
        loading={featuredQuery.isLoading}
      />

      <ProductRail
        title={t('home.newArrivalsTitle')}
        subtitle={t('home.newArrivalsSubtitle')}
        products={newArrivalsQuery.data ?? []}
        viewAllHref={`/${currentLang}/catalog?sort=newest`}
        home
        hideWhenEmpty
        loading={newArrivalsQuery.isLoading}
      />

      <ProductRail
        title={t('home.bestSellersTitle')}
        subtitle={t('home.bestSellersSubtitle')}
        products={bestSellersQuery.data ?? []}
        viewAllHref={`/${currentLang}/catalog?sort=popular`}
        home
        hideWhenEmpty
        loading={bestSellersQuery.isLoading}
      />

      <ProductRail
        title={t('home.bundlesTitle')}
        subtitle={t('home.bundlesSubtitle')}
        products={bundlesQuery.data ?? []}
        viewAllHref={`/${currentLang}/catalog?q=kit`}
        home
        hideWhenEmpty
        loading={bundlesQuery.isLoading}
      />

      <RecentlyViewed />

      <section className="container-page py-10">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-bold text-content">{t('home.newsletterTitle')}</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted">{t('home.newsletterSubtitle')}</p>
          <form className="mt-5 flex max-w-md gap-2" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="newsletter-email">{t('common.email')}</label>
            <input id="newsletter-email" type="email" className="input" placeholder={t('common.email')} />
            <button type="submit" className="btn-primary shrink-0">{t('home.subscribe')}</button>
          </form>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="rounded-[14px] border border-line bg-surface px-4">
          <div className="grid grid-cols-2 gap-4 py-4 lg:flex lg:h-[62px] lg:items-center lg:justify-between lg:py-0">
            {trustItems.map((item, index) => (
              <Fragment key={item.key}>
                <div className="flex flex-1 items-center justify-center gap-2 text-center">
                  <item.icon className="h-8 w-8 shrink-0 text-brand" />
                  <span className="text-[15px] font-medium text-content">
                    {t(`home.trust.${item.key}`)}
                  </span>
                </div>
                {index < trustItems.length - 1 && (
                  <div className="hidden w-px h-[36px] bg-line lg:block" />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/15 via-surface to-surface p-8 sm:p-10">
          <div className="hero-grid absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-content">{t('home.ctaTitle')}</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-muted">{t('home.ctaSubtitle')}</p>
            </div>
            {status === 'authenticated' ? (
              <Link to={`/${currentLang}/account/profile`} className="btn-primary shrink-0">
                {t('common.account')}
              </Link>
            ) : (
              <Link to={`/${currentLang}/register`} className="btn-primary shrink-0">
                {t('home.createAccount')}
                <Arrow className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
