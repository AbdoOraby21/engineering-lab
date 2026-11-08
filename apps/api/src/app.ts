import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins, env, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { compression } from './middleware/compression.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import healthRoutes from './routes/health.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import searchRoutes from './routes/search.routes.js';
import adminRoutes from './routes/admin/index.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import supportRoutes from './routes/support.routes.js';
import contentRoutes from './routes/content.routes.js';
import cartRoutes from './routes/cart.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import orderRoutes from './routes/order.routes.js';
import adminOrderRoutes from './routes/admin/order.routes.js';
import blogRoutes from './routes/blog.routes.js';
import adminBlogRoutes from './routes/admin/blog.routes.js';
import { localUploadRoot } from './services/storage/index.js';
import { openApiDocument } from './docs/openapi.js';
import seoRoutes, { slugRedirectMiddleware } from './routes/seo.routes.js';
import { publicNewsletterRoutes, adminNewsletterRoutes } from './routes/newsletter.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('etag', 'strong');

  const cspDirectives: Record<string, string[]> = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
  };

  if (env.CLOUDINARY_CLOUD_NAME) {
    cspDirectives.imgSrc = [...(cspDirectives.imgSrc ?? []), 'https://res.cloudinary.com'];
    cspDirectives.connectSrc = [...(cspDirectives.connectSrc ?? []), 'https://res.cloudinary.com'];
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: cspDirectives,
        reportOnly: false,
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : { maxAge: 0 },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xContentTypeOptions: true,
    }),
  );
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/v1/health',
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use(globalLimiter);
  app.use(slugRedirectMiddleware());
  app.use(
    '/uploads',
    express.static(localUploadRoot, {
      fallthrough: true,
      maxAge: isProduction ? '7d' : 0,
      immutable: isProduction,
    }),
  );

  // Gzip/deflate compression for compressible responses.
  app.use(compression());

  // Cache-Control hints: public read-only catalog/content endpoints are
  // cacheable; everything else defaults to private/no-cache.
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-cache');
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Engineering Lab API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/v1/health',
    });
  });

  app.use(seoRoutes);

app.use('/api/v1/newsletter', publicNewsletterRoutes);
app.use('/api/v1/admin/newsletter', adminNewsletterRoutes());

  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/catalog', catalogRoutes);
  // Spec aliases: the catalog surface is also exposed at the API root
  // (/categories/tree, /products, /brands, /reviews/:id, ...).
  app.use('/api/v1', catalogRoutes);
  app.use('/api/v1/search', searchRoutes);
  app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/blog', adminBlogRoutes);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminOrderRoutes);
app.use('/api/v1/content', contentRoutes);
  app.use('/api/v1', contentRoutes);
  app.use('/api/v1', healthRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  if (isProduction) {
    logger.info({ env: env.NODE_ENV }, 'API initialized in production mode');
  }

  return app;
}
