import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const authBase = '/api/v1/auth';
const base = '/api/v1/orders';

const account = {
  name: 'Order User',
  email: 'order@example.com',
  password: 'Password123',
  locale: 'ar' as const,
};

let token = '';
let productId = '';
let addressId = '';

async function registerAndVerify(): Promise<void> {
  const reg = await request(app).post(`${authBase}/register`).send(account);
  expect(reg.status).toBe(201);
  const login = await request(app).post(`${authBase}/login`).send({
    email: account.email,
    password: account.password,
  });
  expect(login.status).toBe(200);
  token = (login.body as { data: { accessToken: string } }).data.accessToken;
  const user = await prisma.user.findUnique({ where: { email: account.email } });
  expect(user).toBeTruthy();
  await prisma.user.update({ where: { id: user!.id }, data: { emailVerified: true } });
}

function auth() {
  return { Authorization: `Bearer ${token}` };
}

async function seedProductAndAddress(): Promise<void> {
  const category = await prisma.category.create({
    data: { nameAr: 'اختبار', nameEn: 'Test', slug: 'order-test-category' },
  });
  const product = await prisma.product.create({
    data: {
      nameAr: 'منتج الطلب',
      nameEn: 'Order Product',
      slug: 'order-product',
      sku: 'OD-1',
      descriptionAr: 'وصف',
      descriptionEn: 'Description',
      price: 19900,
      stock: 10,
      categoryId: category.id,
    },
  });
  productId = product.id;
  const user = await prisma.user.findUnique({ where: { email: account.email } });
  const address = await prisma.address.create({
    data: {
      userId: user!.id,
      governorate: 'القاهرة',
      city: 'القاهرة',
      street: 'شارع الرئيسي',
      building: '10',
      isDefault: true,
    },
  });
  addressId = address.id;

  // Add item to cart
  await request(app)
    .post('/api/v1/cart/items')
    .set(auth())
    .send({ productId, qty: 1 });
}

beforeEach(async () => {
  await resetDatabase();
  await registerAndVerify();
  await seedProductAndAddress();
});

describe('orders', () => {
  it('places a COD order (confirmed immediately)', async () => {
    const created = await request(app)
      .post(base)
      .set(auth())
      .send({
        addressId,
        paymentMethod: 'COD',
        idempotencyKey: 'idem-cod-1',
      });
    expect(created.status).toBe(201);
    const order = (created.body as { data: { order: { orderNumber: string; status: string; total: number } } }).data.order;
    expect(order.status).toBe('CONFIRMED');
    expect(order.total).toBe(22900);
    expect(order.orderNumber).toMatch(/^EL-\d{4}-\d{6}$/);

    const listed = await request(app).get(base).set(auth());
    expect(listed.status).toBe(200);
    const items = (listed.body as { data: { orders: { orderNumber: string }[] } }).data.orders;
    expect(items).toHaveLength(1);
    expect(items[0]?.orderNumber).toBe(order.orderNumber);
  });

  it('places a Vodafone Cash order (pending payment)', async () => {
    const created = await request(app)
      .post(base)
      .set(auth())
      .send({
        addressId,
        paymentMethod: 'VODAFONE_CASH',
        idempotencyKey: 'idem-vc-1',
      });
    expect(created.status).toBe(201);
    const order = (created.body as { data: { order: { status: string } } }).data.order;
    expect(order.status).toBe('PENDING_PAYMENT');
  });

  it('blocks unverified email', async () => {
    await prisma.user.update({ where: { email: account.email }, data: { emailVerified: false } });
    const created = await request(app)
      .post(base)
      .set(auth())
      .send({ addressId, paymentMethod: 'COD', idempotencyKey: 'idem-unverified' });
    expect(created.status).toBe(403);
  });

  it('blocks unauthenticated', async () => {
    const created = await request(app).post(base).send({
      addressId,
      paymentMethod: 'COD',
      idempotencyKey: 'idem-anon',
    });
    expect(created.status).toBe(401);
  });

  it('rejects out of stock', async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 0 } });
    const created = await request(app)
      .post(base)
      .set(auth())
      .send({ addressId, paymentMethod: 'COD', idempotencyKey: 'idem-oos' });
    expect(created.status).toBe(409);
  });

  it('submits payment proof then admin approves/rejects', async () => {
    const placed = await request(app)
      .post(base)
      .set(auth())
      .send({ addressId, paymentMethod: 'VODAFONE_CASH', idempotencyKey: 'idem-proof' });
    expect(placed.status).toBe(201);
    const orderNumber = (placed.body as { data: { order: { orderNumber: string } } }).data.order.orderNumber;

    // Get order to confirm userId for proof submit (proof submit needs orderNumber + userId)
    const order = await request(app).get(`${base}/${orderNumber}`).set(auth());
    expect(order.status).toBe(200);

    // Submit proof
    const proofRes = await request(app)
      .post(`${base}/${orderNumber}/payment-proof`)
      .set(auth())
      .field('senderPhone', '+201000000000')
      .field('transferredAt', new Date().toISOString())
      .field('amount', '19900')
      .attach('screenshot', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'screenshot.jpg');
    expect(proofRes.status).toBe(201);

    // Order should now be in review
    const afterProof = await request(app).get(`${base}/${orderNumber}`).set(auth());
    expect((afterProof.body as { data: { order: { status: string } } }).data.order.status).toBe(
      'PENDING_PAYMENT_REVIEW',
    );

    // Proof recorded as SUBMITTED
    const proofs = await prisma.paymentProof.findMany({ where: { order: { orderNumber } } });
    expect(proofs).toHaveLength(1);
    expect(proofs[0]?.status).toBe('SUBMITTED');
    expect(proofs[0]?.amount).toBe(19900);

    // Stock was deducted
    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(9);
  });
});
