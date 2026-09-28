const HASH_PREFIX = 'pbkdf2-sha256$v1';
const ITERATIONS = 120_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const derivedKey = await derive(password, salt, ITERATIONS);
  return [HASH_PREFIX, String(ITERATIONS), encodeBase64Url(salt), encodeBase64Url(new Uint8Array(derivedKey))].join('$');
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split('$');
  if (parts.length !== 5 || `${parts[0]}$${parts[1]}` !== HASH_PREFIX) return false;

  const iterations = Number(parts[2]);
  if (!Number.isSafeInteger(iterations) || iterations < 10_000 || iterations > 1_000_000) return false;

  try {
    const salt = decodeBase64Url(parts[3] ?? '');
    const expected = decodeBase64Url(parts[4] ?? '');
    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
    const actual = new Uint8Array(await derive(password, salt, iterations));
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt.slice().buffer as ArrayBuffer, iterations, hash: 'SHA-256' }, key, KEY_BYTES * 8);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url');
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
