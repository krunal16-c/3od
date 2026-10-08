const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const MIN_IDEMPOTENCY_KEY_LENGTH = 8;
const SHA256_HEX_LENGTH = 64;

export function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  if (
    normalized.length < MIN_IDEMPOTENCY_KEY_LENGTH ||
    normalized.length > MAX_IDEMPOTENCY_KEY_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function decodeHex(value: string): Uint8Array | null {
  if (value.length !== SHA256_HEX_LENGTH || !/^[a-f\d]+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Verify a Razorpay-style HMAC-SHA256 signature against the exact raw body. */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
  cryptoProvider: Crypto = globalThis.crypto,
): Promise<boolean> {
  if (!secret || !signature) return false;
  const expected = decodeHex(signature.trim());
  if (!expected) return false;

  const key = await cryptoProvider.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return cryptoProvider.subtle.verify(
    'HMAC',
    key,
    expected as BufferSource,
    new TextEncoder().encode(rawBody),
  );
}

export function validateWebhookEventId(value: string | null | undefined): string | null {
  return normalizeIdempotencyKey(value);
}
