import type { PublicSettingsDto } from '@engineering-lab/shared';
import { useQuery } from '@tanstack/react-query';
import { fetchSettings } from '../lib/siteApi';

const DEFAULT_CREDIT: PublicSettingsDto['credit'] = {
  enabled: true,
  nameAr: 'عبدالرحمن عرابي',
  nameEn: 'Abdelrahman Oraby',
  url: 'https://abdo-oraby.myftp.org',
};

export const DEFAULT_SITE_SETTINGS: PublicSettingsDto = {
  storeName: 'Engineering Lab',
  storeNameAr: 'Engineering Lab',
  storeTagline: 'Authentic electronics components in Egypt',
  storeTaglineAr: 'مكونات إلكترونية أصلية في مصر',
  logoUrl: null,
  faviconUrl: null,
  contactPhone: '+20 100 000 0000',
  contactPhone2: null,
  contactEmail: 'support@engineeringlab.eg',
  whatsapp: '+20 100 000 0000',
  addressAr: 'القاهرة، مصر',
  addressEn: 'Cairo, Egypt',
  workingHoursAr: 'السبت - الخميس، 10 صباحًا - 7 مساءً',
  workingHoursEn: 'Saturday - Thursday, 10 AM - 7 PM',
  socialLinks: {},
  credit: DEFAULT_CREDIT,
  freeShippingThreshold: 200000,
  paymentMethods: [],
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: async () => {
      try {
        return await fetchSettings();
      } catch {
        return DEFAULT_SITE_SETTINGS;
      }
    },
    // Settings are small; always refetch on mount/window focus so admin
    // changes appear on the storefront without a redeploy.
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
    placeholderData: DEFAULT_SITE_SETTINGS,
  });
}
