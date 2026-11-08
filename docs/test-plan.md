# Test Plan — Phase 7

## Strategy

Layers: unit → API integration (Supertest + ephemeral embedded PostgreSQL) → E2E (Playwright, AR + EN, desktop + mobile). Every PR runs lint, typecheck, unit, integration, E2E (headless), and build; a failure blocks merge.

## Coverage thresholds

Critical modules (enforced via `vitest` coverage, `provider: v8`):

| Module | Threshold | Lines/Functions/Branches/Statements |
|--------|-----------|-------------------------------------|
| `src/services/order.service.ts` | ≥ 85% | 85 / 85 / 85 / 85 |
| `src/services/inventory.service.ts` | ≥ 85% | 85 / 85 / 85 / 85 |
| `src/services/auth.service.ts` | ≥ 85% | 85 / 85 / 85 / 85 |
| `src/services/payment-proof.service.ts` | ≥ 85% | 85 / 85 / 85 / 85 |

Coverage is reported in text, JSON, and HTML.

## Unit tests

Pure, no-DB tests for:
- pricing / coupon math, shipping zone lookup
- order status machine (`canTransition`)
- search normalization (`normalizeSearchText`, `slugify`)
- inventory service (`availableStock`, `sellableStock`)
- slug generation, phone normalization
- permission helpers (`requireRole` matrix)

Files: `apps/api/test/unit/phase4.test.ts`, `apps/api/test/unit/slug.test.ts`.

## API integration tests (Supertest + test DB)

All critical flows with negative cases:

- **Auth:** register, login, refresh rotation/reuse detection, logout, forgot/reset password (token reuse rejected), email verification, resend verification, Google OAuth, password change revokes sessions, rate limiting + login lockout.
- **Catalog:** filters, facets, sorting, pagination, autocomplete, product detail, category tree.
- **Cart:** add/update/remove, merge, price tampering (server prices used, not client-supplied).
- **Orders:** COD and pre-payment placement, idempotency key, concurrency on last unit (stock race), out-of-stock rejection, unverified-email block, cancellation and stock restore.
- **Payments:** proof submit (magic-bytes validation), approve/reject, expiry job, duplicate transaction reference.
- **Returns:** request, approve/reject/receive/refund transitions.
- **Tickets:** create, staff reply, ownership (IDOR matrix).
- **Uploads:** image/datasheet validation (magic bytes, size, extension, path traversal).
- **Admin authorization matrix:** anonymous and customer tokens rejected on every admin surface (`test/route-guard.test.ts` enumerates all routes and asserts non-public routes are protected).

Files: `apps/api/test/*.test.ts`.

## E2E tests (Playwright, AR + EN, desktop + mobile)

1. Visitor browses → search → product → add to cart → redirected to login.
2. Register → verify email (Mailhog API) → checkout → upload proof.
3. Admin approves → customer sees confirmed + notification.
4. Coupon + shipping by governorate math.
5. Wishlist/compare.
6. Ticket creation and staff reply.
7. Blog post → add related product to cart.

Files: `apps/web/e2e/*.spec.ts`.

## Test environments & execution

- API tests run against an embedded PostgreSQL cluster (`test/embedded-db.ts`) with the test DB recreated each run, so stale migration records never block CI.
- `pnpm test` = API unit + integration.
- `pnpm --filter @engineering-lab/web test` = web unit.
- `pnpm --filter @engineering-lab/web test:e2e` = Playwright headless.

## CI pipeline (`.github/workflows/ci.yml`)

Jobs run on every push/PR to `master`/`main`; a failure blocks merge:

1. `lint-and-typecheck` — `pnpm lint`, `pnpm typecheck`
2. `api-tests` — `pnpm --filter @engineering-lab/api test`
3. `web-tests` — `pnpm --filter @engineering-lab/web test`
4. `build` — `pnpm build` (depends on api-tests + web-tests)

`pnpm-lock.yaml` is committed; `pnpm install --frozen-lockfile` is used. `pnpm audit` is part of the dependency gate (see security-audit).

## Demo seed

`apps/api/prisma/demo.seed.ts` (`pnpm --filter @engineering-lab/api prisma:demo-seed`) seeds a staging-only dataset: users (admin + 3 customers), products, shipping zones, coupons, orders in **every** status, reviews, and support tickets. Separate from the production seed (`prisma/seed.ts`).
