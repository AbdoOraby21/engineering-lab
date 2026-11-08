import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/jwt.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const base = '/api/v1/settings/public';
const adminBase = '/api/v1/admin/settings/store';

const adminEmail = 'admin-settings@example.com';
let adminToken = '';

beforeEach(async () => {
  await resetDatabase();
  const admin = await prisma.user.create({
    data: {
      name: 'Settings Admin',
      email: adminEmail,
      passwordHash: 'hash',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  adminToken = signAccessToken(admin.id, 'ADMIN').token;
});

describe('public settings', () => {
  it('returns public settings with defaults and never exposes secrets', async () => {
    const response = await request(app).get(base);
    expect(response.status).toBe(200);
    const body = response.body as { data: { settings: Record<string, unknown> } };
    const settings = body.data.settings;
    expect(settings.storeName).toBe('Engineering Lab');
    expect(settings.storeNameAr).toBe('Engineering Lab');
    expect(settings.credit).toMatchObject({
      enabled: true,
      nameEn: 'Abdelrahman Oraby',
      nameAr: 'عبدالرحمن عرابي',
      url: 'https://abdo-oraby.myftp.org',
    });
    // Secrets must not be leaked through the public endpoint.
    expect(settings).not.toHaveProperty('smtp');
    expect(settings).not.toHaveProperty('SMTP_PASS');
    expect(settings).not.toHaveProperty('whatsappAccessToken');
  });

  it('updates store settings via admin and reflects them publicly', async () => {
    const update = await request(app)
      .put(adminBase)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        'store.name': 'Test Store',
        'store.nameAr': 'متجر اختبار',
        'contact.email': 'shop@example.com',
        'contact.phone': '+201234567890',
        'contact.whatsapp': '+201234567890',
        'site.credit': { enabled: false, nameEn: 'Dev', nameAr: 'مطور', url: 'https://example.com' },
        'social.links': { facebook: 'https://facebook.com/shop', instagram: '' },
      });
    expect(update.status).toBe(200);

    const publicRes = await request(app).get(base);
    expect(publicRes.status).toBe(200);
    const settings = (publicRes.body as { data: { settings: Record<string, unknown> } }).data.settings;
    expect(settings.storeName).toBe('Test Store');
    expect(settings.storeNameAr).toBe('متجر اختبار');
    expect(settings.contactEmail).toBe('shop@example.com');
    expect(settings.contactPhone).toBe('+201234567890');
    expect(settings.whatsapp).toBe('+201234567890');
    expect(settings.credit).toMatchObject({ enabled: false, nameEn: 'Dev', nameAr: 'مطور' });
    expect((settings.socialLinks as Record<string, string>).facebook).toBe('https://facebook.com/shop');
  });

  it('rejects invalid email and phone on settings update', async () => {
    const badEmail = await request(app)
      .put(adminBase)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 'contact.email': 'not-an-email' });
    expect(badEmail.status).toBe(422);

    const badPhone = await request(app)
      .put(adminBase)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 'contact.phone': 'abc' });
    expect(badPhone.status).toBe(422);
  });

  it('rejects non-admin access to settings update', async () => {
    const customer = await prisma.user.create({
      data: {
        name: 'C',
        email: 'customer-settings@example.com',
        passwordHash: 'hash',
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });
    const token = signAccessToken(customer.id, 'CUSTOMER').token;
    const response = await request(app)
      .put(adminBase)
      .set('Authorization', `Bearer ${token}`)
      .send({ 'store.name': 'Hacked' });
    expect(response.status).toBe(403);
  });
});
