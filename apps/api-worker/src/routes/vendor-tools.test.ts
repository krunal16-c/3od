import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncClass, SQLInputValue } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { createApp } from '../http.js';
import type { D1DatabaseLike, D1PreparedStatementLike } from '../db/types.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: typeof DatabaseSyncClass };
const origin = 'https://app.3od.example';
type JsonObject = Record<string, unknown>;

class TestD1 implements D1DatabaseLike {
  private readonly database = new DatabaseSync(':memory:');

  constructor() {
    for (const migration of ['0001_marketplace.sql', '0002_email_verification.sql', '0003_rfq_process_metadata.sql', '0004_orders.sql', '0005_quote_idempotency.sql', '0006_vendor_tools.sql']) {
      this.database.exec(readFileSync(new URL(`../../migrations/${migration}`, import.meta.url), 'utf8'));
    }
  }

  prepare(query: string): D1PreparedStatementLike {
    const statement = this.database.prepare(query);
    return {
      bind: (...values: unknown[]) => ({
        bind: (...next: unknown[]) => this.prepare(query).bind(...next),
        all: async <T>() => ({ results: statement.all(...values as SQLInputValue[]) as unknown as T[] }),
        first: async <T>() => (statement.get(...values as SQLInputValue[]) as T | undefined) ?? null,
        run: async () => ({ success: true, meta: { changes: Number(statement.run(...values as SQLInputValue[]).changes) } }),
      }),
      all: async <T>() => ({ results: statement.all() as unknown as T[] }),
      first: async <T>() => (statement.get() as T | undefined) ?? null,
      run: async () => ({ success: true, meta: { changes: Number(statement.run().changes) } }),
    };
  }
}

function environment(db = new TestD1()) {
  return { APP_ORIGIN: origin, NODE_ENV: 'test' as const, SESSION_SECRET: 'worker-session-secret-that-is-long-enough', DB: db as unknown as D1Database, FILES: {} as R2Bucket };
}

function cookie(response: Response) { return response.headers.get('set-cookie')?.split(';', 1)[0] ?? ''; }
async function json(response: Response) { return response.json() as Promise<Record<string, unknown>>; }

async function signup(app: ReturnType<typeof createApp>, db: TestD1, email: string) {
  const response = await app.request('/auth/signup', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'StrongPassword123!', name: email.split('@')[0], role: 'printer_owner' }),
  }, environment(db));
  return cookie(response);
}

describe('vendor tools routes', () => {
  it('publishes capability, process, MOQ, and lead-time data on the public storefront', async () => {
    const app = createApp();
    const db = new TestD1();
    const vendorCookie = await signup(app, db, 'capability-vendor@example.com');
    await app.request('/vendor/profile', { method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'capability-studio', businessName: 'Capability Studio', serviceAreas: ['Bengaluru', 'Pan India'] }) }, environment(db));
    const printer = await app.request('/vendor/printers', { method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'P1S', technologies: ['FDM'], materials: ['PETG'], processes: ['3d_printing'], minOrderQuantity: 4, leadTimeDays: 7 }) }, environment(db));
    expect(printer.status).toBe(201);
    const storefront = await app.request('/vendors/capability-studio', { headers: { Origin: origin } }, environment(db));
    expect(await json(storefront)).toMatchObject({ printers: [{ minOrderQuantity: 4, leadTimeDays: 7, processes: ['3d_printing'] }] });
  });

  it('rejects overlapping blackout dates and keeps availability vendor-owned', async () => {
    const app = createApp();
    const db = new TestD1();
    const ownerCookie = await signup(app, db, 'availability-owner@example.com');
    const otherCookie = await signup(app, db, 'availability-other@example.com');
    await app.request('/vendor/profile', { method: 'POST', headers: { Origin: origin, Cookie: ownerCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'availability-studio', businessName: 'Availability Studio' }) }, environment(db));
    const printer = await app.request('/vendor/printers', { method: 'POST', headers: { Origin: origin, Cookie: ownerCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'A1', minOrderQuantity: 1 }) }, environment(db));
    const printerPayload = await json(printer);
    const printerId = (printerPayload.printer as JsonObject).id as string;
    const first = await app.request(`/vendor/printers/${printerId}/blackouts`, { method: 'POST', headers: { Origin: origin, Cookie: ownerCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ startsOn: '2026-11-01', endsOn: '2026-11-03', reason: 'Maintenance' }) }, environment(db));
    expect(first.status).toBe(201);
    const overlap = await app.request(`/vendor/printers/${printerId}/blackouts`, { method: 'POST', headers: { Origin: origin, Cookie: ownerCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ startsOn: '2026-11-03', endsOn: '2026-11-04' }) }, environment(db));
    expect(overlap.status).toBe(409);
    const unauthorized = await app.request(`/vendor/printers/${printerId}/blackouts`, { headers: { Origin: origin, Cookie: otherCookie } }, environment(db));
    expect(unauthorized.status).toBe(403);
  });

  it('returns real vendor reports only to the owner', async () => {
    const app = createApp();
    const db = new TestD1();
    const ownerCookie = await signup(app, db, 'reports-owner@example.com');
    const otherCookie = await signup(app, db, 'reports-other@example.com');
    expect((await app.request('/vendor/reports/summary', { headers: { Origin: origin, Cookie: ownerCookie } }, environment(db))).status).toBe(200);
    expect((await app.request('/vendor/reports/summary', { headers: { Origin: origin, Cookie: otherCookie } }, environment(db))).status).toBe(200);
    expect((await app.request('/vendor/reports/summary', { headers: { Origin: origin } }, environment(db))).status).toBe(401);
  });
});
