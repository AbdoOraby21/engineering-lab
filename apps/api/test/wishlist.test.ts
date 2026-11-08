import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const authBase = '/api/v1/auth';
const base = '/api/v1/wishlist';

const account = {
  name: 'Wishlist User',
  email: 'wishlist@example.com',
  password: 'Password123',
  locale: 'ar' as const,
};

let token = '';
let productId = '';

async function registerUser(): Promise<void> {
  const response = await request(app).post(`${authBase}/register`).send(account);
  expect(response.status).toBe(201);
  token = (response.body as { data: { accessToken: string } }).data.accessToken;
}

async function seedProduct(): Promise<void> {
  const category = await prisma.category.create({
    data: { nameAr: 'اختبار', nameEn: 'Test', slug: 'wishlist-test-category' },
  });
  const product = await prisma.product.create({
    data: {
      nameAr: 'منتج القائمة',
      nameEn: 'Wishlist Product',
      slug: 'wishlist-product',
      sku: 'WL-1',
      descriptionAr: 'وصف',
      descriptionEn: 'Description',
      price: 19900,
      stock: 5,
      categoryId: category.id,
    },
  });
  productId = product.id;
}

function auth() {
  return { Authorization: `Bearer ${token}` };
}

beforeEach(async () => {
  await resetDatabase();
  await registerUser();
  await seedProduct();
});

describe('wishlist', () => {
  it('adds, lists and removes wishlist items', async () => {
    const added = await request(app).post(base).set(auth()).send({ productId });
    expect(added.status).toBe(201);
    const item = (
      added.body as { data: { item: { id: string; product: { slug: string; price: number } } } }
    ).data.item;
    expect(item.product.slug).toBe('wishlist-product');

    const listed = await request(app).get(base).set(auth());
    expect(listed.status).toBe(200);
    const items = (listed.body as { data: { items: typeof item[] } }).data.items;
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe(item.id);
    expect(items[0]?.product.price).toBe(19900);

    const duplicate = await request(app).post(base).set(auth()).send({ productId });
    expect(duplicate.status).toBe(201);
    const afterDuplicate = await request(app).get(base).set(auth());
    expect((afterDuplicate.body as { data: { items: unknown[] } }).data.items).toHaveLength(1);

    const removed = await request(app).delete(`${base}/${productId}`).set(auth());
    expect(removed.status).toBe(200);

    const empty = await request(app).get(base).set(auth());
    expect((empty.body as { data: { items: unknown[] } }).data.items).toHaveLength(0);

    const removedAgain = await request(app).delete(`${base}/${productId}`).set(auth());
    expect(removedAgain.status).toBe(200);
  });

  it('rejects unknown or inactive products', async () => {
    const missing = await request(app)
      .post(base)
      .set(auth())
      .send({ productId: 'does-not-exist' });
    expect(missing.status).toBe(404);
    expect((missing.body as { error: { code: string } }).error.code).toBe('PRODUCT_NOT_FOUND');

    await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
    const inactive = await request(app).post(base).set(auth()).send({ productId });
    expect(inactive.status).toBe(404);
  });

  it('requires authentication', async () => {
    const anonymous = await request(app).get(base);
    expect(anonymous.status).toBe(401);

    const anonymousPost = await request(app).post(base).send({ productId });
    expect(anonymousPost.status).toBe(401);
  });
});
