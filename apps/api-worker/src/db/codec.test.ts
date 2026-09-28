import { describe, expect, it } from 'vitest';

import {
  decodeBoolean,
  decodeDate,
  decodeEnum,
  decodeJson,
  decodeStringArray,
  encodeBoolean,
  encodeDate,
  encodeEnum,
  encodeJson,
  encodeStringArray,
} from './codec.js';

describe('D1 value codecs', () => {
  it('round-trips ISO dates without changing the instant', () => {
    const value = new Date('2026-09-28T10:15:30.000Z');

    expect(decodeDate(encodeDate(value))).toEqual(value);
  });

  it('round-trips SQLite integer booleans', () => {
    expect(decodeBoolean(encodeBoolean(true))).toBe(true);
    expect(decodeBoolean(encodeBoolean(false))).toBe(false);
    expect(decodeBoolean(1)).toBe(true);
    expect(decodeBoolean(0)).toBe(false);
  });

  it('round-trips string arrays as JSON text', () => {
    const value = ['FDM', 'SLA'];

    expect(decodeStringArray(encodeStringArray(value))).toEqual(value);
  });

  it('round-trips JSON metadata as an object', () => {
    const value = { source: 'import', attempts: 2, enabled: true };

    expect(decodeJson(encodeJson(value))).toEqual(value);
  });

  it('accepts only known enum values', () => {
    const states = ['DRAFT', 'SUBMITTED'] as const;

    expect(decodeEnum(encodeEnum('DRAFT'), states)).toBe('DRAFT');
    expect(() => decodeEnum('UNKNOWN', states)).toThrow('Invalid enum value');
  });

  it('rejects malformed SQLite values instead of silently coercing them', () => {
    expect(() => decodeDate('not-a-date')).toThrow('Invalid date value');
    expect(() => decodeBoolean(2)).toThrow('Invalid boolean value');
    expect(() => decodeStringArray('{"not":"an array"}')).toThrow(
      'Invalid string array value',
    );
    expect(() => decodeJson('[]')).toThrow('Invalid JSON object value');
  });
});
