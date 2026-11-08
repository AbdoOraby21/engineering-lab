import type { WishlistItemDto } from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { productCardInclude, type ProductCardSource } from './catalog/includes.js';
import { toProductCard } from './catalog/serializers.js';
import { publicProductWhereAsync } from './catalog/visibility.js';

type WishlistRow = {
  id: string;
  createdAt: Date;
  product: ProductCardSource;
};

function toWishlistDto(row: WishlistRow): WishlistItemDto {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    product: toProductCard(row.product),
  };
}

export async function listWishlist(userId: string): Promise<WishlistItemDto[]> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId, product: { is: await publicProductWhereAsync() } },
    orderBy: { createdAt: 'desc' },
    include: { product: { include: productCardInclude } },
  });
  return items.map(toWishlistDto);
}

export async function addWishlistItem(userId: string, productId: string): Promise<WishlistItemDto> {
  const product = await prisma.product.findFirst({
    where: { id: productId, ...(await publicProductWhereAsync()) },
    select: { id: true },
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
    include: { product: { include: productCardInclude } },
  });

  return toWishlistDto(item);
}

export async function removeWishlistItem(userId: string, productId: string): Promise<void> {
  await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
}
