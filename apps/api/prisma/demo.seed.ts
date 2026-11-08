/**
 * Staging demo dataset seed.
 *
 * Separate from the production seed (prisma/seed.ts). Populates orders in
 * every status, support tickets, reviews, coupons and shipping zones so QA
 * and stakeholders can exercise the full order lifecycle on staging.
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter @engineering-lab/api prisma:demo-seed
 *
 *   # package.json script (optional):
 *   "prisma:demo-seed": "tsx prisma/demo.seed.ts"
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, OrderStatus, PaymentMethod, ReviewStatus } from '@prisma/client';

const prisma = new PrismaClient();

const HASHED_PASSWORD = await bcrypt.hash('DemoPassword123', 10);

async function main() {
  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: {},
    create: {
      name: 'Demo Admin',
      email: 'admin@demo.local',
      passwordHash: HASHED_PASSWORD,
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });

  const customers = await Promise.all(
    ['camila@demo.local', 'omar@demo.local', 'maya@demo.local'].map((email) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: email.split('@')[0] ?? email,
          email,
          passwordHash: HASHED_PASSWORD,
          role: 'CUSTOMER',
          emailVerified: true,
          isActive: true,
        },
      }),
    ),
  );
  const [camila, omar, maya] = customers as [typeof customers[0], typeof customers[0], typeof customers[0]];

  // ------------------------------------------------------------------
  // Catalog: categories, brands, products
  // ------------------------------------------------------------------
  const electronics = await prisma.category.create({
    data: {
      nameAr: 'إلكترونيات', nameEn: 'Electronics', slug: 'demo-electronics',
      descriptionAr: 'أجهزة وإلكترونيات', descriptionEn: 'Devices and electronics',
      isActive: true,
    },
  });
  const home = await prisma.category.create({
    data: {
      nameAr: 'منزل ومطبخ', nameEn: 'Home & Kitchen', slug: 'demo-home-kitchen',
      descriptionAr: 'أدوات منزلية ومطبخ', descriptionEn: 'Home tools and kitchenware',
      isActive: true,
    },
  });

  const arduino = await prisma.brand.create({
    data: { nameAr: 'أردوينو', nameEn: 'Arduino', slug: 'demo-arduino', isActive: true },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        nameAr: 'لوحة أردوينو أونو', nameEn: 'Arduino Uno R3', slug: 'demo-arduino-uno', sku: 'DEMO-UNO-001',
        descriptionAr: 'لوحة تطويرية قائمة على متحكم ATmega328P.',
        descriptionEn: 'ATmega328P-based development board.',
        price: 85000, stock: 25, categoryId: electronics.id, brandId: arduino.id, isActive: true, isFeatured: true,
      },
    }),
    prisma.product.create({
      data: {
        nameAr: 'مستشعر مسافة إتش سي إس آر 04', nameEn: 'HC-SR04 Ultrasonic Sensor', slug: 'demo-hcsr04', sku: 'DEMO-HCSR04-002',
        descriptionAr: 'مستشعر مسافة فوق صوتي لقياس المسافات.',
        descriptionEn: 'Ultrasonic distance measuring sensor.',
        price: 45000, stock: 0, categoryId: electronics.id, brandId: arduino.id, isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        nameAr: 'طبق سيراميك مطبع', nameEn: 'Ceramic Dinner Plate', slug: 'demo-ceramic-plate', sku: 'DEMO-PLATE-003',
        descriptionAr: 'طبق تقديم سيراميك.',
        descriptionEn: 'Ceramic serving plate.',
        price: 12000, stock: 40, categoryId: home.id, brandId: arduino.id, isActive: true,
      },
    }),
  ]);
  const [uno, hcsr04] = products;

  // ------------------------------------------------------------------
  // Shipping zones & coupons
  // ------------------------------------------------------------------
  await prisma.shippingZone.createMany({
    data: [
      { governorate: 'القاهرة', feeEgp: 6000, estimatedDaysMin: 1, estimatedDaysMax: 2, isActive: true },
      { governorate: 'الإسكندرية', feeEgp: 9000, estimatedDaysMin: 2, estimatedDaysMax: 4, isActive: true },
      { governorate: 'الجيزة', feeEgp: 6000, estimatedDaysMin: 1, estimatedDaysMax: 2, isActive: true },
    ],
  });

  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', type: 'PERCENT', value: 10, minSubtotal: 100000, maxDiscount: 30000, usageLimit: 100, isActive: true },
      { code: 'SAVE50', type: 'FIXED', value: 5000, minSubtotal: 200000, usageLimit: 50, isActive: true },
      { code: 'EXPIRED100', type: 'PERCENT', value: 100, expiresAt: new Date('2020-01-01'), isActive: true },
    ],
  });

  // ------------------------------------------------------------------
  // Orders in every status
  // ------------------------------------------------------------------
  const now = new Date();
  const statuses: OrderStatus[] = [
    'PENDING_PAYMENT', 'PENDING_PAYMENT_REVIEW', 'CONFIRMED', 'PROCESSING', 'SHIPPED',
    'DELIVERED', 'CANCELLED', 'EXPIRED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED',
  ];

  for (let i = 0; i < statuses.length; i += 1) {
    const status = statuses[i]!;
    const customer = customers[i % customers.length]!;
    const product = products[i % products.length]!;
    const qty = (i % 3) + 1;
    const unitPrice = product.price;
    const lineTotal = unitPrice * qty;
    const orderNumber = `EL-DEMO-${String(i + 1).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customer.id,
        status,
        paymentMethod: status === 'CANCELLED' || status === 'EXPIRED' ? PaymentMethod.COD : PaymentMethod.VODAFONE_CASH,
        addressSnapshot: {
          governorate: 'القاهرة', city: 'القاهرة', street: 'شارعdemo', building: String(10 + i),
          label: 'منزل',
        },
        contactName: customer.name,
        contactPhone: '+201000000000',
        contactEmail: customer.email,
        subtotal: lineTotal,
        discountTotal: 0,
        shippingFee: 6000,
        total: lineTotal + 6000,
        customerNote: `Demo order ${orderNumber}`,
        paymentDeadlineAt: status === 'PENDING_PAYMENT' || status === 'PENDING_PAYMENT_REVIEW'
          ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
          : null,
        confirmedAt: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status) ? now : null,
        shippedAt: ['SHIPPED', 'DELIVERED'].includes(status) ? now : null,
        deliveredAt: status === 'DELIVERED' ? now : null,
        cancelledAt: status === 'CANCELLED' || status === 'EXPIRED' ? now : null,
        cancelReason: status === 'CANCELLED' ? 'Demo cancellation' : null,
        items: {
          create: [{
            productId: product.id,
            qty,
            nameAr: product.nameAr,
            nameEn: product.nameEn,
            sku: product.sku,
            imageUrl: null,
            unitPrice,
            lineTotal,
            isBundle: false,
          }],
        },
        statusHistory: {
          create: [{ from: null, to: status, actorId: customer.id, note: 'Demo order created' }],
        },
      },
      include: { items: true },
    });

    // Add a payment proof for pre-payment statuses.
    if (status === 'PENDING_PAYMENT_REVIEW') {
      await prisma.paymentProof.create({
        data: {
          orderId: order.id,
          senderPhone: '+201000000000',
          referenceNumber: `REF-DEMO-${i + 1}`,
          transferredAt: now,
          amount: order.total,
          screenshotUrl: `/uploads/proofs/demo/proof-${i + 1}.jpg`,
          status: 'SUBMITTED',
        },
      });
    }
  }

  // ------------------------------------------------------------------
  // Reviews
  // ------------------------------------------------------------------
  await prisma.review.create({
    data: {
      productId: uno.id,
      userId: camila.id,
      rating: 5,
      title: 'Great board',
      comment: 'Works perfectly for my projects.',
      status: ReviewStatus.APPROVED,
      isVerifiedPurchase: true,
    },
  });
  await prisma.review.create({
    data: {
      productId: uno.id,
      userId: omar.id,
      rating: 4,
      title: 'Good value',
      comment: 'Solid build quality.',
      status: ReviewStatus.APPROVED,
      isVerifiedPurchase: true,
    },
  });
  await prisma.review.create({
    data: {
      productId: hcsr04.id,
      userId: maya.id,
      rating: 1,
      title: 'Out of stock',
      comment: 'Wish it were available.',
      status: ReviewStatus.PENDING,
      isVerifiedPurchase: false,
    },
  });

  // ------------------------------------------------------------------
  // Support tickets
  // ------------------------------------------------------------------
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: camila.id,
      subject: 'أين طلبي؟ / Where is my order?',
      category: 'SHIPPING',
      status: 'OPEN',
      orderReference: 'EL-DEMO-0001',
      messages: {
        create: {
          senderId: camila.id,
          isStaff: false,
          body: 'مرحبًا، متي يتم شحن طلبي؟\nHi, when will my order be shipped?',
        },
      },
    },
  });
  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: admin.id,
      isStaff: true,
      body: 'جاري معالجة الطلب وسيتم الشحن خلال يومين.\nOrder is being processed and will ship within two days.',
    },
  });

  console.log('Demo seed complete:');
  console.log(`- users: ${customers.length + 1} (admin: ${admin.email})`);
  console.log(`- products: ${products.length}`);
  console.log(`- orders: ${statuses.length} (one per status)`);
  console.log('- reviews & tickets seeded');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
