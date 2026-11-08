import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PublicSettingsDto } from '@engineering-lab/shared';
import i18n from '../../lib/i18n';

const { mockUseSiteSettings, mockListCategories } = vi.hoisted(() => ({
  mockUseSiteSettings: vi.fn(),
  mockListCategories: vi.fn(async () => []),
}));

vi.mock('../../hooks/useSiteSettings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useSiteSettings')>();
  return {
    ...actual,
    useSiteSettings: mockUseSiteSettings,
    DEFAULT_SITE_SETTINGS: actual.DEFAULT_SITE_SETTINGS,
  };
});

vi.mock('../../lib/catalogApi', async () => ({
  listCategories: mockListCategories,
}));

import Footer from './Footer';

function settingsWith(credit: { enabled: boolean; nameAr: string; nameEn: string; url: string }): PublicSettingsDto {
  return {
    storeName: 'Engineering Lab',
    storeNameAr: 'Engineering Lab',
    storeTagline: 'Tagline',
    storeTaglineAr: 'الشعار',
    logoUrl: null,
    faviconUrl: null,
    contactPhone: '+20 100 000 0000',
    contactPhone2: null,
    contactEmail: 'support@example.com',
    whatsapp: '+20 100 000 0000',
    addressAr: 'القاهرة، مصر',
    addressEn: 'Cairo, Egypt',
    workingHoursAr: 'السبت - الخميس، 10 ص - 7 م',
    workingHoursEn: 'Saturday - Thursday, 10 AM - 7 PM',
    socialLinks: {},
    credit,
    freeShippingThreshold: 200000,
    paymentMethods: [],
  };
}

function renderFooter(lang: 'en' | 'ar', settings: PublicSettingsDto) {
  mockUseSiteSettings.mockReturnValue({ data: settings, isLoading: false, refetch: vi.fn() } as never);
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/${lang}`]}>
        <Routes>
          <Route path="/:lang" element={<Footer />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function creditLink(settings: PublicSettingsDto): HTMLAnchorElement | undefined {
  return (screen.getAllByRole('link') as HTMLAnchorElement[]).find((l) => l.getAttribute('href') === settings.credit.url);
}

describe('Footer credit', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the credit link in English with correct href/target/rel', async () => {
    await i18n.changeLanguage('en');
    const settings = settingsWith({
      enabled: true,
      nameAr: 'عبدالرحمن عرابي',
      nameEn: 'Abdelrahman Oraby',
      url: 'https://abdo-oraby.myftp.org',
    });
    renderFooter('en', settings);

    const link = creditLink(settings);
    expect(link).toBeDefined();
    expect(link!.textContent).toContain('Abdelrahman');
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
    expect(link!.getAttribute('rel')).toContain('noreferrer');
  });

  it('renders the credit link in Arabic', async () => {
    await i18n.changeLanguage('ar');
    const settings = settingsWith({
      enabled: true,
      nameAr: 'عبدالرحمن عرابي',
      nameEn: 'Abdelrahman Oraby',
      url: 'https://abdo-oraby.myftp.org',
    });
    renderFooter('ar', settings);

    const link = creditLink(settings);
    expect(link).toBeDefined();
    expect(link!.textContent).toContain('عرابي');
    expect(link!.getAttribute('target')).toBe('_blank');
  });

  it('hides the credit when disabled', async () => {
    await i18n.changeLanguage('en');
    const settings = settingsWith({ enabled: false, nameAr: 'x', nameEn: 'x', url: 'https://example.com' });
    renderFooter('en', settings);

    expect(screen.getAllByRole('link').map((l) => l.getAttribute('href'))).not.toContain('https://example.com');
  });
});
