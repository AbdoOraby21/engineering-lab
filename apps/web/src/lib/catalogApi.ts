import type {
  AutocompleteSuggestionDto,
  BrandDto,
  CategoryDetailDto,
  CategoryDto,
  ProductCardDto,
  ProductFacets,
  ProductListResult,
  ReviewDto,
  ProductDetailDto,
  ProductSort,
  ReviewListResult,
} from '@engineering-lab/shared';
import { api } from './api';
import i18n from './i18n';

interface Data<T> {
  data: T;
}

function currentLocale(): 'ar' | 'en' {
  return i18n.language === 'en' ? 'en' : 'ar';
}

export interface ProductListParams {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  featured?: boolean;
  onSale?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export async function listProducts(params: ProductListParams): Promise<ProductListResult> {
  const response = await api.get<Data<ProductListResult>>('/catalog/products', {
    params: cleanParams({ ...params, locale: currentLocale() }),
  });
  return response.data.data;
}

export async function fetchByIds(ids: string[]): Promise<ProductCardDto[]> {
  if (ids.length === 0) return [];
  const response = await api.get<Data<{ products: ProductCardDto[] }>>('/catalog/products/by-ids', {
    params: { ids: ids.join(','), locale: currentLocale() },
  });
  return response.data.data.products;
}

export async function listCategories(): Promise<CategoryDto[]> {
  const response = await api.get<Data<{ categories: CategoryDto[] }>>('/catalog/categories');
  return response.data.data.categories;
}

export async function getCategory(slug: string): Promise<CategoryDetailDto> {
  const response = await api.get<Data<{ category: CategoryDetailDto }>>(
    `/catalog/categories/${encodeURIComponent(slug)}`,
  );
  return response.data.data.category;
}

export async function listBrands(): Promise<BrandDto[]> {
  const response = await api.get<Data<{ brands: BrandDto[] }>>('/catalog/brands');
  return response.data.data.brands;
}

export async function fetchProduct(slug: string): Promise<ProductDetailDto> {
  const response = await api.get<Data<{ product: ProductDetailDto }>>(
    `/catalog/products/${encodeURIComponent(slug)}`,
  );
  return response.data.data.product;
}

export async function fetchRelated(slug: string, limit = 8): Promise<ProductCardDto[]> {
  const response = await api.get<Data<{ products: ProductCardDto[] }>>(
    `/catalog/products/${encodeURIComponent(slug)}/related`,
    { params: { limit, locale: currentLocale() } },
  );
  return response.data.data.products;
}

export async function fetchReviews(
  slug: string,
  page = 1,
  pageSize = 5,
): Promise<ReviewListResult> {
  const response = await api.get<Data<ReviewListResult>>(
    `/catalog/products/${encodeURIComponent(slug)}/reviews`,
    { params: { page, pageSize } },
  );
  return response.data.data;
}

async function fetchProductRail(
  path: 'featured' | 'new-arrivals' | 'best-sellers',
  limit = 8,
): Promise<ProductCardDto[]> {
  const response = await api.get<Data<{ products: ProductCardDto[] }>>(
    `/catalog/products/${path}`,
    { params: { limit, locale: currentLocale() } },
  );
  return response.data.data.products;
}

export function fetchFeaturedProducts(limit = 8): Promise<ProductCardDto[]> {
  return fetchProductRail('featured', limit);
}

export function fetchNewArrivals(limit = 8): Promise<ProductCardDto[]> {
  return fetchProductRail('new-arrivals', limit);
}

export function fetchBestSellers(limit = 8): Promise<ProductCardDto[]> {
  return fetchProductRail('best-sellers', limit);
}

export async function fetchSuggestions(q: string, limit = 8): Promise<AutocompleteSuggestionDto[]> {
  const response = await api.get<Data<{ suggestions: AutocompleteSuggestionDto[] }>>('/search/suggest', {
    params: { q, limit },
  });
  return response.data.data.suggestions;
}

export async function createReview(
  slug: string,
  input: { rating: number; title?: string; comment: string },
): Promise<ReviewDto> {
  const response = await api.post<Data<{ review: ReviewDto }>>(
    `/catalog/products/${encodeURIComponent(slug)}/reviews`,
    input,
  );
  return response.data.data.review;
}

export async function updateReview(
  reviewId: string,
  input: { rating?: number; title?: string; comment?: string },
): Promise<ReviewDto> {
  const response = await api.patch<Data<{ review: ReviewDto }>>(
    `/catalog/reviews/${encodeURIComponent(reviewId)}`,
    input,
  );
  return response.data.data.review;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await api.delete(`/catalog/reviews/${encodeURIComponent(reviewId)}`);
}

export function sortLabelKeys(): ProductSort[] {
  return ['relevance', 'newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'popular', 'rating'];
}

export type { ProductFacets };
