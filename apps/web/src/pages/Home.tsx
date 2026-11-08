import React, { ComponentType, Fragment, useEffect, useState } from 'react';
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

  const banners = bannersQuery.data ?? [];
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
        <span className="text-brand italic rtl:not-italic">{highlight}</span>
        {after}
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <SeoHead title={`${t('home.heroTitle')} ${t('home.heroHighlight')} | ${t('common.appName')}`} description={t('home.heroSubtitle')} />
      <section className="relative overflow-hidden h-[370px] w-full" style={{ backgroundColor: '#050d0a' }}>
        {/* Radial glows */}
        <div className="absolute top-[40%] left-[25%] w-[600px] h-[600px] rounded-full bg-brand/20 blur-[120px] mix-blend-overlay" />
        <div className="absolute top-[10%] left-[55%] w-[520px] h-[520px] rounded-full bg-brand/15 blur-[100px] mix-blend-overlay" />
        {/* Circuit-board trace pattern */}
        <div className="absolute inset-0 opacity-[0.35]" aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 240 240" preserveAspectRatio="none" fill="none">
            <path
              d="M20 40h60v20h-60z M120 80l-40 0 0-40 M160 120h-40v20h40z M20 180h80v20h-80z M200 160l-60 0 0 20 M40 200v-40h20v40z"
              stroke="#22C55E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
          </svg>
        </div>
        {/* Bottom fade to page background */}
        <div className="absolute bottom-0 left-0 right-0 h-[40px] bg-gradient-to-t from-[#050d0a] to-transparent" />
        <div className="container-page relative h-full flex items-center">
          {/* Left content block */}
          <div className={`flex-1 relative z-10 ps-[58px] rtl:pe-[58px] text-start rtl:text-end pr-[80px] rtl:pr-0 rtl:pl-[80px]`}>
            <span className="inline-block mb-3 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
              {activeBanner ? bannerTitle(activeBanner) : t('home.heroBadge')}
            </span>
            <h1 className={`mt-4 text-[84px] font-bold leading-1 tracking-tight text-content ${isRtl ? '' : 'italic'} rtl:not-italic`}>
              {activeBanner ? bannerTitle(activeBanner) : t('home.heroTitle')}{' '}
              <span className="text-brand">
                {activeBanner ? bannerHighlight(activeBanner) : t('home.heroHighlight')}
              </span>
            </h1>
            <p className="mt-4 text-[31px] font-semibold leading-7 text-content max-w-[720px] rtl:max-w-none">
              {renderHeroSubtitle()}
            </p>
            <p className="mt-5 italic text-[26px] leading-7 text-content/90 rtl:not-italic max-w-[720px] rtl:max-w-none">
              {t('home.heroFeatures')}
            </p>
            <div className="mt-10 flex items-center gap-4 rtl:gap-4">
              <Link
                to={`/${currentLang}/catalog`}
                className="flex items-center gap-2 rounded-[10px] px-8 py-[17px] bg-gradient-to-b from-brand via-brand-hover text-white font-bold text-[22px] shadow-[0_0_24px_rgba(34,197,94,0.35)] transition hover:-translate-y-[1px] hover:shadow-glow"
              >
                <ShoppingCart className="h-5 w-5" />
                {t('home.shopNow')}
                <Arrow className="h-5 w-5" />
              </Link>
            </div>

            {banners.length > 1 ? (
              <div className="mt-12 flex items-center gap-2 rtl:gap-2">
                <button
                  type="button"
                  className="h-4 w-4 rounded-full bg-[#4B5560] hover:bg-muted transition"
                  aria-label={t('pagination.previous')}
                  onClick={() =>
                    setBannerIndex((index) => (index - 1 + banners.length) % banners.length)
                  }
                  disabled={bannerIndex === 0}
                  aria-hidden={bannerIndex === 0 || undefined}
                />
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    aria-label={bannerTitle(banner)}
                    onClick={() => setBannerIndex(index)}
                    className={`h-[16px] w-[16px] rounded-full transition-all ${
                      index === bannerIndex ? 'w-[16px] bg-brand shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'w-[6px] h-[6px] bg-[#4B5560] hover:bg-muted'
                    }`}
                  />
                ))}
                <button
                  type="button"
                  className="h-4 w-4 rounded-full bg-[#4B5560] hover:bg-muted transition"
                  aria-label={t('pagination.next')}
                  onClick={() => setBannerIndex((index) => (index + 1) % banners.length)}
                  disabled={bannerIndex === banners.length - 1}
                  aria-hidden={bannerIndex === banners.length - 1 || undefined}
                />
              </div>
            ) : null}
          </div>

          {/* Right product composition image */}
          <div className={`flex-1 relative z-10 h-full ${isRtl ? 'items-start justify-start pl-[80px] rtl:pr-[80px]' : 'items-end justify-end pr-[80px] rtl:pl-[80px]'}`}>
            <div className="relative w-[880px] h-[370px] shrink-0">
              {activeBanner?.imageUrl ? (
                <img
                  src={activeBanner.imageUrl}
                  alt={bannerTitle(activeBanner)}
                  loading="eager"
                  fetchPriority="high"
                  width={880}
                  height={370}
                  className="absolute right-0 bottom-0 w-full h-full max-w-[880px] max-h-[370px] object-contain"
                />
              ) : (
                <img
                  src="/images/hero/hero-components.svg"
                  alt="Electronics components composition"
                  loading="eager"
                  fetchPriority="high"
                  width={880}
                  height={370}
                  className="absolute right-0 bottom-0 w-full h-full max-w-[880px] max-h-[370px] object-contain"
                />
              )}
            </div>
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
          <div className="flex flex-row gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="flex-initial h-[117px] min-w-[150px] rounded-[14px]" />
            ))}
          </div>
        ) : (
          <div className="flex flex-row gap-2">
            {rootCategories.slice(0, 7).map((category) => {
              const Icon = categoryIcons[category.slug] ?? MoreIcon;
              return (
                <Link
                  key={category.id}
                  to={`/${currentLang}/catalog?category=${category.slug}`}
                  className="flex-initial flex flex-col items-center gap-2 rounded-[14px] border border-line bg-surface px-3 py-3 text-center transition group-hover:border-brand group-hover:shadow-glow"
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
                  <span className="text-[15px] font-medium leading-1.25 text-content max-w-[190px] lines-2">
                    {localizedName(category, currentLang)}
                  </span>
                </Link>
              );
            })}
            <Link
              to={`/${currentLang}/catalog`}
              className="flex-initial flex flex-col items-center justify-center gap-2 rounded-[14px] border border-line bg-surface px-3 py-3 text-center transition group-hover:border-brand group-hover:shadow-glow"
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl text-brand transition group-hover:scale-105 duration-200">
                <MoreIcon className="h-[34px] w-[34px]" />
              </span>
              <span className="text-[15px] font-medium leading-1.25 text-content max-w-[190px] lines-2">
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
      />

      <ProductRail
        title={t('home.newArrivalsTitle')}
        subtitle={t('home.newArrivalsSubtitle')}
        products={newArrivalsQuery.data ?? []}
        viewAllHref={`/${currentLang}/catalog?sort=newest`}
      />

      <ProductRail
        title={t('home.bestSellersTitle')}
        subtitle={t('home.bestSellersSubtitle')}
        products={bestSellersQuery.data ?? []}
        viewAllHref={`/${currentLang}/catalog?sort=popular`}
      />

      <ProductRail
        title={t('home.bundlesTitle')}
        subtitle={t('home.bundlesSubtitle')}
        products={bundlesQuery.data ?? []}
        viewAllHref={`/${currentLang}/catalog?q=kit`}
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
          <div className="flex items-center justify-between h-[62px]">
            {trustItems.map((item, index) => (
              <Fragment key={item.key}>
                <div className="flex-1 flex items-center justify-center gap-2 text-center">
                  <item.icon className="h-[38px] w-[38px] text-brand" />
                  <span className="text-[17px] font-medium text-content">
                    {t(`home.trust.${item.key}`)}
                  </span>
                </div>
                {index < trustItems.length - 1 && (
                  <div className="hidden w-px h-[36px] bg-border lg:block" />
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
