import { z } from 'zod';

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export function getClientEnv(env: Record<string, string | undefined> = process.env) {
  return clientEnvSchema.parse(env);
}
