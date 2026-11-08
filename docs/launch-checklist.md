# Pre-Launch Checklist — Phase 8 Readiness

**Goal:** confirm the store is safe, fast, and tested before handling real customers and real money.  
This checklist is completed before Phase 8 (deployment) work begins.

## 1. Security (all must be PASS)

- [ ] Route-guard enumeration test passes; no route is accidentally public (`test/route-guard.test.ts`).
- [ ] No high/critical security findings open (see `docs/security-audit.md`).
- [ ] CSP active; Google login, product images, and fonts still load.
- [ ] `COOKIE_SECURE=true` and `COOKIE_SAME_SITE` set correctly for the deployment topology (cross-origin API/web → `none` + secure).
- [ ] Production `JWT_ACCESS_SECRET` changed from the default; boot validation rejects it otherwise.
- [ ] Login lockout + rate limits enforced (429 responses sensible).
- [ ] File uploads validated by magic bytes, size, extension allowlist, randomized names, no path traversal.
- [ ] Rich text (descriptions, blog, FAQ, pages, reviews, tickets) sanitized with allowlist; emails/PDF escape output.
- [ ] No secrets committed to repo or written to logs (logger redacts passwords/tokens/phones).
- [ ] `pnpm audit` run; critical/high vulnerabilities remediated or documented with expiry.
- [ ] Refresh-token rotation + reuse detection, logout-all, password change/reset revoke sessions verified.
- [ ] Privacy page includes data retention note; data export/delete path documented.

## 2. Reliability

- [ ] Graceful shutdown (SIGINT/SIGTERM) verified; DB pool disconnects on exit.
- [ ] `/health` and `/ready` return 200 and are uptime-check friendly.
- [ ] External providers (email/WhatsApp/Cloudinary) failures do not block checkout (notifications queued/logged).
- [ ] Background jobs are idempotent; failure alerts configured.
- [ ] DB check constraints applied (non-negative stock/prices/quantities/fees).
- [ ] Backup/restore script tested (`scripts/db-backup.ts` / `db-restore.ts`); restore procedure documented.
- [ ] Indexes reviewed via `EXPLAIN ANALYZE` on heaviest queries (product list + facets, search, admin stats, orders).

## 3. Performance

- [ ] Load test p95 < 300 ms for catalog reads under target concurrency (`scripts/load-test.k6.js`).
- [ ] Compression, ETag, Cache-Control headers present on public catalog responses.
- [ ] Lighthouse mobile budgets met or exceptions documented with reasons:
  - Performance ≥ 90 (Home, Category, Product, Blog)
  - Accessibility ≥ 95
  - Best Practices ≥ 95
  - SEO ≥ 95
- [ ] Slow-network (4G throttle) and offline/error states verified.

## 4. Accessibility & RTL

- [ ] Keyboard-only walkthrough of all customer flows and admin screens.
- [ ] Skip-to-content link present and focusable.
- [ ] Focus management in modals/drawers/menus.
- [ ] `aria` labels on icon buttons; form errors announced; `aria-live` on cart/toasts.
- [ ] Contrast AA in dark and light themes; reduced-motion respected.
- [ ] RTL review complete: `dir`/`bdi` for mixed-direction content (SKUs, numbers, English names in Arabic text); numerals consistent; carousels, breadcrumbs, tables, charts, emails, PDF invoice checked.
- [ ] Cross-browser/device matrix spot-checked (Chrome, Safari iOS, Firefox, Samsung Internet; 360–1440 px).

## 5. Tests

- [ ] Unit tests pass for pricing/coupons/shipping, status machine, search normalization, inventory, slug, phone, permissions.
- [ ] API integration tests pass (critical flows + negative cases).
- [ ] E2E flows green in AR and EN, desktop + mobile viewport.
- [ ] Coverage thresholds met on orders, inventory, payments, auth (≥ 85%).
- [ ] CI pipeline green (lint, typecheck, unit, integration, E2E headless, build); failing tests block merge.
- [ ] Demo seed script runs and produces orders in every status, tickets, reviews.

## 6. Documents

- [ ] `docs/security-audit.md` — findings table (issue, severity, location, fix, status).
- [ ] `docs/performance-report.md` — before/after metrics.
- [ ] `docs/test-plan.md` — strategy, thresholds, CI.
- [ ] `docs/launch-checklist.md` — this file.
- [ ] README updated with security and operations sections.

## Launch blockers for Phase 8

List any item above that cannot be checked PASS before deployment:

1. ________________________________________________
2. ________________________________________________

Sign-off: ____________________  Date: ___________
