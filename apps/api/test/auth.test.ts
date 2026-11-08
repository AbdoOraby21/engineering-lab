import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Response } from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { addHours, generateOpaqueToken, hashToken } from '../src/utils/tokens.js';
import { REFRESH_COOKIE_NAME } from '../src/utils/cookies.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const authBase = '/api/v1/auth';
const usersBase = '/api/v1/users';

const account = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '+201234567890',
  password: 'Password123',
  locale: 'ar' as const,
};

interface SessionBody {
  data: {
    user: { id: string; email: string; emailVerified: boolean; name: string };
    accessToken: string;
    accessTokenExpiresAt: string;
  };
}

function bodyOf(response: Response): SessionBody {
  return response.body as SessionBody;
}

async function registerUser(): Promise<SessionBody> {
  const response = await request(app).post(`${authBase}/register`).send(account);
  expect(response.status).toBe(201);
  return bodyOf(response);
}

beforeEach(async () => {
  await resetDatabase();
});

describe('auth', () => {
  it('registers a user, sets a refresh cookie and returns the current user', async () => {
    const response = await request(app).post(`${authBase}/register`).send(account);
    expect(response.status).toBe(201);

    const body = bodyOf(response);
    expect(body.data.user.email).toBe(account.email);
    expect(body.data.user.emailVerified).toBe(false);
    expect(typeof body.data.accessToken).toBe('string');

    const setCookie = response.headers['set-cookie'];
    const cookie = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie ?? '');
    expect(cookie).toContain(`${REFRESH_COOKIE_NAME}=`);
    expect(cookie.toLowerCase()).toContain('httponly');

    const me = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect((me.body as { data: { user: { email: string } } }).data.user.email).toBe(account.email);
  });

  it('rejects duplicate emails and invalid credentials', async () => {
    await registerUser();

    const duplicate = await request(app).post(`${authBase}/register`).send(account);
    expect(duplicate.status).toBe(409);
    expect((duplicate.body as { error: { code: string } }).error.code).toBe('EMAIL_TAKEN');

    const wrongPassword = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: 'WrongPassword123' });
    expect(wrongPassword.status).toBe(401);
    expect((wrongPassword.body as { error: { code: string } }).error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates refresh tokens silently with the httpOnly cookie', async () => {
    const agent = request.agent(app);
    const registered = await agent.post(`${authBase}/register`).send(account);
    expect(registered.status).toBe(201);

    const refreshed = await agent.post(`${authBase}/refresh`);
    expect(refreshed.status).toBe(200);

    const refreshedBody = bodyOf(refreshed);
    expect(refreshedBody.data.user.email).toBe(account.email);

    const me = await agent
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${refreshedBody.data.accessToken}`);
    expect(me.status).toBe(200);
  });

  it('verifies an email address with a valid token', async () => {
    const session = await registerUser();
    const rawToken = generateOpaqueToken();

    await prisma.emailVerificationToken.create({
      data: {
        userId: session.data.user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: addHours(new Date(), 24),
      },
    });

    const verification = await request(app)
      .post(`${authBase}/verify-email`)
      .send({ token: rawToken });
    expect(verification.status).toBe(200);

    const me = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${session.data.accessToken}`);
    expect((me.body as { data: { user: { emailVerified: boolean } } }).data.user.emailVerified).toBe(
      true,
    );
  });

  it('updates the profile and changes the password', async () => {
    const session = await registerUser();

    const profile = await request(app)
      .patch(`${usersBase}/me`)
      .set('Authorization', `Bearer ${session.data.accessToken}`)
      .send({ name: 'Updated Name', locale: 'en' });
    expect(profile.status).toBe(200);
    expect((profile.body as { data: { user: { name: string; locale: string } } }).data.user.name).toBe(
      'Updated Name',
    );

    const changed = await request(app)
      .post(`${usersBase}/me/change-password`)
      .set('Authorization', `Bearer ${session.data.accessToken}`)
      .send({ currentPassword: account.password, newPassword: 'NewPassword123' });
    expect(changed.status).toBe(200);

    const oldLogin = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: account.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: 'NewPassword123' });
    expect(newLogin.status).toBe(200);
  });

  it('resets a password with a valid token and rejects token reuse', async () => {
    const session = await registerUser();
    const rawToken = generateOpaqueToken();

    await prisma.passwordResetToken.create({
      data: {
        userId: session.data.user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: addHours(new Date(), 1),
      },
    });

    const reset = await request(app)
      .post(`${authBase}/reset-password`)
      .send({ token: rawToken, password: 'ResetPassword123' });
    expect(reset.status).toBe(200);

    const reuse = await request(app)
      .post(`${authBase}/reset-password`)
      .send({ token: rawToken, password: 'AnotherPassword123' });
    expect(reuse.status).toBe(400);

    const login = await request(app)
      .post(`${authBase}/login`)
      .send({ email: account.email, password: 'ResetPassword123' });
    expect(login.status).toBe(200);

    const forgotUnknown = await request(app)
      .post(`${authBase}/forgot-password`)
      .send({ email: 'nobody@example.com' });
    expect(forgotUnknown.status).toBe(200);
  });

  it('returns a consistent validation error shape', async () => {
    const response = await request(app)
      .post(`${authBase}/register`)
      .send({ name: 'A', email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(422);
    const body = response.body as {
      error: { code: string; message: string; details: { fieldErrors: Record<string, string[]> } };
    };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.fieldErrors.email?.length).toBeGreaterThan(0);
    expect(body.error.details.fieldErrors.password?.length).toBeGreaterThan(0);
  });
});
