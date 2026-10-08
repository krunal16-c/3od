import { acceptQuoteInputSchema, createQuoteInputSchema, createRfqInputSchema, printerBlackoutInputSchema, printerInputSchema, updateOrderStatusInputSchema, updateRfqInputSchema, vendorContactInputSchema, vendorProfileInputSchema } from '@3od/contracts';
import { OrderStatus, QuoteState, RfqState, canVendorQuoteProcess, hasEnabledCapability, isEnabledManufacturingProcess, manufacturingProcessCatalog, transitionOrder, transitionQuote, transitionRfq, validateManufacturingRequest } from '@3od/domain';
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

const MAX_DESIGN_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DESIGN_FILES_PER_RFQ = 10;
const MAX_CONTACTS_PER_HOUR = 5;
const allowedDesignExtensions = new Set(['.stl', '.obj', '.step', '.stp', '.3mf']);

function safeFilename(filename: string) {
  const normalized = filename.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  return normalized || 'design-file';
}

function publicPrinter(printer: Awaited<ReturnType<D1MarketplaceRepository['listPrintersByVendor']>>[number]) {
  const { vendorId, ...safePrinter } = printer;
  void vendorId;
  return safePrinter;
}

function publicContact(contact: Awaited<ReturnType<D1MarketplaceRepository['listVendorContacts']>>[number]) {
  const { id, vendorId, buyerId, ...safeContact } = contact;
  void id;
  void vendorId;
  void buyerId;
  return safeContact;
}

function normalizedVendorSlug(rawSlug: string) {
  const slug = rawSlug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    httpError(404, 'VENDOR_NOT_FOUND', 'This vendor page is not available.');
  }
  return slug;
}

async function current(context: ApiContext, role?: 'BUYER' | 'PRINTER_OWNER') {
  const user = await authenticate(context.req.raw, repositoryFor(context));
  if (!user) httpError(401, 'UNAUTHENTICATED', 'Authentication required');
  if (role && user.user.role !== role) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
  return user;
}

export function registerMarketplaceRoutes(app: ApiApp) {
  app.get('/manufacturing/processes', (context) => context.json({ processes: manufacturingProcessCatalog }));

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
    if (!hasEnabledCapability(input.data.processes)) httpError(422, 'CAPABILITY_NOT_AVAILABLE', 'List at least one manufacturing capability that is currently available on 3oD.');
    if (input.data.processes.some((process) => !isEnabledManufacturingProcess(process))) httpError(422, 'PROCESS_NOT_AVAILABLE', 'A printer can only list manufacturing processes that are currently available.');
    const printer = await repository.createPrinter({
      vendorId: vendor.id,
      name: input.data.name,
      model: input.data.model ?? null,
      technologies: input.data.technologies ?? [],
      materials: input.data.materials ?? [],
      processes: input.data.processes,
      minOrderQuantity: input.data.minOrderQuantity ?? 1,
      leadTimeDays: input.data.leadTimeDays ?? 5,
      isActive: true,
    });
    return context.json({ printer }, 201);
  });

  app.post('/vendor/printers/:id/blackouts', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileByUserId(authenticated.user.id);
    const printer = await repository.findPrinterById(context.req.param('id'));
    if (!vendor || !printer || printer.vendorId !== vendor.id) httpError(403, 'FORBIDDEN', 'You do not have access to this printer.');
    const input = printerBlackoutInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Provide a valid availability range.');
    if (await repository.findOverlappingPrinterBlackout(printer.id, input.data.startsOn, input.data.endsOn)) httpError(409, 'AVAILABILITY_CONFLICT', 'This printer is already unavailable during that period.');
    return context.json({ blackout: await repository.createPrinterBlackout({ printerId: printer.id, startsOn: input.data.startsOn, endsOn: input.data.endsOn, reason: input.data.reason ?? null }) }, 201);
  });

  app.get('/vendor/printers/:id/blackouts', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileByUserId(authenticated.user.id);
    const printer = await repository.findPrinterById(context.req.param('id'));
    if (!vendor || !printer || printer.vendorId !== vendor.id) httpError(403, 'FORBIDDEN', 'You do not have access to this printer.');
    return context.json({ blackouts: await repository.listPrinterBlackouts(printer.id) });
  });

  app.get('/vendor/reports/summary', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileByUserId(authenticated.user.id);
    if (!vendor) return context.json({ report: { printerCount: 0, openRfqCount: 0, quoteCount: 0, acceptedQuoteCount: 0, orderCount: 0, earningsInr: 0 } });
    return context.json({ report: await repository.getVendorReportSummary(vendor.id, authenticated.user.id) });
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
    const vendor = await repository.findVendorProfileBySlug(normalizedVendorSlug(context.req.param('slug')));
    if (!vendor) httpError(404, 'VENDOR_NOT_FOUND', 'This vendor page is not available.');
    const { userId: _userId, ...publicProfile } = vendor;
    void _userId;
    const printers = await repository.listPrintersByVendor(vendor.id);
    return context.json({ vendor: publicProfile, printers: printers.map(publicPrinter) });
  });

  app.post('/vendors/:slug/contact', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileBySlug(normalizedVendorSlug(context.req.param('slug')));
    if (!vendor) httpError(404, 'VENDOR_NOT_FOUND', 'This vendor page is not available.');
    const input = vendorContactInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please add a message before contacting this vendor.');
    const recentContacts = await repository.countVendorContactsByBuyerSince(authenticated.user.id, new Date(Date.now() - 60 * 60 * 1000));
    if (recentContacts >= MAX_CONTACTS_PER_HOUR) httpError(429, 'RATE_LIMITED', 'You have reached the hourly contact limit. Please try again later.');
    const contact = await repository.createVendorContact({ vendorId: vendor.id, buyerId: authenticated.user.id, ...input.data, status: 'NEW' });
    return context.json({ contact: publicContact(contact) }, 201);
  });

  app.post('/rfqs', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const raw = await readJsonBody<Record<string, unknown>>(context.req.raw);
    const idempotencyKey = context.req.header('Idempotency-Key') ?? (typeof raw.idempotencyKey === 'string' ? raw.idempotencyKey : undefined);
    const input = createRfqInputSchema.safeParse({ ...raw, idempotencyKey });
    if (!input.success || !idempotencyKey) httpError(400, 'VALIDATION_ERROR', 'An Idempotency-Key header is required.');
    const processValidation = validateManufacturingRequest(input.data);
    if (!processValidation.ok) httpError(422, processValidation.code, processValidation.message);
    const repository = repositoryFor(context);
    const rfq = await repository.createRfq({ buyerId: authenticated.user.id, idempotencyKey, title: input.data.title, process: input.data.process, state: input.data.saveAsDraft ? RfqState.DRAFT : RfqState.OPEN_FOR_QUOTES, description: input.data.notes ?? null, quantity: input.data.quantity, material: input.data.material ?? null, finish: input.data.finish ?? null, deadline: input.data.neededBy ?? null, tolerance: input.data.tolerance ?? null, location: input.data.location ?? null, shippingPreference: input.data.shippingPreference ?? null });
    return context.json({ rfq }, 201);
  });

  app.patch('/rfqs/:id', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const repository = repositoryFor(context);
    const rfq = await repository.findRfqById(context.req.param('id'));
    if (!rfq || rfq.buyerId !== authenticated.user.id) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    const input = updateRfqInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please provide valid RFQ details.');
    if (input.data.process) {
      const processValidation = validateManufacturingRequest({ ...rfq, ...input.data });
      if (!processValidation.ok) httpError(422, processValidation.code, processValidation.message);
    }
    if (input.data.submit && rfq.state !== RfqState.DRAFT) httpError(409, 'INVALID_RFQ_TRANSITION', 'Only draft RFQs can be submitted.');
    const updated = await repository.updateRfq(rfq.id, {
      title: input.data.title ?? rfq.title,
      process: input.data.process ?? rfq.process,
      material: input.data.material ?? rfq.material,
      finish: input.data.finish ?? rfq.finish,
      quantity: input.data.quantity ?? rfq.quantity,
      deadline: input.data.neededBy ?? rfq.deadline,
      tolerance: input.data.tolerance ?? rfq.tolerance,
      location: input.data.location ?? rfq.location,
      shippingPreference: input.data.shippingPreference ?? rfq.shippingPreference,
      description: input.data.notes ?? rfq.description,
      state: input.data.submit ? RfqState.OPEN_FOR_QUOTES : rfq.state,
    });
    return context.json({ rfq: updated });
  });

  app.post('/rfqs/:id/files', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const repository = repositoryFor(context);
    const rfq = await repository.findRfqById(context.req.param('id'));
    if (!rfq || rfq.buyerId !== authenticated.user.id) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    if (!context.env.FILES?.put) httpError(503, 'STORAGE_UNAVAILABLE', 'File storage is not configured.');
    if ((await repository.listRfqFilesByRfq(rfq.id)).length >= MAX_DESIGN_FILES_PER_RFQ) {
      httpError(413, 'TOO_MANY_FILES', 'An RFQ can contain at most 10 design files.');
    }

    const form = await context.req.raw.formData();
    const entry = form.get('file');
    if (!(entry instanceof File) || entry.size === 0) httpError(400, 'VALIDATION_ERROR', 'Attach a non-empty design file.');
    if (entry.size > MAX_DESIGN_FILE_BYTES) httpError(413, 'FILE_TOO_LARGE', 'Design files must be 25 MB or smaller.');
    const filename = safeFilename(entry.name);
    const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (!allowedDesignExtensions.has(extension)) httpError(400, 'VALIDATION_ERROR', 'Use an STL, OBJ, STEP, STP, or 3MF design file.');

    const storageKey = `rfqs/${rfq.id}/${crypto.randomUUID()}-${filename}`;
    await context.env.FILES.put(storageKey, entry, { httpMetadata: { contentType: entry.type || 'application/octet-stream' } });
    const file = await repository.createRfqFile({ rfqId: rfq.id, storageKey, originalFilename: filename, contentType: entry.type || 'application/octet-stream', byteSize: entry.size, state: 'PENDING' });
    return context.json({ file }, 201);
  });

  app.get('/rfqs/mine', async (context) => { const authenticated = await current(context, 'BUYER'); return context.json({ rfqs: await repositoryFor(context).listRfqsByBuyer(authenticated.user.id) }); });
  app.get('/rfqs/inbox', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const vendor = await repository.findVendorProfileByUserId(authenticated.user.id);
    const printers = vendor ? await repository.listPrintersByVendor(vendor.id) : [];
    const capabilities = [...new Set(printers.flatMap((printer) => printer.processes))];
    const rfqs = (await repository.listOpenRfqs()).filter((rfq) => canVendorQuoteProcess(capabilities, rfq.process));
    return context.json({ rfqs });
  });

  app.post('/rfqs/:id/quotes', async (context) => {
    const authenticated = await current(context, 'PRINTER_OWNER');
    const repository = repositoryFor(context);
    const rfq = await repository.findRfqById(context.req.param('id'));
    const raw = await readJsonBody<Record<string, unknown>>(context.req.raw);
    const idempotencyKey = context.req.header('Idempotency-Key') ?? (typeof raw.idempotencyKey === 'string' ? raw.idempotencyKey : undefined);
    if (idempotencyKey) {
      const existing = await repository.findQuoteBySupplierAndIdempotencyKey(authenticated.user.id, idempotencyKey);
      if (existing && rfq?.id === existing.rfqId) return context.json({ quote: existing }, 201);
    }
    if (!rfq || rfq.state !== RfqState.OPEN_FOR_QUOTES) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    const vendor = await repository.findVendorProfileByUserId(authenticated.user.id);
    const printers = vendor ? await repository.listPrintersByVendor(vendor.id) : [];
    const capabilities = [...new Set(printers.flatMap((printer) => printer.processes))];
    // Keep existing 3D-printing RFQs quoteable for legacy vendors without a storefront yet.
    if (!canVendorQuoteProcess(capabilities, rfq.process)) httpError(422, 'CAPABILITY_MISMATCH', 'Your listed capabilities do not support this manufacturing process.');
    const input = createQuoteInputSchema.safeParse({ ...raw, rfqId: rfq.id, idempotencyKey });
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Please provide a valid quote amount and lead time.');
    const quote = await repository.createQuote({ rfqId: rfq.id, supplierId: authenticated.user.id, idempotencyKey: input.data.idempotencyKey ?? null, state: QuoteState.VISIBLE_TO_BUYER, totalAmountInr: Math.ceil(input.data.amountPaise / 100), currency: 'INR', deliveryDate: new Date(Date.now() + input.data.leadTimeDays * 86400000), expiresAt: input.data.expiresAt ?? null, notes: input.data.notes ?? null });
    if (rfq.state === RfqState.OPEN_FOR_QUOTES) await repository.updateRfq(rfq.id, { state: transitionRfq(rfq.state, RfqState.QUOTES_RECEIVED) });
    return context.json({ quote }, 201);
  });

  app.get('/rfqs/:id/quotes', async (context) => {
    const authenticated = await current(context);
    const repository = repositoryFor(context);
    const rfq = await repository.findRfqById(context.req.param('id'));
    if (!rfq || (rfq.buyerId !== authenticated.user.id && authenticated.user.role !== 'PRINTER_OWNER')) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    if (authenticated.user.role === 'PRINTER_OWNER') {
      const ownQuotes = (await repository.listQuotesByRfq(rfq.id)).filter((quote) => quote.supplierId === authenticated.user.id);
      if (ownQuotes.length === 0) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
      return context.json({ quotes: ownQuotes });
    }
    return context.json({ quotes: await repository.listQuotesByRfq(rfq.id) });
  });

  app.post('/quotes/:id/accept', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const repository = repositoryFor(context);
    const quote = await repository.findQuoteById(context.req.param('id'));
    const rfq = quote ? await repository.findRfqById(quote.rfqId) : null;
    if (!quote || !rfq || rfq.buyerId !== authenticated.user.id || quote.state !== QuoteState.VISIBLE_TO_BUYER) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    const existingOrder = await repository.findOrderByQuoteId(quote.id);
    if (existingOrder) return context.json({ quote, rfq, order: existingOrder });
    const rawBody = context.req.header('Content-Type')?.includes('application/json') ? await readJsonBody<unknown>(context.req.raw) : {};
    const body = acceptQuoteInputSchema.safeParse(rawBody);
    if (!body.success) httpError(400, 'VALIDATION_ERROR', 'Please provide valid delivery details.');
    let order;
    try {
      order = await repository.createOrder({ buyerId: authenticated.user.id, vendorId: quote.supplierId, rfqId: rfq.id, quoteId: quote.id, status: OrderStatus.ACCEPTED, pickupAddress: body.data.pickupAddress ?? null, shippingAddress: body.data.shippingAddress ?? null, trackingNumber: null, deliveryConfirmedAt: null });
    } catch (error) {
      const concurrentOrder = await repository.findOrderByQuoteId(quote.id);
      if (!concurrentOrder) throw error;
      return context.json({ quote: await repository.findQuoteById(quote.id), rfq: await repository.findRfqById(rfq.id), order: concurrentOrder });
    }
    const updatedQuote = await repository.updateQuote(quote.id, { state: transitionQuote(quote.state, QuoteState.ACCEPTED) });
    const updatedRfq = await repository.updateRfq(rfq.id, { state: transitionRfq(rfq.state, RfqState.QUOTE_SELECTED) });
    await Promise.all([
      repository.createAuditEvent({ actorUserId: authenticated.user.id, entityType: 'ORDER', entityId: order.id, action: 'ORDER_CREATED', metadata: { quoteId: quote.id, rfqId: rfq.id } }),
      repository.createNotification({ userId: order.buyerId, orderId: order.id, type: 'ORDER_CREATED' }),
      repository.createNotification({ userId: order.vendorId, orderId: order.id, type: 'ORDER_CREATED' }),
    ]);
    return context.json({ quote: updatedQuote, rfq: updatedRfq, order });
  });

  app.get('/orders/mine', async (context) => {
    const authenticated = await current(context);
    return context.json({ orders: await repositoryFor(context).listOrdersByParticipant(authenticated.user.id) });
  });

  app.get('/orders/:id', async (context) => {
    const authenticated = await current(context);
    const repository = repositoryFor(context);
    const order = await repository.findOrderById(context.req.param('id'));
    if (!order || (order.buyerId !== authenticated.user.id && order.vendorId !== authenticated.user.id)) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    return context.json({ order, timeline: await repository.listAuditEvents('ORDER', order.id), notifications: await repository.listNotificationsByUser(authenticated.user.id) });
  });

  app.patch('/orders/:id/status', async (context) => {
    const authenticated = await current(context);
    const repository = repositoryFor(context);
    const order = await repository.findOrderById(context.req.param('id'));
    if (!order || (order.buyerId !== authenticated.user.id && order.vendorId !== authenticated.user.id)) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    const input = updateOrderStatusInputSchema.safeParse(await readJsonBody<unknown>(context.req.raw));
    if (!input.success) httpError(400, 'VALIDATION_ERROR', 'Provide a valid order status.');
    const nextStatus = input.data.status as OrderStatus;
    const isVendor = order.vendorId === authenticated.user.id;
    const vendorStatuses = new Set<OrderStatus>([OrderStatus.AWAITING_PAYMENT, OrderStatus.IN_PRODUCTION, OrderStatus.QUALITY_CHECK, OrderStatus.SHIPPED]);
    if (!isVendor && nextStatus !== OrderStatus.CANCELLED && nextStatus !== OrderStatus.DISPUTED) httpError(403, 'FORBIDDEN', 'Only the vendor can update production status.');
    if (isVendor && !vendorStatuses.has(nextStatus) && nextStatus !== OrderStatus.CANCELLED && nextStatus !== OrderStatus.DISPUTED) httpError(403, 'FORBIDDEN', 'You do not have access to this status transition.');
    try { transitionOrder(order.status, nextStatus); } catch { httpError(409, 'INVALID_ORDER_TRANSITION', 'This order cannot move to that status.'); }
    const updated = await repository.updateOrder(order.id, { status: nextStatus, trackingNumber: input.data.trackingNumber ?? order.trackingNumber });
    await Promise.all([
      repository.createAuditEvent({ actorUserId: authenticated.user.id, entityType: 'ORDER', entityId: order.id, action: 'ORDER_STATUS_CHANGED', metadata: { from: order.status, to: nextStatus } }),
      repository.createNotification({ userId: order.buyerId, orderId: order.id, type: 'ORDER_STATUS_CHANGED' }),
      repository.createNotification({ userId: order.vendorId, orderId: order.id, type: 'ORDER_STATUS_CHANGED' }),
    ]);
    return context.json({ order: updated });
  });

  app.post('/orders/:id/delivery-confirmation', async (context) => {
    const authenticated = await current(context, 'BUYER');
    const repository = repositoryFor(context);
    const order = await repository.findOrderById(context.req.param('id'));
    if (!order || order.buyerId !== authenticated.user.id) httpError(403, 'FORBIDDEN', 'You do not have access to this resource.');
    try { transitionOrder(order.status, OrderStatus.DELIVERED); } catch { httpError(409, 'INVALID_ORDER_TRANSITION', 'Delivery can only be confirmed after shipment.'); }
    const updated = await repository.updateOrder(order.id, { status: OrderStatus.DELIVERED, deliveryConfirmedAt: new Date() });
    await Promise.all([
      repository.createAuditEvent({ actorUserId: authenticated.user.id, entityType: 'ORDER', entityId: order.id, action: 'DELIVERY_CONFIRMED', metadata: {} }),
      repository.createNotification({ userId: order.buyerId, orderId: order.id, type: 'DELIVERY_CONFIRMED' }),
      repository.createNotification({ userId: order.vendorId, orderId: order.id, type: 'DELIVERY_CONFIRMED' }),
    ]);
    return context.json({ order: updated });
  });
}
