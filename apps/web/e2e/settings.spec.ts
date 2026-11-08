import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

const ADMIN_EMAIL = 'admin-settings-e2e@example.com';
const ADMIN_PASSWORD = 'Password123';
const NEW_PHONE = '+201555000123';

test.beforeAll(async () => {
  await prisma.user.create({
    data: {
      name: 'Settings E2E Admin',
      email: ADMIN_EMAIL,
      passwordHash: await (await import('bcrypt')).hash(ADMIN_PASSWORD, 12),
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  await prisma.page.upsert({
    where: { slug: 'about' },
    update: {},
    create: {
      slug: 'about',
      titleAr: 'عننا',
      titleEn: 'About Us',
      contentAr: 'محتوى قديم',
      contentEn: 'Old content',
      isPublished: true,
    },
  });
});

test.afterAll(async () => {
  await prisma.page.delete({ where: { slug: 'about' } });
  await prisma.user.delete({ where: { email: ADMIN_EMAIL } });
  await prisma.$disconnect();
});

test('admin changes phone and About Us; storefront reflects it live (en + ar)', async ({ page }) => {
  // --- Log in as admin ---
  await page.goto(`${BASE}/en/login`);
  await page.fill('input#email', ADMIN_EMAIL);
  await page.fill('input#password', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/en\/account/);

  // --- Change phone in admin settings ---
  await page.goto(`${BASE}/en/admin/settings`);
  await page.waitForSelector('input[name="contact.phone"]', { timeout: 15_000 });
  const phoneInput = page.locator('input[name="contact.phone"]');
  await phoneInput.fill('');
  await phoneInput.type(NEW_PHONE);
  await page.click('button:has-text("Save changes")');
  await expect(page.locator('text=Settings updated')).toBeVisible();

  // --- Public Contact page shows the new phone ---
  await page.goto(`${BASE}/en/contact`);
  await expect(page.locator('text=' + NEW_PHONE)).toBeVisible();

  // --- Footer shows the new phone ---
  await page.goto(`${BASE}/en`);
  await expect(page.locator('footer text=' + NEW_PHONE)).toBeVisible();
  await expect(page.locator('footer a[href="https://abdo-oraby.myftp.org"]')).toBeVisible();

  // --- Admin changes About Us content via Pages CMS ---
  await page.goto(`${BASE}/en/admin/settings`);
  await page.click('button:has-text("Pages")');
  await page.click('text=Edit');
  await page.fill('textarea[name="contentEn"]', 'New About Us content for E2E.');
  await page.fill('textarea[name="contentAr"]', 'محتوى جديد عنا.');
  await page.click('button:has-text("Save changes")');
  await expect(page.locator('text=Settings updated')).toBeVisible();

  // --- Public About page shows new content ---
  await page.goto(`${BASE}/en/about`);
  await expect(page.locator('text=New About Us content for E2E.')).toBeVisible();

  // --- Arabic mirror ---
  await page.goto(`${BASE}/ar/contact`);
  await expect(page.locator('text=' + NEW_PHONE)).toBeVisible();
  await page.goto(`${BASE}/ar/about`);
  await expect(page.locator('text=محتوى جديد عنا.')).toBeVisible();
});
