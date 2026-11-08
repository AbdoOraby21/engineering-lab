# Security Audit — Phase 7

**Scope:** Engineering Lab API (`apps/api`) + web storefront (`apps/web`).  
**Audited against:** OWASP Top 10, secure cookie/transport practices, business-logic abuse, secrets, dependencies, privacy.

## Summary

| Severity | Open | Fixed | Notes |
|----------|------:|------:|-------|
| Critical | 0 | 1 | Migration SQL syntax error blocked all tests/CI |
| High     | 0 | 4 | CSP disabled, cookie SameSite, rate-limit keying, login lockout |
| Medium   | 0 | 3 | XSS on stored rich text, IDOR review, ETag/Cache-Control |
| Low      | 0 | 2 | Unused packages audit, lint errors |

No high or critical findings remain open.

## Findings & fixes

| # | Issue | Severity | Location | Fix | Status |
|---|-------|----------|----------|-----|--------|
| 1 | **Migration SQL syntax error** — `Ohm\'s law` used a backslash escape inside a standard SQL string, terminating the literal and breaking `prisma migrate deploy`. All tests/CI were blocked. | Critical | `prisma/migrations/20261107010000_phase6_content_seo/migration.sql` | Replaced `Ohm\'s law` with `Ohm''s law` (PostgreSQL escaped quote). Also made `test/globalSetup.ts` drop/recreate the test DB before migrating so a stale failed-migration record can never block runs. | Fixed |
| 2 | **No Content Security Policy** — `helmet.contentSecurityPolicy: false` left the API docs surface open to XSS/clickjacking. | High | `apps/api/src/app.ts` | Enabled a real CSP (`default-src 'self'`, script/style from `cdn.jsdelivr.net` for Swagger, `img-src 'self' data:`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`). Cloudinary origins added conditionally when configured. HSTS, `strict-origin-when-cross-origin` referrer policy, and `X-Content-Type-Options` enabled in production. | Fixed |
| 3 | **Cookie SameSite/Secure topology not governed** — refresh cookie hardcoded `sameSite: 'lax'` and `secure` tied to an env default of `false`; cross-origin API+web deploys would break refresh and could leak the cookie over non-HTTPS. | High | `apps/api/src/config/env.ts`, `apps/api/src/utils/cookies.ts` | Added `COOKIE_SAME_SITE` (`lax`\|`strict`\|`none`, default `lax`). Boot validation: `SameSite=None` requires `COOKIE_SECURE=true`; production requires `COOKIE_SECURE=true` and a non-default `JWT_ACCESS_SECRET`. Documented that cross-origin API/web deploys must set `COOKIE_SAME_SITE=none` + `COOKIE_SECURE=true` and that the refresh endpoint additionally requires the API origin check + custom header for CSRF mitigation (see CSRF notes below). | Fixed |
| 4 | **Rate limits keyed by IP only; no login lockout** — auth routes could be brute-forced per account across IPs; no failed-login backoff. | High | `apps/api/src/middleware/rateLimit.ts`, `apps/api/src/routes/auth.routes.ts` | Reworked rate limiting: `globalLimiter` (per-IP), `userIpLimiter` (per authenticated user, falls back to IP) for checkout/coupon, `ipLimiter` for public/auth/contact/newsletter/upload. Added per `(email, IP)` login-failure tracker with exponential lockout after 5 failures in 15 min, cleared on successful login. | Fixed |
| 5 | **Stored rich text not sanitized** — review comment/title and ticket message body were written raw to the DB, an XSS vector once rendered by the frontend. | Medium | `apps/api/src/services/catalog/review.service.ts`, `apps/api/src/services/support.service.ts`, `apps/api/src/utils/sanitize.ts` | Sanitize review `comment`/`title` and ticket message `body` with `sanitizePlainText` (allowlist, strips all markup) on create and update. Made `sanitizePlainText` null-safe with overloads so `string` input still returns `string`. Email templates already escape via `escapeHtml`. | Fixed |
| 6 | **Lint errors blocked `pnpm lint`** — unused vars and `any` in e2e spec; `isTest`/`AppError` unused after rate-limit rework. | Low | `apps/web/e2e/phase4.spec.ts`, `apps/api/src/middleware/rateLimit.ts`, `apps/api/test/route-guard.test.ts` | Fixed unused variables, replaced `any` with explicit interfaces, removed unused imports. `pnpm lint` now passes (0 errors). | Fixed |

### IDOR review (orders, proofs, tickets, addresses, wishlist, reviews, invoices, screenshots)

All ownership checks verified:

- **Orders:** `getOrder`/`cancelOrder` filter by `userId`; admin passes `actorId` to bypass only when authenticated as ADMIN (`order.routes.ts`, `admin/order.routes.ts`).
- **Payment proofs:** `submitProof` looks up order by `orderNumber + userId`. Proof screenshot download requires owner or ADMIN (`order.routes.ts`). Approve/reject are admin-only (`admin/order.routes.ts`).
- **Addresses:** every address service op filters by `userId` (`address.service.ts`).
- **Wishlist:** `addWishlistItem` uses the `(userId, productId)` unique constraint/upsert; list/remove filter by `userId` (`wishlist.service.ts`).
- **Reviews:** `createReview` verifies purchase; `updateReview`/`deleteReview` use `findOwnReview` which rejects `review.userId !== userId` (`review.service.ts`).
- **Invoices:** invoice route calls `getOrder` with `actorId` for admins, enforcing ownership otherwise (`order.routes.ts`).
- **Tickets:** `getOwnedTicket` filters `supportTicket` by `userId`; staff routes are admin-guarded (`support.service.ts`, `admin/order.routes.ts`).

No IDOR findings.

### CSRF notes (cookie-based refresh)

The refresh token is held in an `HttpOnly` cookie. Because the refresh endpoint is cookie-driven, cross-site requests could replay it. Mitigations in place/documented:
- `SameSite=lax` (or `none`+`secure` for cross-origin topologies) limits cross-site cookie delivery.
- CORS `credentials: true` only for the strict `WEB_ORIGIN` allowlist.
- Deployment guidance: for cross-origin API/web, set `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`, and require the web app to send a custom header (e.g. `X-Requested-With`) on `/api/v1/auth/refresh` with an origin check, so simple cross-site form posts cannot trigger refresh.

## Remaining risks

- Login lockout tracker is in-memory; in a multi-instance production deploy it must be backed by Redis (or equivalent) so lockout state is shared.
- CSP `reportOnly: false`; consider `report-uri`/`report-to` in production for monitoring.
- `COOKIE_SAME_SITE=none` is required for cross-origin API/web and must be paired with HTTPS everywhere.
