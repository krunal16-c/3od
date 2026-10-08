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
    const storefrontPayload = await json(storefront);
    expect(storefrontPayload).toMatchObject({ vendor: { slug: 'maker-studio' }, printers: [{ name: 'Bambu Lab P1S' }] });
    expect(storefrontPayload).not.toHaveProperty('printers[0].vendorId');

    const buyerCookie = await signup(app, db, 'buyer@example.com', 'buyer');
    const contact = await app.request('/vendors/maker-studio/contact', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Can you print 20 brackets?', phone: '9876543210' }),
    }, environment(db));
    expect(contact.status).toBe(201);
    const contactPayload = await json(contact);
    expect(contactPayload).toMatchObject({ contact: { message: 'Can you print 20 brackets?', status: 'NEW' } });
    expect(contactPayload).not.toHaveProperty('contact.buyerId');
  });

  it('keeps unpublished or malformed storefront slugs private and limits contact abuse', async () => {
    const app = createApp();
    const db = new TestD1();
    const vendorCookie = await signup(app, db, 'private-vendor@example.com', 'printer_owner');
    const profile = await app.request('/vendor/profile', {
      method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'private-studio', businessName: 'Private Studio', serviceAreas: [] }),
    }, environment(db));
    expect(profile.status).toBe(201);
    const buyerCookie = await signup(app, db, 'contact-buyer@example.com', 'buyer');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.request('/vendors/private-studio/contact', {
        method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Message ${attempt + 1}` }),
      }, environment(db));
      expect(response.status).toBe(201);
    }
    const limited = await app.request('/vendors/private-studio/contact', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Message six' }),
    }, environment(db));
    expect(limited.status).toBe(429);

    const malformed = await app.request('/vendors/../private-studio/contact', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Should not route through malformed slug' }),
    }, environment(db));
    expect([404, 405]).toContain(malformed.status);
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
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'quote-vendor');
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
    expect(await json(accepted)).toMatchObject({ quote: { state: 'ACCEPTED' }, rfq: { state: 'QUOTE_SELECTED' }, order: { status: 'ACCEPTED', buyerId: expect.any(String), vendorId: expect.any(String) } });
  });

  it('creates an order and enforces participant-only production transitions', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'order-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'order-vendor@example.com', 'printer_owner');
    const otherVendorCookie = await signup(app, db, 'other-vendor@example.com', 'printer_owner');
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'order-vendor');
    const rfqResponse = await app.request('/rfqs', { method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'order-rfq-key' }, body: JSON.stringify({ title: 'Order bracket', quantity: 1 }) }, environment(db));
    const rfqId = ((await json(rfqResponse)).rfq as JsonObject).id as string;
    const quoteResponse = await app.request(`/rfqs/${rfqId}/quotes`, { method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ amountPaise: 50000, leadTimeDays: 3 }) }, environment(db));
    const quoteId = ((await json(quoteResponse)).quote as JsonObject).id as string;
    const accepted = await app.request(`/quotes/${quoteId}/accept`, { method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ shippingAddress: 'Bengaluru, Karnataka' }) }, environment(db));
    const orderId = ((await json(accepted)).order as JsonObject).id as string;

    const unauthorized = await app.request(`/orders/${orderId}/status`, { method: 'PATCH', headers: { Origin: origin, Cookie: otherVendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'IN_PRODUCTION' }) }, environment(db));
    expect(unauthorized.status).toBe(403);
    const invalid = await app.request(`/orders/${orderId}/status`, { method: 'PATCH', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'SHIPPED' }) }, environment(db));
    expect(invalid.status).toBe(409);
    const payment = await app.request(`/orders/${orderId}/status`, { method: 'PATCH', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'AWAITING_PAYMENT' }) }, environment(db));
    expect(payment.status).toBe(200);
    const started = await app.request(`/orders/${orderId}/status`, { method: 'PATCH', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'IN_PRODUCTION' }) }, environment(db));
    expect(started.status).toBe(200);
    expect(await json(started)).toMatchObject({ order: { id: orderId, status: 'IN_PRODUCTION' } });
    const buyerOrders = await app.request('/orders/mine', { headers: { Origin: origin, Cookie: buyerCookie } }, environment(db));
    expect(await json(buyerOrders)).toMatchObject({ orders: [{ id: orderId, status: 'IN_PRODUCTION' }] });
  });

  it('confirms delivery only from a shipped order and records a notification', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'delivery-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'delivery-vendor@example.com', 'printer_owner');
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'delivery-vendor');
    const rfqResponse = await app.request('/rfqs', { method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'delivery-rfq-key' }, body: JSON.stringify({ title: 'Delivery part', quantity: 1 }) }, environment(db));
    const rfqId = ((await json(rfqResponse)).rfq as JsonObject).id as string;
    const quoteResponse = await app.request(`/rfqs/${rfqId}/quotes`, { method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ amountPaise: 50000, leadTimeDays: 3 }) }, environment(db));
    const quoteId = ((await json(quoteResponse)).quote as JsonObject).id as string;
    const accepted = await app.request(`/quotes/${quoteId}/accept`, { method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' }, body: '{}' }, environment(db));
    const orderId = ((await json(accepted)).order as JsonObject).id as string;
    for (const status of ['AWAITING_PAYMENT', 'IN_PRODUCTION', 'QUALITY_CHECK', 'SHIPPED']) {
      const response = await app.request(`/orders/${orderId}/status`, { method: 'PATCH', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }, environment(db));
      expect(response.status).toBe(200);
    }
    const delivered = await app.request(`/orders/${orderId}/delivery-confirmation`, { method: 'POST', headers: { Origin: origin, Cookie: buyerCookie } }, environment(db));
    expect(delivered.status).toBe(200);
    expect(await json(delivered)).toMatchObject({ order: { status: 'DELIVERED', deliveryConfirmedAt: expect.any(String) } });
    const order = await app.request(`/orders/${orderId}`, { headers: { Origin: origin, Cookie: buyerCookie } }, environment(db));
    expect(await json(order)).toMatchObject({ notifications: expect.arrayContaining([expect.objectContaining({ type: 'DELIVERY_CONFIRMED', userId: expect.any(String) })]) });
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

  it('saves an RFQ draft and submits it with process-aware metadata', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'draft-buyer@example.com', 'buyer');
    const draftResponse = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'draft-rfq-key' },
      body: JSON.stringify({ title: 'Prototype enclosure', quantity: 2, process: '3d_printing', tolerance: '±0.2 mm', location: 'Bengaluru', shippingPreference: 'shipping', saveAsDraft: true }),
    }, environment(db));
    expect(draftResponse.status).toBe(201);
    const draft = (await json(draftResponse)).rfq as JsonObject;
    expect(draft).toMatchObject({ state: 'DRAFT', process: '3d_printing', tolerance: '±0.2 mm', location: 'Bengaluru', shippingPreference: 'shipping' });

    const submittedResponse = await app.request(`/rfqs/${draft.id}`, {
      method: 'PATCH', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submit: true }),
    }, environment(db));
    expect(submittedResponse.status, await submittedResponse.clone().text()).toBe(200);
    expect(await json(submittedResponse)).toMatchObject({ rfq: { id: draft.id, state: 'OPEN_FOR_QUOTES' } });
  });

  it('does not submit a future manufacturing process before capability support exists', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'future-process@example.com', 'buyer');
    const response = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'future-process-key' },
      body: JSON.stringify({ title: 'Machined bracket', quantity: 1, process: 'cnc_milling', material: 'Aluminium' }),
    }, environment(db));
    expect(response.status).toBe(422);
    expect(await json(response)).toMatchObject({ code: 'PROCESS_NOT_AVAILABLE' });
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

  it('does not allow another buyer to upload to or read an RFQ-owned file flow', async () => {
    const app = createApp();
    const db = new TestD1();
    const stored: string[] = [];
    const files = {
      put: async (key: string) => {
        stored.push(key);
      },
    } as unknown as R2Bucket;
    const ownerCookie = await signup(app, db, 'rfq-owner@example.com', 'buyer');
    const otherBuyerCookie = await signup(app, db, 'other-buyer@example.com', 'buyer');
    const rfqResponse = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: ownerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'private-rfq-key' },
      body: JSON.stringify({ title: 'Private design', quantity: 1 }),
    }, environment(db, files));
    const rfqId = ((await json(rfqResponse)).rfq as JsonObject).id as string;
    const form = new FormData();
    form.append('file', new File(['solid private'], 'private.stl', { type: 'model/stl' }));

    const response = await app.request(`/rfqs/${rfqId}/files`, {
      method: 'POST', headers: { Origin: origin, Cookie: otherBuyerCookie }, body: form,
    }, environment(db, files));

    expect(response.status).toBe(403);
    expect(stored).toHaveLength(0);
  });

  it('rejects unsupported design file types before storing them', async () => {
    const app = createApp();
    const db = new TestD1();
    const stored: string[] = [];
    const files = {
      put: async (key: string) => {
        stored.push(key);
      },
    } as unknown as R2Bucket;
    const buyerCookie = await signup(app, db, 'invalid-file@example.com', 'buyer');
    const rfqResponse = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'invalid-file-rfq' },
      body: JSON.stringify({ title: 'Unsupported file', quantity: 1 }),
    }, environment(db, files));
    const rfqId = ((await json(rfqResponse)).rfq as JsonObject).id as string;
    const form = new FormData();
    form.append('file', new File(['not a CAD format'], 'design.pdf', { type: 'application/pdf' }));

    const response = await app.request(`/rfqs/${rfqId}/files`, {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie }, body: form,
    }, environment(db, files));

    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(stored).toHaveLength(0);
  });

  it('does not expose an RFQ quote list to an unrelated buyer', async () => {
    const app = createApp();
    const db = new TestD1();
    const ownerCookie = await signup(app, db, 'quote-owner@example.com', 'buyer');
    const otherBuyerCookie = await signup(app, db, 'quote-observer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'quote-vendor@example.com', 'printer_owner');
    await enableDefaultPrintingCapability(app, db, vendorCookie, 'private-quote-vendor');
    const rfqResponse = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: ownerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'quote-private-rfq' },
      body: JSON.stringify({ title: 'Private quote request', quantity: 2 }),
    }, environment(db));
    const rfqId = ((await json(rfqResponse)).rfq as JsonObject).id as string;

    const quoteResponse = await app.request(`/rfqs/${rfqId}/quotes`, {
      method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaise: 50000, leadTimeDays: 3 }),
    }, environment(db));
    expect(quoteResponse.status).toBe(201);

    const response = await app.request(`/rfqs/${rfqId}/quotes`, {
      headers: { Origin: origin, Cookie: otherBuyerCookie },
    }, environment(db));

    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('blocks a vendor without an active capable printer from quoting', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'capability-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'capability-empty-vendor@example.com', 'printer_owner');
    const rfqResponse = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'capability-rfq' },
      body: JSON.stringify({ title: 'Capability protected RFQ', quantity: 1 }),
    }, environment(db));
    const rfqId = ((await json(rfqResponse)).rfq as JsonObject).id as string;

    const response = await app.request(`/rfqs/${rfqId}/quotes`, {
      method: 'POST', headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaise: 50000, leadTimeDays: 3 }),
    }, environment(db));

    expect(response.status).toBe(422);
    expect(await json(response)).toMatchObject({ code: 'CAPABILITY_MISMATCH' });
  });

  it('caps the number of design files attached to one RFQ', async () => {
    const app = createApp();
    const db = new TestD1();
    const stored: string[] = [];
    const files = { put: async (key: string) => { stored.push(key); } } as unknown as R2Bucket;
    const buyerCookie = await signup(app, db, 'file-limit-buyer@example.com', 'buyer');
    const rfqResponse = await app.request('/rfqs', {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'file-limit-rfq' },
      body: JSON.stringify({ title: 'File limit RFQ', quantity: 1 }),
    }, environment(db, files));
    const rfqId = ((await json(rfqResponse)).rfq as JsonObject).id as string;

    for (let index = 0; index < 10; index += 1) {
      const form = new FormData();
      form.append('file', new File([`solid ${index}`], `design-${index}.stl`, { type: 'model/stl' }));
      const response = await app.request(`/rfqs/${rfqId}/files`, {
        method: 'POST', headers: { Origin: origin, Cookie: buyerCookie }, body: form,
      }, environment(db, files));
      expect(response.status).toBe(201);
    }

    const form = new FormData();
    form.append('file', new File(['solid overflow'], 'overflow.stl', { type: 'model/stl' }));
    const response = await app.request(`/rfqs/${rfqId}/files`, {
      method: 'POST', headers: { Origin: origin, Cookie: buyerCookie }, body: form,
    }, environment(db, files));

    expect(response.status).toBe(413);
    expect(await json(response)).toMatchObject({ code: 'TOO_MANY_FILES' });
    expect(stored).toHaveLength(10);
  });
});
