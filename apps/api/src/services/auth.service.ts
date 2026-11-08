import type { ChangePasswordInput, Locale, RegisterInput } from '@engineering-lab/shared';
import type { User } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { signAccessToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/mailer.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { addDays, addHours, generateOpaqueToken, hashToken } from '../utils/tokens.js';
import { toAuthUser } from '../utils/serialize.js';

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface SessionResult {
  user: ReturnType<typeof toAuthUser>;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function normalizeLocale(locale: string): Locale {
  return locale === 'en' ? 'en' : 'ar';
}

async function createSession(user: User, meta: SessionMeta): Promise<SessionResult> {
  const access = signAccessToken(user.id, user.role);
  const refreshToken = generateOpaqueToken();
  const refreshTokenExpiresAt = addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
      userAgent: meta.userAgent,
      ip: meta.ip,
    },
  });

  return {
    user: toAuthUser(user),
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken,
    refreshTokenExpiresAt,
  };
}

async function createEmailVerification(user: User): Promise<void> {
  const token = generateOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: addHours(new Date(), 24),
    },
  });
  await sendVerificationEmail(user.email, user.name, token, normalizeLocale(user.locale));
}

export async function register(input: RegisterInput, meta: SessionMeta): Promise<SessionResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('An account with this email already exists', ErrorCodes.EMAIL_TAKEN);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      locale: input.locale,
    },
  });

  await createEmailVerification(user);

  return createSession(user, meta);
}

export async function login(email: string, password: string, meta: SessionMeta): Promise<SessionResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw AppError.unauthorized('Invalid email or password', ErrorCodes.INVALID_CREDENTIALS);
  }

  const passwordMatches = user.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : false;
  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email or password', ErrorCodes.INVALID_CREDENTIALS);
  }

  if (!user.isActive) {
    throw AppError.forbidden('This account has been disabled');
  }

  return createSession(user, meta);
}

export interface GoogleProfileInput {
  googleId: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
}

export async function googleLogin(
  input: GoogleProfileInput,
  meta: SessionMeta,
): Promise<SessionResult> {
  const email = input.email.trim().toLowerCase();
  if (!input.googleId || !email) {
    throw AppError.unauthorized(
      'Google account did not provide an email',
      ErrorCodes.INVALID_CREDENTIALS,
    );
  }

  const byGoogle = await prisma.user.findUnique({ where: { googleId: input.googleId } });
  if (byGoogle) {
    if (!byGoogle.isActive) {
      throw AppError.forbidden('This account has been disabled');
    }
    return createSession(byGoogle, meta);
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (!byEmail.isActive) {
      throw AppError.forbidden('This account has been disabled');
    }
    if (byEmail.googleId && byEmail.googleId !== input.googleId) {
      throw AppError.conflict(
        'This email is already linked to a different Google account',
        ErrorCodes.CONFLICT,
      );
    }

    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: input.googleId,
        ...(input.emailVerified && !byEmail.emailVerified ? { emailVerified: true } : {}),
      },
    });
    return createSession(linked, meta);
  }

  const user = await prisma.user.create({
    data: {
      name: input.displayName?.trim() || email.split('@')[0] || email,
      email,
      googleId: input.googleId,
      emailVerified: input.emailVerified,
      passwordHash: null,
      locale: 'ar',
    },
  });

  return createSession(user, meta);
}

export async function refreshSession(
  rawRefreshToken: string | undefined,
  meta: SessionMeta,
): Promise<SessionResult> {
  if (!rawRefreshToken) {
    throw AppError.unauthorized('Refresh token is missing', ErrorCodes.TOKEN_INVALID);
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw AppError.unauthorized('Invalid refresh token', ErrorCodes.TOKEN_INVALID);
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw AppError.unauthorized('Refresh token has been revoked', ErrorCodes.TOKEN_INVALID);
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthorized('Refresh token expired', ErrorCodes.TOKEN_EXPIRED);
  }

  if (!stored.user.isActive) {
    throw AppError.forbidden('This account has been disabled');
  }

  const access = signAccessToken(stored.user.id, stored.user.role);
  const newRefreshToken = generateOpaqueToken();
  const newTokenHash = hashToken(newRefreshToken);
  const refreshTokenExpiresAt = addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenHash: newTokenHash },
    }),
    prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: newTokenHash,
        expiresAt: refreshTokenExpiresAt,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    }),
  ]);

  return {
    user: toAuthUser(stored.user),
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken: newRefreshToken,
    refreshTokenExpiresAt,
  };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawRefreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function verifyEmail(rawToken: string): Promise<ReturnType<typeof toAuthUser>> {
  const stored = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!stored || stored.usedAt) {
    throw AppError.badRequest('Verification link is invalid', ErrorCodes.TOKEN_INVALID);
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw AppError.badRequest('Verification link has expired', ErrorCodes.TOKEN_EXPIRED);
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: stored.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { userId: stored.userId, usedAt: null, id: { not: stored.id } },
    }),
  ]);

  return toAuthUser(updatedUser);
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw AppError.unauthorized();
  }
  if (user.emailVerified) {
    throw AppError.conflict('Email is already verified', ErrorCodes.EMAIL_ALREADY_VERIFIED);
  }

  await prisma.emailVerificationToken.deleteMany({
    where: { userId, usedAt: null },
  });
  await createEmailVerification(user);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return;
  }

  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: addHours(new Date(), 1),
    },
  });

  await sendPasswordResetEmail(user.email, user.name, token, normalizeLocale(user.locale));
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!stored || stored.usedAt) {
    throw AppError.badRequest('Reset link is invalid', ErrorCodes.TOKEN_INVALID);
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw AppError.badRequest('Reset link has expired', ErrorCodes.TOKEN_EXPIRED);
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: stored.userId, usedAt: null, id: { not: stored.id } },
    }),
  ]);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  meta: SessionMeta,
): Promise<SessionResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw AppError.unauthorized();
  }

  const matches = user.passwordHash
    ? await verifyPassword(input.currentPassword, user.passwordHash)
    : false;
  if (!matches) {
    throw AppError.badRequest('Current password is incorrect', ErrorCodes.INVALID_PASSWORD);
  }

  const passwordHash = await hashPassword(input.newPassword);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return createSession(updated, meta);
}
