# Engineering Lab

**Build · Innovate · Create** — a bilingual (Arabic RTL / English LTR) e-commerce store for electronics components in Egypt. Prices are stored as integer **piasters** (100 piasters = 1 EGP); payment is handled through **manual-verified wallet transfers** (Vodafone Cash / InstaPay, verified by an admin).

## Tech stack

| Layer      | Choice                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| Frontend   | React 18, Vite, TypeScript, React Router v6, Tailwind CSS, Zustand, TanStack React Query, react-i18next |
| Backend    | Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, Zod, JWT (access in memory + refresh cookie)      |
| Tooling    | pnpm workspaces, ESLint, Prettier, Husky, Vitest + Supertest, Swagger/OpenAPI            |
| Services   | PostgreSQL 16, MailHog (dev email), Cloudinary or local disk (image storage)             |

## Repository layout

```
engineering-lab/
  apps/web          # Vite React storefront + admin (phases 3/5)
  apps/api          # Express API, Prisma schema/migrations/seed, tests
  packages/shared   # Zod schemas and DTO types shared by both apps
  docker-compose.yml  # postgres + mailhog (api/web containers arrive in phase 8)
```

## Getting started

Prerequisites: **Node ≥ 20**, **pnpm 9**, **PostgreSQL 16** (or `docker compose up -d postgres`).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env    # then edit DATABASE_URL, secrets, admin user
cp apps/web/.env.example apps/web/.env

# create schema + seed admin, categories, brands and 47 products
pnpm db:migrate
pnpm db:seed

pnpm dev          # api (:4000) + web (:5173) together
```

- API docs (Swagger): <http://localhost:4000/api/docs>
- Health check: <http://localhost:4000/api/v1/health>
- Dev email inbox (MailHog): <http://localhost:8025>
- Default admin comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `apps/api/.env`.

### Scripts (root)

| Script             | What it does                                  |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Run API and web in parallel                   |
| `pnpm build`       | Build all packages                            |
| `pnpm typecheck`   | TypeScript project-wide                       |
| `pnpm lint`        | ESLint across the repo                        |
| `pnpm test`        | API integration tests (Vitest + Supertest)    |
| `pnpm db:migrate`  | Apply Prisma migrations                       |
| `pnpm db:seed`     | Seed admin + catalog data (idempotent)        |
| `pnpm db:studio`   | Prisma Studio                                 |

## Environment

`apps/api/.env.example` documents every variable (DB URL, JWT secrets, SMTP/MailHog, admin seed user, storage driver, rate limits). Never commit `.env` files — they are gitignored.

Key conventions:

- Success responses are wrapped in `{ data }`, errors in `{ error: { code, message, details? } }`.
- `STORAGE_DRIVER=local|cloudinary` switches the image upload service; local files are written to `apps/api/uploads` and served from `/uploads`.
- Catalog search uses **PostgreSQL full-text search** (`to_tsvector`, Arabic + English + SKU) with a **`pg_trgm` typo-tolerant fallback** plus Arabic alef/hamza normalization.

## API surface (phase 2)

Public catalog endpoints are available both under `/api/v1/catalog` and at the API root (spec aliases):

- `GET /categories/tree` (alias of `/categories`), `GET /categories/:slug`, `GET /brands`
- `GET /products` — search (`q`), filters (`category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `minRating`, `featured`, `onSale`), sorting (`relevance|newest|oldest|price_asc|price_desc|name_asc|name_desc|popular|rating`), pagination (`page`, `pageSize`)
- `GET /search/suggest`, `GET /products/by-ids`, `GET /products/lists/featured|new-arrivals|best-sellers` (max 12 items; classic aliases `/products/featured|new-arrivals|best-sellers` and `/products/autocomplete` remain)
- `GET /products/:slug`, `/products/:slug/related`, `/products/:slug/reviews`, `POST /products/:slug/reviews`, `PATCH|DELETE /reviews/:id`
- `GET|POST /wishlist`, `POST|DELETE /wishlist/:productId`
- `GET /banners` (alias of `/content/banners`)

Product lists and product detail only expose products whose **entire category ancestor chain** and brand are active. Search ranks by full-text relevance plus brand/category name matches, and falls back to trigram typo tolerance.

### Admin API

All routes under `/api/v1/admin` require a bearer token with role `ADMIN`:

- Categories: `GET|POST /categories`, `PATCH /categories/reorder`, `PATCH|DELETE /categories/:id`, `PATCH /categories/:id/toggle-active`
- Brands: `GET|POST /brands`, `PATCH|DELETE /brands/:id`, `PATCH /brands/:id/toggle-active`
- Products: `GET|POST /products`, `GET|PATCH|DELETE /products/:id`, `POST /products/:id/duplicate`, toggle featured/new/active, image upload/reorder/primary/delete, variants, bundle items, specs, stock adjustments
- Import/export: `GET /products/import/template`, `POST /products/import?dryRun=true|false`, `GET /products/export?format=csv|xlsx`
- Inventory: `GET /inventory/movements`, `GET /inventory/low-stock`
- Reviews: `GET /reviews`, `POST /reviews/:id/approve|reject`, `DELETE /reviews/:id`
- Banners: `GET|POST /banners`, `PATCH /banners/reorder`, `PATCH|DELETE /banners/:id`
- Uploads: `POST /uploads/image`, `POST /uploads/datasheet`, `DELETE /uploads/:publicId`

Plus auth/user endpoints from phase 1 (`/auth/*`, `/users/me/*`). Full request/response schemas: `/api/docs`.

### Auth notes

- Roles are `CUSTOMER` and `ADMIN` only.
- Google sign-in (required in production): set `GOOGLE_OAUTH_ENABLED=true` plus `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (and optionally `GOOGLE_CALLBACK_URL`). Flow: `GET /auth/google` (state cookie + CSRF nonce) → Google → `GET /auth/google/callback` sets the refresh cookie and redirects to `/:locale/auth/callback#access_token=...`. `GET /auth/providers` tells the UI which buttons to render. Google accounts are verified by Google and are safely linked to an existing email account (never overwritten silently).

## Phases

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 1 — Foundation, auth & users | ✅ done | register/login/refresh, Google OAuth, email verification, password reset, addresses, AR/EN + RTL |
| 2 — Catalog backend | ✅ done | models, public + admin APIs, recursive category visibility, FTS + trigram search, imports, uploads, reviews, banners, seed (31 categories, 8 brands, 47 products), tests |
| 3 — Storefront UI | ⏳ next | home per screenshot, category/product pages, search, wishlist, support tickets, static pages |
| 4 — Cart, checkout & manual payment | ⏳ | server cart for members + localStorage cart for visitors, login-gated checkout, coupons, payment proof flow, order status machine |
| 5 — Admin dashboard | ⏳ | payment review queue, products/orders/inventory, settings |
| 6 — Content & SEO | ⏳ | blog, sitemap/robots, newsletter, WhatsApp button |
| 7 — Hardening & testing | ✅ done | rate limits, CSP/cookie hardening, IDOR review, caching/compression, load tests, unit + integration + E2E, coverage thresholds, CI pipeline |
| 8 — Deployment & docs | ⏳ | Dockerfiles, Nginx, CI, deployment guides |

### Phase 2 manual test checklist

- [ ] `pnpm db:seed` reports 31 categories, 8 brands, 47 products and writes SVG placeholders
- [ ] Swagger (`/api/docs`) shows the Catalog and Admin tags with all endpoints
- [ ] `GET /api/v1/categories/tree` returns 8 roots with nested sub-categories and `nameAr`/`nameEn`
- [ ] `GET /api/v1/products?q=اردوينو` (no hamza) returns the Arduino products
- [ ] `GET /api/v1/products?q=Arduno` finds "Arduino UNO R3" (trigram typo tolerance)
- [ ] `GET /api/v1/products?category=microcontrollers&inStock=true&sort=price_asc` filters + paginates correctly
- [ ] `GET /api/v1/products/arduino-uno-r3` returns images, specs and variants
- [ ] Bundle product detail lists its component products and computes availability
- [ ] Deactivating an ancestor category hides every descendant product from lists and detail
- [ ] Inactive product returns `404 PRODUCT_NOT_FOUND`
- [ ] `/uploads/products/arduino-uno-r3.svg` serves a placeholder image
- [ ] `pnpm test` → API integration tests green; `pnpm typecheck` and `pnpm lint` clean

## Extending

- **Add a language:** add the locale to `localeSchema` in `packages/shared`, create `apps/web/src/locales/<code>.json`, extend the i18n setup and the `dir` mapping; DB content already stores `nameAr`/`nameEn` pairs — add `name<Code>` columns for new content languages.
- **Add a payment method:** add the enum value to the shared checkout schema, a payment-instructions resolver in the API settings, and an admin setting toggle — totals are always recomputed server-side.
- **Add a notification provider:** implement the provider interface in `apps/api/src/services/notifications` (email is the reference implementation via Nodemailer); WhatsApp/SMS providers are stubbed behind the same interface.

## Notes

- This is a Vite SPA; SEO relies on meta tags, JSON-LD and an API-generated `sitemap.xml`/`robots.txt`. Migrating the storefront to SSR (e.g. Remix or Next.js) is a sensible future step for stronger SEO.
- Prices never come from the client: totals are recomputed in the API from server-side product data.

## Security

- **Authentication:** JWT access token (short-lived) + `HttpOnly` refresh token cookie with rotation and reuse detection. Password reset/change revokes all sessions. Login is rate-limited with per-`(email, IP)` lockout after repeated failures.
- **Authorization:** every route is covered by an automated route-guard enumeration test (`apps/api/test/route-guard.test.ts`) asserting no route is accidentally public. Orders, proofs, tickets, addresses, wishlist, reviews and invoices enforce ownership; admin surfaces require the `ADMIN` role.
- **Input validation:** Zod schemas on body/query/params for every route. File uploads validated by magic bytes, size, extension allowlist, randomized names and path-traversal checks. Rich text is allowlist-sanitized; email/PDF output is escaped.
- **Transport & headers:** Helmet with a real CSP, HSTS (production), `strict-origin-when-cross-origin` referrer policy, `X-Content-Type-Options`, gzip/deflate compression, strict CORS allowlist.
- **Cookies:** `HttpOnly`, `SameSite` (configurable via `COOKIE_SAME_SITE`), `Secure` in production. Cross-origin API/web deploys require `COOKIE_SAME_SITE=none` + `COOKIE_SECURE=true` plus an origin/custom-header check on the refresh endpoint (see `docs/security-audit.md`).
- **Secrets:** validated at boot; never committed or logged (logger redacts passwords, tokens, proof URLs and partially masks phones).
- **Dependencies:** `pnpm audit` run as part of the dependency gate; lockfile committed; CI runs an audit step.

Full audit findings: `docs/security-audit.md`.

## Operations

- **Health/readiness:** `GET /api/v1/health` and `GET /api/v1/ready` (DB ping) for uptime checks.
- **Graceful shutdown:** SIGINT/SIGTERM close the HTTP server and disconnect Prisma.
- **Background jobs:** order expiry and low-stock digest run via `node-cron` with advisory locks; failures are logged and never block checkout.
- **Backup/restore:** `apps/api/scripts/db-backup.ts` (`backup`/`restore <file.sql>`) wraps `pg_dump`/`pg_restore`; test the restore procedure before launch.
- **Environment:** all config validated at boot via Zod (`apps/api/src/config/env.ts`); separate dev/prod values through `.env`. Never commit `.env`.
- **Demo seed:** `pnpm --filter @engineering-lab/api prisma:demo-seed` seeds a staging dataset (orders in every status, tickets, reviews) separate from production seed.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, API tests, web tests and build on every push/PR; a failure blocks merge.

### Scripts (root, additional)

| Script | What it does |
|--------|--------------|
| `pnpm --filter @engineering-lab/api prisma:demo-seed` | Seed staging demo dataset |
| `pnpm --filter @engineering-lab/web test:e2e` | Playwright E2E (headless) |
| `pnpm audit` | Dependency vulnerability audit |

## Notes

- This is a Vite SPA; SEO relies on meta tags, JSON-LD and an API-generated `sitemap.xml`/`robots.txt`. Migrating the storefront to SSR (e.g. Remix or Next.js) is a sensible future step for stronger SEO.
- Prices never come from the client: totals are recomputed in the API from server-side product data.

## Deployment

- **Vercel**: The web frontend is deployed on Vercel via Git integration. Every push to `main` triggers a new production build. The `vercel.json` file configures SPA rewrites, API rewrites to the backend, security headers, and cache control for hashed assets.
- **Render/Railway**: The API is deployed as a long‑running Node service (multi‑stage Dockerfile, non‑root user, healthcheck). Managed PostgreSQL is attached; environment variables are set through the platform dashboard.
- **Docker (self‑hosting)**: `docker-compose.prod.yml` brings up Nginx/Caddy reverse‑proxy, the API container, PostgreSQL, and optional Redis. TLS can be provided by Caddy (Let's Encrypt) or by custom certificates.
- **CI/CD**: GitHub Actions runs `lint-and-typecheck`, `api-tests`, `web-tests`, and `build` on every PR. Merging to `main` triggers `deploy.yml`, which:
  1. Runs the full test suite.
  2. Deploys the API to Render (via deploy hook) or Railway (via CLI), then runs `prisma migrate deploy`.
  3. Triggers a Vercel deployment (auto‑deploy on `main` push).
  4. Performs post‑deploy smoke tests (`/health`, `/ready`, home page, product list, login page).
- **Environment variables**: All secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `SMTP_PASS`, `WHATSAPP_ACCESS_TOKEN`, Cloudinary keys) must be set in the platform secrets UI; never committed to the repository.
- **Domain & HTTPS**: Configure `www.example.com` → apex `example.com` redirect via DNS. Obtain a Let's Encrypt certificate (Caddy or platform‑provided). Update `API_PUBLIC_URL` and `WEB_URL` to the custom domains.
- **Backups**: Daily `pg_dump` backups are stored in encrypted storage (`scripts/backup.sh`). Restore procedure is documented in `docs/troubleshooting.md`.
- **Rollback**: `prisma migrate rollback <target>` or restore from backup. Always test rollback in a staging environment first.
- **Contributing**:
  - Open a ticket or PR for any bug or feature.
  - Follow the `CONTRIBUTING.md` style (if present) or the conventions in `docs/extending.md`.
  - Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before opening a PR.
  - Add Arabic language support for any new UI text; the DB already stores `nameAr`/`nameEn` pairs.
- **License**: This project is licensed under the MIT License. See the `LICENSE` file for details.

- Prices never come from the client: totals are recomputed in the API from server-side product data.