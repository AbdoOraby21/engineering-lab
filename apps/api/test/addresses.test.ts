import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const authBase = '/api/v1/auth';
const usersBase = '/api/v1/users';

const firstUser = {
  name: 'Address Owner',
  email: 'owner@example.com',
  password: 'Password123',
  locale: 'en' as const,
};

const secondUser = {
  name: 'Other User',
  email: 'other@example.com',
  password: 'Password123',
  locale: 'en' as const,
};

interface AddressShape {
  id: string;
  label: string | null;
  isDefault: boolean;
  city: string;
}

async function register(payload: typeof firstUser): Promise<string> {
  const response = await request(app).post(`${authBase}/register`).send(payload);
  expect(response.status).toBe(201);
  return (response.body as { data: { accessToken: string } }).data.accessToken;
}

async function createAddress(
  token: string,
  payload: Record<string, unknown>,
): Promise<AddressShape> {
  const response = await request(app)
    .post(`${usersBase}/me/addresses`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  expect(response.status).toBe(201);
  return (response.body as { data: { address: AddressShape } }).data.address;
}

const cairoAddress = {
  governorate: 'Cairo',
  city: 'Nasr City',
  street: 'Abbas El Akkad',
  building: '12',
  label: 'Home',
};

const gizaAddress = {
  governorate: 'Giza',
  city: 'Dokki',
  street: 'Tahrir Street',
  building: '5',
  label: 'Work',
};

beforeEach(async () => {
  await resetDatabase();
});

describe('addresses', () => {
  it('requires authentication', async () => {
    const response = await request(app).get(`${usersBase}/me/addresses`);
    expect(response.status).toBe(401);
  });

  it('creates addresses and keeps exactly one default', async () => {
    const token = await register(firstUser);

    const first = await createAddress(token, cairoAddress);
    expect(first.isDefault).toBe(true);

    const second = await createAddress(token, { ...gizaAddress, isDefault: true });
    expect(second.isDefault).toBe(true);

    const list = await request(app)
      .get(`${usersBase}/me/addresses`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    const addresses = (list.body as { data: { addresses: AddressShape[] } }).data.addresses;
    expect(addresses).toHaveLength(2);
    expect(addresses.filter((address) => address.isDefault)).toHaveLength(1);
    expect(addresses[0]?.id).toBe(second.id);
  });

  it('updates, switches default and deletes an address', async () => {
    const token = await register(firstUser);
    const first = await createAddress(token, cairoAddress);
    const second = await createAddress(token, gizaAddress);

    const updated = await request(app)
      .patch(`${usersBase}/me/addresses/${second.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Office', city: 'Mohandessin' });
    expect(updated.status).toBe(200);
    expect((updated.body as { data: { address: AddressShape } }).data.address.city).toBe(
      'Mohandessin',
    );

    const setDefault = await request(app)
      .post(`${usersBase}/me/addresses/${first.id}/default`)
      .set('Authorization', `Bearer ${token}`);
    expect(setDefault.status).toBe(200);

    const removed = await request(app)
      .delete(`${usersBase}/me/addresses/${first.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(200);

    const list = await request(app)
      .get(`${usersBase}/me/addresses`)
      .set('Authorization', `Bearer ${token}`);
    const addresses = (list.body as { data: { addresses: AddressShape[] } }).data.addresses;
    expect(addresses).toHaveLength(1);
    expect(addresses[0]?.id).toBe(second.id);
    expect(addresses[0]?.isDefault).toBe(true);
  });

  it('prevents users from touching another user address', async () => {
    const ownerToken = await register(firstUser);
    const otherToken = await register(secondUser);
    const address = await createAddress(ownerToken, cairoAddress);

    const update = await request(app)
      .patch(`${usersBase}/me/addresses/${address.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ city: 'Alexandria' });
    expect(update.status).toBe(404);

    const remove = await request(app)
      .delete(`${usersBase}/me/addresses/${address.id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(remove.status).toBe(404);
  });
});
