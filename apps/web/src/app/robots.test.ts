import { describe, expect, it } from 'vitest';
import robots from './robots';

describe('robots policy', () => {
  it('keeps authenticated and lead-capture routes out of search indexes', () => {
    const policy = robots();
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    expect(rule).toBeDefined();
    if (!rule) return;
    const disallowed = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];

    expect(disallowed).toEqual(expect.arrayContaining([
      '/dashboard/',
      '/login',
      '/signup',
      '/request-quote',
      '/verify-email',
    ]));
    expect(policy.sitemap).toBe('https://3od.zesterproductstudio.com/sitemap.xml');
  });
});
