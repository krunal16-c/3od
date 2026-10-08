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
    this.database.exec(readFileSync(new URL('../../migrations/0003_rfq_process_metadata.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../../migrations/0004_orders.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../../migrations/0005_quote_idempotency.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../../migrations/0006_vendor_tools.sql', import.meta.url), 'utf8'));
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

function environment(db: TestD1) {
  return {
    APP_ORIGIN: origin,
    NODE_ENV: 'test' as const,
    SESSION_SECRET: 'worker-session-secret-that-is-long-enough',
    DB: db as unknown as D1Database,
    FILES: {} as R2Bucket,
  };
}

function sessionCookie(response: Response) {
  return response.headers.get('set-cookie')?.split(';', 1)[0] ?? '';
}

type JsonObject = Record<string, unknown>;

async function json(response: Response) {
  return response.json() as Promise<JsonObject>;
}

async function signup(
  app: ReturnType<typeof createApp>,
  db: TestD1,
  email: string,
  role: 'buyer' | 'printer_owner',
) {
  const response = await app.request('/auth/signup', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'StrongPassword123!', name: email.split('@')[0], role }),
  }, environment(db));
  expect(response.status).toBe(201);
  return sessionCookie(response);
}

async function enableDefaultPrintingCapability(app: ReturnType<typeof createApp>, db: TestD1, vendorCookie: string, slug: string) {
  const profile = await app.request('/vendor/profile', {
    method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, businessName: `${slug} studio` }),
  }, environment(db));
  expect(profile.status).toBe(201);
  const printer = await app.request('/vendor/printers', {
    method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test printer', processes: ['3d_printing'] }),
  }, environment(db));
  expect(printer.status).toBe(201);
}

async function createRfq(
  app: ReturnType<typeof createApp>,
  db: TestD1,
  buyerCookie: string,
  idempotencyKey = 'production-workflow-rfq',
) {
  const response = await app.request('/rfqs', {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: buyerCookie,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ title: 'Production bracket', quantity: 4, material: 'PETG' }),
  }, environment(db));
  expect(response.status).toBe(201);
  return ((await json(response)).rfq as JsonObject).id as string;
}

async function createQuote(
  app: ReturnType<typeof createApp>,
  db: TestD1,
  rfqId: string,
  vendorCookie: string,
  idempotencyKey?: string,
) {
  const headers: Record<string, string> = {
    Origin: origin,
    Cookie: vendorCookie,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const response = await app.request(`/rfqs/${rfqId}/quotes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amountPaise: 125000, leadTimeDays: 5, notes: 'Production-ready quote' }),
  }, environment(db));
  expect(response.status).toBe(201);
  return (await json(response)).quote as JsonObject;
}

describe('Ticket 03 production workflow QA', () => {
  it('supports the buyer acceptance path and rejects a duplicate acceptance transition', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'workflow-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'workflow-vendor@example.com', 'printer_owner');
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'workflow-vendor');
    const rfqId = await createRfq(app, db, buyerCookie);
    const quote = await createQuote(app, db, rfqId, vendorCookie);

    const first = await app.request(`/quotes/${quote.id as string}/accept`, {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie },
    }, environment(db));
    expect(first.status).toBe(200);
    expect(await json(first)).toMatchObject({ quote: { state: 'ACCEPTED' }, rfq: { state: 'QUOTE_SELECTED' } });

    const second = await app.request(`/quotes/${quote.id as string}/accept`, {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie },
    }, environment(db));
    expect(second.status).toBe(403);
    expect(await json(second)).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects a different buyer from accepting another buyer\'s quote', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'workflow-owner@example.com', 'buyer');
    const otherBuyerCookie = await signup(app, db, 'workflow-other@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'workflow-vendor-two@example.com', 'printer_owner');
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'workflow-vendor-two');
    const rfqId = await createRfq(app, db, buyerCookie, 'workflow-owner-rfq');
    const quote = await createQuote(app, db, rfqId, vendorCookie);

    const response = await app.request(`/quotes/${quote.id as string}/accept`, {
      method: 'POST', headers: { Origin: origin, Cookie: otherBuyerCookie },
    }, environment(db));
    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('creates an order when the buyer accepts a quote', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'order-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'order-vendor@example.com', 'printer_owner');
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'order-vendor');
    const rfqId = await createRfq(app, db, buyerCookie, 'order-rfq-key');
    const quote = await createQuote(app, db, rfqId, vendorCookie);

    const response = await app.request(`/quotes/${quote.id as string}/accept`, {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie },
    }, environment(db));
    const payload = await json(response);
    expect(response.status).toBe(200);
    expect(payload.order).toMatchObject({ rfqId, quoteId: quote.id, status: 'ACCEPTED' });
  });

  it('limits quote visibility to the RFQ buyer and participating vendor', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'visibility-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'visibility-vendor@example.com', 'printer_owner');
    const unrelatedVendorCookie = await signup(app, db, 'unrelated-vendor@example.com', 'printer_owner');
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'visibility-vendor');
    const rfqId = await createRfq(app, db, buyerCookie, 'visibility-rfq-key');
    await createQuote(app, db, rfqId, vendorCookie);

    const response = await app.request(`/rfqs/${rfqId}/quotes`, {
      headers: { Origin: origin, Cookie: unrelatedVendorCookie },
    }, environment(db));
    expect(response.status).toBe(403);
  });

  it('deduplicates repeated quote submissions with the same idempotency key', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'duplicate-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'duplicate-vendor@example.com', 'printer_owner');
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'duplicate-vendor');
    const rfqId = await createRfq(app, db, buyerCookie, 'duplicate-rfq-key');
    const first = await createQuote(app, db, rfqId, vendorCookie, 'duplicate-quote-key');
    const second = await createQuote(app, db, rfqId, vendorCookie, 'duplicate-quote-key');

    expect(second.id).toBe(first.id);
  });
});
