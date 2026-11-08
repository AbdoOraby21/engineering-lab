import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generateSitemapXml, generateRobotsTxt, findSlugRedirect } from '../services/seo.service.js';

const router = Router();

router.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const xml = await generateSitemapXml();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }),
);

router.get(
  '/robots.txt',
  asyncHandler(async (_req, res) => {
    const txt = await generateRobotsTxt();
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(txt);
  }),
);

// Slug redirect middleware: check for legacy/changed slugs and 301/302 redirect.
export function slugRedirectMiddleware() {
  return asyncHandler(async (req, res, next) => {
    const path = req.path;
    // Only check GET/HEAD requests for HTML-ish paths.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    // Skip API, static, and asset paths.
    if (
      path.startsWith('/api/') ||
      path.startsWith('/uploads/') ||
      path.startsWith('/api/docs') ||
      path.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff2?)$/i)
    ) {
      return next();
    }
    // Normalize source: strip trailing slash, keep as-is otherwise.
    const source = path.replace(/\/$/, '') || '/';
    const redirect = await findSlugRedirect(source);
    if (!redirect) {
      return next();
    }
    const status = redirect.isPermanent ? 301 : 302;
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = redirect.target.startsWith('http')
      ? redirect.target
      : `${req.protocol}://${req.get('host')}${redirect.target}${queryString}`;
    res.redirect(status, targetUrl);
  });
}

export default router;
