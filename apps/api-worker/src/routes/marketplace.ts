import { createQuoteInputSchema, createRfqInputSchema, printerInputSchema, vendorContactInputSchema, vendorProfileInputSchema } from '@3od/contracts';
import { QuoteState, RfqState, transitionQuote, transitionRfq } from '@3od/domain';
import { D1MarketplaceRepository } from '../db/marketplace-repository.js';
import { readJsonBody, type ApiApp, type ApiContext } from '../http.js';
import { authenticate } from '../auth/session.js';

function httpError(statusCode: number, code: string, message: string): never {
  const error = new Error(message) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function repositoryFor(context: ApiContext) { return new D1MarketplaceRepository(context.env.DB!); }

async function current(context: ApiContext, role?: 'BUYER' | 'PRINTER_OWNER') {
  const user = await authenticate(context.req.raw, repositoryFor(context));
  if (!user) httpError(401, 'UNAUTHENTICATED', 'Authentication required');
  if (role && user.user.role !== role) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
  return user;
}

export function registerMarketplaceRoutes(app: ApiApp) {
  app.post('/vendor/profile', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const input = vendorProfileInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please provide a valid vendor profile.');
    const vendor = await repositoryFor(context).upsertVendorProfile({
      userId: authenticated.user.id,
      slug: input.data.slug,
      businessName: input.data.businessName,
      bio: input.data.bio ?? null,
      city: input.data.city ?? null,
      state: input.data.state ?? null,
      serviceAreas: input.data.serviceAreas ?? [],
      isPublished: true,
    });
    return context.json({ vendor }, 201);
  });

  app.post('/vendor/printers', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileByUserId(authenticated.user.id);
    if (!vendor) httpError(409, 'VENDOR_PROFILE_REQUIRED', 'Create your vendor profile before adding a printer.');
    const input = printerInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please provide valid printer details.');
    const printer = await repository.createPrinter({
      vendorId: vendor.id,
      name: input.data.name,
      model: input.data.model ?? null,
      technologies: input.data.technologies ?? [],
      materials: input.data.materials ?? [],
      minOrderQuantity: input.data.minOrderQuantity ?? 1,
      isActive: true,
    });
    return context.json({ printer }, 201);
  });

  app.get('/vendor/printers', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileByUserId(authenticated.user.id);
    return context.json({ printers: vendor ? await repository.listPrintersByVendor(vendor.id) : [] });
  });

  app.get('/vendor/contacts', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileByUserId(authenticated.user.id);
    return context.json({ contacts: vendor ? await repository.listVendorContacts(vendor.id) : [] });
  });

  app.get('/vendors/:slug', async (context) => {
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileBySlug(context.req.param('slug'));
    if (!vendor) httpError(404, 'VENDOR_NOT_FOUND', 'This vendor page is not available.');
    const { userId: _userId, ...publicProfile } = vendor;
    void _userId;
    return context.json({ vendor: publicProfile, printers: await repository.listPrintersByVendor(vendor.id) });
  });

  app.post('/vendors/:slug/contact', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileBySlug(context.req.param('slug'));
    if (!vendor) httpError(404, 'VENDOR_NOT_FOUND', 'This vendor page is not available.');
    const input = vendorContactInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please add a message before contacting this vendor.');
    const contact = await repository.createVendorContact({ vendorId: vendor.id, buyerId: authenticated.user.id, ...input.data, status: 'NEW' });
    return context.json({ contact }, 201);
  });

  app.post('/rfqs', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const raw = await readJsonBody<Record<string, unknown>>(context.req.raw);
    const idempotencyKey = context.req.header('Idempotency-Key') ?? (typeof raw.idempotencyKey === 'string' ? raw.idempotencyKey : undefined);
    const input = createRfqInputSchema.safeParse({ ...raw, idempotencyKey });
    if (!input.success || !idempotencyKey) httpError(400, 'VALIDATION_ERROR', 'An Idempotency-Key header is required.');
    const repository = repositoryFor(context);
    const rfq = await repository.createRfq({ buyerId: authenticated.user.id, idempotencyKey, title: input.data.title, state: RfqState.OPEN_FOR_QUOTES, description: input.data.notes ?? null, quantity: input.data.quantity, material: input.data.material ?? null, finish: input.data.finish ?? null, deadline: input.data.neededBy ?? null });
    return context.json({ rfq }, 201);
  });

  app.get('/rfqs/mine', async (context) => { const authenticated = await current(context, 'BUYER'); return context.json({ rfqs: await repositoryFor(context).listRfqsByBuyer(authenticated.user.id) }); });
  app.get('/rfqs/inbox', async (context) => { await current(context, 'PRINTER_OWNER'); return context.json({ rfqs: await repositoryFor(context).listOpenRfqs() }); });

  app.post('/rfqs/:id/quotes', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const rfq = await repository.findRfqById(context.req.param('id'));
    if (!rfq || rfq.state !== RfqState.OPEN_FOR_QUOTES) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    const input = createQuoteInputSchema.safeParse({ ...(await readJsonBody<Record<string, unknown>>(context.req.raw)), rfqId: rfq.id });
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please provide a valid quote amount and lead time.');
    const quote = await repository.createQuote({ rfqId: rfq.id, supplierId: authenticated.user.id, state: QuoteState.VISIBLE_TO_BUYER, totalAmountInr: Math.ceil(input.data.amountPaise / 100), currency: 'INR', deliveryDate: new Date(Date.now() + input.data.leadTimeDays * 86400000), expiresAt: input.data.expiresAt ?? null, notes: input.data.notes ?? null });
    await repository.updateRfq(rfq.id, { state: transitionRfq(rfq.state, RfqState.QUOTES_RECEIVED) });
    return context.json({ quote }, 201);
  });

  app.get('/rfqs/:id/quotes', async (context) => {
    const authenticated = await current(context);
    const repository = repositoryFor(context);
    const rfq = await repository.findRfqById(context.req.param('id'));
    if (!rfq || (rfq.buyerId !== authenticated.user.id && authenticated.user.role !== 'PRINTER_OWNER')) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    return context.json({ quotes: await repository.listQuotesByRfq(rfq.id) });
  });

  app.post('/quotes/:id/accept', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const repository = repositoryFor(context);
    const quote = await repository.findQuoteById(context.req.param('id'));
    const rfq = quote ? await repository.findRfqById(quote.rfqId) : null;
    if (!quote || !rfq || rfq.buyerId !== authenticated.user.id || quote.state !== QuoteState.VISIBLE_TO_BUYER) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    const updatedQuote = await repository.updateQuote(quote.id, { state: transitionQuote(quote.state, QuoteState.ACCEPTED) });
    const updatedRfq = await repository.updateRfq(rfq.id, { state: transitionRfq(rfq.state, RfqState.QUOTE_SELECTED) });
    return context.json({ quote: updatedQuote, rfq: updatedRfq });
  });
}
