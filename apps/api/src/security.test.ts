import { describe, expect, it } from 'vitest';
import { getSecurityOptions } from './security.js';

describe('API security configuration', () => {
  it('uses an exact CORS allowlist and rejects credentials for unknown origins', () => {
    const options = getSecurityOptions({
      WEB_ORIGINS: ['https://app.example.test'],
      NODE_ENV: 'production',
    });

    expect(options.cors.origin).toEqual(['https://app.example.test']);
    expect(options.cors.credentials).toBe(true);
    expect(options.cors.methods).toEqual(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    expect(options.rateLimit.max).toBeGreaterThan(0);
    expect(options.rateLimit.timeWindow).toBe('1 minute');
  });

  it('keeps rate limiting enabled with conservative defaults', () => {
    const options = getSecurityOptions({ WEB_ORIGINS: ['http://localhost:3000'], NODE_ENV: 'development' });

    expect(options.rateLimit.allowList).toEqual([]);
    expect(options.rateLimit.addHeaders).toBe(true);
  });
});
