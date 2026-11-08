import { Router } from 'express';
import {
  bannerListQuerySchema,
  contactSchema,
  faqQuerySchema,
  slugParamSchema,
  type BannerListQuery,
  type ContactInput,
  type FaqQuery,
  type SlugParam,
} from '@engineering-lab/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { contactLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import { listBanners } from '../services/banner.service.js';
import {
  getPage,
  getPublicSettings,
  listFaq,
  submitContact,
} from '../services/content.service.js';

const router = Router();

router.get(
  '/banners',
  validate({ query: bannerListQuerySchema }),
  asyncHandler(async (req, res) => {
    const banners = await listBanners((req.query as BannerListQuery).location);
    sendData(res, { banners });
  }),
);

router.post(
  '/contact',
  contactLimiter,
  validate({ body: contactSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as ContactInput;
    // Honeypot: bots fill hidden fields. Pretend success without writing.
    if (input.website && input.website.trim().length > 0) {
      sendData(res, { message: 'Message received' }, 201);
      return;
    }

    await submitContact(input);
    sendData(
      res,
      {
        message: 'Message received. Our team will reply within one business day.',
      },
      201,
    );
  }),
);

router.get(
  '/faq',
  validate({ query: faqQuerySchema }),
  asyncHandler(async (req, res) => {
    const { category } = req.query as unknown as FaqQuery;
    const items = await listFaq(category);
    const categories = [...new Set(items.map((item) => item.category))];
    sendData(res, { items, categories });
  }),
);

router.get(
  '/pages/:slug',
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const page = await getPage((req.params as SlugParam).slug);
    sendData(res, { page });
  }),
);

router.get(
  '/settings/public',
  asyncHandler(async (_req, res) => {
    const settings = await getPublicSettings();
    sendData(res, { settings });
  }),
);

export default router;
