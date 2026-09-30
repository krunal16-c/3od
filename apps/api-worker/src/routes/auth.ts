import { loginInputSchema, signupInputSchema } from '@3od/contracts';
import { D1MarketplaceRepository } from '../db/marketplace-repository.js';
import { readJsonBody, type ApiApp, type ApiContext } from '../http.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { authenticate, clearSessionCookie, createSessionToken, createVerificationToken, hashSessionToken, publicUser, readVerificationToken, SESSION_TTL_SECONDS, sessionCookie } from '../auth/session.js';

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

async function sendVerificationEmail(context: ApiContext, email: string, token: string) {
  if (!context.env.RESEND_API_KEY || !context.env.MAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${context.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: context.env.MAIL_FROM, to: [email], subject: 'Verify your 3oD account', html: `<p>Welcome to 3oD.</p><p><a href="${context.env.APP_ORIGIN}/verify-email?token=${encodeURIComponent(token)}">Verify your email address</a></p>` }),
  });
  if (!response.ok) httpError(502, 'EMAIL_DELIVERY_FAILED', 'We could not send the verification email. Please try again.');
  return true;
}

export function registerAuthRoutes(app: ApiApp) {
  app.post('/auth/signup', async (context) => {
    const input = signupInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please check the account details.');
    const repository = repositoryFor(context);
    const existing = await repository.findUserByEmail(input.data.email);
    if (existing) httpError(409, 'ACCOUNT_EXISTS', 'An account already exists for this email.');
    const user = await repository.createUser({ email: input.data.email.toLowerCase(), passwordHash: await hashPassword(input.data.password), role: input.data.role === 'printer_owner' ? 'PRINTER_OWNER' : 'BUYER', displayName: input.data.name, emailVerifiedAt: context.env.RESEND_API_KEY && context.env.MAIL_FROM ? null : new Date() });
    if (context.env.RESEND_API_KEY && context.env.MAIL_FROM) {
      await sendVerificationEmail(context, user.email, await createVerificationToken(user.id, context.env.SESSION_SECRET!));
      return context.json({ verificationRequired: true, message: 'Check your inbox for a verification link.' }, 202);
    }
    await startSession(context, user.id);
    return context.json({ user: publicUser(user) }, 201);
  });

  app.post('/auth/resend-verification', async (context) => {
    const input = await readJsonBody<{ email?: unknown }>(context.req.raw);
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email && context.env.RESEND_API_KEY && context.env.MAIL_FROM) {
      const repository = repositoryFor(context);
      const user = await repository.findUserByEmail(email);
      if (user && !user.emailVerifiedAt) await sendVerificationEmail(context, user.email, await createVerificationToken(user.id, context.env.SESSION_SECRET!));
    }
    return context.json({ message: 'If an account needs verification, a new link has been sent.' }, 202);
  });

  app.get('/auth/verify', async (context) => {
    const userId = await readVerificationToken(context.req.query('token') ?? '', context.env.SESSION_SECRET!);
    if (!userId) httpError(400, 'INVALID_VERIFICATION_TOKEN', 'This verification link is invalid or has expired.');
    const user = await repositoryFor(context).markUserEmailVerified(userId);
    if (!user) httpError(400, 'INVALID_VERIFICATION_TOKEN', 'This verification link is invalid or has expired.');
    return context.json({ message: 'Your email is verified. You can now log in.' });
  });

  app.post('/auth/login', async (context) => {
    const input = loginInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    const repository = repositoryFor(context);
    const user = await repository.findUserByEmail(input.data.email);
    if (!user) httpError(404, 'ACCOUNT_NOT_FOUND', 'No 3oD account exists for this email. Create an account to continue.');
    if (!(await verifyPassword(input.data.password, user.passwordHash))) httpError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    if (context.env.RESEND_API_KEY && context.env.MAIL_FROM && !user.emailVerifiedAt) httpError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before logging in.');
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
