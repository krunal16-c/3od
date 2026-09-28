export function encodeDate(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid date value');
  }

  return value.toISOString();
}

export function decodeDate(value: unknown): Date {
  if (typeof value !== 'string') {
    throw new Error('Invalid date value');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }

  return date;
}

export function encodeBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export function decodeBoolean(value: unknown): boolean {
  if (value === 1 || value === true) return true;
  if (value === 0 || value === false) return false;
  throw new Error('Invalid boolean value');
}

export function encodeStringArray(value: readonly string[]): string {
  return JSON.stringify(value);
}

export function decodeStringArray(value: unknown): string[] {
  const decoded = parseJson(value);
  if (!Array.isArray(decoded) || !decoded.every((item) => typeof item === 'string')) {
    throw new Error('Invalid string array value');
  }

  return decoded;
}

export function encodeJson(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

export function decodeJson(value: unknown): Record<string, unknown> {
  const decoded = parseJson(value);
  if (decoded === null || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new Error('Invalid JSON object value');
  }

  return decoded as Record<string, unknown>;
}

export function encodeEnum<T extends string>(value: T): string {
  return value;
}

export function decodeEnum<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value === 'string' && allowed.includes(value as T)) {
    return value as T;
  }

  throw new Error(`Invalid enum value: ${String(value)}`);
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    throw new Error('Invalid JSON value');
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error('Invalid JSON value');
  }
}
