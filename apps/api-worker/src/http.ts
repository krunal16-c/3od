import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { validateEnvironment, type WorkerEnv } from './env.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerMarketplaceRoutes } from './routes/marketplace.js';

type AppVariables = {
  requestId: string;
};

export type ApiApp = Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>;
export type ApiContext = Context<{ Bindings: WorkerEnv; Variables: AppVariables }>;

export class JsonBodyError extends Error {
  readonly statusCode = 400;
  readonly code = 'INVALID_JSON';

  constructor() {
    super('Request body must contain valid JSON');
    this.name = 'JsonBodyError';
  }
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new JsonBodyError();
  }
}

export function createApp(): ApiApp {
  const app: ApiApp = new Hono();

  app.use('*', async (context, next) => {
    const requestId = crypto.randomUUID();
    context.set('requestId', requestId);
    context.header('X-Request-Id', requestId);

    try {
      validateEnvironment(context.env);
      await next();
    } finally {
      context.header('X-Content-Type-Options', 'nosniff');
      context.header('X-Frame-Options', 'DENY');
      context.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      context.header('Cache-Control', 'no-store');
    }
  });

  app.use('*', async (context, next) => {
    const origin = context.req.header('Origin');
    const isAllowedOrigin = origin === context.env.APP_ORIGIN;

    if (isAllowedOrigin) {
      context.header('Access-Control-Allow-Origin', origin);
      context.header('Access-Control-Allow-Credentials', 'true');
      context.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-Request-Id');
      context.header('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
      context.header('Access-Control-Max-Age', '600');
      context.header('Vary', 'Origin');
    }

    if (context.req.method === 'OPTIONS' && isAllowedOrigin) {
      return new Response(null, { status: 204, headers: context.res.headers });
    }

    await next();
  });

  app.get('/', (context) => context.json({ ok: true, service: '3od-api-worker' }));

  registerAuthRoutes(app);
  registerMarketplaceRoutes(app);

  app.onError((error, context) => {
    const statusCode = isHttpError(error) ? error.statusCode : 500;
    const code = isHttpError(error) ? error.code : 'INTERNAL_ERROR';
    console.error(JSON.stringify({
      requestId: context.get('requestId'),
      code,
      error: error instanceof Error ? error.message : String(error),
    }));
    const message = statusCode >= 500 ? 'Unexpected server error' : error.message;

    return context.json(
      {
        statusCode,
        code,
        message,
        requestId: context.get('requestId'),
      },
      statusCode as ContentfulStatusCode,
    );
  });

  app.notFound((context) => context.json(
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId: context.get('requestId'),
    },
    404,
  ));

  return app;
}

function isHttpError(error: unknown): error is Error & { statusCode: number; code: string } {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as Error & { statusCode?: unknown; code?: unknown };
  return typeof candidate.statusCode === 'number' && typeof candidate.code === 'string';
}
