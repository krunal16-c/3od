import { describe, expect, it } from 'vitest';
import {
  apiErrorSchema,
  createRfqInputSchema,
  createQuoteInputSchema,
  loginInputSchema,
  paginationQuerySchema,
  signupInputSchema,
} from './index.js';

describe('shared API contracts', () => {
  it('rejects invalid auth input', () => {
    expect(() => loginInputSchema.parse({ email: 'not-an-email', password: '' })).toThrow();
    expect(() => signupInputSchema.parse({ email: 'buyer@example.com', password: 'short' })).toThrow();
  });

  it('rejects RFQs and quotes with invalid quantities or amounts', () => {
    expect(() => createRfqInputSchema.parse({ title: '', quantity: 0 })).toThrow();
    expect(() => createQuoteInputSchema.parse({ rfqId: 'bad', amountPaise: 0, leadTimeDays: 0 })).toThrow();
  });

  it('coerces valid pagination values and rejects unsafe limits', () => {
    expect(paginationQuerySchema.parse({ page: '2', pageSize: '25' })).toMatchObject({ page: 2, pageSize: 25 });
    expect(() => paginationQuerySchema.parse({ pageSize: '101' })).toThrow();
  });

  it('requires a stable error shape', () => {
    expect(() => apiErrorSchema.parse({ statusCode: 400, message: '' })).toThrow();
    expect(apiErrorSchema.parse({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid request' })).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
    });
  });
});
