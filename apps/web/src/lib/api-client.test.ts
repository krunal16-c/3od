import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMyRfqs, getCurrentUser } from './api-client';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('dashboard API client', () => {
  it('includes credentials when loading buyer RFQs', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.credentials).toBe('include');
      return new Response(JSON.stringify({ rfqs: [{ id: 'rfq-1', title: 'Bracket', state: 'OPEN_FOR_QUOTES' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    globalThis.fetch = fetchMock;

    const response = await getMyRfqs();
    expect(response.rfqs[0]?.title).toBe('Bracket');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/rfqs/mine'), expect.objectContaining({ credentials: 'include' }));
  });

  it('loads the authenticated user through the same cookie session', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ user: { id: 'user-1', email: 'buyer@example.com', name: 'Buyer', role: 'buyer' } }), { status: 200 }));

    const response = await getCurrentUser();
    expect(response.user.role).toBe('buyer');
  });
});
