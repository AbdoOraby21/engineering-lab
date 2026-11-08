import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const API = 'http://127.0.0.1:4000';
const BASE = 'http://127.0.0.1:5173';
const PASSWORD = 'Password123';

interface Fixture {
  customer: { id: string; email: string };
  product: { id: string; sku: string };
  addressId: string;
}

let f1: Fixture;
let f2: Fixture;

const ADMIN_EMAIL = 'admin-e2e@example.com';

test.beforeAll(async () => {
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const category = await prisma.category.create({
    data: { nameAr: 'إلكترونيات', nameEn: 'Electronics', slug: 'electronics-e2e', isActive: true },
  });
  const brand = await prisma.brand.create({
    data: { nameAr: 'أردوينو', nameEn: 'Arduino', slug: 'arduino-e2e', isActive: true },
  });

  const mk = async (email: string, name: string, slug: string, sku: string) => {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'CUSTOMER', emailVerified: true },
    });
    const address = await prisma.address.create({
      data: { userId: user.id, governorate: 'القاهرة', city: 'القاهرة', street: 'شارع الرئيسي', building: '10', isDefault: true },
    });
    const product = await prisma.product.create({
      data: {
        nameAr: name, nameEn: name, slug, sku,
        descriptionAr: 'وصف', descriptionEn: 'Description', price: 15000, stock: 10,
        categoryId: category.id, brandId: brand.id, isActive: true,
      },
    });
    await prisma.cart.create({
      data: { userId: user.id, items: { create: { productId: product.id, qty: 1 } } },
    });
    return { customer: { id: user.id, email: user.email }, product: { id: product.id, sku: product.sku }, addressId: address.id };
  };

  f1 = await mk('cust1-e2e@example.com', 'أردوينو أونو 1', 'arduino-uno-1-e2e', 'E2E-UNO-1');
  f2 = await mk('cust2-e2e@example.com', 'أردوينو أونو 2', 'arduino-uno-2-e2e', 'E2E-UNO-2');
  await prisma.user.create({
    data: { name: 'أدمن اختبار', email: ADMIN_EMAIL, passwordHash, role: 'ADMIN', emailVerified: true },
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

interface PlaywrightRequest {
  post: (url: string, opts?: { data?: unknown; multipart?: unknown; headers?: Record<string, string> }) => Promise<{ status: () => number; json: () => Promise<unknown> }>;
  get: (url: string, opts?: { headers?: Record<string, string> }) => Promise<{ status: () => number; json: () => Promise<unknown> }>;
}
interface PlaywrightRequestContext {
  request: PlaywrightRequest;
}
async function loginViaApi(context: PlaywrightRequestContext, email: string, password: string): Promise<string> {
  const res = await context.request.post(`${API}/api/v1/auth/login`, { data: { email, password } });
  const body = await res.json();
  if (res.status() !== 200) {
    console.log('LOGIN BODY:', JSON.stringify(body));
  }
  expect(res.status()).toBe(200);
  return body.data.accessToken;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

test('E2E: COD order → confirmed end-to-end (en)', async ({ context }) => {
  const token = await loginViaApi(context, f1.customer.email, PASSWORD);
  const headers = authHeaders(token);

  const cart = await context.request.get(`${API}/api/v1/cart`, { headers });
  expect(cart.status()).toBe(200);
  const cartData = await cart.json();
  expect((cartData as { data: { cart: { items: unknown[] } } }).data.cart.items.length).toBeGreaterThan(0);

  const placed = await context.request.post(`${API}/api/v1/orders`, {
    headers,
    data: { addressId: f2.addressId, paymentMethod: 'VODAFONE_CASH', idempotencyKey: `e2e-vc-${Date.now()}` },
  });
  expect(placed.status()).toBe(201);
  const placedBody = await placed.json();
  const order = (placedBody as { data: { order: { status: string; orderNumber: string } } }).data.order;
  expect(order.status).toBe('CONFIRMED');

  const orderPage = await context.request.get(`${BASE}/en/orders/${order.orderNumber}`);
  expect(orderPage.status()).toBe(200);
});

test('E2E: Vodafone Cash → submit proof → admin approves → confirmed (ar)', async ({ context }) => {
  const customerToken = await loginViaApi(context, f2.customer.email, PASSWORD);
  const customerHeaders = authHeaders(customerToken);
  const adminToken = await loginViaApi(context, ADMIN_EMAIL, PASSWORD);
  const adminHeaders = authHeaders(adminToken);

  await context.request.post(`${API}/api/v1/cart`, { headers: customerHeaders, data: { productId: f2.product.id, qty: 1 } });

  const placed = await context.request.post(`${API}/api/v1/orders`, {
    headers: customerHeaders,
    data: { addressId: f2.addressId, paymentMethod: 'VODAFONE_CASH', idempotencyKey: `e2e-vc-${Date.now()}` },
  });
  expect(placed.status()).toBe(201);
  const placedBody = await placed.json();
  const order = (placedBody as { data: { order: { status: string; orderNumber: string; total: number } } }).data.order;
  expect(order.status).toBe('PENDING_PAYMENT');

  const proof = await context.request.post(`${API}/api/v1/orders/${order.orderNumber}/payment-proof`, {
    headers: customerHeaders,
    multipart: {
      senderPhone: '+201000000000',
      referenceNumber: 'REF-E2E',
      transferredAt: '2026-12-01T10:00:00.000Z',
      amount: String(order.total),
      screenshot: { name: 'proof.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) },
    },
  });
  expect(proof.status()).toBe(201);

  const orderData = await (await context.request.get(`${API}/api/v1/orders/${order.orderNumber}`, { headers: customerHeaders })).json();
  expect((orderData as { data: { order: { status: string } } }).data.order.status).toBe('PENDING_PAYMENT_REVIEW');

  const proofs = await (await context.request.get(`${API}/api/v1/admin/payment-proofs`, { headers: adminHeaders })).json();
  const myProof = ((proofs as { data: { proofs: { id: string; order: { orderNumber: string } }[] } }).data?.proofs as { id: string; order: { orderNumber: string } }[]).find((p) => p.order.orderNumber === order.orderNumber);
  expect(myProof).toBeTruthy();
  const approved = await context.request.post(`${API}/api/v1/admin/payment-proofs/${myProof!.id}/approve`, { headers: adminHeaders });
  expect(approved.status()).toBe(200);

  const confirmed = await (await context.request.get(`${API}/api/v1/orders/${order.orderNumber}`, { headers: customerHeaders })).json();
  expect((confirmed as { data: { order: { status: string } } }).data.order.status).toBe('CONFIRMED');

  const arHome = await context.request.get(`${BASE}/ar`);
  expect(arHome.status()).toBe(200);
});
