import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { googleLogin, login } from '../src/services/auth.service.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const authBase = '/api/v1/auth';

const sessionMeta = { userAgent: 'vitest', ip: '127.0.0.1' };

function encodeStateCookie(nonce: string, locale: 'ar' | 'en' = 'ar'): string {
  return Buffer.from(JSON.stringify({ nonce, locale, redirect: null }), 'utf8').toString(
    'base64url',
  );
}

beforeEach(async () => {
  await resetDatabase();
});

describe('google auth endpoints', () => {
  it('reports google as disabled by default', async () => {
    const response = await request(app).get(`${authBase}/providers`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { google: false } });
  });

  it('rejects starting the google flow when disabled', async () => {
    const response = await request(app).get(`${authBase}/google?locale=en`);
    expect(response.status).toBe(404);
    expect((response.body as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('redirects to login when the state cookie is missing', async () => {
    const response = await request(app).get(`${authBase}/google/callback?state=anything`);
    expect(response.status).toBe(302);
    expect(String(response.headers.location)).toContain('/ar/login?error=invalid_state');
  });

  it('redirects to login when the state value does not match the cookie', async () => {
    const response = await request(app)
      .get(`${authBase}/google/callback?state=another-nonce`)
      .set('Cookie', `el_gstate=${encodeStateCookie('expected-nonce')}`);
    expect(response.status).toBe(302);
    expect(String(response.headers.location)).toContain('/ar/login?error=invalid_state');
  });
});

describe('googleLogin service', () => {
  it('creates a google-only account without a password', async () => {
    const session = await googleLogin(
      {
        googleId: 'google-1',
        email: 'Google.User@Example.com',
        displayName: 'Google User',
        emailVerified: true,
      },
      sessionMeta,
    );

    expect(session.user.email).toBe('google.user@example.com');
    expect(session.user.role).toBe('CUSTOMER');
    expect(session.user.emailVerified).toBe(true);
    expect(typeof session.accessToken).toBe('string');

    const stored = await prisma.user.findUnique({ where: { email: 'google.user@example.com' } });
    expect(stored?.googleId).toBe('google-1');
    expect(stored?.passwordHash).toBeNull();
  });

  it('links google to an existing password account by email', async () => {
    const existing = await prisma.user.create({
      data: {
        name: 'Existing User',
        email: 'linked@example.com',
        passwordHash: 'not-a-real-hash',
        emailVerified: false,
        locale: 'ar',
      },
    });

    const session = await googleLogin(
      {
        googleId: 'google-2',
        email: 'linked@example.com',
        displayName: 'Linked User',
        emailVerified: true,
      },
      sessionMeta,
    );

    expect(session.user.id).toBe(existing.id);
    expect(session.user.emailVerified).toBe(true);

    const stored = await prisma.user.findUnique({ where: { id: existing.id } });
    expect(stored?.googleId).toBe('google-2');
    expect(stored?.passwordHash).toBe('not-a-real-hash');
  });

  it('rejects linking a different google id to an already linked email', async () => {
    await googleLogin(
      { googleId: 'google-a', email: 'conflict@example.com', displayName: null, emailVerified: true },
      sessionMeta,
    );

    await expect(
      googleLogin(
        { googleId: 'google-b', email: 'conflict@example.com', displayName: null, emailVerified: true },
        sessionMeta,
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('reuses the same google id across logins', async () => {
    const first = await googleLogin(
      { googleId: 'google-repeat', email: 'repeat@example.com', displayName: null, emailVerified: true },
      sessionMeta,
    );
    const second = await googleLogin(
      { googleId: 'google-repeat', email: 'repeat@example.com', displayName: null, emailVerified: true },
      sessionMeta,
    );

    expect(second.user.id).toBe(first.user.id);
    expect(await prisma.user.count({ where: { email: 'repeat@example.com' } })).toBe(1);
  });

  it('rejects password login for google-only accounts', async () => {
    await googleLogin(
      { googleId: 'google-nopassword', email: 'nopass@example.com', displayName: null, emailVerified: true },
      sessionMeta,
    );

    await expect(
      login('nopass@example.com', 'Whatever123', sessionMeta),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('disables google sign-in for deactivated accounts', async () => {
    const session = await googleLogin(
      { googleId: 'google-disabled', email: 'disabled@example.com', displayName: null, emailVerified: true },
      sessionMeta,
    );
    await prisma.user.update({
      where: { id: session.user.id },
      data: { isActive: false },
    });

    await expect(
      googleLogin(
        { googleId: 'google-disabled', email: 'disabled@example.com', displayName: null, emailVerified: true },
        sessionMeta,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
