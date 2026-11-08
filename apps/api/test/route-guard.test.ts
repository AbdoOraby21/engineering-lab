import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { optionalAuth, requireAuth } from '../src/middleware/auth.js';

// Routes that are intentionally public (no authentication required).
// Any route NOT in this list, and not protected by requireAuth/requireRole
// nor marked optionalAuth, is flagged as accidentally public.
const PUBLIC_ROUTE_PREFIXES = [
  '/',
  '/api/docs.json',
  '/api/docs',
  '/api/v1/health',
  '/api/v1/auth',
  '/api/v1/catalog',
  // Spec aliases exposing the same public catalog surface at the API root.
  '/api/v1/categories',
  '/api/v1/brands',
  '/api/v1/products',
  '/api/v1/search',
  '/api/v1/blog',
  '/api/v1/content',
  '/api/v1/newsletter',
  '/api/v1/uploads',
  '/api/v1/seo',
  '/api/v1/sitemap',
];

function isPublic(path: string): boolean {
  // Empty path represents the root route ("/").
  const normalized = path || '/';
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

function collectRoutes(
  stack: unknown[],
  prefix = '',
  ancestorRequiredAuth = false,
  ancestorOptionalAuth = false,
): Array<{ path: string; methods: string[]; requiredAuth: boolean; optionalAuth: boolean }> {
  const routes: Array<{ path: string; methods: string[]; requiredAuth: boolean; optionalAuth: boolean }> = [];

  for (const layer of stack as Array<{
    route?: { methods: Record<string, boolean>; stack: unknown[] };
    handle?: { stack?: unknown[] };
    path?: string;
  }>) {
    if (!layer) continue;

    // Mounted sub-router (e.g. app.use('/api/v1/auth', authRouter)).
    if (layer.handle && typeof layer.handle === 'object' && 'stack' in layer.handle) {
      const mountPath = (layer.path ?? '').replace(/\/$/, '') || '';
      const combined = prefix + mountPath;
      const routerRequired = ancestorRequiredAuth || hasMiddleware(layer.handle.stack ?? [], requireAuth);
      const routerOptional = ancestorOptionalAuth || hasMiddleware(layer.handle.stack ?? [], optionalAuth);
      routes.push(
        ...collectRoutes(layer.handle.stack as unknown[], combined, routerRequired, routerOptional),
      );
      continue;
    }

    // Route layer (e.g. router.get('/x', handler)).
    if (layer.route) {
      const path = prefix + (layer.path ?? '');
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      routes.push({
        path,
        methods,
        requiredAuth: ancestorRequiredAuth || hasMiddleware(layer.route.stack, requireAuth),
        optionalAuth: ancestorOptionalAuth || hasMiddleware(layer.route.stack, optionalAuth),
      });
    }
  }

  return routes;
}

function hasMiddleware(stack: unknown[], target: unknown): boolean {
  return stack.some((layer) => (layer as { handle?: unknown }).handle === target);
}

describe('route guard enumeration', () => {
  it('every non-public route is protected by requireAuth or marked optionalAuth', () => {
    const app = createApp();
    const stack = (app as { _router: { stack: unknown[] } })._router.stack;

    const routes = collectRoutes(stack);

    const accidentallyPublic = routes.filter(
      (r) => !r.requiredAuth && !r.optionalAuth && !isPublic(r.path),
    );

    expect(accidentallyPublic, JSON.stringify(accidentallyPublic, null, 2)).toEqual([]);
  });
});
