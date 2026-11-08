import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const base = '/api/v1/catalog';

interface CatalogFixture {
  rootId: string;
  arduinoId: string;
  sensorsId: string;
  brandId: string;
  unoId: string;
  nanoId: string;
  sensorProductId: string;
  bundleId: string;
  hiddenId: string;
}

interface ProductCardBody {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  price: number;
  stock: number;
  isFeatured: boolean;
  primaryImage: { url: string } | null;
}

interface ProductListBody {
  data: {
    items: ProductCardBody[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  };
}

let fixture: CatalogFixture;

async function seedCatalogFixture(): Promise<CatalogFixture> {
  const root = await prisma.category.create({
    data: {
      nameAr: 'المتحكمات',
      nameEn: 'Microcontrollers',
      slug: 'microcontrollers',
      sortOrder: 1,
    },
  });
  const arduino = await prisma.category.create({
    data: {
      nameAr: 'لوحات أردوينو',
      nameEn: 'Arduino Boards',
      slug: 'arduino',
      parentId: root.id,
      sortOrder: 1,
    },
  });
  const sensors = await prisma.category.create({
    data: {
      nameAr: 'الحساسات',
      nameEn: 'Sensors',
      slug: 'sensors',
      sortOrder: 2,
    },
  });
  const brand = await prisma.brand.create({
    data: {
      nameAr: 'أردوينو',
      nameEn: 'Arduino',
      slug: 'arduino-brand',
    },
  });

  const baseProduct = {
    descriptionAr: 'وصف تفصيلي للمنتج',
    descriptionEn: 'Detailed product description',
    tags: ['test'],
    specs: [
      { keyAr: 'الجهد', keyEn: 'Voltage', valueAr: '5 فولت', valueEn: '5V' },
    ],
  };

  const uno = await prisma.product.create({
    data: {
      ...baseProduct,
      nameAr: 'أردوينو أونو R3',
      nameEn: 'Arduino UNO R3',
      slug: 'arduino-uno-r3',
      sku: 'EL-UNO-001',
      price: 95000,
      compareAtPrice: 110000,
      stock: 10,
      categoryId: arduino.id,
      brandId: brand.id,
      isFeatured: true,
      ratingAverage: 4.8,
      ratingCount: 20,
      soldCount: 100,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    },
  });

  const nano = await prisma.product.create({
    data: {
      ...baseProduct,
      nameAr: 'أردوينو نانو',
      nameEn: 'Arduino Nano',
      slug: 'arduino-nano',
      sku: 'EL-NANO-001',
      price: 65000,
      stock: 0,
      categoryId: arduino.id,
      brandId: brand.id,
      ratingAverage: 4.2,
      ratingCount: 8,
      soldCount: 45,
      createdAt: new Date('2025-02-01T00:00:00Z'),
    },
  });

  const sensor = await prisma.product.create({
    data: {
      ...baseProduct,
      nameAr: 'حساس الموجات فوق الصوتية HC-SR04',
      nameEn: 'HC-SR04 Ultrasonic Sensor',
      slug: 'hc-sr04',
      sku: 'EL-SEN-001',
      price: 3500,
      stock: 20,
      categoryId: sensors.id,
      isFeatured: true,
      ratingAverage: 4.5,
      ratingCount: 12,
      soldCount: 200,
      createdAt: new Date('2025-03-01T00:00:00Z'),
    },
  });

  const bundle = await prisma.product.create({
    data: {
      ...baseProduct,
      nameAr: 'حقيبة بداية أردوينو',
      nameEn: 'Arduino Starter Kit',
      slug: 'arduino-starter-kit',
      sku: 'EL-KIT-001',
      price: 150000,
      compareAtPrice: 170000,
      stock: 5,
      categoryId: arduino.id,
      type: 'BUNDLE',
      ratingAverage: 5,
      ratingCount: 4,
      soldCount: 10,
      createdAt: new Date('2025-04-01T00:00:00Z'),
    },
  });

  const hidden = await prisma.product.create({
    data: {
      ...baseProduct,
      nameAr: 'منتج مخفي',
      nameEn: 'Hidden Product',
      slug: 'hidden-product',
      sku: 'EL-HID-001',
      price: 1000,
      stock: 10,
      categoryId: sensors.id,
      isActive: false,
      createdAt: new Date('2025-05-01T00:00:00Z'),
    },
  });

  await prisma.productImage.createMany({
    data: [
      {
        productId: uno.id,
        url: '/uploads/products/arduino-uno-r3.svg',
        altAr: 'أردوينو أونو',
        altEn: 'Arduino UNO',
        sortOrder: 0,
      },
      {
        productId: uno.id,
        url: '/uploads/products/arduino-uno-r3-alt.svg',
        altAr: 'أردوينو أونو - صورة إضافية',
        altEn: 'Arduino UNO - alternate view',
        sortOrder: 1,
      },
    ],
  });

  await prisma.productVariant.create({
    data: {
      productId: uno.id,
      nameAr: 'نسخة أصلية',
      nameEn: 'Original',
      sku: 'EL-UNO-001-ORIG',
      priceDelta: 0,
      stock: 8,
    },
  });

  await prisma.bundleItem.createMany({
    data: [
      { bundleId: bundle.id, componentId: uno.id, quantity: 1 },
      { bundleId: bundle.id, componentId: nano.id, quantity: 1 },
    ],
  });

  return {
    rootId: root.id,
    arduinoId: arduino.id,
    sensorsId: sensors.id,
    brandId: brand.id,
    unoId: uno.id,
    nanoId: nano.id,
    sensorProductId: sensor.id,
    bundleId: bundle.id,
    hiddenId: hidden.id,
  };
}

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedCatalogFixture();
});

describe('catalog categories', () => {
  it('returns an active category tree with bilingual names and product counts', async () => {
    const response = await request(app).get(`${base}/categories`);
    expect(response.status).toBe(200);

    const categories = (response.body as { data: { categories: Array<Record<string, unknown>> } })
      .data.categories;
    expect(categories).toHaveLength(2);

    const root = categories.find((category) => category.slug === 'microcontrollers');
    expect(root).toBeDefined();
    expect(root?.productCount).toBe(0);
    const children = root?.children as Array<{ slug: string; productCount: number }>;
    expect(children).toHaveLength(1);
    expect(children[0]?.slug).toBe('arduino');
    expect(children[0]?.productCount).toBe(3);
  });

  it('returns a category with breadcrumb and 404 for unknown slugs', async () => {
    const response = await request(app).get(`${base}/categories/arduino`);
    expect(response.status).toBe(200);
    const category = (response.body as { data: { category: { breadcrumb: Array<{ slug: string }> } } })
      .data.category;
    expect(category.breadcrumb.map((entry) => entry.slug)).toEqual(['microcontrollers', 'arduino']);

    const missing = await request(app).get(`${base}/categories/does-not-exist`);
    expect(missing.status).toBe(404);
    expect((missing.body as { error: { code: string } }).error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('lists active brands with product counts', async () => {
    const response = await request(app).get(`${base}/brands`);
    expect(response.status).toBe(200);
    const brands = (response.body as { data: { brands: Array<{ slug: string; productCount: number }> } })
      .data.brands;
    expect(brands).toHaveLength(1);
    expect(brands[0]).toMatchObject({ slug: 'arduino-brand', productCount: 2 });
  });
});

describe('catalog product list', () => {
  it('paginates active products and sorts by price', async () => {
    const response = await request(app).get(`${base}/products?page=1&pageSize=2&sort=price_asc`);
    expect(response.status).toBe(200);

    const body = response.body as ProductListBody;
    expect(body.data.items).toHaveLength(2);
    expect(body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 2,
      total: 4,
      totalPages: 2,
    });
    expect(body.data.items.map((item) => item.price)).toEqual([3500, 65000]);
  });

  it('filters by category descendants, brand, stock, price and sale status', async () => {
    const category = await request(app).get(`${base}/products?category=microcontrollers`);
    const categoryItems = (category.body as ProductListBody).data.items;
    expect(categoryItems.map((item) => item.slug).sort()).toEqual([
      'arduino-nano',
      'arduino-starter-kit',
      'arduino-uno-r3',
    ]);

    const inStock = await request(app).get(`${base}/products?category=microcontrollers&inStock=true`);
    expect((inStock.body as ProductListBody).data.items.map((item) => item.slug)).not.toContain(
      'arduino-nano',
    );

    const branded = await request(app).get(`${base}/products?brand=arduino-brand`);
    expect((branded.body as ProductListBody).data.pagination.total).toBe(2);

    const priced = await request(app).get(`${base}/products?minPrice=50000&maxPrice=100000`);
    expect((priced.body as ProductListBody).data.items.map((item) => item.slug)).toEqual([
      'arduino-nano',
      'arduino-uno-r3',
    ]);

    const onSale = await request(app).get(`${base}/products?onSale=true&sort=price_asc`);
    expect((onSale.body as ProductListBody).data.items.map((item) => item.slug)).toEqual([
      'arduino-uno-r3',
      'arduino-starter-kit',
    ]);

    const missingCategory = await request(app).get(`${base}/products?category=unknown`);
    expect((missingCategory.body as ProductListBody).data.items).toHaveLength(0);
  });

  it('searches Arabic, English, SKU and tolerates typos', async () => {
    const arabic = await request(app).get(`${base}/products?q=${encodeURIComponent('أردوينو')}`);
    expect((arabic.body as ProductListBody).data.items.map((item) => item.slug).sort()).toEqual([
      'arduino-nano',
      'arduino-starter-kit',
      'arduino-uno-r3',
    ]);

    const arabicWithoutHamza = await request(app).get(
      `${base}/products?q=${encodeURIComponent('اردوينو')}`,
    );
    expect(
      (arabicWithoutHamza.body as ProductListBody).data.items.map((item) => item.slug).sort(),
    ).toEqual(['arduino-nano', 'arduino-starter-kit', 'arduino-uno-r3']);

    const english = await request(app).get(`${base}/products?q=UNO`);
    expect((english.body as ProductListBody).data.items[0]?.slug).toBe('arduino-uno-r3');

    const sku = await request(app).get(`${base}/products?q=EL-SEN-001`);
    expect((sku.body as ProductListBody).data.items[0]?.slug).toBe('hc-sr04');

    const typo = await request(app).get(`${base}/products?q=Arduno`);
    expect((typo.body as ProductListBody).data.items.map((item) => item.slug)).toContain(
      'arduino-uno-r3',
    );
  });

  it('validates list query parameters', async () => {
    const invalidRange = await request(app).get(`${base}/products?minPrice=100&maxPrice=10`);
    expect(invalidRange.status).toBe(422);
    expect((invalidRange.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');

    const invalidSlug = await request(app).get(`${base}/products/Not_A_Slug`);
    expect(invalidSlug.status).toBe(422);
  });
});

describe('catalog product detail and discovery', () => {
  it('returns product details with images, variants and specs', async () => {
    const response = await request(app).get(`${base}/products/arduino-uno-r3`);
    expect(response.status).toBe(200);

    const product = (
      response.body as {
        data: {
          product: {
            slug: string;
            specs: Array<{ keyEn: string; valueEn: string }>;
            images: Array<{ url: string }>;
            variants: Array<{ sku: string }>;
          };
        };
      }
    ).data.product;

    expect(product.slug).toBe('arduino-uno-r3');
    expect(product.images).toHaveLength(2);
    expect(product.images[0]?.url).toContain('/uploads/products/arduino-uno-r3.svg');
    expect(product.variants[0]?.sku).toBe('EL-UNO-001-ORIG');
    expect(product.specs[0]).toMatchObject({ keyEn: 'Voltage', valueEn: '5V' });
  });

  it('exposes bundle contents and hides inactive products', async () => {
    const bundle = await request(app).get(`${base}/products/arduino-starter-kit`);
    expect(bundle.status).toBe(200);
    const bundleItems = (
      bundle.body as { data: { product: { bundleItems: Array<{ component: { slug: string } }> } } }
    ).data.product.bundleItems;
    expect(bundleItems.map((item) => item.component.slug).sort()).toEqual([
      'arduino-nano',
      'arduino-uno-r3',
    ]);

    const hidden = await request(app).get(`${base}/products/hidden-product`);
    expect(hidden.status).toBe(404);
    expect((hidden.body as { error: { code: string } }).error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns related, featured, new arrival and best seller products', async () => {
    const related = await request(app).get(`${base}/products/arduino-uno-r3/related`);
    expect((related.body as { data: { products: ProductCardBody[] } }).data.products.map((p) => p.slug)).toEqual([
      'arduino-nano',
      'arduino-starter-kit',
    ]);

    const featured = await request(app).get(`${base}/products/featured?limit=5`);
    expect((featured.body as { data: { products: ProductCardBody[] } }).data.products.map((p) => p.slug)).toEqual([
      'hc-sr04',
      'arduino-uno-r3',
    ]);

    const newArrivals = await request(app).get(`${base}/products/new-arrivals?limit=2`);
    expect(
      (newArrivals.body as { data: { products: ProductCardBody[] } }).data.products.map((p) => p.slug),
    ).toEqual(['arduino-starter-kit', 'hc-sr04']);

    const best = await request(app).get(`${base}/products/best-sellers?limit=2`);
    expect((best.body as { data: { products: ProductCardBody[] } }).data.products.map((p) => p.slug)).toEqual([
      'hc-sr04',
      'arduino-uno-r3',
    ]);
  });

  it('returns autocomplete suggestions with images', async () => {
    const response = await request(app).get(`${base}/products/autocomplete?q=UNO`);
    expect(response.status).toBe(200);
    const suggestions = (
      response.body as {
        data: { suggestions: Array<{ slug: string; imageUrl: string | null }> };
      }
    ).data.suggestions;
    expect(suggestions[0]?.slug).toBe('arduino-uno-r3');
    expect(suggestions[0]?.imageUrl).toContain('/uploads/products/');
  });
});

describe('catalog reviews', () => {
  it('returns only approved reviews with an aggregate summary', async () => {
    const [firstUser, secondUser, thirdUser] = await Promise.all([
      prisma.user.create({
        data: { name: 'Buyer One', email: 'one@example.com', passwordHash: 'hash' },
      }),
      prisma.user.create({
        data: { name: 'Buyer Two', email: 'two@example.com', passwordHash: 'hash' },
      }),
      prisma.user.create({
        data: { name: 'Buyer Three', email: 'three@example.com', passwordHash: 'hash' },
      }),
    ]);

    await prisma.review.createMany({
      data: [
        {
          productId: fixture.unoId,
          userId: firstUser.id,
          rating: 5,
          comment: 'Excellent board',
          status: 'APPROVED',
          isVerifiedPurchase: true,
        },
        {
          productId: fixture.unoId,
          userId: secondUser.id,
          rating: 3,
          comment: 'Good value',
          status: 'APPROVED',
        },
        {
          productId: fixture.unoId,
          userId: thirdUser.id,
          rating: 1,
          comment: 'Hidden pending review',
          status: 'PENDING',
        },
      ],
    });

    const response = await request(app).get(
      `${base}/products/arduino-uno-r3/reviews?page=1&pageSize=1`,
    );
    expect(response.status).toBe(200);

    const result = response.body as {
      data: {
        reviews: Array<{ rating: number; user: { name: string } }>;
        pagination: { total: number };
        summary: { average: number; count: number; distribution: Record<string, number> };
      };
    };
    expect(result.data.reviews).toHaveLength(1);
    expect(result.data.pagination.total).toBe(2);
    expect(result.data.summary).toMatchObject({
      average: 4,
      count: 2,
      distribution: { 1: 0, 3: 1, 5: 1 },
    });

    const missing = await request(app).get(`${base}/products/hidden-product/reviews`);
    expect(missing.status).toBe(404);
  });
});
