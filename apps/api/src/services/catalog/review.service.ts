import { Prisma } from '@prisma/client';
import type {
  CreateReviewInput,
  ReviewListQuery,
  ReviewListResult,
  ReviewSummaryDto,
  ReviewStatus,
  UpdateReviewInput,
} from '@engineering-lab/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import { env } from '../../config/env.js';
import { sanitizePlainText } from '../../utils/sanitize.js';
import { paginationMeta } from '../../utils/pagination.js';
import { toAbsoluteUrl } from './serializers.js';
import { toReviewDto } from './serializers.js';
import { purchaseVerifier } from '../purchase-verifier.js';
import { publicProductWhereAsync } from './visibility.js';
import { invalidateCatalogCache } from '../../utils/cache.js';

const reviewInclude = { user: { select: { id: true, name: true } } } satisfies Prisma.ReviewInclude;

export async function getRatingSummary(productId: string): Promise<ReviewSummaryDto> {
  const grouped = await prisma.review.groupBy({
    by: ['rating'],
    where: { productId, status: 'APPROVED' },
    _count: { _all: true },
  });

  const distribution: ReviewSummaryDto['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  let ratingCount = 0;
  for (const row of grouped) {
    if (row.rating >= 1 && row.rating <= 5) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count._all;
      ratingSum += row.rating * row._count._all;
      ratingCount += row._count._all;
    }
  }

  return {
    average: ratingCount === 0 ? 0 : Number((ratingSum / ratingCount).toFixed(2)),
    count: ratingCount,
    distribution,
  };
}

async function recomputeProductRating(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<void> {
  const aggregates = await tx.review.aggregate({
    where: { productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const count = aggregates._count._all;
  const average = count === 0 ? 0 : Number((aggregates._avg.rating ?? 0).toFixed(2));

  await tx.product.update({
    where: { id: productId },
    data: { ratingAverage: average, ratingCount: count },
  });
}

export async function listProductReviews(
  slug: string,
  query: ReviewListQuery,
): Promise<ReviewListResult> {
  const product = await prisma.product.findFirst({
    where: { slug, ...(await publicProductWhereAsync()) },
    select: { id: true },
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const where = { productId: product.id, status: 'APPROVED' as ReviewStatus };
  const offset = (query.page - 1) * query.pageSize;

  const [total, reviews, summary] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: query.pageSize,
    }),
    getRatingSummary(product.id),
  ]);

  return {
    reviews: reviews.map(toReviewDto),
    pagination: paginationMeta(query.page, query.pageSize, total),
    summary,
  };
}

export async function createReview(
  userId: string,
  slug: string,
  input: CreateReviewInput,
) {
  const product = await prisma.product.findFirst({
    where: { slug, ...(await publicProductWhereAsync()) },
    select: { id: true },
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const canReview = await purchaseVerifier.canReview(userId, product.id);
  if (!canReview) {
    throw new AppError(
      403,
      ErrorCodes.PURCHASE_REQUIRED,
      'You can only review products you have purchased and received',
    );
  }

  try {
    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId,
        rating: input.rating,
        title: input.title ? sanitizePlainText(input.title) : null,
        comment: sanitizePlainText(input.comment),
        status: 'PENDING',
        isVerifiedPurchase: env.REVIEWS_REQUIRE_PURCHASE,
      },
      include: reviewInclude,
    });
    return toReviewDto(review);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw AppError.conflict(
        'You have already reviewed this product',
        ErrorCodes.REVIEW_ALREADY_EXISTS,
      );
    }
    throw error;
  }
}

async function findOwnReview(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: reviewInclude,
  });
  if (!review) {
    throw AppError.notFound('Review not found', ErrorCodes.REVIEW_NOT_FOUND);
  }
  if (review.userId !== userId) {
    throw AppError.forbidden('You can only modify your own reviews');
  }
  return review;
}

export async function updateReview(userId: string, reviewId: string, input: UpdateReviewInput) {
  const existing = await findOwnReview(userId, reviewId);

  const review = await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id: existing.id },
      data: {
        ...(input.rating === undefined ? {} : { rating: input.rating }),
        ...(input.title === undefined ? {} : { title: sanitizePlainText(input.title) }),
        ...(input.comment === undefined ? {} : { comment: sanitizePlainText(input.comment) }),
        status: 'PENDING',
      },
      include: reviewInclude,
    });
    if (existing.status === 'APPROVED') {
      await recomputeProductRating(tx, existing.productId);
    }
    return updated;
  });

  invalidateCatalogCache();
  return toReviewDto(review);
}

export async function deleteReview(userId: string, reviewId: string) {
  const existing = await findOwnReview(userId, reviewId);

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: existing.id } });
    if (existing.status === 'APPROVED') {
      await recomputeProductRating(tx, existing.productId);
    }
  });

  invalidateCatalogCache();
}

export async function moderateReview(
  reviewId: string,
  action: 'approve' | 'reject' | 'delete',
) {
  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true, status: true },
  });
  if (!existing) {
    throw AppError.notFound('Review not found', ErrorCodes.REVIEW_NOT_FOUND);
  }

  if (action === 'delete') {
    await prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: existing.id } });
      if (existing.status === 'APPROVED') {
        await recomputeProductRating(tx, existing.productId);
      }
    });
    invalidateCatalogCache();
    return { id: existing.id, deleted: true };
  }

  const status: ReviewStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const updated = await prisma.$transaction(async (tx) => {
    const review = await tx.review.update({
      where: { id: existing.id },
      data: { status },
      include: reviewInclude,
    });
    if (existing.status === 'APPROVED' || status === 'APPROVED') {
      await recomputeProductRating(tx, existing.productId);
    }
    return review;
  });

  invalidateCatalogCache();
  return toReviewDto(updated);
}

export async function listAdminReviews(query: { status?: ReviewStatus; page: number; pageSize: number }) {
  const where = query.status ? { status: query.status } : {};
  const offset = (query.page - 1) * query.pageSize;

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      include: {
        ...reviewInclude,
        product: {
          select: {
            id: true,
            slug: true,
            sku: true,
            nameAr: true,
            nameEn: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: query.pageSize,
    }),
  ]);

  return {
    reviews: reviews.map((review) => ({
      ...toReviewDto(review),
      product: {
        id: review.product.id,
        slug: review.product.slug,
        sku: review.product.sku,
        nameAr: review.product.nameAr,
        nameEn: review.product.nameEn,
        primaryImageUrl: toAbsoluteUrl(review.product.images[0]?.url ?? null),
      },
    })),
    pagination: paginationMeta(query.page, query.pageSize, total),
  };
}
