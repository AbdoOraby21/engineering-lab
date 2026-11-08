import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/jwt.js';
import { IMPORT_COLUMNS } from '../src/services/admin/import-export.service.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const adminBase = '/api/v1/admin';

interface Fixture {
  rootId: string;
  leafId: string;
  brandId: string;
  simpleId: string;
  simpleSlug: string;
  simple: { id: string; nameAr: string; nameEn: string; sku: string };
  componentId: string;
  componentSlug: string;
  bundleId: string;
  bundleSlug: string;
  variantProductId: string;
  variantProductSlug: string;
}

let fixture: Fixture;
let adminAuth: { Authorization: string };
let customerAuth: { Authorization: string };
let customer: { id: string; name: string; email: string; phone: string | null };

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

async function seedFixture(): Promise<Fixture> {
  const root = await prisma.category.create({
    data: { nameAr: 'جذر', nameEn: 'Root', slug: 'root', sortOrder: 1 },
  });
  const leaf = await prisma.category.create({
    data: {
      nameAr: 'ورقة',
      nameEn: 'Leaf',
      slug: 'leaf',
      parentId: root.id,
      sortOrder: 1,
    },
  });
  const brand = await prisma.brand.create({
    data: { nameAr: 'علامة', nameEn: 'Test Brand', slug: 'test-brand' },
  });

  const base = {
    descriptionAr: 'وصف تفصيلي',
    descriptionEn: 'Detailed description',
    categoryId: leaf.id,
    brandId: brand.id,
    tags: ['test'],
  };

  const simple = await prisma.product.create({
    data: {
      ...base,
      nameAr: 'لوحة اختبار أردوينو',
      nameEn: 'Arduino Test Board',
      slug: 'simple-product',
      sku: 'TST-001',
      price: 10000,
      compareAtPrice: 12000,
      stock: 10,
      isFeatured: true,
      specs: [{ keyAr: 'الجهد', keyEn: 'Voltage', valueAr: '5V', valueEn: '5V' }],
    },
  });
  const component = await prisma.product.create({
    data: {
      ...base,
      nameAr: 'مكون',
      nameEn: 'Component Part',
      slug: 'component-product',
      sku: 'TST-002',
      price: 500,
      stock: 3,
    },
  });
  const bundle = await prisma.product.create({
    data: {
      ...base,
      nameAr: 'حقيبة',
      nameEn: 'Test Bundle',
      slug: 'bundle-product',
      sku: 'TST-BUNDLE',
      price: 5000,
      stock: 0,
      type: 'BUNDLE',
    },
  });
  const variantProduct = await prisma.product.create({
    data: {
      ...base,
      nameAr: 'منتج بمتغيرات',
      nameEn: 'Variant Product',
      slug: 'variant-product',
      sku: 'TST-VAR',
      price: 3000,
      stock: 5,
    },
  });

  return {
    rootId: root.id,
    leafId: leaf.id,
    brandId: brand.id,
    simpleId: simple.id,
    simpleSlug: simple.slug,
    simple: { id: simple.id, nameAr: simple.nameAr, nameEn: simple.nameEn, sku: simple.sku },
    componentId: component.id,
    componentSlug: component.slug,
    bundleId: bundle.id,
    bundleSlug: bundle.slug,
    variantProductId: variantProduct.id,
    variantProductSlug: variantProduct.slug,
  };
}

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@test.local',
      passwordHash: 'hash',
      role: 'ADMIN',
    },
  });
  customer = await prisma.user.create({
    data: {
      name: 'Customer User',
      email: 'customer@test.local',
      passwordHash: 'hash',
      role: 'CUSTOMER',
    },
  });
  adminAuth = auth(signAccessToken(admin.id, 'ADMIN').token);
  customerAuth = auth(signAccessToken(customer.id, 'CUSTOMER').token);
});

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function importCsv(rows: Array<Partial<Record<(typeof IMPORT_COLUMNS)[number], string>>>): Buffer {
  const base: Record<(typeof IMPORT_COLUMNS)[number], string> = {
    sku: '',
    slug: '',
    nameAr: '',
    nameEn: '',
    shortDescriptionAr: '',
    shortDescriptionEn: '',
    descriptionAr: 'وصف',
    descriptionEn: 'Description',
    price: '1234',
    compareAtPrice: '',
    stock: '5',
    lowStockThreshold: '5',
    weightGrams: '',
    category: 'leaf',
    brand: '',
    tags: '',
    specs: '[]',
    isFeatured: 'false',
    isNew: 'true',
    isActive: 'true',
    type: 'SIMPLE',
  };
  const header = IMPORT_COLUMNS.join(',');
  const lines = rows.map((row) => {
    const values = { ...base, ...row };
    return IMPORT_COLUMNS.map((column) => csvEscape(values[column] ?? '')).join(',');
  });
  return Buffer.from([header, ...lines].join('\n'), 'utf8');
}

describe('admin authorization', () => {
  it('rejects anonymous and customer tokens on every admin surface', async () => {
    const anonymous = await request(app).get(`${adminBase}/products`);
    expect(anonymous.status).toBe(401);

    const asCustomer = await request(app).get(`${adminBase}/products`).set(customerAuth);
    expect(asCustomer.status).toBe(403);

    for (const path of [
      '/categories',
      '/brands',
      '/inventory/movements',
      '/reviews',
      '/banners',
      '/uploads/image',
    ]) {
      const response = await request(app).get(`${adminBase}${path}`).set(customerAuth);
      expect(response.status, path).toBe(403);
    }
  });
});

describe('admin categories and brands', () => {
  it('creates, reorders, toggles and protects categories', async () => {
    const created = await request(app)
      .post(`${adminBase}/categories`)
      .set(adminAuth)
      .send({ nameAr: 'فئة جديدة', nameEn: 'New Category', slug: 'new-category', parentId: fixture.rootId });
    expect(created.status).toBe(201);
    const categoryId = (created.body as { data: { category: { id: string } } }).data.category.id;

    const reorder = await request(app)
      .patch(`${adminBase}/categories/reorder`)
      .set(adminAuth)
      .send({ parentId: fixture.rootId, orderedIds: [categoryId] });
    expect(reorder.status).toBe(200);

    const blocked = await request(app)
      .delete(`${adminBase}/categories/${fixture.rootId}`)
      .set(adminAuth);
    expect(blocked.status).toBe(409);

    const disabled = await request(app)
      .patch(`${adminBase}/categories/${categoryId}/toggle-active`)
      .set(adminAuth)
      .send({ value: false });
    expect(disabled.status).toBe(200);

    const tree = await request(app).get('/api/v1/categories/tree');
    const roots = (tree.body as { data: { categories: Array<{ slug: string; children: Array<{ slug: string }> }> } })
      .data.categories;
    const root = roots.find((entry) => entry.slug === 'root');
    expect(root?.children.map((child) => child.slug)).not.toContain('new-category');
  });

  it('creates and updates a brand', async () => {
    const created = await request(app)
      .post(`${adminBase}/brands`)
      .set(adminAuth)
      .send({ nameAr: 'علامة جديدة', nameEn: 'New Brand', slug: 'new-brand' });
    expect(created.status).toBe(201);
    const brandId = (created.body as { data: { brand: { id: string } } }).data.brand.id;

    const updated = await request(app)
      .patch(`${adminBase}/brands/${brandId}`)
      .set(adminAuth)
      .send({ nameEn: 'Renamed Brand' });
    expect(updated.status).toBe(200);
    expect((updated.body as { data: { brand: { nameEn: string } } }).data.brand.nameEn).toBe(
      'Renamed Brand',
    );
  });
});

describe('admin products', () => {
  it('enforces leaf categories and compareAtPrice rules, and records initial stock', async () => {
    const payload = {
      nameAr: 'منتج إداري',
      nameEn: 'Admin Product',
      sku: 'ADM-001',
      descriptionAr: 'وصف',
      descriptionEn: 'Description',
      price: 20000,
      stock: 7,
    };

    const rootCategory = await request(app)
      .post(`${adminBase}/products`)
      .set(adminAuth)
      .send({ ...payload, categoryId: fixture.rootId });
    expect(rootCategory.status).toBe(422);

    const badCompare = await request(app)
      .post(`${adminBase}/products`)
      .set(adminAuth)
      .send({ ...payload, categoryId: fixture.leafId, compareAtPrice: 20000 });
    expect(badCompare.status).toBe(422);

    const created = await request(app)
      .post(`${adminBase}/products`)
      .set(adminAuth)
      .send({ ...payload, categoryId: fixture.leafId, compareAtPrice: 25000 });
    expect(created.status).toBe(201);
    const productId = (created.body as { data: { product: { id: string } } }).data.product.id;

    const movements = await request(app)
      .get(`${adminBase}/inventory/movements?productId=${productId}`)
      .set(adminAuth);
    const rows = (movements.body as { data: { movements: Array<{ delta: number; reason: string }> } }).data
      .movements;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ delta: 7, reason: 'INITIAL' });
  });

  it('enforces variant/bundle exclusivity and computes bundle availability', async () => {
    const variant = await request(app)
      .post(`${adminBase}/products/${fixture.variantProductId}/variants`)
      .set(adminAuth)
      .send({
        nameAr: 'أحمر',
        nameEn: 'Red',
        sku: 'TST-VAR-RED',
        priceDelta: 0,
        stock: 4,
      });
    expect(variant.status).toBe(201);

    const convert = await request(app)
      .patch(`${adminBase}/products/${fixture.variantProductId}`)
      .set(adminAuth)
      .send({ type: 'BUNDLE' });
    expect(convert.status).toBe(422);

    const variantOnBundle = await request(app)
      .post(`${adminBase}/products/${fixture.bundleId}/variants`)
      .set(adminAuth)
      .send({ nameAr: 'أ', nameEn: 'A', sku: 'TST-BUNDLE-V', stock: 1 });
    expect(variantOnBundle.status).toBe(422);

    const items = await request(app)
      .put(`${adminBase}/products/${fixture.bundleId}/bundle-items`)
      .set(adminAuth)
      .send({ items: [{ componentId: fixture.componentId, quantity: 2 }] });
    expect(items.status).toBe(200);

    const detail = await request(app).get(`/api/v1/products/${fixture.bundleSlug}`);
    expect(
      (detail.body as { data: { product: { availableStock: number } } }).data.product.availableStock,
    ).toBe(1);

    const adjust = await request(app)
      .post(`${adminBase}/products/${fixture.componentId}/stock-adjustments`)
      .set(adminAuth)
      .send({ delta: 3, reason: 'MANUAL_ADJUSTMENT' });
    expect(adjust.status).toBe(200);

    const afterAdjust = await request(app).get(`/api/v1/products/${fixture.bundleSlug}`);
    expect(
      (afterAdjust.body as { data: { product: { availableStock: number } } }).data.product
        .availableStock,
    ).toBe(3);

    const nestedBundle = await request(app)
      .put(`${adminBase}/products/${fixture.bundleId}/bundle-items`)
      .set(adminAuth)
      .send({ items: [{ componentId: fixture.bundleId, quantity: 1 }] });
    expect(nestedBundle.status).toBe(422);
  });
});

describe('inventory service', () => {
  it('never allows negative stock and writes a movement per change', async () => {
    await prisma.product.update({ where: { id: fixture.componentId }, data: { stock: 5 } });

    const overdraw = await request(app)
      .post(`${adminBase}/products/${fixture.componentId}/stock-adjustments`)
      .set(adminAuth)
      .send({ delta: -6, reason: 'MANUAL_ADJUSTMENT' });
    expect(overdraw.status).toBe(409);

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post(`${adminBase}/products/${fixture.componentId}/stock-adjustments`)
          .set(adminAuth)
          .send({ delta: -1, reason: 'MANUAL_ADJUSTMENT' }),
      ),
    );
    expect(results.filter((response) => response.status === 200)).toHaveLength(5);
    expect(results.filter((response) => response.status === 409)).toHaveLength(5);

    const product = await prisma.product.findUnique({ where: { id: fixture.componentId } });
    expect(product?.stock).toBe(0);

    const movements = await prisma.stockMovement.count({
      where: { productId: fixture.componentId, delta: -1 },
    });
    expect(movements).toBe(5);

    const lowStock = await request(app)
      .get(`${adminBase}/inventory/low-stock`)
      .set(adminAuth);
    expect(lowStock.status).toBe(200);
    const lowStockIds = (
      lowStock.body as { data: { items: Array<{ productId: string; stock: number }> } }
    ).data.items;
    expect(lowStockIds.some((item) => item.productId === fixture.componentId)).toBe(true);
  });
});

describe('product import/export', () => {
  it('serves a template and reports dry-run validation errors with row numbers', async () => {
    const template = await request(app)
      .get(`${adminBase}/products/import/template`)
      .set(adminAuth);
    expect(template.status).toBe(200);
    expect(template.headers['content-type']).toContain('text/csv');
    expect(template.text).toContain('sku');

    const csv = importCsv([
      { sku: 'IMP-1', slug: 'import-one', nameAr: 'مستورد', nameEn: 'Imported Product' },
      { sku: 'IMP-2', slug: 'import-two', nameAr: 'خطأ', nameEn: 'Broken Row', price: '' },
    ]);

    const dryRun = await request(app)
      .post(`${adminBase}/products/import?dryRun=true`)
      .set(adminAuth)
      .attach('file', csv, 'products.csv');
    expect(dryRun.status).toBe(200);
    const report = (dryRun.body as {
      data: {
        report: {
          total: number;
          valid: number;
          invalid: number;
          rows: Array<{ row: number; sku: string; errors: string[] }>;
        };
      };
    }).data.report;
    expect(report).toMatchObject({ total: 2, valid: 1, invalid: 1 });
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ row: 3, sku: 'IMP-2' });
    expect(report.rows[0]?.errors.join(' ')).toContain('price');

    const existing = await prisma.product.findUnique({ where: { sku: 'IMP-1' } });
    expect(existing).toBeNull();
  });

  it('upserts by SKU and writes IMPORT movements', async () => {
    const csv = importCsv([
      {
        sku: 'IMP-1',
        slug: 'import-one',
        nameAr: 'مستورد',
        nameEn: 'Imported Product',
        stock: '5',
      },
    ]);

    const created = await request(app)
      .post(`${adminBase}/products/import?dryRun=false`)
      .set(adminAuth)
      .attach('file', csv, 'products.csv');
    expect(created.status).toBe(200);
    expect((created.body as { data: { report: { created: number } } }).data.report.created).toBe(1);

    const product = await prisma.product.findUnique({ where: { sku: 'IMP-1' } });
    expect(product?.stock).toBe(5);
    const initialMovements = await prisma.stockMovement.findMany({
      where: { productId: product!.id, reason: 'IMPORT' },
    });
    expect(initialMovements).toHaveLength(1);
    expect(initialMovements[0]?.delta).toBe(5);

    const updatedCsv = importCsv([
      {
        sku: 'IMP-1',
        slug: 'import-one',
        nameAr: 'مستورد',
        nameEn: 'Imported Product',
        stock: '9',
      },
    ]);
    const updated = await request(app)
      .post(`${adminBase}/products/import?dryRun=false`)
      .set(adminAuth)
      .attach('file', updatedCsv, 'products.csv');
    expect(updated.status).toBe(200);
    expect((updated.body as { data: { report: { updated: number } } }).data.report.updated).toBe(1);

    const refreshed = await prisma.product.findUnique({ where: { sku: 'IMP-1' } });
    expect(refreshed?.stock).toBe(9);
    const movements = await prisma.stockMovement.findMany({
      where: { productId: product!.id, reason: 'IMPORT' },
      orderBy: { createdAt: 'asc' },
    });
    expect(movements.map((movement) => movement.delta)).toEqual([5, 4]);
  });
});

describe('review moderation', () => {
  it('keeps reviews pending until approved and recomputes rating aggregates', async () => {
    // Seed a delivered order so the purchase-verifier allows the review.
    const order = await prisma.order.create({
      data: {
        orderNumber: 'EL-2026-000001',
        userId: customer.id,
        status: 'DELIVERED',
        paymentMethod: 'COD',
        addressSnapshot: { governorate: 'القاهرة', city: 'Cairo' },
        contactName: customer.name,
        contactPhone: customer.phone ?? '',
        contactEmail: customer.email,
        subtotal: 10000,
        discountTotal: 0,
        shippingFee: 0,
        total: 10000,
        deliveredAt: new Date(),
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: fixture.simpleId,
        qty: 1,
        nameAr: fixture.simple.nameAr,
        nameEn: fixture.simple.nameEn,
        sku: fixture.simple.sku,
        imageUrl: null,
        unitPrice: 10000,
        lineTotal: 10000,
        isBundle: false,
      },
    });

    const created = await request(app)
      .post(`/api/v1/products/${fixture.simpleSlug}/reviews`)
      .set(customerAuth)
      .send({ rating: 5, title: 'Excellent', comment: 'Works perfectly' });
    expect(created.status).toBe(201);
    const reviewId = (created.body as { data: { review: { id: string; status: string } } }).data.review
      .id;
    expect((created.body as { data: { review: { status: string } } }).data.review.status).toBe(
      'PENDING',
    );

    const duplicate = await request(app)
      .post(`/api/v1/products/${fixture.simpleSlug}/reviews`)
      .set(customerAuth)
      .send({ rating: 4, comment: 'Second attempt' });
    expect(duplicate.status).toBe(409);

    const publicBefore = await request(app).get(
      `/api/v1/products/${fixture.simpleSlug}/reviews`,
    );
    expect(
      (publicBefore.body as { data: { pagination: { total: number } } }).data.pagination.total,
    ).toBe(0);

    const approved = await request(app)
      .post(`${adminBase}/reviews/${reviewId}/approve`)
      .set(adminAuth);
    expect(approved.status).toBe(200);

    const detail = await request(app).get(`/api/v1/products/${fixture.simpleSlug}`);
    const product = (
      detail.body as {
        data: {
          product: {
            ratingAverage: number;
            ratingCount: number;
            ratingSummary: { average: number; count: number };
          };
        };
      }
    ).data.product;
    expect(product.ratingAverage).toBe(5);
    expect(product.ratingCount).toBe(1);
    expect(product.ratingSummary).toMatchObject({ average: 5, count: 1 });

    const rejected = await request(app)
      .post(`${adminBase}/reviews/${reviewId}/reject`)
      .set(adminAuth);
    expect(rejected.status).toBe(200);

    const afterReject = await request(app).get(`/api/v1/products/${fixture.simpleSlug}`);
    expect(
      (afterReject.body as { data: { product: { ratingAverage: number; ratingCount: number } } }).data
        .product,
    ).toMatchObject({ ratingAverage: 0, ratingCount: 0 });
  });
});

describe('public API aliases and deep category visibility', () => {
  it('answers on the spec paths', async () => {
    const tree = await request(app).get('/api/v1/categories/tree');
    expect(tree.status).toBe(200);

    const brands = await request(app).get('/api/v1/brands');
    expect(brands.status).toBe(200);

    const products = await request(app).get('/api/v1/products?q=arduino');
    expect(products.status).toBe(200);
    expect(
      (products.body as { data: { items: Array<{ slug: string }> } }).data.items.map(
        (item) => item.slug,
      ),
    ).toContain('simple-product');

    const byCategoryName = await request(app).get('/api/v1/products?q=leaf');
    expect(
      (byCategoryName.body as { data: { items: Array<{ slug: string }> } }).data.items.map(
        (item) => item.slug,
      ),
    ).toContain('simple-product');

    const suggest = await request(app).get('/api/v1/search/suggest?q=ard');
    expect(suggest.status).toBe(200);
    expect(
      (suggest.body as { data: { suggestions: Array<{ slug: string }> } }).data.suggestions.length,
    ).toBeGreaterThan(0);

    const featured = await request(app).get('/api/v1/products/lists/featured');
    expect(featured.status).toBe(200);
    expect(
      (featured.body as { data: { products: Array<{ slug: string }> } }).data.products.map(
        (product) => product.slug,
      ),
    ).toContain('simple-product');

    const wishlist = await request(app)
      .post(`/api/v1/wishlist/${fixture.simpleId}`)
      .set(customerAuth);
    expect(wishlist.status).toBe(201);

    const banners = await request(app).get('/api/v1/banners');
    expect(banners.status).toBe(200);
  });

  it('hides products when any ancestor category is inactive', async () => {
    const grandparent = await prisma.category.create({
      data: { nameAr: 'جد', nameEn: 'Grandparent', slug: 'grandparent', isActive: false },
    });
    const parent = await prisma.category.create({
      data: {
        nameAr: 'أب',
        nameEn: 'Parent',
        slug: 'parent',
        parentId: grandparent.id,
      },
    });
    const child = await prisma.category.create({
      data: {
        nameAr: 'ابن',
        nameEn: 'Child',
        slug: 'child',
        parentId: parent.id,
      },
    });
    const hidden = await prisma.product.create({
      data: {
        nameAr: 'منتج مخفي بعمق',
        nameEn: 'Deeply Hidden Product',
        slug: 'deeply-hidden',
        sku: 'HID-DEEP',
        descriptionAr: 'وصف',
        descriptionEn: 'Description',
        price: 100,
        stock: 1,
        categoryId: child.id,
      },
    });

    const list = await request(app).get('/api/v1/products?pageSize=48');
    expect(
      (list.body as { data: { items: Array<{ id: string }> } }).data.items.map((item) => item.id),
    ).not.toContain(hidden.id);

    const detail = await request(app).get('/api/v1/products/deeply-hidden');
    expect(detail.status).toBe(404);

    const reviewRead = await request(app).get('/api/v1/products/deeply-hidden/reviews');
    expect(reviewRead.status).toBe(404);
  });
});
