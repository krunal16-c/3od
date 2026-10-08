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
    this.database.exec(readFileSync(new URL('../../migrations/0007_payments.sql', import.meta.url), 'utf8'));
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

  userId(email: string) {
    const row = this.database.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (!row) throw new Error(`Test user not found: ${email}`);
    return row.id;
  }

  seedOrder(buyerId: string, vendorId: string, status = 'AWAITING_PAYMENT') {
    const timestamp = '2026-10-08T00:00:00.000Z';
    this.database.prepare(`
      INSERT INTO rfqs (id, buyer_id, idempotency_key, title, process, state, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('rfq-payment-1', buyerId, 'payment-rfq-key', 'Payment test RFQ', '3d_printing', 'QUOTE_SELECTED', timestamp, timestamp);
    this.database.prepare(`
      INSERT INTO quotes (id, rfq_id, supplier_id, idempotency_key, state, total_amount_inr, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('quote-payment-1', 'rfq-payment-1', vendorId, 'payment-quote-key', 'ACCEPTED', 1250, 'INR', timestamp, timestamp);
    this.database.prepare(`
      INSERT INTO orders (id, buyer_id, vendor_id, rfq_id, quote_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('order-payment-1', buyerId, vendorId, 'rfq-payment-1', 'quote-payment-1', status, timestamp, timestamp);
    return 'order-payment-1';
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

function cookie(response: Response) {
  return response.headers.get('set-cookie')?.split(';', 1)[0] ?? '';
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
  return cookie(response);
}

describe('Worker payment routes', () => {
  it('does not allow a browser callback to mark an order as paid', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'payment-buyer@example.com', 'buyer');

    const response = await app.request('/orders/order-1/payment/success', {
      method: 'POST',
      headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: 'browser-controlled-payment', status: 'paid' }),
    }, environment(db));

    expect(response.status).toBe(403);
  });

  it('rejects a payment intent with zero, negative, or fractional amounts', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'invalid-payment@example.com', 'buyer');

    for (const amountPaise of [0, -1, 10.5]) {
      const response = await app.request('/orders/order-1/payment-intent', {
        method: 'POST',
        headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaise }),
      }, environment(db));

      expect(response.status, `amountPaise=${amountPaise}`).toBe(400);
    }
  });

  it('creates a payment intent only for an authorized buyer and valid amount', async () => {
    const app = createApp();
    const db = new TestD1();
    const buyerCookie = await signup(app, db, 'payment-intent-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'payment-intent-vendor@example.com', 'printer_owner');
    const orderId = db.seedOrder(db.userId('payment-intent-buyer@example.com'), db.userId('payment-intent-vendor@example.com'));

    const response = await app.request(`/orders/${orderId}/payment-intent`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'payment-intent-1' },
      body: JSON.stringify({ amountPaise: 125000 }),
    }, environment(db));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ payment: { orderId, amountPaise: 125000, currency: 'INR', state: 'CREATED' } });

    const unauthorized = await app.request(`/orders/${orderId}/payment-intent`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'payment-intent-2' },
      body: JSON.stringify({ amountPaise: 125000 }),
    }, environment(db));

    expect(unauthorized.status).toBe(403);
  });

  it('does not expose payment status to a non-participant', async () => {
    const app = createApp();
    const db = new TestD1();
    await signup(app, db, 'unrelated-payment@example.com', 'buyer');
    await signup(app, db, 'payment-vendor@example.com', 'printer_owner');
    const orderId = db.seedOrder(db.userId('unrelated-payment@example.com'), db.userId('payment-vendor@example.com'));
    const outsiderCookie = await signup(app, db, 'outsider-payment@example.com', 'buyer');

    const response = await app.request(`/orders/${orderId}/payment`, {
      headers: { Origin: origin, Cookie: outsiderCookie },
    }, environment(db));

    expect(response.status).toBe(403);
  });

  it('rejects a webhook callback with an invalid signature before processing it', async () => {
    const app = createApp();
    const db = new TestD1();

    const response = await app.request('/payments/webhook', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Razorpay-Signature': 'invalid' },
      body: JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay-invalid' } } } }),
    }, environment(db));

    expect(response.status).toBe(401);
  });

  it('processes a duplicate webhook idempotently', async () => {
    const app = createApp();
    const db = new TestD1();
    const webhook = () => app.request('/payments/webhook', {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'test-signature',
        'X-Webhook-Id': 'payment-captured-event-1',
      },
      body: JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay-1' } } } }),
    }, environment(db));

    const first = await webhook();
    const second = await webhook();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ duplicate: true });
  });

  it('records failed payment callbacks without granting production access', async () => {
    const app = createApp();
    const db = new TestD1();
    const response = await app.request('/payments/webhook', {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'test-signature',
        'X-Webhook-Id': 'payment-failed-event-1',
      },
      body: JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay-failed' } } } }),
    }, environment(db));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ paymentState: 'FAILED', productionAccess: false });
  });
});
