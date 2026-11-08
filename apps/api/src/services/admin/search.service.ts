import { prisma } from '../../lib/prisma.js';

export interface SearchResult {
  type: 'order' | 'product' | 'customer';
  id: string;
  label: string;
  subtitle: string;
  url: string;
}

export async function globalSearch(q: string): Promise<SearchResult[]> {
  const [orders, products, customers] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { contactName: { contains: q, mode: 'insensitive' } },
          { contactPhone: { contains: q } },
          { contactEmail: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, orderNumber: true, contactName: true, total: true, status: true },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { nameAr: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q } },
        ],
      },
      take: 5,
      select: { id: true, nameAr: true, nameEn: true, sku: true, slug: true },
    }),
    prisma.user.findMany({
      where: { role: 'CUSTOMER', OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] },
      take: 5,
      select: { id: true, name: true, email: true },
    }),
  ]);

  const results: SearchResult[] = [];
  for (const o of orders) {
    results.push({
      type: 'order',
      id: o.id,
      label: o.orderNumber,
      subtitle: `${o.contactName} · ${o.total} EGP · ${o.status}`,
      url: `/admin/orders/${o.id}`,
    });
  }
  for (const p of products) {
    results.push({
      type: 'product',
      id: p.id,
      label: p.nameEn || p.nameAr,
      subtitle: `${p.sku} · ${p.slug}`,
      url: `/admin/products/${p.id}`,
    });
  }
  for (const c of customers) {
    results.push({
      type: 'customer',
      id: c.id,
      label: c.name,
      subtitle: c.email,
      url: `/admin/customers/${c.id}`,
    });
  }
  return results.slice(0, 12);
}
