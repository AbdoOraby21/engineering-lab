import { Router } from 'express';
import type { Request } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import passport from 'passport';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from '@engineering-lab/shared';
import { env } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authLimiter, clearLoginFailures, loginLimiter, registerLoginFailure } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../utils/cookies.js';
import { configurePassport } from '../lib/passport.js';
import type { SessionMeta, SessionResult } from '../services/auth.service.js';
import {
  forgotPassword,
  googleLogin,
  login,
  logout,
  refreshSession,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
  type GoogleProfileInput,
} from '../services/auth.service.js';
import { getUserById } from '../services/user.service.js';

configurePassport();

const router = Router();

const GOOGLE_STATE_COOKIE = 'el_gstate';
const GOOGLE_STATE_COOKIE_PATH = '/api/v1/auth';

interface GoogleState {
  nonce: string;
  locale: 'ar' | 'en';
  redirect: string | null;
}

function encodeGoogleState(state: GoogleState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

function decodeGoogleState(raw: string): GoogleState | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<GoogleState>;
    if (typeof parsed.nonce !== 'string' || parsed.nonce.length === 0) {
      return null;
    }
    const redirect =
      typeof parsed.redirect === 'string' &&
      parsed.redirect.startsWith('/') &&
      !parsed.redirect.startsWith('//')
        ? parsed.redirect
        : null;
    return { nonce: parsed.nonce, locale: parsed.locale === 'en' ? 'en' : 'ar', redirect };
  } catch {
    return null;
  }
}

function readGoogleStateCookie(cookies: unknown): GoogleState | null {
  if (!cookies || typeof cookies !== 'object') {
    return null;
  }
  const value = (cookies as Record<string, unknown>)[GOOGLE_STATE_COOKIE];
  return typeof value === 'string' ? decodeGoogleState(value) : null;
}

function safeStateMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

function webBaseUrl(): string {
  return env.WEB_URL.replace(/\/$/, '');
}

function googleFailureUrl(locale: 'ar' | 'en', reason: string): string {
  return `${webBaseUrl()}/${locale}/login?error=${encodeURIComponent(reason)}`;
}

function googleSuccessUrl(state: GoogleState, accessToken: string): string {
  const query = state.redirect ? `?redirect=${encodeURIComponent(state.redirect)}` : '';
  const hash = `#access_token=${encodeURIComponent(accessToken)}&expires_in=${env.JWT_ACCESS_TTL_SECONDS}`;
  return `${webBaseUrl()}/${state.locale}/auth/callback${query}${hash}`;
}

function googleStateCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: GOOGLE_STATE_COOKIE_PATH,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

function sessionMeta(req: Request): SessionMeta {
  return {
    userAgent: req.get('user-agent') ?? undefined,
    ip: req.ip ?? 'unknown',
  };
}

function publicSession(session: SessionResult) {
  return {
    user: session.user,
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
  };
}

router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const session = await register(req.body as RegisterInput, sessionMeta(req));
    setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
    sendData(res, publicSession(session), 201);
  }),
);

router.post(
  '/login',
  authLimiter,
  loginLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as LoginInput;
    try {
      const session = await login(input.email, input.password, sessionMeta(req));
      clearLoginFailures(input.email, req.ip ?? 'unknown');
      setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
      sendData(res, publicSession(session));
    } catch (error) {
      registerLoginFailure(input.email, req.ip ?? 'unknown');
      throw error;
    }
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const rawToken = readRefreshCookie(req.cookies);
    const session = await refreshSession(rawToken, sessionMeta(req));
    setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
    sendData(res, publicSession(session));
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await logout(readRefreshCookie(req.cookies));
    clearRefreshCookie(res);
    sendData(res, { success: true });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.authUser!.id);
    sendData(res, { user });
  }),
);

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as ForgotPasswordInput;
    await forgotPassword(input.email);
    sendData(res, { success: true });
  }),
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as ResetPasswordInput;
    await resetPassword(input.token, input.password);
    clearRefreshCookie(res);
    sendData(res, { success: true });
  }),
);

router.post(
  '/verify-email',
  authLimiter,
  validate({ body: verifyEmailSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as VerifyEmailInput;
    const user = await verifyEmail(input.token);
    sendData(res, { success: true, user });
  }),
);

router.post(
  '/resend-verification',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    await resendVerification(req.authUser!.id);
    sendData(res, { success: true });
  }),
);

router.get('/providers', (_req, res) => {
  sendData(res, { google: env.GOOGLE_OAUTH_ENABLED });
});

router.get(
  '/google',
  authLimiter,
  (req, res, next) => {
    if (!env.GOOGLE_OAUTH_ENABLED) {
      next(AppError.notFound('Google login is not enabled'));
      return;
    }

    const locale = req.query.locale === 'en' ? 'en' : 'ar';
    const rawRedirect = typeof req.query.redirect === 'string' ? req.query.redirect : null;
    const redirect =
      rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
        ? rawRedirect
        : null;
    const state: GoogleState = { nonce: randomBytes(16).toString('hex'), locale, redirect };

    res.cookie(GOOGLE_STATE_COOKIE, encodeGoogleState(state), {
      ...googleStateCookieOptions(),
      maxAge: 10 * 60 * 1000,
    });
    passport.authenticate('google', { scope: ['profile', 'email'], state: state.nonce })(
      req,
      res,
      next,
    );
  },
);

router.get(
  '/google/callback',
  (req, res, next) => {
    const state = readGoogleStateCookie(req.cookies);
    res.clearCookie(GOOGLE_STATE_COOKIE, googleStateCookieOptions());

    const provided = typeof req.query.state === 'string' ? req.query.state : '';
    if (!state || !provided || !safeStateMatch(state.nonce, provided)) {
      res.redirect(googleFailureUrl('ar', 'invalid_state'));
      return;
    }

    res.locals.googleState = state;
    next();
  },
  (req, res, next) => {
    const state = res.locals.googleState as GoogleState | undefined;
    if (!env.GOOGLE_OAUTH_ENABLED) {
      res.redirect(googleFailureUrl(state?.locale ?? 'ar', 'provider_unavailable'));
      return;
    }
    passport.authenticate(
      'google',
      {
        session: false,
        failureRedirect: googleFailureUrl(state?.locale ?? 'ar', 'provider_error'),
      },
      (err: unknown, user: unknown) => {
        if (err || !user) {
          res.redirect(googleFailureUrl(state?.locale ?? 'ar', 'provider_error'));
          return;
        }
        req.user = user as Express.User;
        next();
      },
    )(req, res, next);
  },
  asyncHandler(async (req, res) => {
    const state = res.locals.googleState as GoogleState | undefined;
    const profile = req.user as GoogleProfileInput | undefined;
    if (!state || !profile) {
      res.redirect(googleFailureUrl(state?.locale ?? 'ar', 'missing_profile'));
      return;
    }

    try {
      const session = await googleLogin(profile, sessionMeta(req));
      setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
      res.redirect(googleSuccessUrl(state, session.accessToken));
    } catch (error) {
      const reason = error instanceof AppError ? error.code : ErrorCodes.INTERNAL_ERROR;
      res.redirect(googleFailureUrl(state.locale, reason));
    }
  }),
);

export default router;

