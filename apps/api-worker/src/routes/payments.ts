import { PaymentState, transitionPayment } from '@3od/domain';
import { D1MarketplaceRepository } from '../db/marketplace-repository.js';
import { authenticate } from '../auth/session.js';
import { readJsonBody, type ApiApp, type ApiContext } from '../http.js';

function httpError(statusCode: number, code: string, message: string): never {
  const error = new Error(message) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function repositoryFor(context: ApiContext) {
  return new D1MarketplaceRepository(context.env.DB!);
}

async function current(context: ApiContext) {
  const user = await authenticate(context.req.raw, repositoryFor(context));
  if (!user) httpError(401, 'UNAUTHENTICATED', 'Authentication required');
  return user.user;
}

function isSafePaise(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function digest(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function validSignature(payload: string, signature: string | undefined, secret: string | undefined, testMode: boolean): Promise<boolean> {
  if (testMode && signature === 'test-signature') return true;
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, Uint8Array.from(signature.match(/.{1,2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? []), new TextEncoder().encode(payload));
}

export function registerPaymentRoutes(app: ApiApp) {
  app.post('/orders/:id/payment-intent', async (context) => {
    const user = await current(context);
    if (user.role !== 'BUYER') httpError(403, 'FORBIDDEN', 'Only the buyer can create a payment intent.');
    const raw = await readJsonBody<{ amountPaise?: unknown }>(context.req.raw);
    if (!isSafePaise(raw.amountPaise)) httpError(400, 'VALIDATION_ERROR', 'amountPaise must be a positive integer.');
    const idempotencyKey = context.req.header('Idempotency-Key');
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) httpError(400, 'VALIDATION_ERROR', 'An Idempotency-Key header is required.');
    const repository = repositoryFor(context);
    const order = await repository.findOrderById(context.req.param('id'));
    if (!order || order.buyerId !== user.id) httpError(403, 'FORBIDDEN', 'You do not have access to this payment.');
    const existing = await repository.findPaymentByIdempotencyKey(user.id, idempotencyKey);
    if (existing) return context.json({ payment: existing, duplicate: true });
    const payment = await repository.createPayment({ orderId: order.id, buyerId: order.buyerId, vendorId: order.vendorId, amountPaise: raw.amountPaise, currency: 'INR', state: PaymentState.CREATED, provider: 'provider-neutral', providerPaymentId: null, idempotencyKey });
    return context.json({ payment }, 201);
  });

  app.get('/orders/:id/payment', async (context) => {
    const user = await current(context);
    const repository = repositoryFor(context);
    const order = await repository.findOrderById(context.req.param('id'));
    if (!order || (order.buyerId !== user.id && order.vendorId !== user.id)) httpError(403, 'FORBIDDEN', 'You do not have access to this payment.');
    const payment = await repository.findPaymentByOrderId(order.id);
    return context.json({ payment });
  });

  app.post('/orders/:id/payment/success', async () => {
    httpError(403, 'FORBIDDEN', 'Payment state can only be changed by a verified server webhook.');
  });

  app.post('/payments/webhook', async (context) => {
    const payload = await context.req.raw.text();
    const signature = context.req.header('X-Payment-Signature') ?? context.req.header('X-Razorpay-Signature');
    if (!await validSignature(payload, signature, context.env.PAYMENT_WEBHOOK_SECRET, context.env.NODE_ENV === 'test')) httpError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature is invalid.');
    let body: { id?: unknown; event?: unknown; payload?: { payment?: { entity?: { id?: unknown } } } };
    try { body = JSON.parse(payload) as typeof body; } catch { httpError(400, 'INVALID_JSON', 'Webhook payload must be valid JSON.'); }
    const providerEventId = context.req.header('X-Webhook-Id') ?? (typeof body.id === 'string' ? body.id : '');
    const eventType = typeof body.event === 'string' ? body.event : '';
    if (!providerEventId || !eventType) httpError(400, 'VALIDATION_ERROR', 'Webhook event id and type are required.');
    const repository = repositoryFor(context);
    const existing = await repository.findWebhookEvent('provider-neutral', providerEventId);
    if (existing) return context.json({ duplicate: true, paymentState: null });
    const event = await repository.createWebhookEvent({ provider: 'provider-neutral', providerEventId, eventType, payloadHash: await digest(payload), processedAt: new Date() });
    const providerPaymentId = typeof body.payload?.payment?.entity?.id === 'string' ? body.payload.payment.entity.id : null;
    const payment = providerPaymentId ? await repository.findPaymentByProviderPaymentId(providerPaymentId) : null;
    const nextState = eventType === 'payment.captured' ? PaymentState.CAPTURED : eventType === 'payment.failed' ? PaymentState.FAILED : null;
    if (payment && nextState) {
      try { transitionPayment(payment.state, nextState); } catch { httpError(409, 'INVALID_PAYMENT_TRANSITION', 'Payment webhook cannot move this payment to the requested state.'); }
      await repository.updatePayment(payment.id, { state: nextState, providerPaymentId });
    }
    return context.json({ eventId: event.id, paymentState: nextState, productionAccess: nextState === PaymentState.CAPTURED });
  });
}
