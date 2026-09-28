import { describe, expect, it } from 'vitest';
import { createApp, readJsonBody } from './http.js';

const allowedOrigin = 'https://app.3od.example';
const workerEnv = {
  APP_ORIGIN: allowedOrigin,
  NODE_ENV: 'test' as const,
  SESSION_SECRET: 'test-session-secret-that-is-long-enough',
  DB: {} as D1Database,
  FILES: {} as R2Bucket,
};

describe('Cloudflare API Worker foundation', () => {
  it('returns a healthy JSON response with a request ID', async () => {
    const response = await createApp().request('/', { headers: { Origin: allowedOrigin } }, workerEnv);
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, service: '3od-api-worker' });
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('allows the configured origin and credentials on CORS responses', async () => {
    const response = await createApp().request(
      '/',
      {
        method: 'OPTIONS',
        headers: {
          Origin: allowedOrigin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      },
      workerEnv,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('does not grant CORS access to an unknown origin', async () => {
    const response = await createApp().request(
      '/',
      { headers: { Origin: 'https://evil.example' } },
      workerEnv,
    );

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
  });

  it('returns JSON errors for unknown routes', async () => {
    const response = await createApp().request('/missing', {}, workerEnv);
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Route not found',
    });
    expect(body.requestId).toBe(response.headers.get('x-request-id'));
  });

  it('rejects malformed JSON with a typed client error', async () => {
    await expect(
      readJsonBody(new Request('https://api.3od.example/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      })),
    ).rejects.toMatchObject({ code: 'INVALID_JSON', statusCode: 400 });
  });
});
