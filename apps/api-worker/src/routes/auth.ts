import { loginInputSchema, signupInputSchema } from '@3od/contracts';
import { D1MarketplaceRepository } from '../db/marketplace-repository.js';
import { readJsonBody, type ApiApp, type ApiContext } from '../http.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { authenticate, clearSessionCookie, createSessionToken, hashSessionToken, publicUser, SESSION_TTL_SECONDS, sessionCookie } from '../auth/session.js';

function httpError(statusCode: number, code: string, message: string): never {
  const error = new Error(message) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function repositoryFor(context: ApiContext) {
  return new D1MarketplaceRepository(context.env.DB!);
}

async function startSession(context: ApiContext, userId: string) {
  const token = createSessionToken();
  const repository = repositoryFor(context);
  await repository.createSession({ userId, tokenHash: await hashSessionToken(token), expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) });
  context.header('Set-Cookie', sessionCookie(token, context.env.NODE_ENV === 'production'));
}

export function registerAuthRoutes(app: ApiApp) {
  app.post('/auth/signup', async (context) => {
    const input = signupInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please check the account details.');
    const repository = repositoryFor(context);
    const existing = await repository.findUserByEmail(input.data.email);
    if (existing) httpError(409, 'ACCOUNT_EXISTS', 'An account already exists for this email.');
    const user = await repository.createUser({ email: input.data.email.toLowerCase(), passwordHash: await hashPassword(input.data.password), role: input.data.role === 'printer_owner' ? 'PRINTER_OWNER' : 'BUYER', displayName: input.data.name });
    await startSession(context, user.id);
    return context.json({ user: publicUser(user) }, 201);
  });

  app.post('/auth/login', async (context) => {
    const input = loginInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    const repository = repositoryFor(context);
    const user = await repository.findUserByEmail(input.data.email);
    if (!user || !(await verifyPassword(input.data.password, user.passwordHash))) httpError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    await startSession(context, user.id);
    return context.json({ user: publicUser(user) });
  });

  app.post('/auth/logout', async (context) => {
    const repository = repositoryFor(context);
    const current = await authenticate(context.req.raw, repository);
    if (current) await repository.deleteSession(current.session.id);
    context.header('Set-Cookie', clearSessionCookie(context.env.NODE_ENV === 'production'));
    return new Response(null, { status: 204, headers: context.res.headers });
  });

  app.get('/auth/me', async (context) => {
    const current = await authenticate(context.req.raw, repositoryFor(context));
    if (!current) httpError(401, 'UNAUTHENTICATED', 'Authentication required');
    return context.json({ user: publicUser(current.user) });
  });
}
