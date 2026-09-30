import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncClass, SQLInputValue } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { createApp } from '../http.js';
import type { D1DatabaseLike, D1PreparedStatementLike } from '../db/types.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: typeof DatabaseSyncClass };
const origin = 'https://app.3od.example';

class TestD1 implements D1DatabaseLike {
  private readonly database = new DatabaseSync(':memory:');

  constructor() {
    this.database.exec(readFileSync(new URL('../../migrations/0001_marketplace.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../../migrations/0002_email_verification.sql', import.meta.url), 'utf8'));
  }

  prepare(query: string): D1PreparedStatementLike {
    const statement = this.database.prepare(query);
    let parameters: SQLInputValue[] = [];
    const bound = (values: SQLInputValue[]) => ({
      bind: (...next: unknown[]) => bound(next as SQLInputValue[]),
      all: async <T>() => ({ results: statement.all(...values) as unknown as T[] }),
      first: async <T>() => (statement.get(...values) as T | undefined) ?? null,
      run: async () => ({ success: true, meta: { changes: Number(statement.run(...values).changes) } }),
    });
    return {
      bind: (...values: unknown[]) => { parameters = values as SQLInputValue[]; return bound(parameters); },
      all: async <T>() => ({ results: statement.all(...parameters) as unknown as T[] }),
      first: async <T>() => (statement.get(...parameters) as T | undefined) ?? null,
      run: async () => ({ success: true, meta: { changes: Number(statement.run(...parameters).changes) } }),
    };
  }
}

function environment(db = new TestD1()) {
  return {
    APP_ORIGIN: origin,
    NODE_ENV: 'test' as const,
    SESSION_SECRET: 'worker-session-secret-that-is-long-enough',
    DB: db as unknown as D1Database,
    FILES: {} as R2Bucket,
  };
}

function body(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function cookie(response: Response) {
  const value = response.headers.get('set-cookie');
  return value?.split(';', 1)[0] ?? '';
}

async function signup(app: ReturnType<typeof createApp>, email: string) {
  const db = new TestD1();
  const response = await app.request('/auth/signup', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'StrongPassword123!', name: 'Test User', role: 'buyer' }),
  }, environment(db));
  return { response, cookie: cookie(response), db };
}

describe('Worker authentication routes', () => {
  it('signs up and returns the current user through an HttpOnly session cookie', async () => {
    const app = createApp();
    const db = new TestD1();
    const response = await app.request('/auth/signup', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@example.com', password: 'StrongPassword123!', name: 'Buyer', role: 'buyer' }),
    }, environment(db));
    const payload = await body(response);

    expect(response.status).toBe(201);
    expect(payload.user).toMatchObject({ email: 'buyer@example.com', name: 'Buyer', role: 'buyer' });
    expect(response.headers.get('set-cookie')).toMatch(/3od_session=.+; Path=\/; HttpOnly; SameSite=Lax/);

    const me = await app.request('/auth/me', { headers: { Origin: origin, Cookie: cookie(response) } }, environment(db));
    expect(me.status).toBe(200);
    expect(await body(me)).toMatchObject({ user: { email: 'buyer@example.com', role: 'buyer' } });
  });

  it('rejects invalid and duplicate accounts with stable API errors', async () => {
    const app = createApp();
    const db = new TestD1();
    const invalid = await app.request('/auth/signup', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'short', name: '', role: 'buyer' }),
    }, environment(db));
    expect(invalid.status).toBe(400);

    const first = await signup(app, 'duplicate@example.com');
    expect(first.response.status).toBe(201);
    const duplicateResponse = await app.request('/auth/signup', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'DUPLICATE@example.com', password: 'StrongPassword123!', name: 'Test User', role: 'buyer' }),
    }, environment(first.db));
    const duplicate = { response: duplicateResponse };
    expect(duplicate.response.status).toBe(409);
    expect(await body(duplicate.response)).toMatchObject({ code: 'ACCOUNT_EXISTS' });
  });

  it('rejects invalid login, then invalidates the session on logout', async () => {
    const app = createApp();
    const db = new TestD1();
    await app.request('/auth/signup', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'StrongPassword123!', name: 'Login User', role: 'buyer' }),
    }, environment(db));
    const invalid = await app.request('/auth/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'wrong-password' }),
    }, environment(db));
    expect(invalid.status).toBe(401);

    const loggedIn = await app.request('/auth/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'StrongPassword123!' }),
    }, environment(db));
    const sessionCookie = cookie(loggedIn);
    expect(loggedIn.status).toBe(200);

    const logout = await app.request('/auth/logout', { method: 'POST', headers: { Origin: origin, Cookie: sessionCookie } }, environment(db));
    expect(logout.status).toBe(204);
    const me = await app.request('/auth/me', { headers: { Origin: origin, Cookie: sessionCookie } }, environment(db));
    expect(me.status).toBe(401);
  });

  it('returns a distinct account-not-found error for an unknown login email', async () => {
    const response = await createApp().request('/auth/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'StrongPassword123!' }),
    }, environment());

    expect(response.status).toBe(404);
    expect(await body(response)).toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });
  });

  it('requires a valid session for /auth/me', async () => {
    const response = await createApp().request('/auth/me', { headers: { Origin: origin } }, environment());
    expect(response.status).toBe(401);
    expect(await body(response)).toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
