import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDatabase } from './helpers.js';
import type { CartDto, CartItemDto } from '@engineering-lab/shared';

const app = createApp();
const authBase = '/api/v1/auth';
const base = '/api/v1/cart';

const account = {
  name: 'Cart User',
  email: 'cart@example.com',
  password: 'Password123',
  locale: 'ar' as const,
};

let token = '';
let productId = '';
let variantId = '';

async function registerUser(): Promise<void> {
  const response = await request(app).post(`${authBase}/register`).send(account);
  expect(response.status).toBe(201);
  token = (response.body as { data: { accessToken: string } }).data.accessToken;
}

async function seedProduct(): Promise<void> {
  const category = await prisma.category.create({
    data: { nameAr: 'اختبار', nameEn: 'Test', slug: 'cart-test-category' },
  });
  const product = await prisma.product.create({
    data: {
      nameAr: 'منتج العربة',
      nameEn: 'Cart Product',
      slug: 'cart-product',
      sku: 'CT-1',
      descriptionAr: 'وصف',
      descriptionEn: 'Description',
      price: 19900,
      stock: 10,
      categoryId: category.id,
    },
  });
  productId = product.id;
  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      nameAr: 'متغير',
      nameEn: 'Variant',
      sku: 'CT-1-V1',
      priceDelta: 500,
      stock: 3,
      isActive: true,
    },
  });
  variantId = variant.id;
}

function auth() {
  return { Authorization: `Bearer ${token}` };
}

function cartItems(body: { data: { cart: CartDto } }): CartItemDto[] {
  return body.data.cart.items;
}

beforeEach(async () => {
  await resetDatabase();
  await registerUser();
  await seedProduct();
});

describe('cart', () => {
  it('starts empty, adds items, updates qty, removes and clears', async () => {
    const empty = await request(app).get(base).set(auth());
    expect(empty.status).toBe(200);
    expect(cartItems(empty.body as { data: { cart: CartDto } })).toHaveLength(0);

    const added = await request(app)
      .post(`${base}/items`)
      .set(auth())
      .send({ productId, qty: 2 });
    expect(added.status).toBe(201);
    const items = cartItems(added.body as { data: { cart: CartDto } });
    expect(items).toHaveLength(1);
    expect(items[0]?.productId).toBe(productId);
    expect(items[0]?.qty).toBe(2);

    const itemId = items[0]?.id;
    const updated = await request(app)
      .patch(`${base}/items/${itemId}`)
      .set(auth())
      .send({ qty: 5 });
    expect(updated.status).toBe(200);
    expect(cartItems(updated.body as { data: { cart: CartDto } })[0]?.qty).toBe(5);

    const capped = await request(app)
      .patch(`${base}/items/${itemId}`)
      .set(auth())
      .send({ qty: 50 });
    expect(capped.status).toBe(200);
    expect(cartItems(capped.body as { data: { cart: CartDto } })[0]?.qty).toBe(10);

    const removed = await request(app)
      .delete(`${base}/items/${itemId}`)
      .set(auth());
    expect(removed.status).toBe(200);
    expect(cartItems(removed.body as { data: { cart: CartDto } })).toHaveLength(0);
  });

  it('adds variant with variant stock cap', async () => {
    const added = await request(app)
      .post(`${base}/items`)
      .set(auth())
      .send({ productId, variantId, qty: 5 });
    expect(added.status).toBe(201);
    const items = cartItems(added.body as { data: { cart: CartDto } });
    expect(items[0]?.variantId).toBe(variantId);
    expect(items[0]?.qty).toBe(3); // variant stock is 3

    const tooMuch = await request(app)
      .patch(`${base}/items/${items[0]?.id}`)
      .set(auth())
      .send({ qty: 10 });
    expect(tooMuch.status).toBe(200);
    expect(cartItems(tooMuch.body as { data: { cart: CartDto } })[0]?.qty).toBe(3);
  });

  it('merges local cart on login via POST /merge', async () => {
    const merged = await request(app)
      .post(`${base}/merge`)
      .set(auth())
      .send({ items: [{ productId, qty: 2 }, { productId, variantId, qty: 1 }] });
    expect(merged.status).toBe(200);
    const items = cartItems(merged.body as { data: { cart: CartDto } });
    expect(items).toHaveLength(2);
  });

  it('rejects out-of-stock product', async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 0 } });
    const response = await request(app)
      .post(`${base}/items`)
      .set(auth())
      .send({ productId, qty: 1 });
    expect(response.status).toBe(409);
    expect((response.body as { error: { code: string } }).error.code).toBe('OUT_OF_STOCK');
  });

  it('requires authentication', async () => {
    const anonymous = await request(app).get(base);
    expect(anonymous.status).toBe(401);
    const anonymousPost = await request(app).post(`${base}/items`).send({ productId });
    expect(anonymousPost.status).toBe(401);
  });
});
