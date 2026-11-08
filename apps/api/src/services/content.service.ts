import type {
  ContactInput,
  CreditBlock,
  FaqItemDto,
  PageDto,
  PaymentDisplayInfo,
  PublicSettingsDto,
  SocialLinks,
} from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';
import { sendContactNotification } from '../lib/mailer.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

export async function submitContact(input: ContactInput): Promise<void> {
  await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject,
      message: input.message,
    },
  });

  await sendContactNotification({
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    subject: input.subject,
    message: input.message,
  });
}

export async function listFaq(category?: string): Promise<FaqItemDto[]> {
  const items = await prisma.faqItem.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return items.map((item) => ({
    id: item.id,
    questionAr: item.questionAr,
    questionEn: item.questionEn,
    answerAr: item.answerAr,
    answerEn: item.answerEn,
    category: item.category,
    sortOrder: item.sortOrder,
  }));
}

export async function getPage(slug: string): Promise<PageDto> {
  const page = await prisma.page.findFirst({
    where: { slug, isPublished: true },
  });
  if (!page) {
    throw AppError.notFound('Page not found', ErrorCodes.PAGE_NOT_FOUND);
  }
  return {
    slug: page.slug,
    titleAr: page.titleAr,
    titleEn: page.titleEn,
    contentAr: page.contentAr,
    contentEn: page.contentEn,
    updatedAt: page.updatedAt.toISOString(),
  };
}

const DEFAULT_SETTINGS: PublicSettingsDto = {
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
  credit: { enabled: true, nameAr: 'عبدالرحمن عرابي', nameEn: 'Abdelrahman Oraby', url: 'https://abdo-oraby.myftp.org' },
  freeShippingThreshold: 200000,
  paymentMethods: [
    {
      key: 'vodafone_cash',
      labelAr: 'فودافون كاش',
      labelEn: 'Vodafone Cash',
      valueAr: '01000000000',
      valueEn: '01000000000',
    },
    {
      key: 'instapay',
      labelAr: 'إنستاباي',
      labelEn: 'InstaPay',
      valueAr: 'support@engineeringlab.eg',
      valueEn: 'support@engineeringlab.eg',
    },
  ],
};

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asSocialLinks(value: unknown): SocialLinks {
  const record = asRecord(value);
  const links: SocialLinks = {};
  for (const key of ['facebook', 'instagram', 'youtube', 'tiktok', 'x'] as const) {
    const url = record[key];
    if (typeof url === 'string' && url.trim()) {
      links[key] = url;
    }
  }
  return links;
}

function asPaymentMethods(value: unknown, fallback: PaymentDisplayInfo[]): PaymentDisplayInfo[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const methods: PaymentDisplayInfo[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (
      typeof record.key === 'string' &&
      typeof record.labelAr === 'string' &&
      typeof record.labelEn === 'string'
    ) {
      methods.push({
        key: record.key,
        labelAr: record.labelAr,
        labelEn: record.labelEn,
        valueAr: typeof record.valueAr === 'string' ? record.valueAr : '',
        valueEn: typeof record.valueEn === 'string' ? record.valueEn : '',
      });
    }
  }
  return methods.length > 0 ? methods : fallback;
}

export async function getPublicSettings(): Promise<PublicSettingsDto> {
  const rows = await prisma.setting.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    storeName: asString(byKey.get('store.name'), DEFAULT_SETTINGS.storeName),
    storeNameAr: asString(byKey.get('store.nameAr'), DEFAULT_SETTINGS.storeNameAr),
    storeTagline: asString(byKey.get('store.tagline'), DEFAULT_SETTINGS.storeTagline),
    storeTaglineAr: asString(
      byKey.get('store.taglineAr'),
      DEFAULT_SETTINGS.storeTaglineAr,
    ),
    logoUrl: asStringOrNull(byKey.get('store.logoUrl'), DEFAULT_SETTINGS.logoUrl),
    faviconUrl: asStringOrNull(byKey.get('store.faviconUrl'), DEFAULT_SETTINGS.faviconUrl),
    contactPhone: asString(byKey.get('contact.phone'), DEFAULT_SETTINGS.contactPhone),
    contactPhone2: asStringOrNull(
      byKey.get('contact.phone2'),
      DEFAULT_SETTINGS.contactPhone2,
    ),
    contactEmail: asString(byKey.get('contact.email'), DEFAULT_SETTINGS.contactEmail),
    whatsapp: asString(byKey.get('contact.whatsapp'), DEFAULT_SETTINGS.whatsapp),
    addressAr: asString(byKey.get('contact.addressAr'), DEFAULT_SETTINGS.addressAr),
    addressEn: asString(byKey.get('contact.addressEn'), DEFAULT_SETTINGS.addressEn),
    workingHoursAr: asString(
      byKey.get('contact.hoursAr'),
      DEFAULT_SETTINGS.workingHoursAr,
    ),
    workingHoursEn: asString(
      byKey.get('contact.hoursEn'),
      DEFAULT_SETTINGS.workingHoursEn,
    ),
    socialLinks: asSocialLinks(byKey.get('social.links')),
    credit: asCreditBlock(byKey.get('site.credit'), DEFAULT_SETTINGS.credit),
    freeShippingThreshold: asNumber(
      byKey.get('shipping.freeThreshold'),
      DEFAULT_SETTINGS.freeShippingThreshold,
    ),
    paymentMethods: asPaymentMethods(
      byKey.get('payment.methods'),
      DEFAULT_SETTINGS.paymentMethods,
    ),
  };
}

function asStringOrNull(value: unknown, fallback: string | null): string | null {
  if (value === null || value === undefined) {
    return fallback;
  }
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asCreditBlock(value: unknown, fallback: CreditBlock): CreditBlock {
  const record = asRecord(value);
  const enabled = typeof record.enabled === 'boolean' ? record.enabled : fallback.enabled;
  return {
    enabled,
    nameAr: asString(record.nameAr, fallback.nameAr),
    nameEn: asString(record.nameEn, fallback.nameEn),
    url: asString(record.url, fallback.url),
  };
}
