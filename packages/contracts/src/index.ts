import { z } from 'zod';

export type HealthStatus = { service: string; status: 'ok' };

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(8).max(128);

export const signupInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(120),
  role: z.enum(['buyer', 'printer_owner']).default('buyer'),
});

export const loginInputSchema = z.object({ email: emailSchema, password: passwordSchema });

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: emailSchema,
  name: z.string().min(1),
  role: z.enum(['buyer', 'printer_owner']),
});

export const createRfqInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  material: z.string().trim().min(1).max(80).optional(),
  finish: z.string().trim().min(1).max(80).optional(),
  quantity: z.coerce.number().int().positive().max(100_000),
  neededBy: z.coerce.date().optional(),
  notes: z.string().trim().max(10_000).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const createQuoteInputSchema = z.object({
  rfqId: z.string().trim().min(1).max(128),
  amountPaise: z.coerce.number().int().positive().max(100_000_000_00),
  leadTimeDays: z.coerce.number().int().positive().max(365),
  notes: z.string().trim().max(10_000).optional(),
  expiresAt: z.coerce.date().optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const apiErrorSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  code: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(500),
  requestId: z.string().min(1).optional(),
  details: z.unknown().optional(),
});

export type SignupInput = z.infer<typeof signupInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type CreateRfqInput = z.infer<typeof createRfqInputSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
