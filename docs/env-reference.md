# Environment Variables Reference

This table documents all environment variables used by the **Engineering Lab** API and web applications. 
Variables prefixed `VITE_` are exposed to the browser; all others are **only available to the API**.

| Name | Where Used | Example | Required? |
|------|-----------|---------|-----------|
| `NODE_ENV` | API — determines behaviour (dev/prod/test) | `production` | No (default: `development`) |
| `PORT` | API — server port | `4000` | No (default: `4000`) |
| `API_PUBLIC_URL` | API — base URL for public links (emails, docs) | `https://api.engineering-lab.com` | No (default: `http://localhost:4000`) |
| `DATABASE_URL` | API — Prisma connection string | `postgresql://postgres:postgres@localhost:5432/engineering_lab?schema=public` | **Yes** |
| `WEB_URL` | API + email templates — base URL of the web site | `https://engineering-lab.com` | No (default: `http://localhost:5173`) |
| `WEB_ORIGIN` | API — CORS origin validation | `https://engineering-lab.com` | No (default: `http://localhost:5173`) |
| `JWT_ACCESS_SECRET` | API — signs access tokens | `a-very-long-random-string-at-least-32-chars` | **Yes** |
| `JWT_ACCESS_TTL_SECONDS` | API — access token TTL | `900` | No (default: `900`) |
| `REFRESH_TOKEN_TTL_DAYS` | API — refresh token TTL | `7` | No (default: `7`) |
| `COOKIE_SECURE` | API — `Secure` flag on refresh cookie | `true`/`false` | No (default: `false`; **must be `true`** in production) |
| `COOKIE_DOMAIN` | API — domain for cookies (leave empty for cross‑origin) | `` | No |
| `COOKIE_SAME_SITE` | API — SameSite cookie policy | `lax`/`strict`/`none` | No (default: `lax`; **must be `none`** when `COOKIE_SECURE=true`) |
| `BCRYPT_ROUNDS` | API — password hashing cost | `12` | No (default: `12`; range: `4–15`) |
| `SMTP_HOST` | API — SMTP server host | `smtp.sendgrid.net` | No |
| `SMTP_PORT` | API — SMTP server port | `587` | No (default: `1025`) |
| `SMTP_USER` | API — SMTP authentication user | `apikey` | No |
| `SMTP_PASS` | API — SMTP authentication password | `your-smtp-password` | No |
| `SMTP_SECURE` | API — SMTP TLS flag | `true`/`false` | No (default: `false`) |
| `MAIL_FROM` | API — sender address in emails | `Engineering Lab <no-reply@engineering-lab.com>` | No |
| `STORE_EMAIL` | API + docs — general support email | `support@engineeringlab.eg` | No |
| `ADMIN_NAME` | API + admin surfaces | `Engineering Lab Admin` | No |
| `ADMIN_EMAIL` | API — admin contact (optional) | `admin@engineering-lab.com` | No |
| `ADMIN_PASSWORD` | API — admin initial password (optional) | `InitialPass123` | No (min 8 chars) |
| `LOG_LEVEL` | API — pino log level | `info` | No (default: `info`) |
| `RATE_LIMIT_MAX` | API — global IP‑based rate limit | `300` | No (default: `300`) |
| `AUTH_RATE_LIMIT_MAX` | API — auth‑route rate limit | `20` | No (default: `20`) |
| `GOOGLE_OAUTH_ENABLED` | API — enable Google Sign‑In | `true`/`false` | No (default: `false`) |
| `GOOGLE_CLIENT_ID` | API — Google OAuth client ID | `your-google-client-id` | Required if `GOOGLE_OAUTH_ENABLED=true` |
| `GOOGLE_CLIENT_SECRET` | API — Google OAuth client secret | `your-google-client-secret` | Required if `GOOGLE_OAUTH_ENABLED=true` |
| `GOOGLE_CALLBACK_URL` | API — Google OAuth callback URL | `https://api.engineering-lab.com/api/v1/auth/google/callback` | Optional (defaults to `${API_PUBLIC_URL}/api/v1/auth/google/callback`) |
| `STORAGE_DRIVER` | API — image storage driver | `local`/`cloudinary` | No (default: `local`) |
| `UPLOAD_DIR` | API — local upload directory | `uploads` | No (default: `uploads`) |
| `UPLOAD_MAX_BYTES` | API — max file upload size (local) | `5242880` (5 MiB) | No (default: `5 MiB`) |
| `DATASHEET_MAX_BYTES` | API — max datasheet upload size | `15728640` (15 MiB) | No (default: `15 MiB`) |
| `REVIEWS_REQUIRE_PURCHASE` | API — enforce purchase for reviews | `true`/`false` | No (default: `true`) |
| `CLOUDINARY_CLOUD_NAME` | API — Cloudinary storage (required if `STORAGE_DRIVER=cloudinary`) | `your-cloud-name` | Required when `STORAGE_DRIVER=cloudinary` |
| `CLOUDINARY_API_KEY` | API — Cloudinary API key (required if `STORAGE_DRIVER=cloudinary`) | `your-api-key` | Required when `STORAGE_DRIVER=cloudinary` |
| `CLOUDINARY_API_SECRET` | API — Cloudinary API secret (required if `STORAGE_DRIVER=cloudinary`) | `your-api-secret` | Required when `STORAGE_DRIVER=cloudinary` |
| `CLOUDINARY_FOLDER` | API — Cloudinary upload folder | `engineering-lab` | No (default: `engineering-lab`) |
| `WHATSAPP_ACCESS_TOKEN` | API — Meta WhatsApp Cloud API token | `your-whatsapp-token` | Required for WhatsApp notifications |
| `WHATSAPP_PHONE_NUMBER_ID` | API — Meta WhatsApp phone number ID | `your-phone-number-id` | Required for WhatsApp notifications |
| `WHATSAPP_API_VERSION` | API — WhatsApp API version | `v22.0` | No (default: `v22.0`) |
| `VITE_API_URL` | Web (browser) — API base URL (prefixed `VITE_`) | `/api/v1` | No (default: `/api/v1`) |
| `VITE_APP_NAME` | Web (browser) — app name displayed in UI | `Engineering Lab` | No (default: `Engineering Lab`) |