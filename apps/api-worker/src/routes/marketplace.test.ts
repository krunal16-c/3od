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

function environment(db = new TestD1(), files: R2Bucket = {} as R2Bucket) {
  return { APP_ORIGIN: origin, NODE_ENV: 'test' as const, SESSION_SECRET: 'worker-session-secret-that-is-long-enough', DB: db as unknown as D1Database, FILES: files };
}

function cookie(response: Response) { return response.headers.get('set-cookie')?.split(';', 1)[0] ?? ''; }
type JsonObject = Record<string, unknown>;

async function json(response: Response) { return response.json() as Promise<JsonObject>; }

async function signup(app: ReturnType<typeof createApp>, db: TestD1, email: string, role: 'buyer' | 'printer_owner') {
  const response = await app.request('/auth/signup', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'StrongPassword123!', name: email.split('@')[0], role }),
  }, environment(db));
  return cookie(response);
}

describe('Worker marketplace routes', () => {
  it('lets a vendor publish a printer storefront and a buyer contact it', async () => {
    const app = createApp();
    const db = new TestD1();
    const vendorCookie = await signup(app, db, 'vendor@example.com', 'printer_owner');
    const profile = await app.request('/vendor/profile', {
      method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'maker-studio', businessName: 'Maker Studio', serviceAreas: ['Bengaluru'] }),
    }, environment(db));
    expect(profile.status).toBe(201);
    const printer = await app.request('/vendor/printers', {
      method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bambu Lab P1S', model: 'P1S', technologies: ['FDM'], materials: ['PLA'], minOrderQuantity: 5 }),
    }, environment(db));
    expect(await json(printer)).toMatchObject({ printer: { minOrderQuantity: 5 } });

    const storefront = await app.request('/vendors/maker-studio', { headers: { Origin: origin } }, environment(db));
    expect(storefront.status).toBe(200);
    expect(await json(storefront)).toMatchObject({ vendor: { slug: 'maker-studio' }, printers: [{ name: 'Bambu Lab P1S' }] });

    const buyerCookie = await signup(app, db, 'buyer@example.com', 'buyer');
    const contact = await app.request('/vendors/maker-studio/contact', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Can you print 20 brackets?', phone: '9876543210' }),
    }, environment(db));
    expect(contact.status).toBe(201);
    expect(await json(contact)).toMatchObject({ contact: { message: 'Can you print 20 brackets?', status: 'NEW' } });
  });

  it('enforces buyer/vendor role boundaries', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'vendor@example.com', 'printer_owner');

    const buyerInbox = await app.request('/rfqs/inbox', { headers: { Origin: origin, Cookie: buyerCookie } }, environment(db));
    expect(buyerInbox.status).toBe(403);
    const vendorRfq = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'vendor-cannot-rfq' },
      body: JSON.stringify({ title: 'Part', quantity: 1 }),
    }, environment(db));
    expect(vendorRfq.status).toBe(403);
  });

  it('creates an RFQ once for repeated idempotency keys and supports quote acceptance', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'vendor@example.com', 'printer_owner');
    const rfqRequest = () => app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'rfq-retry-key' },
      body: JSON.stringify({ title: 'PETG bracket', quantity: 10, material: 'PETG' }),
    }, environment(db));
    const first = await rfqRequest();
    const second = await rfqRequest();
    expect(first.status).toBe(201);
    const firstPayload = await json(first);
    const secondPayload = await json(second);
    const firstRfq = firstPayload.rfq as JsonObject;
    const secondRfq = secondPayload.rfq as JsonObject;
    expect(secondRfq.id).toBe(firstRfq.id);
    const rfqId = firstRfq.id as string;

    const quote = await app.request(`/rfqs/${rfqId}/quotes`, {
      method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaise: 185000, leadTimeDays: 4, notes: 'Ready to print' }),
    }, environment(db));
    expect(quote.status).toBe(201);
    const quotePayload = await json(quote);
    const quoteId = (quotePayload.quote as JsonObject).id as string;
    const quotes = await app.request(`/rfqs/${rfqId}/quotes`, { headers: { Origin: origin, Cookie: buyerCookie } }, environment(db));
    expect(await json(quotes)).toMatchObject({ quotes: [{ totalAmountInr: 1850, state: 'VISIBLE_TO_BUYER' }] });

    const accepted = await app.request(`/quotes/${quoteId}/accept`, { method: 'POST', headers: { Origin: origin, Cookie: buyerCookie } }, environment(db));
    expect(accepted.status).toBe(200);
    expect(await json(accepted)).toMatchObject({ quote: { state: 'ACCEPTED' }, rfq: { state: 'QUOTE_SELECTED' } });
  });

  it('rejects invalid RFQ input and missing idempotency keys', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'buyer@example.com', 'buyer');
    const response = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', quantity: 0 }),
    }, environment(db));
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('stores an RFQ design file in the configured R2 bucket', async () => {
    const app = createApp();
    const db = new TestD1();
    const stored: { key?: string; body?: unknown; contentType?: string } = {};
    const files = {
      put: async (key: string, body: unknown, options?: { httpMetadata?: { contentType?: string } }) => {
        stored.key = key;
        stored.body = body;
        stored.contentType = options?.httpMetadata?.contentType;
        return undefined;
      },
    } as unknown as R2Bucket;
    const buyerCookie = await signup(app, db, 'file-buyer@example.com', 'buyer');
    const rfqResponse = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'file-rfq-key' },
      body: JSON.stringify({ title: 'Uploaded bracket', quantity: 1 }),
    }, environment(db, files));
    const rfqId = ((await json(rfqResponse)).rfq as JsonObject).id as string;
    const form = new FormData();
    form.append('file', new File(['solid bracket'], 'bracket.stl', { type: 'model/stl' }));

    const response = await app.request(`/rfqs/${rfqId}/files`, {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie }, body: form,
    }, environment(db, files));

    expect(response.status).toBe(201);
    expect(await json(response)).toMatchObject({ file: { originalFilename: 'bracket.stl', contentType: 'model/stl', state: 'PENDING' } });
    expect(stored.key).toContain(`rfqs/${rfqId}/`);
    expect(stored.contentType).toBe('model/stl');
  });
});
