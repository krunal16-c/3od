import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQuote, getMyRfqs, getCurrentUser, uploadRfqFile } from './api-client';

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
    expect(response.user?.role).toBe('buyer');
  });

  it('uploads a design file as multipart form data with credentials', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.credentials).toBe('include');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeInstanceOf(FormData);
      return new Response(JSON.stringify({ file: { id: 'file-1' } }), { status: 201 });
    });
    globalThis.fetch = fetchMock;

    await uploadRfqFile('rfq-1', new File(['solid bracket'], 'bracket.stl', { type: 'model/stl' }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/rfqs/rfq-1/files'), expect.objectContaining({ credentials: 'include' }));
  });

  it('submits a vendor quote for an RFQ', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ quote: { id: 'quote-1' } }), { status: 201 }));
    globalThis.fetch = fetchMock;

    await createQuote('rfq-1', { amountPaise: 185000, leadTimeDays: 4, notes: 'PETG, ready in four days' });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/rfqs/rfq-1/quotes'), expect.objectContaining({ method: 'POST', credentials: 'include' }));
    const calls = fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit?]>;
    const request = calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ rfqId: 'rfq-1', amountPaise: 185000, leadTimeDays: 4 });
  });
});
