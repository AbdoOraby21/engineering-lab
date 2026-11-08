# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/specification.html#semantic-versioning).

## Unreleased

### Added
- Phase 8 deployment infrastructure: Vercel config, Dockerfile, docker-compose.prod.yml, CI/CD pipelines
- Admin guide (AR+EN) for store owners
- Environment variables reference docs
- Architecture docs with Mermaid diagrams
- Launch checklist with 27 items
- Backup/restore script docs

### Changed
- README updated with deployment summary and contribution guidelines
- Env-reference.md created with full env var table
- Security hardening: CSP, SameSite/Secure cookie settings enforced at boot
- Rate limits and login lockout moved to platform-recommended configurations

### Fixed
- Header height collapse issue (dynamic Tailwind class → static 143px)
- Search pill visibility (`bg-surface-2` → `bg-surface2`)
- Logo no longer overlaps search bar (`shrink-0` + `min-w-0`)
- Mobile clipping fixed (tagline hidden below sm, text hidden below 380px)

### Security
- `COOKIE_SECURE=true` enforced in production
- `COOKIE_SAME_SITE` policy validated at boot
- JWT secret rotation validation added
- File upload magic-byte validation enforced
- Rich text sanitization XSS prevention

### Deprecated
- None

## [v1.0.0] - Phase 8 Release

- Initial deployment-ready release
- Vercel + Render deployment workflows established
- CI/CD pipelines (lint, typecheck, test, build, deploy)
- Documentation set completed (architecture, admin guide, env reference, launch checklist)
- Monitoring, backups, and runbooks documented
- Arabic/English admin guide completed