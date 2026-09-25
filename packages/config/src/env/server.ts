import { z } from 'zod';

const originsSchema = z
  .string()
  .default('http://localhost:3000')
  .transform((value) => [...new Set(value.split(',').map((origin) => origin.trim()).filter(Boolean))]);

export const serverEnvSchema = z
  .object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  MARKETPLACE_STORE: z.enum(['memory', 'prisma']).default('prisma'),
  DATABASE_URL: z.string().url().default('postgresql://localhost:5432/3od'),
  APP_ORIGIN: z.string().url().default('http://localhost:3000'),
  WEB_ORIGINS: originsSchema,
  SESSION_SECRET: z.string().min(32).default('development-only-session-secret-change-me'),
  R2_ENDPOINT: z.string().url().default('http://localhost:9000'),
  R2_BUCKET: z.string().min(1).default('3od-development'),
  R2_ACCESS_KEY_ID: z.string().min(1).default('development-access-key'),
  R2_SECRET_ACCESS_KEY: z.string().min(1).default('development-secret-key'),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'production') return;

    if (env.SESSION_SECRET === 'development-only-session-secret-change-me') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['SESSION_SECRET'], message: 'SESSION_SECRET is required in production' });
    }
    if (env.DATABASE_URL === 'postgresql://localhost:5432/3od') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'DATABASE_URL is required in production' });
    }
    if (env.R2_ENDPOINT === 'http://localhost:9000' || env.R2_BUCKET === '3od-development') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['R2_ENDPOINT'], message: 'R2 configuration is required in production' });
    }
    if (env.R2_ACCESS_KEY_ID === 'development-access-key' || env.R2_SECRET_ACCESS_KEY === 'development-secret-key') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['R2_ACCESS_KEY_ID'], message: 'R2 credentials are required in production' });
    }
    if (env.WEB_ORIGINS.includes('*') || !env.WEB_ORIGINS.includes(env.APP_ORIGIN)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['WEB_ORIGINS'], message: 'Production origins must be explicit and include APP_ORIGIN' });
    }
  });

export function getServerEnv(env: NodeJS.ProcessEnv = process.env) {
  return serverEnvSchema.parse(env);
}
