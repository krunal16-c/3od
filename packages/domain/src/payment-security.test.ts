import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  normalizeIdempotencyKey,
  validateWebhookEventId,
  verifyWebhookSignature,
} from './payment-security.js';

describe('payment security helpers', () => {
  it('accepts bounded idempotency keys and rejects unsafe values', () => {
    expect(normalizeIdempotencyKey('order-attempt-123')).toBe('order-attempt-123');
    expect(normalizeIdempotencyKey(' short-key ')).toBe('short-key');
    expect(normalizeIdempotencyKey('too short')).toBeNull();
    expect(normalizeIdempotencyKey('contains space')).toBeNull();
    expect(normalizeIdempotencyKey('a'.repeat(129))).toBeNull();
    expect(validateWebhookEventId('webhook-event-123')).toBe('webhook-event-123');
  });

  it('verifies the exact raw body with an HMAC-SHA256 signature', async () => {
    const body = '{"event":"payment.captured"}';
    const secret = 'test-webhook-secret';
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    await expect(verifyWebhookSignature(body, signature, secret)).resolves.toBe(true);
    await expect(verifyWebhookSignature(`${body} `, signature, secret)).resolves.toBe(false);
    await expect(verifyWebhookSignature(body, 'not-a-signature', secret)).resolves.toBe(false);
  });

  it('does not accept a missing secret or signature', async () => {
    await expect(verifyWebhookSignature('{}', undefined, 'secret')).resolves.toBe(false);
    await expect(verifyWebhookSignature('{}', 'a'.repeat(64), '')).resolves.toBe(false);
  });
});
