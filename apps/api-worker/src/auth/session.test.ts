import { describe, expect, it } from 'vitest';

import { clearSessionCookie, createSessionToken, hashSessionToken, parseSessionCookie, sessionCookie } from './session.js';

describe('Worker cookie sessions', () => {
  it('creates an opaque token and stores only its SHA-256 digest', async () => {
    const token = createSessionToken();
    const digest = await hashSessionToken(token);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(digest).not.toBe(token);
    expect(await hashSessionToken(token)).toBe(digest);
  });

  it('extracts only the 3oD session cookie from a cookie header', () => {
    expect(parseSessionCookie('theme=dark; 3od_session=opaque-token; other=value')).toBe('opaque-token');
    expect(parseSessionCookie('theme=dark')).toBeNull();
  });

  it('uses cross-site secure cookies in production', () => {
    expect(sessionCookie('opaque-token', true)).toContain('SameSite=None;');
    expect(sessionCookie('opaque-token', true)).toContain('; Secure');
    expect(clearSessionCookie(true)).toContain('SameSite=None;');
    expect(sessionCookie('opaque-token', false)).toContain('SameSite=Lax;');
  });
});
