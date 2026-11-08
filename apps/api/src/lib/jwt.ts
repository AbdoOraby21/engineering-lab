import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Role } from '@engineering-lab/shared';
import { env } from '../config/env.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

const accessPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(['CUSTOMER', 'ADMIN']),
  type: z.literal('access'),
});

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export interface SignedAccessToken {
  token: string;
  expiresAt: Date;
}

export function signAccessToken(userId: string, role: Role): SignedAccessToken {
  const token = jwt.sign({ sub: userId, role, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    issuer: 'engineering-lab',
    audience: 'engineering-lab-web',
  });

  return {
    token,
    expiresAt: new Date(Date.now() + env.JWT_ACCESS_TTL_SECONDS * 1000),
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'engineering-lab',
      audience: 'engineering-lab-web',
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Access token expired', ErrorCodes.TOKEN_EXPIRED);
    }
    throw AppError.unauthorized('Invalid access token', ErrorCodes.TOKEN_INVALID);
  }

  const parsed = accessPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw AppError.unauthorized('Invalid access token', ErrorCodes.TOKEN_INVALID);
  }

  return { sub: parsed.data.sub, role: parsed.data.role };
}
