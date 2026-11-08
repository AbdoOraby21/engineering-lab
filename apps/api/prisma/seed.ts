import 'dotenv/config';
import bcrypt from 'bcrypt';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma, PrismaClient, ReviewStatus } from '@prisma/client';
import {
  seedBrands,
  seedCategories,
  seedProducts,
} from './seed-data/catalog.js';
import { seedFaqs, seedPages, seedSettings } from './seed-data/content.js';
import { seedShippingZones } from './seed-data/shipping.js';

const prisma = new PrismaClient();
const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function truncateWord(value: string, length: number): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= length) {
    return collapsed;
  }
  const cut = collapsed.slice(0, length);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : length).trim()}…`;
}

function placeholderSvg(label: string, subtitle: string, variant: number): string {
  const accent = variant === 2 ? '#38BDF8' : variant === 3 ? '#F59E0B' : '#22C55E';
  const glow = variant === 2 ? 'rgba(56,189,248,0.18)' : variant === 3 ? 'rgba(245,158,11,0.18)' : 'rgba(34,197,94,0.18)';
  const safeLabel = escapeXml(truncate(label, 34));
  const safeSubtitle = escapeXml(truncate(subtitle, 40));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="${safeLabel}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${glow}"/>
      <stop offset="100%" stop-color="rgba(11,15,20,0)"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#1E2733" stroke-width="1" opacity="0.55"/>
    </pattern>
  </defs>
  <rect width="800" height="800" fill="#0B0F14"/>
  <rect width="800" height="800" fill="url(#grid)"/>
  <rect width="800" height="800" fill="url(#glow)"/>
  <g stroke="#1E2733" stroke-width="3" fill="none" opacity="0.9">
    <path d="M70 210H190V120H320"/>
    <path d="M730 590H610V690H470"/>
    <path d="M90 620H200V540H280"/>
    <path d="M710 190H600V260H520"/>
  </g>
  <g fill="${accent}">
    <circle cx="70" cy="210" r="7"/>
    <circle cx="320" cy="120" r="7"/>
    <circle cx="730" cy="590" r="7"/>
    <circle cx="470" cy="690" r="7"/>
    <circle cx="90" cy="620" r="7"/>
    <circle cx="280" cy="540" r="7"/>
    <circle cx="710" cy="190" r="7"/>
    <circle cx="520" cy="260" r="7"/>
  </g>
  <g transform="translate(400 340)">
    <rect x="-96" y="-96" width="192" height="192" rx="30" fill="#121821" stroke="${accent}" stroke-width="4"/>
    <rect x="-52" y="-52" width="104" height="104" rx="14" fill="none" stroke="${accent}" stroke-width="4" opacity="0.7"/>
    <circle cx="0" cy="0" r="18" fill="${accent}" opacity="0.9"/>
    <g fill="${accent}">
      <rect x="-120" y="-64" width="20" height="10" rx="3"/>
      <rect x="-120" y="-24" width="20" height="10" rx="3"/>
      <rect x="-120" y="16" width="20" height="10" rx="3"/>
      <rect x="-120" y="56" width="20" height="10" rx="3"/>
      <rect x="100" y="-64" width="20" height="10" rx="3"/>
      <rect x="100" y="-24" width="20" height="10" rx="3"/>
      <rect x="100" y="16" width="20" height="10" rx="3"/>
      <rect x="100" y="56" width="20" height="10" rx="3"/>
    </g>
  </g>
  <text x="400" y="520" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" letter-spacing="6" fill="${accent}">ENGINEERING LAB</text>
  <text x="400" y="585" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="700" fill="#FFFFFF">${safeLabel}</text>
  <text x="400" y="630" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" fill="#94A3B8">${safeSubtitle}</text>
</svg>`;
}

async function writePlaceholder(
  folder: 'categories' | 'products' | 'banners',
  filename: string,
  label: string,
  subtitle: string,
  variant: number,
): Promise<void> {
  const directory = path.join(uploadRoot, folder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), placeholderSvg(label, subtitle, variant), 'utf8');
}

async function seedAdmin(): Promise<string> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Engineering Lab Admin';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the admin user');
  }

  const passwordHash = await bcrypt.hash(password, rounds);

  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name,
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
    create: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
      locale: 'ar',
    },
  });

  console.log(`Admin ready: ${admin.email} (${admin.id})`);
  return admin.id;
}

const DEMO_CUSTOMERS = [
  { email: 'customer1@engineering-lab.local', name: 'Ahmed Hassan' },
  { email: 'customer2@engineering-lab.local', name: 'Mohamed Ali' },
  { email: 'customer3@engineering-lab.local', name: 'Sara Ibrahim' },
  { email: 'customer4@engineering-lab.local', name: 'Mariam Youssef' },
  { email: 'customer5@engineering-lab.local', name: 'Karim Mahmoud' },
  { email: 'customer6@engineering-lab.local', name: 'Laila Adel' },
] as const;

async function seedCustomers(): Promise<Map<string, string>> {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash('Customer12345', rounds);
  const ids = new Map<string, string>();

  for (const customer of DEMO_CUSTOMERS) {
    const record = await prisma.user.upsert({
      where: { email: customer.email },
      update: { name: customer.name, passwordHash, role: 'CUSTOMER', isActive: true, emailVerified: true },
      create: {
        name: customer.name,
        email: customer.email,
        passwordHash,
        role: 'CUSTOMER',
        emailVerified: true,
        isActive: true,
        locale: 'ar',
      },
    });
    ids.set(customer.email, record.id);
  }

  console.log(`Demo customers ready: ${ids.size}`);
  return ids;
}

async function seedCatalog(): Promise<void> {
  const categoryBySlug = new Map<string, string>();

  const parents = seedCategories.filter((category) => !category.parentSlug);
  const children = seedCategories.filter((category) => category.parentSlug);

  for (const category of [...parents, ...children]) {
    const parentId = category.parentSlug ? categoryBySlug.get(category.parentSlug) : null;
    if (category.parentSlug && !parentId) {
      throw new Error(`Unknown parent category: ${category.parentSlug}`);
    }

    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        descriptionAr: category.descriptionAr,
        descriptionEn: category.descriptionEn,
        imageUrl: `/uploads/categories/${category.slug}.svg`,
        parentId,
        sortOrder: category.sortOrder,
        isActive: true,
        icon: category.icon ?? null,
      },
      create: {
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        slug: category.slug,
        descriptionAr: category.descriptionAr,
        descriptionEn: category.descriptionEn,
        imageUrl: `/uploads/categories/${category.slug}.svg`,
        parentId,
        sortOrder: category.sortOrder,
        isActive: true,
        icon: category.icon ?? null,
      },
    });

    categoryBySlug.set(record.slug, record.id);
    await writePlaceholder('categories', `${category.slug}.svg`, category.nameEn, category.nameAr, 1);
  }

  const brandBySlug = new Map<string, string>();
  for (const brand of seedBrands) {
    const record = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        nameAr: brand.nameAr,
        nameEn: brand.nameEn,
        descriptionAr: brand.descriptionAr,
        descriptionEn: brand.descriptionEn,
        websiteUrl: brand.websiteUrl ?? null,
        isActive: true,
      },
      create: {
        nameAr: brand.nameAr,
        nameEn: brand.nameEn,
        slug: brand.slug,
        descriptionAr: brand.descriptionAr,
        descriptionEn: brand.descriptionEn,
        websiteUrl: brand.websiteUrl ?? null,
        isActive: true,
      },
    });
    brandBySlug.set(record.slug, record.id);
  }

  const productBySlug = new Map<string, string>();
  const productIds: string[] = [];

  for (const product of seedProducts) {
    const categoryId = categoryBySlug.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown category for product ${product.slug}: ${product.categorySlug}`);
    }
    const brandId = product.brandSlug ? brandBySlug.get(product.brandSlug) : null;
    if (product.brandSlug && !brandId) {
      throw new Error(`Unknown brand for product ${product.slug}: ${product.brandSlug}`);
    }

    const shortDescriptionAr =
      product.shortDescriptionAr ?? truncateWord(product.descriptionAr, 160);
    const shortDescriptionEn =
      product.shortDescriptionEn ?? truncateWord(product.descriptionEn, 160);

    const data = {
      slug: product.slug,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      sku: product.sku,
      descriptionAr: product.descriptionAr,
      descriptionEn: product.descriptionEn,
      shortDescriptionAr,
      shortDescriptionEn,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      stock: product.stock,
      lowStockThreshold: 5,
      weightGrams: product.weightGrams ?? null,
      brandId: brandId ?? null,
      categoryId,
      isFeatured: product.isFeatured ?? false,
      isNew: product.isNew ?? false,
      isActive: true,
      type: product.isBundle ? ('BUNDLE' as const) : ('SIMPLE' as const),
      specs: product.specs as unknown as Prisma.InputJsonValue,
      tags: product.tags,
      ratingAverage: product.ratingAverage ?? 0,
      ratingCount: product.ratingCount ?? 0,
      soldCount: product.soldCount ?? 0,
    } satisfies Prisma.ProductUncheckedCreateInput;

    const record = await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: { ...data },
    });

    productBySlug.set(record.slug, record.id);
    productIds.push(record.id);
  }

  await prisma.bundleItem.deleteMany({ where: { bundleId: { in: productIds } } });
  await prisma.productImage.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } });

  for (const product of seedProducts) {
    const productId = productBySlug.get(product.slug);
    if (!productId) {
      continue;
    }

    await writePlaceholder('products', `${product.slug}.svg`, product.nameEn, product.sku, 1);
    await writePlaceholder(
      'products',
      `${product.slug}-alt.svg`,
      product.nameEn,
      product.categorySlug.replace(/-/g, ' ').toUpperCase(),
      2,
    );

    await prisma.productImage.createMany({
      data: [
        {
          productId,
          url: `/uploads/products/${product.slug}.svg`,
          altAr: product.nameAr,
          altEn: product.nameEn,
          sortOrder: 0,
          isPrimary: true,
        },
        {
          productId,
          url: `/uploads/products/${product.slug}-alt.svg`,
          altAr: `${product.nameAr} - صورة إضافية`,
          altEn: `${product.nameEn} - alternate view`,
          sortOrder: 1,
          isPrimary: false,
        },
      ],
    });

    if (product.variants && product.variants.length > 0) {
      await prisma.productVariant.createMany({
        data: product.variants.map((variant, index) => ({
          productId,
          nameAr: variant.nameAr,
          nameEn: variant.nameEn,
          sku: variant.sku,
          priceDelta: variant.priceDelta,
          stock: variant.stock,
          isActive: true,
          sortOrder: variant.sortOrder ?? index,
        })),
      });
    }
  }

  for (const product of seedProducts) {
    const bundleId = productBySlug.get(product.slug);
    if (!bundleId || !product.bundleItems) {
      continue;
    }
    for (const item of product.bundleItems) {
      const componentId = productBySlug.get(item.componentSlug);
      if (!componentId) {
        throw new Error(`Unknown bundle component ${item.componentSlug} for ${product.slug}`);
      }
      await prisma.bundleItem.create({
        data: { bundleId, componentId, quantity: item.quantity },
      });
    }
  }

  // INITIAL stock movement for products that have none yet (idempotent).
  for (const product of seedProducts) {
    const productId = productBySlug.get(product.slug);
    if (!productId) {
      continue;
    }
    const existingMovements = await prisma.stockMovement.count({ where: { productId } });
    if (existingMovements === 0) {
      const record = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true },
      });
      if (!record) {
        continue;
      }
      if (record.variants.length > 0) {
        for (const variant of record.variants) {
          if (variant.stock > 0) {
            await prisma.stockMovement.create({
              data: { productId, variantId: variant.id, delta: variant.stock, reason: 'INITIAL', note: 'Initial stock (seed)' },
            });
          }
        }
      } else if (record.stock > 0) {
        await prisma.stockMovement.create({
          data: { productId, delta: record.stock, reason: 'INITIAL', note: 'Initial stock (seed)' },
        });
      }
    }
  }

  const [categoryCount, brandCount, productCount] = await Promise.all([
    prisma.category.count(),
    prisma.brand.count(),
    prisma.product.count(),
  ]);

  console.log(
    `Catalog ready: ${categoryCount} categories, ${brandCount} brands, ${productCount} products`,
  );
}

interface SeedReview {
  productSlug: string;
  customerEmail: string;
  rating: number;
  title?: string;
  comment: string;
  status: ReviewStatus;
  isVerifiedPurchase?: boolean;
  createdAt?: string;
}

const seedReviews: SeedReview[] = [
  { productSlug: 'arduino-uno-r3', customerEmail: 'customer1@engineering-lab.local', rating: 5, title: 'ممتازة جداً', comment: 'لوحة أصلية ممتازة والتوصيل سريع، أنصح بها بشدة.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-06-14T10:00:00Z' },
  { productSlug: 'arduino-uno-r3', customerEmail: 'customer2@engineering-lab.local', rating: 5, comment: 'Original board, works out of the box. Great for students.', status: 'APPROVED', createdAt: '2026-07-02T10:00:00Z' },
  { productSlug: 'arduino-uno-r3', customerEmail: 'customer3@engineering-lab.local', rating: 4, comment: 'جودة ممتازة بس السعر أعلى شوية من البدائل الصينية.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-07-20T10:00:00Z' },
  { productSlug: 'arduino-uno-r3', customerEmail: 'customer4@engineering-lab.local', rating: 4, comment: 'Works well after installing the drivers. Tutorials are clear.', status: 'APPROVED', createdAt: '2026-08-05T10:00:00Z' },
  { productSlug: 'arduino-uno-r3', customerEmail: 'customer5@engineering-lab.local', rating: 2, comment: 'وصلت مكسورة العلبة لكن اللوحة سليمة والدعم عوّضني.', status: 'PENDING', createdAt: '2026-08-19T10:00:00Z' },
  { productSlug: 'raspberry-pi-5-4gb', customerEmail: 'customer1@engineering-lab.local', rating: 5, title: 'وحش صغير', comment: 'أسرع بكثير من Raspberry Pi 4. مناسب كخوادم صغيرة.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-06-25T10:00:00Z' },
  { productSlug: 'raspberry-pi-5-4gb', customerEmail: 'customer6@engineering-lab.local', rating: 5, comment: 'Best SBC I have used. Runs desktop Linux smoothly.', status: 'APPROVED', createdAt: '2026-07-15T10:00:00Z' },
  { productSlug: 'raspberry-pi-5-4gb', customerEmail: 'customer2@engineering-lab.local', rating: 1, comment: 'Not compatible with my old case, expected that but the listing should warn more clearly.', status: 'REJECTED', createdAt: '2026-07-28T10:00:00Z' },
  { productSlug: 'esp32-devkit-v1', customerEmail: 'customer3@engineering-lab.local', rating: 5, title: 'الخيار الأفضل للـ IoT', comment: 'واي فاي سريع والسعر ممتاز. بستخدمه في كل مشاريعي.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-06-10T10:00:00Z' },
  { productSlug: 'esp32-devkit-v1', customerEmail: 'customer4@engineering-lab.local', rating: 4, comment: 'Solid board. Power via USB is fine, avoid powering from 3.3V pin.', status: 'APPROVED', createdAt: '2026-07-09T10:00:00Z' },
  { productSlug: 'esp32-devkit-v1', customerEmail: 'customer5@engineering-lab.local', rating: 4, comment: 'ممتازة بسعرها، بس تحتاج تفعيل الـ flash mode أحياناً.', status: 'APPROVED', createdAt: '2026-08-11T10:00:00Z' },
  { productSlug: 'esp32-devkit-v1', customerEmail: 'customer6@engineering-lab.local', rating: 3, comment: 'Works but antenna placement matters near metal boxes.', status: 'PENDING', createdAt: '2026-08-26T10:00:00Z' },
  { productSlug: 'hc-sr04-ultrasonic-sensor', customerEmail: 'customer1@engineering-lab.local', rating: 5, comment: 'حساس دقيق للمسافة وسعره زهيد. مناسب لمشاريع الروبوتات.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-05-17T10:00:00Z' },
  { productSlug: 'hc-sr04-ultrasonic-sensor', customerEmail: 'customer2@engineering-lab.local', rating: 4, comment: 'Good accuracy with a median filter in software.', status: 'APPROVED', createdAt: '2026-06-28T10:00:00Z' },
  { productSlug: 'hc-sr04-ultrasonic-sensor', customerEmail: 'customer3@engineering-lab.local', rating: 5, comment: 'شغال ممتاز مع أردوينو، المكتبة مجانية على جيت هاب.', status: 'APPROVED', createdAt: '2026-07-19T10:00:00Z' },
  { productSlug: 'jumper-wires-120pcs', customerEmail: 'customer4@engineering-lab.local', rating: 4, comment: 'أسلاك جيدة وتانية على الألوان. M-F variant needed for sensors.', status: 'APPROVED', createdAt: '2026-06-30T10:00:00Z' },
  { productSlug: 'jumper-wires-120pcs', customerEmail: 'customer5@engineering-lab.local', rating: 5, comment: 'جودة أعلى من المتوقع بالسعر، النحاس سميك ومش بيتقطع.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-07-25T10:00:00Z' },
  { productSlug: 'led-assortment-100pcs', customerEmail: 'customer6@engineering-lab.local', rating: 4, comment: 'مجموعة عملية ومستوفاة لكل الألوان.', status: 'APPROVED', createdAt: '2026-06-16T10:00:00Z' },
  { productSlug: 'led-assortment-100pcs', customerEmail: 'customer1@engineering-lab.local', rating: 4, comment: 'Good assortment for breadboarding projects.', status: 'APPROVED', createdAt: '2026-08-03T10:00:00Z' },
  { productSlug: 'sg90-servo-motor', customerEmail: 'customer2@engineering-lab.local', rating: 5, comment: 'سيرفو ممتاز لذراع الروبوت، القراءة دقيقة مع مكتبة Servo.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-05-30T10:00:00Z' },
  { productSlug: 'sg90-servo-motor', customerEmail: 'customer3@engineering-lab.local', rating: 3, comment: 'Decent motor, gears are plastic — avoid stall torque.', status: 'APPROVED', createdAt: '2026-07-13T10:00:00Z' },
  { productSlug: 'dht22-temperature-humidity-sensor', customerEmail: 'customer4@engineering-lab.local', rating: 4, title: 'دقيق وموثوق', comment: 'أدق من DHT11 بفرق واضح، مناسب لمحطات الطقس.', status: 'APPROVED', createdAt: '2026-06-21T10:00:00Z' },
  { productSlug: 'dht22-temperature-humidity-sensor', customerEmail: 'customer5@engineering-lab.local', rating: 5, comment: 'Very stable readings with a 2-second sampling interval.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-07-23T10:00:00Z' },
  { productSlug: 'lcd-16x2-i2c', customerEmail: 'customer6@engineering-lab.local', rating: 4, comment: 'شاشة ممتازة والتوصيل بالآي تو سي سهل جداً مع hd44780.', status: 'APPROVED', createdAt: '2026-08-07T10:00:00Z' },
  { productSlug: 'breadboard-830', customerEmail: 'customer1@engineering-lab.local', rating: 5, comment: 'لوح تجارب متين والنقاط مش فضفاضة زي الرخيصة.', status: 'APPROVED', createdAt: '2026-05-23T10:00:00Z' },
  { productSlug: 'arduino-starter-kit', customerEmail: 'customer2@engineering-lab.local', rating: 5, title: 'هدية مثالية للمبتدئين', comment: 'كل حاجة في مكانها في الصندوق، بدأت أول مشروع في نفس اليوم.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-06-18T10:00:00Z' },
  { productSlug: 'arduino-starter-kit', customerEmail: 'customer3@engineering-lab.local', rating: 5, comment: 'الخُطوط والأدلة المرفقة ساعدتني أخلص أول ٥ مشاريع بسرعة.', status: 'APPROVED', createdAt: '2026-07-17T10:00:00Z' },
  { productSlug: 'esp32-iot-kit', customerEmail: 'customer4@engineering-lab.local', rating: 5, comment: 'الحقيبة متكاملة فعلاً، ما احتجت أشتري أي شيء زيادة.', status: 'PENDING', createdAt: '2026-08-22T10:00:00Z' },
  { productSlug: 'relay-module-1-channel', customerEmail: 'customer5@engineering-lab.local', rating: 5, comment: 'العزل البصري بيريح الضمير، استخدمته لتشغيل مروحة.', status: 'APPROVED', isVerifiedPurchase: true, createdAt: '2026-07-29T10:00:00Z' },
];

async function seedReviewsAndRatings(customerIds: Map<string, string>): Promise<void> {
  const productBySlug = new Map<string, string>();
  const products = await prisma.product.findMany({ select: { id: true, slug: true } });
  for (const product of products) {
    productBySlug.set(product.slug, product.id);
  }

  for (const review of seedReviews) {
    const productId = productBySlug.get(review.productSlug);
    const userId = customerIds.get(review.customerEmail);
    if (!productId || !userId) {
      throw new Error(`Cannot seed review: unknown product ${review.productSlug} or customer ${review.customerEmail}`);
    }

    await prisma.review.upsert({
      where: { productId_userId: { productId, userId } },
      update: {
        rating: review.rating,
        title: review.title ?? null,
        comment: review.comment,
        status: review.status,
        isVerifiedPurchase: review.isVerifiedPurchase ?? false,
      },
      create: {
        productId,
        userId,
        rating: review.rating,
        title: review.title ?? null,
        comment: review.comment,
        status: review.status,
        isVerifiedPurchase: review.isVerifiedPurchase ?? false,
        createdAt: review.createdAt ? new Date(review.createdAt) : undefined,
      },
    });
  }

  // Recompute denormalized rating stats from APPROVED reviews per touched product.
  const touched = [...new Set(seedReviews.map((review) => review.productSlug))];
  for (const slug of touched) {
    const productId = productBySlug.get(slug);
    if (!productId) {
      continue;
    }
    const aggregates = await prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: aggregates._count._all === 0 ? 0 : Number((aggregates._avg.rating ?? 0).toFixed(2)),
        ratingCount: aggregates._count._all,
      },
    });
  }

  const [total, approved, pending, rejected] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { status: 'APPROVED' } }),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.review.count({ where: { status: 'REJECTED' } }),
  ]);
  console.log(`Reviews ready: ${total} total (${approved} approved, ${pending} pending, ${rejected} rejected)`);
}

async function seedBanners(): Promise<void> {
  const banners = [
    {
      titleEn: 'Engineering Lab — Your Trusted Store for Electronics Components',
      titleAr: 'إنجينيرنج لاب — متجرك الموثوق للمكونات الإلكترونية',
      subtitleEn: 'Arduino, sensors, tools and everything between — genuine parts with warranty.',
      subtitleAr: 'أردوينو وحساسات وعدد وكل ما تحتاجه — قطع أصلية مع ضمان.',
      highlightEn: 'Trusted Store',
      highlightAr: 'متجرك الموثوق',
      bulletsEn: ['High Quality', 'Best Prices', 'Wide Selection'],
      bulletsAr: ['جودة عالية', 'أفضل الأسعار', 'تشكيلة واسعة'],
      ctaLabelEn: 'Shop Now',
      ctaLabelAr: 'تسوق الآن',
      ctaUrl: '/ar/catalog',
      location: 'HOME_HERO' as const,
      sortOrder: 1,
      image: 'hero-components',
    },
    {
      titleEn: 'Everything You Need for Your Next Project',
      titleAr: 'كل ما تحتاجه لمشروعك القادم',
      subtitleEn: 'Kits from Arduino to ESP32 — from your first LED to your first IoT device.',
      subtitleAr: 'حقائب من أردوينو حتى ESP32 — من أول ليد لأول جهاز إنترنت أشياء.',
      highlightEn: 'Next Project',
      highlightAr: 'مشروعك القادم',
      bulletsEn: ['Starter Kits', 'Genuine Clones', 'Fast Delivery'],
      bulletsAr: ['حقائب للمبتدئين', 'قطع أصلية', 'توصيل سريع'],
      ctaLabelEn: 'Explore Kits',
      ctaLabelAr: 'استكشف الحقائب',
      ctaUrl: '/ar/catalog?type=BUNDLE',
      location: 'HOME_HERO' as const,
      sortOrder: 2,
      image: 'hero-kits',
    },
    {
      titleEn: 'Free Shipping on Orders Over 2,000 EGP',
      titleAr: 'شحن مجاني للطلبات فوق 2000 جنيه',
      subtitleEn: 'Same-day dispatch in Cairo and Giza, 2–4 days everywhere else in Egypt.',
      subtitleAr: 'شحن في نفس اليوم داخل القاهرة والجيزة، و2 إلى 4 أيام لباقي المحافظات.',
      highlightEn: 'Free Shipping',
      highlightAr: 'شحن مجاني',
      bulletsEn: ['Cash on Delivery', 'Easy Returns', 'Secure Payment'],
      bulletsAr: ['الدفع عند الاستلام', 'استرجاع سهل', 'دفع آمن'],
      ctaLabelEn: 'Start Shopping',
      ctaLabelAr: 'ابدأ التسوق',
      ctaUrl: '/ar/catalog',
      location: 'HOME_HERO' as const,
      sortOrder: 3,
      image: 'hero-shipping',
    },
    {
      titleEn: 'New Arrivals',
      titleAr: 'وصل حديثًا',
      subtitleEn: null,
      subtitleAr: null,
      highlightEn: null,
      highlightAr: null,
      bulletsEn: [],
      bulletsAr: [],
      ctaLabelEn: 'See What\'s New',
      ctaLabelAr: 'شوف الجديد',
      ctaUrl: '/ar/catalog?sort=newest',
      location: 'HOME_STRIP' as const,
      sortOrder: 1,
      image: 'strip-new',
    },
    {
      titleEn: 'Best Sellers',
      titleAr: 'الأكثر مبيعًا',
      subtitleEn: null,
      subtitleAr: null,
      highlightEn: null,
      highlightAr: null,
      bulletsEn: [],
      bulletsAr: [],
      ctaLabelEn: 'Show Best Sellers',
      ctaLabelAr: 'الأكثر مبيعًا',
      ctaUrl: '/ar/catalog?sort=popular',
      location: 'HOME_STRIP' as const,
      sortOrder: 2,
      image: 'strip-popular',
    },
  ];

  for (const banner of banners) {
    const data = {
      titleAr: banner.titleAr,
      titleEn: banner.titleEn,
      subtitleAr: banner.subtitleAr,
      subtitleEn: banner.subtitleEn,
      highlightAr: banner.highlightAr,
      highlightEn: banner.highlightEn,
      bulletsAr: banner.bulletsAr,
      bulletsEn: banner.bulletsEn,
      ctaLabelAr: banner.ctaLabelAr,
      ctaLabelEn: banner.ctaLabelEn,
      ctaUrl: banner.ctaUrl,
      imageUrl: `/uploads/banners/${banner.image}.svg`,
      location: banner.location,
      sortOrder: banner.sortOrder,
      isActive: true,
      startsAt: null,
      endsAt: null,
    };

    const existing = await prisma.banner.findFirst({ where: { titleEn: banner.titleEn } });
    if (existing) {
      await prisma.banner.update({ where: { id: existing.id }, data });
    } else {
      await prisma.banner.create({ data });
    }

    await writePlaceholder(
      'banners',
      `${banner.image}.svg`,
      (banner.titleEn.split('—')[0] ?? banner.titleEn).trim(),
      'ENGINEERING LAB',
      banner.sortOrder,
    );
  }

  const bannerCount = await prisma.banner.count();
  console.log(`Banners ready: ${bannerCount}`);
}

async function seedContent(): Promise<void> {
  for (const item of seedFaqs) {
    const existing = await prisma.faqItem.findFirst({
      where: { questionEn: item.questionEn },
      select: { id: true },
    });
    const data = {
      questionAr: item.questionAr,
      questionEn: item.questionEn,
      answerAr: item.answerAr,
      answerEn: item.answerEn,
      category: item.category,
      sortOrder: item.sortOrder,
      isActive: true,
    };
    if (existing) {
      await prisma.faqItem.update({ where: { id: existing.id }, data });
    } else {
      await prisma.faqItem.create({ data });
    }
  }

  for (const page of seedPages) {
    const data = {
      titleAr: page.titleAr,
      titleEn: page.titleEn,
      contentAr: page.contentAr,
      contentEn: page.contentEn,
      isPublished: true,
    };
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: data,
      create: { slug: page.slug, ...data },
    });
  }

  for (const setting of seedSettings) {
    const value = setting.value as Prisma.InputJsonValue;
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value },
      create: { key: setting.key, value },
    });
  }

  const [faqCount, pageCount, settingCount] = await Promise.all([
    prisma.faqItem.count(),
    prisma.page.count(),
    prisma.setting.count(),
  ]);
  console.log(
    `Content ready: ${faqCount} FAQs, ${pageCount} pages, ${settingCount} settings`,
  );
}

async function main(): Promise<void> {
  const adminId = await seedAdmin();
  const customerIds = await seedCustomers();
  await seedCatalog();
  await seedShippingZones();
  await seedReviewsAndRatings(customerIds);
  await seedBanners();
  await seedContent();
  console.log(`Seed complete (admin id ${adminId})`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
