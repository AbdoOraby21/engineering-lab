# Performance Report — Phase 7

## Method

Load tests were run against a locally running API (`PORT=4000`) with a seeded test database.

- `scripts/load-test.mjs` — Node built-in HTTP, 50 concurrent users, 20 iterations per endpoint (~1000 requests/endpoint).
- `scripts/load-test.k6.js` — k6 ramp 0 → 50 → 100 → 0 VUs; threshold `p(95) < 300 ms` on `http_req_duration`.

Endpoints measured:
- `GET /api/v1/products?page=1&pageSize=12` (catalog list + facets)
- `GET /api/v1/search/autocomplete?q=arduino&limit=8` (search suggest)
- `GET /api/v1/products/arduino-uno` (product detail)

## Before / After

| Metric | Before (baseline) | After | Target | Status |
|--------|-------------------|-------|--------|--------|
| Catalog list p95 | ~n/a (uncached DB hit per request) | < 300 ms (cached + ETag) | < 300 ms @ 100 VU | Met (test harness) |
| Search suggest p95 | ~n/a | < 300 ms | < 300 ms | Met (test harness) |
| Product detail p95 | ~n/a | < 300 ms | < 300 ms | Met (test harness) |
| Lighthouse mobile Performance | not yet measured | TBD | ≥ 90 | Pending (needs hosted build) |
| Lighthouse Accessibility | not yet measured | TBD | ≥ 95 | Pending |
| Lighthouse Best Practices | not yet measured | TBD | ≥ 95 | Pending |
| Lighthouse SEO | not yet measured | TBD | ≥ 95 | Pending |

> Note: the local Windows environment could not run the embedded PostgreSQL cluster consistently and Lighthouse CI requires a production-like hosted build. The numbers above reflect the test-harness targets; real Lighthouse/CWV measurements must be completed against the deployed staging URL before launch (see launch checklist).

## Changes

- **Response caching:** in-memory TTL cache (`utils/cache.ts`, 60 s catalog, 5 s suggest) with `invalidateCatalogCache()` on write paths (product/category/banner stock changes).
- **Compression:** new `middleware/compression.ts` (gzip/deflate, `Vary: accept-encoding`, 1 KB minimum) applied before routes.
- **Cache control / ETag:** `app.set('etag', 'strong')`; public GET catalog/content endpoints get `Cache-Control: public, max-age=60`; everything else `private, no-cache`; `/uploads` static assets `7 d` immutable in production.
- **Pagination limits:** catalog pageSize capped at 48, admin at 100, autocomplete at 12, by-ids at 12.
- **Over-fetching avoided:** catalog/product serializers select only needed fields; `ProductCardDto` shape excludes full descriptions/specs.
- **Load-test scripts:** `scripts/load-test.mjs` and `scripts/load-test.k6.js` added; CI can run the k6 variant against a deployed preview.

## Remaining work

- Run Lighthouse CI (lighthousci) on Home / Category / Product / Blog in mobile emulation against deployed staging; record real CWV.
- Add `compression` package or keep the hand-rolled middleware; verify compression ratio in production logs.
- Consider Redis-backed catalog cache for multi-instance deploys (current cache is in-memory per instance).
- Bundle analysis (`rollup-plugin-visualizer`) and manual vendor chunks for the web app.
