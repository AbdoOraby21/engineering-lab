import type { OrderStatus } from '@engineering-lab/shared';
import { prisma } from '../../lib/prisma.js';

const PAID_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'] as OrderStatus[];

interface DateRange {
  from?: Date;
  to?: Date;
}

function rangeWhere(range: DateRange): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (range.from) where.createdAt = { gte: range.from };
  if (range.to) {
    where.createdAt = { ...(where.createdAt as Record<string, unknown>), lte: range.to };
  }
  return where;
}

export async function getStatsOverview(from?: Date, to?: Date) {
  const range: DateRange = {};
  if (from) range.from = from;
  if (to) range.to = to;
  const where = rangeWhere(range);

  const [
    totalOrders,
    paidOrders,
    revenue,
    newCustomers,
    pendingProofs,
    lowStock,
    openTickets,
    newContacts,
    ordersByStatus,
  ] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, status: { in: PAID_STATUSES } } }),
    prisma.order.aggregate({
      where: { ...where, status: { in: PAID_STATUSES } },
      _sum: { total: true },
    }),
    prisma.user.count({ where: { ...where, role: 'CUSTOMER' } }),
    prisma.paymentProof.count({ where: { status: 'SUBMITTED' } }),
    prisma.product.count({
      where: { isActive: true, stock: { lte: prisma.product.fields.lowStockThreshold } },
    }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.contactMessage.count({ where }),
    prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),
  ]);

  const sum = revenue._sum?.total ?? 0;
  const aov = paidOrders > 0 ? Number(sum / paidOrders) : 0;

  return {
    totalOrders,
    paidOrders,
    revenue: sum,
    averageOrderValue: aov,
    newCustomers,
    pendingProofs,
    lowStock,
    openTickets,
    newContacts,
    ordersByStatus: ordersByStatus.map((row) => ({ status: row.status, count: row._count.status })),
  };
}

export async function getRevenueOverTime(from: Date, to: Date, interval: 'day' | 'week' | 'month') {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: PAID_STATUSES },
      createdAt: { gte: from, lte: to },
    },
    select: { createdAt: true, total: true },
  });

  const bucket = (d: Date): string => {
    const date = new Date(d);
    if (interval === 'day') {
      return date.toISOString().slice(0, 10);
    }
    if (interval === 'week') {
      const day = date.getUTCDay();
      const start = new Date(date);
      start.setUTCDate(date.getUTCDate() - day);
      return start.toISOString().slice(0, 10);
    }
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const map = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const key = bucket(o.createdAt);
    const cur = map.get(key) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    map.set(key, cur);
  }

  return [...map.entries()].map(([key, value]) => ({ date: key, ...value }));
}

export async function getTopProducts(limit = 10, from?: Date, to?: Date) {
  const where: Record<string, unknown> = { order: { status: { in: PAID_STATUSES } } };
  if (from || to) {
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;
    where.order = { ...(where.order as object), createdAt: dateFilter };
  }

  const items = await prisma.orderItem.groupBy({
    by: ['productId'],
    where,
    _sum: { qty: true },
    _count: { productId: true },
    orderBy: { _sum: { qty: 'desc' } },
    take: limit,
  });

  const ids = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, sku: true, nameAr: true, nameEn: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return items.map((i) => {
    const p = byId.get(i.productId)!;
    return {
      productId: p.id,
      sku: p.sku,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      qty: Number(i._sum.qty ?? 0),
      orders: Number(i._count.productId ?? 0),
    };
  });
}
