import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

describe('Worker password hashing', () => {
  it('creates and verifies a versioned PBKDF2 hash', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).toMatch(/^pbkdf2-sha256\$v1\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('rejects hashes from unsupported formats instead of treating them as legacy-compatible', async () => {
    await expect(verifyPassword('password', 'salt:derived-key')).resolves.toBe(false);
    await expect(verifyPassword('password', 'not-a-password-hash')).resolves.toBe(false);
  });
});
