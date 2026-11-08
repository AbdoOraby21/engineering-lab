import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const base = '/api/v1/content/banners';

beforeEach(async () => {
  await resetDatabase();
});

describe('content banners', () => {
  it('returns only active banners inside their schedule window', async () => {
    await prisma.banner.createMany({
      data: [
        {
          titleAr: 'Ø¨Ø§Ù†Ø± Ù†Ø´Ø·',
          titleEn: 'Active banner',
          location: 'HOME_HERO',
          sortOrder: 1,
          isActive: true,
        },
        {
          titleAr: 'Ø¨Ø§Ù†Ø± Ù…Ø¹Ø·Ù„',
          titleEn: 'Disabled banner',
          location: 'HOME_HERO',
          sortOrder: 2,
          isActive: false,
        },
        {
          titleAr: 'Ø¨Ø§Ù†Ø± Ù‚Ø§Ø¯Ù…',
          titleEn: 'Future banner',
          location: 'HOME_HERO',
          sortOrder: 3,
          isActive: true,
          startsAt: new Date(Date.now() + 60_000),
        },
        {
          titleAr: 'Ø¨Ø§Ù†Ø± Ù…Ù†ØªÙ‡ÙŠ',
          titleEn: 'Expired banner',
          location: 'HOME_STRIP',
          sortOrder: 1,
          isActive: true,
          endsAt: new Date(Date.now() - 60_000),
        },
        {
          titleAr: 'Ø´Ø±ÙŠØ· Ù†Ø´Ø·',
          titleEn: 'Active strip',
          location: 'HOME_STRIP',
          sortOrder: 2,
          isActive: true,
        },
      ],
    });

    const all = await request(app).get(base);
    expect(all.status).toBe(200);
    const banners = (all.body as { data: { banners: { titleEn: string }[] } }).data.banners;
    expect(banners.map((banner) => banner.titleEn)).toEqual(['Active banner', 'Active strip']);

    const hero = await request(app).get(`${base}?location=HOME_HERO`);
    const heroBanners = (hero.body as { data: { banners: { titleEn: string }[] } }).data.banners;
    expect(heroBanners.map((banner) => banner.titleEn)).toEqual(['Active banner']);

    const strip = await request(app).get(`${base}?location=HOME_STRIP`);
    const stripBanners = (strip.body as { data: { banners: { titleEn: string }[] } }).data.banners;
    expect(stripBanners.map((banner) => banner.titleEn)).toEqual(['Active strip']);
  });

  it('rejects an unknown location filter', async () => {
    const response = await request(app).get(`${base}?location=NOPE`);
    expect(response.status).toBe(422);
    expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('contact, FAQ, pages and settings', () => {
  it('stores contact messages, honours the honeypot and enforces the rate limit', async () => {
    const payload = {
      name: 'Contact User',
      email: 'contact@example.com',
      phone: '01000000000',
      subject: 'Bulk order',
      message: 'I would like a quote for 50 Arduino boards.',
    };

    const honeypot = await request(app)
      .post('/api/v1/contact')
      .send({ ...payload, website: 'https://spam.example' });
    expect(honeypot.status).toBe(201);
    expect(await prisma.contactMessage.count()).toBe(0);

    for (let index = 0; index < 4; index += 1) {
      const response = await request(app).post('/api/v1/contact').send(payload);
      expect(response.status).toBe(201);
    }

    const limited = await request(app).post('/api/v1/contact').send(payload);
    expect(limited.status).toBe(429);
    expect((limited.body as { error: { code: string } }).error.code).toBe('RATE_LIMITED');
    expect(await prisma.contactMessage.count()).toBe(4);

    const stored = await prisma.contactMessage.findFirst();
    expect(stored).toMatchObject({ subject: 'Bulk order', email: 'contact@example.com' });
  });

  it('returns active FAQs and supports category filtering', async () => {
    await prisma.faqItem.createMany({
      data: [
        {
          questionAr: '???? ???',
          questionEn: 'First question',
          answerAr: '?????',
          answerEn: 'Answer',
          category: 'ORDERS',
          sortOrder: 2,
        },
        {
          questionAr: '???? ????',
          questionEn: 'Second question',
          answerAr: '?????',
          answerEn: 'Answer',
          category: 'ORDERS',
          sortOrder: 1,
        },
        {
          questionAr: '???? ????',
          questionEn: 'Inactive question',
          answerAr: '?????',
          answerEn: 'Answer',
          category: 'SHIPPING',
          isActive: false,
        },
      ],
    });

    const all = await request(app).get('/api/v1/faq');
    expect(all.status).toBe(200);
    const body = all.body as {
      data: { items: { questionEn: string }[]; categories: string[] };
    };
    expect(body.data.items.map((item) => item.questionEn)).toEqual([
      'Second question',
      'First question',
    ]);
    expect(body.data.categories).toEqual(['ORDERS']);

    const filtered = await request(app).get('/api/v1/faq?category=SHIPPING');
    expect((filtered.body as { data: { items: unknown[] } }).data.items).toHaveLength(0);
  });

  it('serves published pages only', async () => {
    await prisma.page.create({
      data: {
        slug: 'returns',
        titleAr: '?????????',
        titleEn: 'Returns',
        contentAr: '<p>????</p>',
        contentEn: '<p>English</p>',
      },
    });
    await prisma.page.create({
      data: {
        slug: 'draft',
        titleAr: '?????',
        titleEn: 'Draft',
        contentAr: '',
        contentEn: '',
        isPublished: false,
      },
    });

    const page = await request(app).get('/api/v1/pages/returns');
    expect(page.status).toBe(200);
    expect((page.body as { data: { page: { titleEn: string } } }).data.page.titleEn).toBe(
      'Returns',
    );

    const draft = await request(app).get('/api/v1/pages/draft');
    expect(draft.status).toBe(404);
    expect((draft.body as { error: { code: string } }).error.code).toBe('PAGE_NOT_FOUND');
  });

  it('returns public settings merged with defaults', async () => {
    await prisma.setting.createMany({
      data: [
        { key: 'contact.phone', value: '+20 111 222 3333' },
        { key: 'shipping.freeThreshold', value: 300000 },
        {
          key: 'social.links',
          value: { facebook: 'https://facebook.com/engineeringlab' },
        },
      ],
    });

    const response = await request(app).get('/api/v1/settings/public');
    expect(response.status).toBe(200);
    const settings = (
      response.body as {
        data: {
          settings: {
            contactPhone: string;
            freeShippingThreshold: number;
            socialLinks: { facebook?: string };
            storeName: string;
          };
        };
      }
    ).data.settings;
    expect(settings.contactPhone).toBe('+20 111 222 3333');
    expect(settings.freeShippingThreshold).toBe(300000);
    expect(settings.socialLinks.facebook).toBe('https://facebook.com/engineeringlab');
    expect(settings.storeName).toBe('Engineering Lab');
  });
});

