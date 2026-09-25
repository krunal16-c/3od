import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getServerEnv } from '@3od/config/env/server';
import { getSecurityOptions } from './security.js';
import { JsonErrorFilter } from './http-error.filter.js';
import { AppModule } from './app.module.js';

export { AppModule } from './app.module.js';

export async function createApp() {
  const env = getServerEnv();
  const security = getSecurityOptions(env);
  const adapter = new FastifyAdapter({ genReqId: () => randomUUID() });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, { abortOnError: true });

  // The plugins currently publish separate Fastify module augmentations; the
  // runtime versions are compatible, but their callback types are not.
  await app.register(cors as never, security.cors);
  await app.register(helmet as never, { contentSecurityPolicy: env.NODE_ENV === 'production' });
  await app.register(rateLimit as never, security.rateLimit);
  app.useGlobalFilters(new JsonErrorFilter());
  return { app, env };
}

export async function bootstrap() {
  const { app, env } = await createApp();
  await app.listen(env.API_PORT, '0.0.0.0');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void bootstrap();
}
