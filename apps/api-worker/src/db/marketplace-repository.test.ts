import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncClass, SQLInputValue } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { QuoteState, RfqState } from '@3od/domain';

import { D1MarketplaceRepository } from './marketplace-repository.js';
import type { D1DatabaseLike, D1PreparedStatementLike } from './types.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: typeof DatabaseSyncClass };

class InMemoryD1 implements D1DatabaseLike {
  private readonly database = new DatabaseSync(':memory:');

  constructor() {
    this.database.exec([
      readFileSync(new URL('../../migrations/0001_marketplace.sql', import.meta.url), 'utf8'),
      readFileSync(new URL('../../migrations/0002_email_verification.sql', import.meta.url), 'utf8'),
    ].join('\n'));
  }

  prepare(query: string): D1PreparedStatementLike {
    const statement = this.database.prepare(query);
    let parameters: SQLInputValue[] = [];

    return {
      bind: (...values: unknown[]) => {
        parameters = values as SQLInputValue[];
        return this.prepareBound(statement, () => parameters);
      },
      all: async <T>() => ({ results: statement.all(...parameters) as unknown as T[] }),
      first: async <T>() => (statement.get(...parameters) as T | undefined) ?? null,
      run: async () => {
        const result = statement.run(...parameters);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    };
  }

  private prepareBound(
    statement: ReturnType<InstanceType<typeof DatabaseSync>['prepare']>,
    parameters: () => SQLInputValue[],
  ): D1PreparedStatementLike {
    return {
      bind: (...values: unknown[]) => this.prepareBound(statement, () => values as SQLInputValue[]),
      all: async <T>() => ({ results: statement.all(...parameters()) as unknown as T[] }),
      first: async <T>() => (statement.get(...parameters()) as T | undefined) ?? null,
      run: async () => {
        const result = statement.run(...parameters());
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    };
  }
}

describe('D1MarketplaceRepository', () => {
  it('creates users and finds them by normalized email and id', async () => {
    const repository = new D1MarketplaceRepository(new InMemoryD1());

    const user = await repository.createUser({
      email: 'maker@example.com',
      passwordHash: 'hash',
      role: 'PRINTER_OWNER',
      displayName: 'Maker Studio',
    });

    expect(await repository.findUserByEmail(' MAKER@EXAMPLE.COM ')).toMatchObject({
      id: user.id,
      email: 'maker@example.com',
    });
    expect(await repository.findUserById(user.id)).toEqual(user);
  });

  it('does not return expired sessions', async () => {
    const repository = new D1MarketplaceRepository(new InMemoryD1());
    const user = await repository.createUser({
      email: 'buyer@example.com',
      passwordHash: 'hash',
      role: 'BUYER',
      displayName: 'Buyer',
    });

    const expired = await repository.createSession({
      userId: user.id,
      tokenHash: 'expired-token',
      expiresAt: new Date('2026-09-27T00:00:00.000Z'),
    });
    const active = await repository.createSession({
      userId: user.id,
      tokenHash: 'active-token',
      expiresAt: new Date('2099-09-27T00:00:00.000Z'),
    });

    expect(await repository.findSessionByTokenHash(expired.tokenHash)).toBeNull();
    expect(await repository.findSessionByTokenHash(active.tokenHash)).toEqual(active);
  });

  it('creates an RFQ once for a buyer idempotency key, including concurrent retries', async () => {
    const repository = new D1MarketplaceRepository(new InMemoryD1());
    const buyer = await repository.createUser({ email: 'buyer@example.com', passwordHash: 'hash', role: 'BUYER', displayName: 'Buyer' });
    const first = {
      buyerId: buyer.id,
      idempotencyKey: 'request-1',
      title: 'Bracket',
      state: RfqState.DRAFT,
      description: 'PETG bracket',
      quantity: 10,
      material: 'PETG',
      finish: 'Raw',
      deadline: null,
    };

    const [created, retried] = await Promise.all([
      repository.createRfq(first),
      repository.createRfq(first),
    ]);

    expect(created.id).toBe(retried.id);
    expect(await repository.listRfqsByBuyer(buyer.id)).toHaveLength(1);
    expect(await repository.findRfqByBuyerAndIdempotencyKey(buyer.id, 'request-1')).toEqual(
      created,
    );
  });

  it('updates quotes and preserves their date and enum conversions', async () => {
    const repository = new D1MarketplaceRepository(new InMemoryD1());
    const buyer = await repository.createUser({ email: 'buyer@example.com', passwordHash: 'hash', role: 'BUYER', displayName: 'Buyer' });
    const supplier = await repository.createUser({ email: 'supplier@example.com', passwordHash: 'hash', role: 'PRINTER_OWNER', displayName: 'Supplier' });
    const rfq = await repository.createRfq({ buyerId: buyer.id, idempotencyKey: 'quote-rfq-1', title: 'Bracket', state: RfqState.OPEN_FOR_QUOTES, description: null, quantity: 1, material: 'PETG', finish: null, deadline: null });
    const quote = await repository.createQuote({
      rfqId: rfq.id,
      supplierId: supplier.id,
      state: QuoteState.VISIBLE_TO_BUYER,
      totalAmountInr: 1850,
      currency: 'INR',
      deliveryDate: new Date('2026-10-01T00:00:00.000Z'),
      expiresAt: null,
      notes: null,
    });

    const updated = await repository.updateQuote(quote.id, {
      state: QuoteState.ACCEPTED,
      notes: 'Ready to print',
    });

    expect(updated).toMatchObject({ id: quote.id, state: 'ACCEPTED', notes: 'Ready to print' });
    expect(updated?.deliveryDate).toEqual(new Date('2026-10-01T00:00:00.000Z'));
  });

  it('reads active printers and newest vendor contacts for a storefront', async () => {
    const repository = new D1MarketplaceRepository(new InMemoryD1());
    const vendorUser = await repository.createUser({ email: 'vendor@example.com', passwordHash: 'hash', role: 'PRINTER_OWNER', displayName: 'Vendor' });
    const buyerOne = await repository.createUser({ email: 'buyer-one@example.com', passwordHash: 'hash', role: 'BUYER', displayName: 'Buyer One' });
    const buyerTwo = await repository.createUser({ email: 'buyer-two@example.com', passwordHash: 'hash', role: 'BUYER', displayName: 'Buyer Two' });
    const profile = await repository.upsertVendorProfile({
      userId: vendorUser.id,
      slug: 'maker-studio',
      businessName: 'Maker Studio',
      bio: 'Small batch parts',
      city: 'Bengaluru',
      state: 'Karnataka',
      serviceAreas: ['Bengaluru'],
      isPublished: true,
    });

    await repository.createPrinter({
      vendorId: profile.id,
      name: 'Bambu Lab X1C',
      model: 'X1C',
      technologies: ['FDM'],
      materials: ['PLA', 'PETG'],
      minOrderQuantity: 2,
      isActive: true,
    });
    await repository.createPrinter({
      vendorId: profile.id,
      name: 'Retired printer',
      model: null,
      technologies: [],
      materials: [],
      minOrderQuantity: 1,
      isActive: false,
    });
    const olderContact = await repository.createVendorContact({
      vendorId: profile.id,
      buyerId: buyerOne.id,
      message: 'Older message',
      phone: null,
      status: 'NEW',
    });
    await repository.createVendorContact({
      vendorId: profile.id,
      buyerId: buyerTwo.id,
      message: 'Newer message',
      phone: '+919999999999',
      status: 'NEW',
    });

    const printers = await repository.listPrintersByVendor(profile.id);
    const contacts = await repository.listVendorContacts(profile.id);

    expect(printers).toHaveLength(1);
    expect(printers[0]?.minOrderQuantity).toBe(2);
    expect(contacts).toHaveLength(2);
    expect(contacts[1]?.id).toBe(olderContact.id);
    expect(await repository.findVendorProfileBySlug('maker-studio')).toMatchObject({
      id: profile.id,
      isPublished: true,
    });
  });

  it('round-trips RFQ files and idempotency constraints through D1', async () => {
    const repository = new D1MarketplaceRepository(new InMemoryD1());
    const buyer = await repository.createUser({ email: 'buyer@example.com', passwordHash: 'hash', role: 'BUYER', displayName: 'Buyer' });
    const rfq = await repository.createRfq({ buyerId: buyer.id, idempotencyKey: 'file-rfq-1', title: 'Part', state: RfqState.OPEN_FOR_QUOTES, description: null, quantity: 1, material: null, finish: null, deadline: null });
    const file = await repository.createRfqFile({
      rfqId: rfq.id,
      storageKey: `rfq/${rfq.id}/design.stl`,
      originalFilename: 'design.stl',
      contentType: 'model/stl',
      byteSize: 1024,
      state: 'PENDING',
    });

    expect(await repository.listRfqFilesByRfq(file.rfqId)).toEqual([file]);
    await expect(
      repository.createRfqFile({
        rfqId: file.rfqId,
        storageKey: file.storageKey,
        originalFilename: file.originalFilename,
        contentType: file.contentType,
        byteSize: file.byteSize,
        state: file.state,
      }),
    ).rejects.toThrow();
  });
});
