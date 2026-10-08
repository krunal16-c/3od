import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncClass, SQLInputValue } from 'node:sqlite';
import { canVendorQuoteProcess, getManufacturingProcess, hasEnabledCapability, manufacturingProcessCatalog, validateManufacturingRequest } from '@3od/domain';
import { describe, expect, it } from 'vitest';

import { createApp } from '../http.js';
import type { D1DatabaseLike, D1PreparedStatementLike } from '../db/types.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: typeof DatabaseSyncClass };
const origin = 'https://app.3od.example';

class ManufacturingTestD1 implements D1DatabaseLike {
  private readonly database = new DatabaseSync(':memory:');

  constructor() {
    for (const migration of [
      '0001_marketplace.sql',
      '0002_email_verification.sql',
      '0003_rfq_process_metadata.sql',
      '0004_orders.sql',
      '0005_quote_idempotency.sql',
      '0006_vendor_tools.sql',
    ]) {
      this.database.exec(readFileSync(new URL(`../../migrations/${migration}`, import.meta.url), 'utf8'));
    }
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
      bind: (...values: unknown[]) => {
        parameters = values as SQLInputValue[];
        return bound(parameters);
      },
      all: async <T>() => ({ results: statement.all(...parameters) as unknown as T[] }),
      first: async <T>() => (statement.get(...parameters) as T | undefined) ?? null,
      run: async () => ({ success: true, meta: { changes: Number(statement.run(...parameters).changes) } }),
    };
  }
}

function environment(db = new ManufacturingTestD1()) {
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
  db: ManufacturingTestD1,
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

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('manufacturing expansion contracts', () => {
  it('discovers enabled, coming-next, and planned processes without exposing them as enabled', () => {
    expect(manufacturingProcessCatalog.map(({ id }) => id)).toEqual([
      '3d_printing',
      'cnc_milling',
      'cnc_turning',
      'laser_cutting',
      'fabrication',
      'waterjet_cutting',
      'vacuum_forming',
      'injection_molding',
    ]);
    expect(manufacturingProcessCatalog.filter(({ availability }) => availability === 'enabled')).toEqual([
      expect.objectContaining({ id: '3d_printing' }),
    ]);
    expect(getManufacturingProcess('cnc_milling')).toMatchObject({ availability: 'coming_next' });
    expect(getManufacturingProcess('waterjet_cutting')).toMatchObject({ availability: 'planned' });
  });

  it('rejects unsupported processes and incomplete process metadata', () => {
    expect(validateManufacturingRequest({ process: '3d_printing' })).toEqual({ ok: true });
    expect(validateManufacturingRequest({ process: 'cnc_milling', material: 'Aluminium' })).toMatchObject({
      ok: false,
      code: 'PROCESS_NOT_AVAILABLE',
    });
    expect(validateManufacturingRequest({ process: 'laser_cutting', material: 'Acrylic' })).toMatchObject({
      ok: false,
      code: 'PROCESS_NOT_AVAILABLE',
    });
    expect(validateManufacturingRequest({ process: 'fabrication', material: 'Steel', tolerance: '±0.1 mm' })).toMatchObject({
      ok: false,
      code: 'PROCESS_NOT_AVAILABLE',
    });
    expect(validateManufacturingRequest({ process: 'not-a-process' })).toMatchObject({
      ok: false,
      code: 'PROCESS_NOT_AVAILABLE',
    });
  });

  it('matches quote eligibility only when a vendor has the requested enabled capability', () => {
    expect(hasEnabledCapability(['3d_printing'])).toBe(true);
    expect(hasEnabledCapability(['cnc_milling', 'laser_cutting'])).toBe(false);
    expect(canVendorQuoteProcess(['3d_printing'], '3d_printing')).toBe(true);
    expect(canVendorQuoteProcess(['cnc_milling'], '3d_printing')).toBe(false);
    expect(canVendorQuoteProcess(['3d_printing'], 'cnc_milling')).toBe(false);
  });
});

describe('manufacturing expansion route authorization', () => {
  it('rejects buyers from vendor capability management and quote submission', async () => {
    const app = createApp();
    const db = new ManufacturingTestD1();
    const buyerCookie = await signup(app, db, 'manufacturing-buyer@example.com', 'buyer');

    const printerResponse = await app.request('/vendor/printers', {
      method: 'POST',
      headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized machine', processes: ['3d_printing'] }),
    }, environment(db));
    expect(printerResponse.status).toBe(403);

    const quoteResponse = await app.request('/rfqs/not-owned/quotes', {
      method: 'POST',
      headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaise: 10000, leadTimeDays: 2 }),
    }, environment(db));
    expect(quoteResponse.status).toBe(403);
  });

  it('requires a vendor to have a matching listed capability before quoting', async () => {
    const app = createApp();
    const db = new ManufacturingTestD1();
    const buyerCookie = await signup(app, db, 'eligibility-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'eligibility-vendor@example.com', 'printer_owner');
    const rfqResponse = await app.request('/rfqs', {
      method: 'POST',
      headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'eligibility-rfq-key' },
      body: JSON.stringify({ title: 'Capability matched bracket', quantity: 1, material: 'PETG' }),
    }, environment(db));
    const rfq = await json(rfqResponse);
    const createdRfq = rfq.rfq as { id: string };
    const quoteResponse = await app.request(`/rfqs/${createdRfq.id}/quotes`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaise: 10000, leadTimeDays: 2 }),
    }, environment(db));

    expect(quoteResponse.status).toBe(422);
    expect(await json(quoteResponse)).toMatchObject({ code: 'CAPABILITY_MISMATCH' });
  });

  it('allows a vendor to list an enabled capability and rejects future capabilities', async () => {
    const app = createApp();
    const db = new ManufacturingTestD1();
    const vendorCookie = await signup(app, db, 'capability-listing-vendor@example.com', 'printer_owner');

    const profileResponse = await app.request('/vendor/profile', {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'capability-listing-vendor', businessName: 'Capability Listing Workshop', serviceAreas: ['Bengaluru'] }),
    }, environment(db));
    expect(profileResponse.status).toBe(201);

    const enabledResponse = await app.request('/vendor/printers', {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FDM Printer', processes: ['3d_printing'], materials: ['PETG'], technologies: ['FDM'] }),
    }, environment(db));
    expect(enabledResponse.status).toBe(201);
    expect(await json(enabledResponse)).toMatchObject({ printer: { processes: ['3d_printing'] } });

    const futureResponse = await app.request('/vendor/printers', {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'CNC Mill', processes: ['3d_printing', 'cnc_milling'], materials: ['Aluminium'], technologies: ['CNC'] }),
    }, environment(db));
    expect(futureResponse.status).toBe(422);
    expect(await json(futureResponse)).toMatchObject({ code: 'PROCESS_NOT_AVAILABLE' });
  });

  it('filters the vendor RFQ inbox to RFQs matching the vendor capability', async () => {
    const app = createApp();
    const db = new ManufacturingTestD1();
    const buyerCookie = await signup(app, db, 'inbox-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'inbox-vendor@example.com', 'printer_owner');

    await app.request('/vendor/profile', {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'inbox-vendor', businessName: 'Inbox Workshop', serviceAreas: [] }),
    }, environment(db));
    await app.request('/vendor/printers', {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FDM Printer', processes: ['3d_printing'], materials: [], technologies: [] }),
    }, environment(db));

    const rfqResponse = await app.request('/rfqs', {
      method: 'POST',
      headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'inbox-rfq-key' },
      body: JSON.stringify({ title: 'Inbox bracket', process: '3d_printing', quantity: 2, material: 'PETG' }),
    }, environment(db));
    expect(rfqResponse.status).toBe(201);
    const rfqId = ((await json(rfqResponse)).rfq as { id: string }).id;

    const inboxResponse = await app.request('/rfqs/inbox', {
      headers: { Origin: origin, Cookie: vendorCookie },
    }, environment(db));
    expect(inboxResponse.status).toBe(200);
    expect(await json(inboxResponse)).toMatchObject({ rfqs: [expect.objectContaining({ id: rfqId, process: '3d_printing' })] });
  });

  it('allows a vendor with a matching capability to submit a quote', async () => {
    const app = createApp();
    const db = new ManufacturingTestD1();
    const buyerCookie = await signup(app, db, 'matching-buyer@example.com', 'buyer');
    const vendorCookie = await signup(app, db, 'matching-vendor@example.com', 'printer_owner');

    await app.request('/vendor/profile', {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'matching-vendor', businessName: 'Matching Workshop', serviceAreas: [] }),
    }, environment(db));
    await app.request('/vendor/printers', {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FDM Printer', processes: ['3d_printing'], materials: ['PETG'], technologies: ['FDM'] }),
    }, environment(db));

    const rfqResponse = await app.request('/rfqs', {
      method: 'POST',
      headers: { Origin: origin, Cookie: buyerCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'matching-rfq-key' },
      body: JSON.stringify({ title: 'Quote-ready bracket', process: '3d_printing', quantity: 1, material: 'PETG' }),
    }, environment(db));
    const rfqId = ((await json(rfqResponse)).rfq as { id: string }).id;

    const quoteResponse = await app.request(`/rfqs/${rfqId}/quotes`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: vendorCookie, 'Content-Type': 'application/json', 'Idempotency-Key': 'matching-quote-key' },
      body: JSON.stringify({ amountPaise: 25000, leadTimeDays: 4 }),
    }, environment(db));
    expect(quoteResponse.status).toBe(201);
    expect(await json(quoteResponse)).toMatchObject({ quote: { rfqId, supplierId: expect.any(String), totalAmountInr: 250 } });
  });
});
