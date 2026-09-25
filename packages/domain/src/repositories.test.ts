import { describe, expect, it } from 'vitest';
import { InMemoryRfqRepository } from './repositories';
import { RfqState } from './state';

describe('InMemoryRfqRepository', () => {
  it('returns the original RFQ for a retry with the same buyer idempotency key', async () => {
    const repository = new InMemoryRfqRepository();
    const input = {
      buyerId: 'buyer-1',
      idempotencyKey: 'request-1',
      title: 'Bracket',
      state: RfqState.DRAFT,
    };

    const first = await repository.create(input);
    const retry = await repository.create(input);

    expect(retry).toEqual(first);
    expect(await repository.count()).toBe(1);
  });

  it('does not reuse an idempotency key across buyers', async () => {
    const repository = new InMemoryRfqRepository();
    await repository.create({
      buyerId: 'buyer-1',
      idempotencyKey: 'request-1',
      title: 'Bracket',
      state: RfqState.DRAFT,
    });

    await expect(
      repository.create({
        buyerId: 'buyer-2',
        idempotencyKey: 'request-1',
        title: 'Bracket',
        state: RfqState.DRAFT,
      }),
    ).resolves.toMatchObject({ buyerId: 'buyer-2' });
    expect(await repository.count()).toBe(2);
  });
});
