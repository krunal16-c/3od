import { describe, expect, it } from 'vitest';
import { PrismaMarketplaceStore } from './prisma-marketplace-store.js';

describe('PrismaMarketplaceStore', () => {
  it('creates a buyer and normalizes the email before persisting it', async () => {
    const calls: unknown[] = [];
    const prisma = {
      user: {
        create: async (args: unknown) => {
          calls.push(args);
          return {
            id: 'user-1', email: 'maker@example.com', passwordHash: 'hash', role: 'BUYER',
            displayName: 'Maker', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
          };
        },
        findUnique: async () => null,
      },
    };
    const store = new PrismaMarketplaceStore(prisma as never);

    const user = await store.createUser({ email: ' Maker@Example.com ', passwordHash: 'hash', role: 'BUYER', displayName: 'Maker' });

    expect(user.email).toBe('maker@example.com');
    expect(calls[0]).toEqual({ data: { email: 'maker@example.com', passwordHash: 'hash', role: 'BUYER', displayName: 'Maker' } });
  });

  it('uses the database uniqueness boundary for RFQ idempotency', async () => {
    let createCount = 0;
    const prisma = {
      rfq: {
        findUnique: async () => createCount ? { id: 'rfq-1', buyerId: 'buyer-1', idempotencyKey: 'retry-key' } : null,
        create: async () => { createCount += 1; return { id: 'rfq-1', buyerId: 'buyer-1', idempotencyKey: 'retry-key' }; },
      },
    };
    const store = new PrismaMarketplaceStore(prisma as never);

    await store.createRfq({ buyerId: 'buyer-1', idempotencyKey: 'retry-key', title: 'Bracket', quantity: 1, state: 'OPEN_FOR_QUOTES' });
    const retry = await store.createRfq({ buyerId: 'buyer-1', idempotencyKey: 'retry-key', title: 'Bracket', quantity: 1, state: 'OPEN_FOR_QUOTES' });

    expect(createCount).toBe(1);
    expect(retry.id).toBe('rfq-1');
  });
});
