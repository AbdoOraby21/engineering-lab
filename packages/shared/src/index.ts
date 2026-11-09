import { z } from 'zod';

export const localeSchema = z.enum(['ar', 'en']);
export type Locale = z.infer<typeof localeSchema>;

export const roleSchema = z.enum(['CUSTOMER', 'ADMIN']);
export type Role = z.infer<typeof roleSchema>;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{8,15}$/, 'Enter a valid phone number');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const nameSchema = z.string().trim().min(2, 'Name is too short').max(80);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  locale: localeSchema.default('ar'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(256),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(20).max(256),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    locale: localeSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(72),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  governorate: z.string().trim().min(2, 'Governorate is required').max(80),
  city: z.string().trim().min(2, 'City is required').max(80),
  street: z.string().trim().min(3, 'Street is required').max(200),
  building: z.string().trim().min(1, 'Building is required').max(80),
  notes: z.string().trim().max(500).optional(),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const addressUpdateSchema = addressSchema.partial().refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: 'At least one field is required' },
);
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  isActive: boolean;
  locale: Locale;
  createdAt: string;
}

export interface AddressDto {
  id: string;
  label: string | null;
  governorate: string;
  city: string;
  street: string;
  building: string;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccess<T> {
  data: T;
}

const booleanQuerySchema = z
  .enum(['true', 'false'], { message: 'Expected true or false' })
  .transform((value) => value === 'true');

export const productSortSchema = z.enum([
  'relevance',
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
  'popular',
  'popularity',
  'rating',
]);
export type ProductSort = z.infer<typeof productSortSchema>;

const commaSlugListSchema = z
  .string()
  .trim()
  .max(500)
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

export const productListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(160).optional(),
    brand: commaSlugListSchema.optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    inStock: booleanQuerySchema.optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    featured: booleanQuerySchema.optional(),
    isNew: booleanQuerySchema.optional(),
    onSale: booleanQuerySchema.optional(),
    type: z.enum(['SIMPLE', 'BUNDLE']).optional(),
    sort: productSortSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
    locale: localeSchema.default('ar'),
    lang: localeSchema.optional(),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { message: 'minPrice must be less than or equal to maxPrice', path: ['minPrice'] },
  );
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const catalogLimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8),
  locale: localeSchema.default('ar'),
  lang: localeSchema.optional(),
});
export type CatalogLimitQuery = z.infer<typeof catalogLimitQuerySchema>;

export const catalogLangQuerySchema = z.object({
  locale: localeSchema.default('ar'),
  lang: localeSchema.optional(),
});
export type CatalogLangQuery = z.infer<typeof catalogLangQuerySchema>;

export const byIdsQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .min(1)
    .transform((value, ctx) => {
      const parts = value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (parts.length < 1 || parts.length > 12) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide between 1 and 12 ids' });
        return z.NEVER;
      }
      return [...new Set(parts)];
    }),
  locale: localeSchema.default('ar'),
  lang: localeSchema.optional(),
});
export type ByIdsQuery = z.infer<typeof byIdsQuerySchema>;

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(2, 'Search needs at least 2 characters').max(80),
  limit: z.coerce.number().int().min(1).max(12).default(8),
  locale: localeSchema.default('ar'),
});
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(5),
});
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const reviewStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(2, 'Comment is too short').max(2000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    title: z.string().trim().max(120).nullable().optional(),
    comment: z.string().trim().min(2).max(2000).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
});
export type SlugParam = z.infer<typeof slugParamSchema>;

export interface BrandSummaryDto {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  logoUrl: string | null;
}

export interface BrandDto extends BrandSummaryDto {
  descriptionAr: string | null;
  descriptionEn: string | null;
  websiteUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface CategorySummaryDto {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
}

export interface CategoryDto extends CategorySummaryDto {
  descriptionAr: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children: CategoryDto[];
}

export interface ProductFacetBrand {
  slug: string;
  nameAr: string;
  nameEn: string;
  logoUrl: string | null;
  count: number;
}

export interface ProductFacets {
  brands: ProductFacetBrand[];
  price: { min: number; max: number } | null;
  inStockCount: number;
}

export interface CategoryDetailDto extends CategoryDto {
  breadcrumb: CategorySummaryDto[];
  facets: ProductFacets;
}

export interface ProductImageDto {
  id: string;
  url: string;
  altAr: string | null;
  altEn: string | null;
  sortOrder: number;
}

export interface ProductVariantDto {
  id: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  priceDelta: number;
  stock: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductSpecDto {
  keyAr: string;
  keyEn: string;
  valueAr: string;
  valueEn: string;
}

export type ProductType = 'SIMPLE' | 'BUNDLE';

export interface ProductCardDto {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  stock: number;
  isFeatured: boolean;
  isNew: boolean;
  isBundle: boolean;
  type: ProductType;
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
  tags: string[];
  primaryImage: ProductImageDto | null;
  secondaryImage?: ProductImageDto | null;
  brand: BrandSummaryDto | null;
  category: CategorySummaryDto;
  name?: string;
  shortDescription?: string | null;
}

export interface BundleItemDto {
  id: string;
  quantity: number;
  component: ProductCardDto;
}

export interface ProductDetailDto extends ProductCardDto {
  descriptionAr: string;
  descriptionEn: string;
  shortDescriptionAr: string | null;
  shortDescriptionEn: string | null;
  weightGrams: number | null;
  lowStockThreshold: number;
  datasheetUrl: string | null;
  specs: ProductSpecDto[];
  images: ProductImageDto[];
  variants: ProductVariantDto[];
  bundleItems: BundleItemDto[];
  availableStock: number;
  ratingSummary: ReviewSummaryDto;
  breadcrumb: CategorySummaryDto[];
  isInWishlist?: boolean;
  description?: string;
  canReview?: boolean;
  seoTitleAr: string | null;
  seoTitleEn: string | null;
  seoDescriptionAr: string | null;
  seoDescriptionEn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProductListResult {
  items: ProductCardDto[];
  pagination: PaginationMeta;
  facets: ProductFacets;
}

export interface ReviewUserDto {
  id: string;
  name: string;
}

export interface ReviewDto {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: ReviewUserDto;
}

export interface ReviewSummaryDto {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewListResult {
  reviews: ReviewDto[];
  pagination: PaginationMeta;
  summary: ReviewSummaryDto;
}

export type SuggestionKind = 'product' | 'category' | 'brand';

export interface AutocompleteSuggestionDto {
  kind: SuggestionKind;
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  price?: number;
  imageUrl?: string | null;
}

export const ticketCategorySchema = z.enum(['ORDER', 'PAYMENT', 'PRODUCT', 'SHIPPING', 'OTHER']);
export type TicketCategory = z.infer<typeof ticketCategorySchema>;

export const ticketStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'PENDING_CUSTOMER',
  'RESOLVED',
  'CLOSED',
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3, 'Subject is too short').max(160),
  category: ticketCategorySchema.default('OTHER'),
  orderReference: z.string().trim().max(40).optional(),
  orderId: z.string().trim().max(64).optional(),
  message: z.string().trim().min(2, 'Message is too short').max(4000),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message is required').max(4000),
});
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;

export const ticketListQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export const bannerLocationSchema = z.enum(['HOME_HERO', 'HOME_STRIP']);
export type BannerLocation = z.infer<typeof bannerLocationSchema>;

export const bannerListQuerySchema = z.object({
  location: bannerLocationSchema.optional(),
});
export type BannerListQuery = z.infer<typeof bannerListQuerySchema>;

export interface BannerDto {
  id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string | null;
  subtitleEn: string | null;
  highlightAr: string | null;
  highlightEn: string | null;
  bulletsAr: string[];
  bulletsEn: string[];
  ctaLabelAr: string | null;
  ctaLabelEn: string | null;
  imageUrl: string | null;
  href: string | null;
  ctaUrl: string | null;
  location: BannerLocation;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface TicketSenderDto {
  id: string;
  name: string;
  role: Role;
}

export interface TicketMessageDto {
  id: string;
  body: string;
  isStaff: boolean;
  attachments: unknown[];
  createdAt: string;
  sender: TicketSenderDto | null;
}

export interface SupportTicketDto {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  orderReference: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: TicketMessageDto | null;
}

export interface SupportTicketDetailDto extends SupportTicketDto {
  messages: TicketMessageDto[];
}

export interface TicketListResult {
  items: SupportTicketDto[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Storefront content: contact, FAQ, static pages and public settings
// ---------------------------------------------------------------------------

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  subject: z.string().trim().min(3, 'Subject is too short').max(160),
  message: z.string().trim().min(10, 'Message is too short').max(5000),
  website: z.string().max(200).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const faqQuerySchema = z.object({
  category: z.string().trim().max(60).optional(),
});
export type FaqQuery = z.infer<typeof faqQuerySchema>;

export interface FaqItemDto {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  category: string;
  sortOrder: number;
}

export interface PageDto {
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  updatedAt: string;
}

export interface PaymentDisplayInfo {
  key: string;
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  x?: string;
  linkedin?: string;
  telegram?: string;
}

export interface CreditBlock {
  enabled: boolean;
  nameAr: string;
  nameEn: string;
  url: string;
}

export interface PublicSettingsDto {
  storeName: string;
  storeNameAr: string;
  storeTagline: string;
  storeTaglineAr: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  contactPhone: string;
  contactPhone2: string | null;
  contactEmail: string;
  whatsapp: string;
  addressAr: string;
  addressEn: string;
  workingHoursAr: string;
  workingHoursEn: string;
  socialLinks: SocialLinks;
  credit: CreditBlock;
  freeShippingThreshold: number;
  paymentMethods: PaymentDisplayInfo[];
}

// ---------------------------------------------------------------------------
// Settings validation (admin "Store" group). Keys not listed here pass through
// untouched (.passthrough) so the admin UI can store arbitrary group values;
// listed keys are validated before they hit the database.
// ---------------------------------------------------------------------------

const settingsPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number');

const urlSchema = z.string().trim().url('Enter a valid URL').nullish();

export const creditBlockSchema = z.object({
  enabled: z.boolean().default(true),
  nameAr: z.string().trim().min(1, 'Name is required').max(80),
  nameEn: z.string().trim().min(1, 'Name is required').max(80),
  url: z.string().trim().url('Enter a valid URL'),
});

export const settingsStoreSchema = z
  .object({
    'store.name': z.string().trim().min(1).max(160).nullish(),
    'store.nameAr': z.string().trim().min(1).max(160).nullish(),
    'store.tagline': z.string().trim().max(300).nullish(),
    'store.taglineAr': z.string().trim().max(300).nullish(),
    'store.logoUrl': urlSchema,
    'store.faviconUrl': urlSchema,
    'contact.phone': settingsPhoneSchema.nullish(),
    'contact.phone2': settingsPhoneSchema.nullish(),
    'contact.email': z.string().trim().email('Enter a valid email').max(254).nullish(),
    'contact.whatsapp': settingsPhoneSchema.nullish(),
    'contact.addressAr': z.string().trim().max(500).nullish(),
    'contact.addressEn': z.string().trim().max(500).nullish(),
    'contact.hoursAr': z.string().trim().max(200).nullish(),
    'contact.hoursEn': z.string().trim().max(200).nullish(),
    'site.credit': creditBlockSchema.nullish(),
  })
  .passthrough();
export type SettingsStoreInput = z.infer<typeof settingsStoreSchema>;

export interface WishlistItemDto {
  id: string;
  createdAt: string;
  product: ProductCardDto;
}

// ---------------------------------------------------------------------------
// Money: stored and transported as integer piasters (100 piasters = 1 EGP).
// ---------------------------------------------------------------------------

export function formatEGP(piasters: number, locale: Locale = 'en'): string {
  const tag = locale === 'ar' ? 'ar-EG' : 'en-EG';
  return new Intl.NumberFormat(tag, { style: 'currency', currency: 'EGP' }).format(piasters / 100);
}

export function discountPercent(price: number, compareAtPrice: number | null | undefined): number | null {
  if (!compareAtPrice || compareAtPrice <= price) {
    return null;
  }
  return Math.round((1 - price / compareAtPrice) * 100);
}

// ---------------------------------------------------------------------------
// Search normalization (mirrors search_normalize() in the database migration).
// Keep both in sync: lowercase, strip tashkeel/tatweel, fold alef forms,
// ى→ي, ة→ه, Arabic-Indic digits → Latin digits, collapse whitespace.
// ---------------------------------------------------------------------------

const ARABIC_DIACRITICS = /[ً-ٰٟـ]/g;
const ALEF_FORMS = /[أإآٱ]/g;
const ALIF_MAKSURA = /ى/g;
const TAA_MARBUTA = /ة/g;
const WHITESPACE = /\s+/g;
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function replaceDigits(value: string): string {
  let result = value;
  for (let index = 0; index < 10; index += 1) {
    result = result.split(ARABIC_INDIC_DIGITS.charAt(index)).join(String(index));
    result = result.split(EXTENDED_ARABIC_INDIC_DIGITS.charAt(index)).join(String(index));
  }
  return result;
}

export function normalizeSearchText(value: string): string {
  return replaceDigits(
    value
      .toLowerCase()
      .replace(ARABIC_DIACRITICS, '')
      .replace(ALEF_FORMS, 'ا')
      .replace(ALIF_MAKSURA, 'ي')
      .replace(TAA_MARBUTA, 'ه')
      .replace(WHITESPACE, ' ')
      .trim(),
  );
}

const ARABIC_LATIN_MAP: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'a', آ: 'a', ٱ: 'a',
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h',
  خ: 'kh', د: 'd', ذ: 'th', ر: 'r', ز: 'z',
  س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't',
  ظ: 'z', ع: 'e', غ: 'gh', ف: 'f', ق: 'q',
  ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h',
  و: 'w', ي: 'y', ى: 'a', ة: 'a', ء: '',
  ئ: 'e', ؤ: 'o',
};

export function slugify(value: string): string {
  const transliterated = [...normalizeSearchText(value)]
    .map((char) => ARABIC_LATIN_MAP[char] ?? char)
    .join('');
  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}


// ---------------------------------------------------------------------------
// Admin: categories, brands, products, inventory, banners
// ---------------------------------------------------------------------------

export const adminCategorySchema = z.object({
  nameAr: z.string().trim().min(2, 'Name is too short').max(160),
  nameEn: z.string().trim().min(2, 'Name is too short').max(160),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug')
    .optional(),
  descriptionAr: z.string().trim().max(2000).nullish(),
  descriptionEn: z.string().trim().max(2000).nullish(),
  imageUrl: z.string().trim().max(500).nullish(),
  icon: z.string().trim().max(64).nullish(),
  parentId: z.string().trim().min(1).max(64).nullish(),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
  seoTitleAr: z.string().trim().max(200).nullish(),
  seoTitleEn: z.string().trim().max(200).nullish(),
  seoDescriptionAr: z.string().trim().max(500).nullish(),
  seoDescriptionEn: z.string().trim().max(500).nullish(),
});
export type AdminCategoryInput = z.infer<typeof adminCategorySchema>;

export const adminCategoryUpdateSchema = adminCategorySchema.partial().refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: 'At least one field is required' },
);
export type AdminCategoryUpdate = z.infer<typeof adminCategoryUpdateSchema>;

export const adminCategoryReorderSchema = z.object({
  parentId: z.string().trim().min(1).max(64).nullish(),
  orderedIds: z.array(z.string().trim().min(1).max(64)).min(1).max(500),
});
export type AdminCategoryReorderInput = z.infer<typeof adminCategoryReorderSchema>;

export const adminBrandSchema = z.object({
  nameAr: z.string().trim().min(1, 'Name is required').max(160),
  nameEn: z.string().trim().min(1, 'Name is required').max(160),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug')
    .optional(),
  logoUrl: z.string().trim().max(500).nullish(),
  descriptionAr: z.string().trim().max(2000).nullish(),
  descriptionEn: z.string().trim().max(2000).nullish(),
  websiteUrl: z.string().trim().url('Enter a valid URL').max(500).nullish().or(z.literal('').transform(() => null)),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
});
export type AdminBrandInput = z.infer<typeof adminBrandSchema>;

export const adminBrandUpdateSchema = adminBrandSchema.partial().refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: 'At least one field is required' },
);
export type AdminBrandUpdate = z.infer<typeof adminBrandUpdateSchema>;

export const productSpecSchema = z.object({
  keyAr: z.string().trim().min(1).max(120),
  keyEn: z.string().trim().min(1).max(120),
  valueAr: z.string().trim().min(1).max(500),
  valueEn: z.string().trim().min(1).max(500),
});
export type ProductSpecInput = z.infer<typeof productSpecSchema>;

export const adminCreateProductSchema = z
  .object({
    nameAr: z.string().trim().min(2, 'Name is too short').max(200),
    nameEn: z.string().trim().min(2, 'Name is too short').max(200),
    slug: z
      .string()
      .trim()
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug')
      .optional(),
    sku: z
      .string()
      .trim()
      .min(2, 'SKU is too short')
      .max(64)
      .regex(/^[A-Za-z0-9/_-]+$/, 'Invalid SKU'),
    descriptionAr: z.string().trim().min(1, 'Description is required').max(20000),
    descriptionEn: z.string().trim().min(1, 'Description is required').max(20000),
    shortDescriptionAr: z.string().trim().max(500).nullish(),
    shortDescriptionEn: z.string().trim().max(500).nullish(),
    price: z.coerce.number().int().min(0),
    compareAtPrice: z.coerce.number().int().min(0).nullish(),
    stock: z.coerce.number().int().min(0, 'stock cannot be negative').default(0),
    lowStockThreshold: z.coerce.number().int().min(0).max(10000).default(5),
    weightGrams: z.coerce.number().int().min(0).nullish(),
    brandId: z.string().trim().min(1).max(64).nullish(),
    categoryId: z.string().trim().min(1, 'Category is required').max(64),
    isFeatured: z.boolean().default(false),
    isNew: z.boolean().default(false),
    isActive: z.boolean().default(true),
    type: z.enum(['SIMPLE', 'BUNDLE']).default('SIMPLE'),
    datasheetUrl: z.string().trim().max(500).nullish(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    specs: z.array(productSpecSchema).max(50).default([]),
    seoTitleAr: z.string().trim().max(200).nullish(),
    seoTitleEn: z.string().trim().max(200).nullish(),
    seoDescriptionAr: z.string().trim().max(500).nullish(),
    seoDescriptionEn: z.string().trim().max(500).nullish(),
  })
  .refine(
    (data) =>
      data.compareAtPrice === undefined ||
      data.compareAtPrice === null ||
      data.compareAtPrice > data.price,
    { message: 'compareAtPrice must be greater than price', path: ['compareAtPrice'] },
  );
export type AdminCreateProductInput = z.infer<typeof adminCreateProductSchema>;

export const adminUpdateProductSchema = z
  .object({
    nameAr: z.string().trim().min(2).max(200).optional(),
    nameEn: z.string().trim().min(2).max(200).optional(),
    slug: z.string().trim().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug').optional(),
    sku: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9/_-]+$/, 'Invalid SKU').optional(),
    descriptionAr: z.string().trim().min(1).max(20000).optional(),
    descriptionEn: z.string().trim().min(1).max(20000).optional(),
    shortDescriptionAr: z.string().trim().max(500).nullish(),
    shortDescriptionEn: z.string().trim().max(500).nullish(),
    price: z.coerce.number().int().min(0).optional(),
    compareAtPrice: z.coerce.number().int().min(0).nullish(),
    lowStockThreshold: z.coerce.number().int().min(0).max(10000).optional(),
    weightGrams: z.coerce.number().int().min(0).nullish(),
    brandId: z.string().trim().min(1).max(64).nullish(),
    categoryId: z.string().trim().min(1).max(64).optional(),
    isFeatured: z.boolean().optional(),
    isNew: z.boolean().optional(),
    isActive: z.boolean().optional(),
    type: z.enum(['SIMPLE', 'BUNDLE']).optional(),
    datasheetUrl: z.string().trim().max(500).nullish(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    specs: z.array(productSpecSchema).max(50).optional(),
    seoTitleAr: z.string().trim().max(200).nullish(),
    seoTitleEn: z.string().trim().max(200).nullish(),
    seoDescriptionAr: z.string().trim().max(500).nullish(),
    seoDescriptionEn: z.string().trim().max(500).nullish(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  })
  .refine(
    (data) =>
      data.compareAtPrice === undefined ||
      data.compareAtPrice === null ||
      data.price === undefined ||
      data.compareAtPrice > data.price,
    { message: 'compareAtPrice must be greater than price', path: ['compareAtPrice'] },
  );
export type AdminUpdateProductInput = z.infer<typeof adminUpdateProductSchema>;

export const adminProductListQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  categoryId: z.string().trim().min(1).max(64).optional(),
  brandId: z.string().trim().min(1).max(64).optional(),
  isActive: booleanQuerySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

export const adminReorderImagesSchema = z.object({
  imageIds: z.array(z.string().trim().min(1).max(64)).min(1).max(50),
});
export type AdminReorderImagesInput = z.infer<typeof adminReorderImagesSchema>;

export const adminReorderBannersSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1).max(64)).min(1).max(100),
});
export type AdminReorderBannersInput = z.infer<typeof adminReorderBannersSchema>;

export const adminVariantSchema = z.object({
  nameAr: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9/_-]+$/, 'Invalid SKU'),
  priceDelta: z.coerce.number().int().default(0),
  stock: z.coerce.number().int().min(0, 'stock cannot be negative').default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});
export type AdminVariantInput = z.infer<typeof adminVariantSchema>;

export const adminVariantUpdateSchema = adminVariantSchema.partial().refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: 'At least one field is required' },
);
export type AdminVariantUpdate = z.infer<typeof adminVariantUpdateSchema>;

export const adminBundleItemsSchema = z.object({
  items: z
    .array(
      z.object({
        componentId: z.string().trim().min(1).max(64),
        quantity: z.coerce.number().int().min(1).max(1000),
      }),
    )
    .max(50)
    .refine(
      (items) => new Set(items.map((item) => item.componentId)).size === items.length,
      { message: 'Duplicate componentId entries are not allowed' },
    ),
});
export type AdminBundleItemsInput = z.infer<typeof adminBundleItemsSchema>;

export const adminSpecsSchema = z.object({
  specs: z.array(productSpecSchema).max(50),
});
export type AdminSpecsInput = z.infer<typeof adminSpecsSchema>;

export const stockMovementReasonSchema = z.enum([
  'INITIAL',
  'MANUAL_ADJUSTMENT',
  'ORDER_PLACED',
  'ORDER_CANCELLED',
  'RETURN',
  'IMPORT',
]);
export type StockMovementReason = z.infer<typeof stockMovementReasonSchema>;

export const stockAdjustmentSchema = z.object({
  delta: z.coerce.number().int().refine((value) => value !== 0, { message: 'delta must not be zero' }),
  reason: stockMovementReasonSchema.default('MANUAL_ADJUSTMENT'),
  note: z.string().trim().max(500).nullish(),
  variantId: z.string().trim().min(1).max(64).nullish(),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const stockMovementsQuerySchema = z.object({
  productId: z.string().trim().min(1).max(64).optional(),
  variantId: z.string().trim().min(1).max(64).optional(),
  reason: stockMovementReasonSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type StockMovementsQuery = z.infer<typeof stockMovementsQuerySchema>;

export const adminReviewsQuerySchema = z.object({
  status: reviewStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminReviewsQuery = z.infer<typeof adminReviewsQuerySchema>;

export const adminBannerBaseSchema = z.object({
  titleAr: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  subtitleAr: z.string().trim().max(500).nullish(),
  subtitleEn: z.string().trim().max(500).nullish(),
  highlightAr: z.string().trim().max(200).nullish(),
  highlightEn: z.string().trim().max(200).nullish(),
  bulletsAr: z.array(z.string().trim().min(1).max(120)).max(5).default([]),
  bulletsEn: z.array(z.string().trim().min(1).max(120)).max(5).default([]),
  ctaLabelAr: z.string().trim().max(120).nullish(),
  ctaLabelEn: z.string().trim().max(120).nullish(),
  ctaUrl: z.string().trim().max(500).nullish(),
  imageUrl: z.string().trim().max(500).nullish(),
  location: bannerLocationSchema.default('HOME_HERO'),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
});
export type AdminBannerInput = z.infer<typeof adminBannerBaseSchema>;
export const adminBannerSchema = adminBannerBaseSchema.refine(
  (data) => !data.startsAt || !data.endsAt || data.startsAt < data.endsAt,
  { message: 'startsAt must be before endsAt', path: ['endsAt'] },
);

export const adminBannerUpdateSchema = adminBannerBaseSchema.partial().refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: 'At least one field is required' },
);
export type AdminBannerUpdate = z.infer<typeof adminBannerUpdateSchema>;

export const importQuerySchema = z.object({
  dryRun: booleanQuerySchema.default(true),
});
export type ImportQuery = z.infer<typeof importQuerySchema>;

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
});
export type ExportQuery = z.infer<typeof exportQuerySchema>;

export interface AdminProductCardDto extends ProductCardDto {
  isActive: boolean;
  reservedStock: number;
  datasheetUrl: string | null;
}

export interface AdminProductListResult {
  items: AdminProductCardDto[];
  pagination: PaginationMeta;
}

export interface StockMovementDto {
  id: string;
  productId: string;
  variantId: string | null;
  delta: number;
  reason: StockMovementReason;
  note: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
  product?: { id: string; sku: string; nameAr: string; nameEn: string };
}

export interface LowStockItemDto {
  productId: string;
  variantId: string | null;
  sku: string;
  nameAr: string;
  nameEn: string;
  stock: number;
  lowStockThreshold: number;
  type: ProductType;
}

export interface ImportRowError {
  row: number;
  sku: string | null;
  errors: string[];
}

export interface ImportDryRunReport {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportRowError[];
}

export interface ImportSummary {
  created: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
}

export interface AdminReviewsResult {
  reviews: ReviewDto[];
  pagination: PaginationMeta;
}

export interface CartItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  qty: number;
  product: ProductCardDto;
}

export interface CartDto {
  id: string;
  userId: string;
  items: CartItemDto[];
  updatedAt: string;
}

export const addCartItemSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).optional().nullable(),
  qty: z.coerce.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  qty: z.coerce.number().int().min(1).max(99),
});

// ---------------------------------------------------------------------------
// Phase 4: Orders, shipping, coupons, payments, returns
// ---------------------------------------------------------------------------

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_PAYMENT_REVIEW'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentMethod = 'VODAFONE_CASH' | 'INSTAPAY' | 'COD';

export type PaymentProofStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type ReturnRequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED';

export interface ShippingZoneDto {
  id: string;
  governorate: string;
  feeEgp: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

export interface CouponDto {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountTotal: number; // piasters
  reason?: string;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  qty: number;
  nameAr: string;
  nameEn: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  lineTotal: number;
  isBundle: boolean;
}

export interface OrderStatusHistoryDto {
  id: string;
  from: OrderStatus | null;
  to: OrderStatus;
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

export interface PaymentProofDto {
  id: string;
  senderPhone: string;
  referenceNumber: string | null;
  transferredAt: string;
  amount: number;
  status: PaymentProofStatus;
  rejectReason: string | null;
  createdAt: string;
}

export interface ReturnRequestDto {
  id: string;
  reason: string;
  details: string | null;
  photos: unknown[];
  status: ReturnRequestStatus;
  resolutionNote: string | null;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  addressSnapshot: unknown;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  customerNote: string | null;
  paymentDeadlineAt: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  trackingCompany: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDto[];
  proofs: PaymentProofDto[];
  returnRequests: ReturnRequestDto[];
  statusHistory: OrderStatusHistoryDto[];
}

export interface OrderSummaryDto {
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  shippingZone: ShippingZoneDto | null;
  coupon: CouponDto | null;
  items: OrderItemDto[];
  paymentMethods: { key: PaymentMethod; labelAr: string; labelEn: string; value?: string }[];
}

export interface PlaceOrderInput {
  addressId: string;
  couponCode?: string | null;
  paymentMethod: PaymentMethod;
  customerNote?: string | null;
  idempotencyKey: string;
}

export interface SubmitPaymentProofInput {
  orderNumber: string;
  senderPhone: string;
  referenceNumber?: string | null;
  transferredAt: string;
  amount: number;
}

export interface CreateReturnRequestInput {
  orderNumber: string;
  reason: string;
  details?: string | null;
  photos: unknown[];
}

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(40),
});

export const placeOrderSchema = z.object({
  addressId: z.string().min(1).max(64),
  couponCode: z.string().trim().min(1).max(40).optional().nullable(),
  paymentMethod: z.enum(['VODAFONE_CASH', 'INSTAPAY', 'COD']),
  customerNote: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().min(1).max(128),
});

export const submitPaymentProofSchema = z.object({
  senderPhone: z.string().trim().min(1),
  referenceNumber: z.string().trim().min(1).max(64).optional().nullable(),
  transferredAt: z.string().datetime(),
  amount: z.coerce.number().int().positive(),
});

export const createReturnRequestSchema = z.object({
  reason: z.string().trim().min(1).max(160),
  details: z.string().max(1000).optional().nullable(),
  photos: z.array(z.string().url()).default([]),
});
