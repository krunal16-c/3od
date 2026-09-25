import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from './main.js';

type InjectResponse = {
  statusCode: number;
  body: string;
  headers: Record<string, string | string[] | number | undefined>;
};

const testPassword = 'correct horse battery staple';

function responseJson(response: InjectResponse): Record<string, unknown> {
  return JSON.parse(response.body) as Record<string, unknown>;
}

function sessionCookie(response: InjectResponse): string {
  const setCookie = response.headers['set-cookie'];
  const first = Array.isArray(setCookie) ? setCookie[0] : typeof setCookie === 'string' ? setCookie : undefined;
  if (!first) throw new Error('Expected a session cookie');
  return first.split(';', 1)[0] ?? '';
}

async function signup(app: NestFastifyApplication, email: string, role: 'buyer' | 'printer_owner' = 'buyer') {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { email, password: testPassword, name: email.split('@')[0], role },
  });
  expect(response.statusCode).toBe(201);
  return { cookie: sessionCookie(response), user: responseJson(response).user as Record<string, unknown> };
}

describe('auth and RFQ API vertical slice', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_BUCKET;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    const created = await createApp();
    app = created.app;
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('signs up, logs in, reads me, and logs out without exposing secrets', async () => {
    const first = await signup(app, 'auth@example.com');
    expect(first.user).not.toHaveProperty('passwordHash');
    expect(first.user).not.toHaveProperty('token');

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'auth@example.com', password: testPassword },
    });
    expect(login.statusCode).toBe(200);
    expect(responseJson(login).user).toMatchObject({ email: 'auth@example.com', role: 'buyer' });
    expect(responseJson(login)).not.toHaveProperty('token');

    const cookie = sessionCookie(login);
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(responseJson(me).user).toMatchObject({ email: 'auth@example.com' });

    const logout = await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } });
    expect(logout.statusCode).toBe(204);
    const afterLogout = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(afterLogout.statusCode).toBe(401);
    expect(responseJson(afterLogout).message).toBe('Authentication required');
  });

  it('rejects invalid credentials with a generic authentication error', async () => {
    await signup(app, 'generic@example.com');
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'generic@example.com', password: 'wrong password' },
    });
    expect(response.statusCode).toBe(401);
    expect(responseJson(response).message).toBe('Invalid email or password');
  });

  it('enforces buyer and printer-owner role guards', async () => {
    const buyer = await signup(app, 'buyer@example.com');
    const owner = await signup(app, 'owner@example.com', 'printer_owner');

    const buyerInbox = await app.inject({ method: 'GET', url: '/rfqs/inbox', headers: { cookie: buyer.cookie } });
    expect(buyerInbox.statusCode).toBe(403);

    const ownerCreate = await app.inject({
      method: 'POST',
      url: '/rfqs',
      headers: { cookie: owner.cookie, 'idempotency-key': 'owner-create-1' },
      payload: { title: 'Owner cannot create', quantity: 1 },
    });
    expect(ownerCreate.statusCode).toBe(403);
  });

  it('returns the same RFQ for an idempotent retry', async () => {
    const buyer = await signup(app, 'retry@example.com');
    const request = {
      method: 'POST' as const,
      url: '/rfqs',
      headers: { cookie: buyer.cookie, 'idempotency-key': 'retry-key-123' },
      payload: { title: 'Prototype bracket', quantity: 2 },
    };
    const first = await app.inject(request);
    const retry = await app.inject(request);
    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(201);
    expect(responseJson(retry)).toEqual(responseJson(first));
  });

  it('denies cross-user upload intents and fails closed when R2 is unavailable', async () => {
    const owner = await signup(app, 'rfq-owner@example.com');
    const other = await signup(app, 'other-owner@example.com');
    const created = await app.inject({
      method: 'POST',
      url: '/rfqs',
      headers: { cookie: owner.cookie, 'idempotency-key': 'upload-rfq-123' },
      payload: { title: 'Private enclosure', quantity: 1 },
    });
    const rfqId = (responseJson(created).rfq as Record<string, unknown>).id as string;

    const crossUser = await app.inject({
      method: 'POST',
      url: `/rfqs/${rfqId}/upload-intent`,
      headers: { cookie: other.cookie },
      payload: { fileName: 'part.stl', contentType: 'model/stl', byteSize: 1024 },
    });
    expect(crossUser.statusCode).toBe(403);

    const missingR2 = await app.inject({
      method: 'POST',
      url: `/rfqs/${rfqId}/upload-intent`,
      headers: { cookie: owner.cookie },
      payload: { fileName: 'part.stl', contentType: 'model/stl', byteSize: 1024 },
    });
    expect(missingR2.statusCode).toBe(503);
    expect(responseJson(missingR2).code).toBe('STORAGE_UNAVAILABLE');
  });
});
