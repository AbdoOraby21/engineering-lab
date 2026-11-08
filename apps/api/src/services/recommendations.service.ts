import { OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

export interface CoPurchaseItem {
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  price: number;
  stock: number;
  isActive: boolean;
  coPurchaseCount: number;
  primaryImage: string | null;
}

export async function getCoPurchaseProducts(
  productId: string,
  limit = 8,
): Promise<CoPurchaseItem[]> {
  // Find orders that contain this product (confirmed/delivered/paid statuses)
  const paidStatuses: OrderStatus[] = [
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'REFUNDED',
  ];

  const coOrdered = await prisma.orderItem.findMany({
    where: {
      productId,
      order: { status: { in: paidStatuses } },
    },
    select: { orderId: true },
    take: 500,
  });

  const orderIds = coOrdered.map((oi) => oi.orderId);
  if (orderIds.length === 0) {
    return [];
  }

  // Find other items in those orders
  const otherItems = await prisma.orderItem.findMany({
    where: {
      orderId: { in: orderIds },
      productId: { not: productId },
    },
    select: { productId: true },
  });

  // Count co-occurrence
  const counts = new Map<string, number>();
  for (const item of otherItems) {
    counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1);
  }

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pid]) => pid);

  const products = await prisma.product.findMany({
    where: { id: { in: sorted }, isActive: true },
    select: {
      id: true,
      slug: true,
      sku: true,
      nameAr: true,
      nameEn: true,
      price: true,
      stock: true,
      isActive: true,
      images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  return sorted
    .map((pid) => byId.get(pid))
    .filter(Boolean)
    .map((p) => ({
      productId: p!.id,
      sku: p!.sku,
      nameAr: p!.nameAr,
      nameEn: p!.nameEn,
      price: p!.price,
      stock: p!.stock,
      isActive: p!.isActive,
      coPurchaseCount: counts.get(p!.id) ?? 0,
      primaryImage: p!.images[0]?.url ?? null,
    }));
}

export interface PopularSearch {
  query: string;
  count: number;
}

export async function logSearchQuery(query: string, resultsCount: number) {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }
  await prisma.searchQueryLog.create({
    data: { query: trimmed, resultsCount },
  });
}

export async function getPopularSearches(limit = 10): Promise<PopularSearch[]> {
  const logs = await prisma.searchQueryLog.findMany({
    take: 1000,
    orderBy: { createdAt: 'desc' },
    select: { query: true },
  });
  const counts = new Map<string, number>();
  for (const log of logs) {
    counts.set(log.query, (counts.get(log.query) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getZeroResultSearches(limit = 10): Promise<PopularSearch[]> {
  const logs = await prisma.searchQueryLog.findMany({
    where: { resultsCount: 0 },
    take: 1000,
    orderBy: { createdAt: 'desc' },
    select: { query: true },
  });
  const counts = new Map<string, number>();
  for (const log of logs) {
    counts.set(log.query, (counts.get(log.query) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Back-in-stock subscriptions

export async function subscribeBackInStock(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.NOT_FOUND);
  }
  if (product.stock > 0) {
    throw AppError.badRequest('Product is already in stock', ErrorCodes.VALIDATION_ERROR);
  }

  const existing = await prisma.backInStockSubscription.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    return { alreadySubscribed: true };
  }

  await prisma.backInStockSubscription.create({
    data: { userId, productId },
  });
  return { subscribed: true };
}

export async function getBackInStockSubscriptions(productId: string) {
  return prisma.backInStockSubscription.findMany({
    where: { productId, notifiedAt: null },
    include: { user: { select: { id: true, name: true, email: true, locale: true } } },
  });
}

export async function markBackInStockNotified(productId: string) {
  await prisma.backInStockSubscription.updateMany({
    where: { productId, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
}
