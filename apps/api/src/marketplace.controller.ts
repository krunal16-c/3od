import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Req, Res } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { getServerEnv } from '@3od/config/env/server';
import { createQuoteInputSchema, createRfqInputSchema, loginInputSchema, printerInputSchema, signupInputSchema, vendorContactInputSchema, vendorProfileInputSchema } from '@3od/contracts';
import { QuoteState, RfqState, transitionQuote, transitionRfq } from '@3od/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { hashPassword, hashToken, MarketplaceStore, publicUser, roleForDomain, verifyPassword } from './marketplace.store.js';
import { R2StorageService } from './r2-storage.js';

type RequestWithUser = FastifyRequest;
const SESSION_COOKIE = '3od_session';
const cookieValue = (raw: string | undefined) => raw?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
function fail(statusCode: number, code: string, message: string): never { const error = new Error(message); Object.assign(error, { statusCode, code }); throw error; }
const badRequest = (message: string): never => fail(400, 'VALIDATION_ERROR', message);
const unauthorized = (message = 'Authentication required'): never => fail(401, 'UNAUTHENTICATED', message);
const forbidden = (): never => fail(403, 'FORBIDDEN', 'You do not have access to this resource.');
function setSession(reply: FastifyReply, token: string) { reply.header('set-cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); }

@Controller()
export class MarketplaceController {
  constructor(
    @Inject(MarketplaceStore) private readonly store: MarketplaceStore,
    @Inject(R2StorageService) private readonly storage: R2StorageService,
  ) {}
  private async current(request: RequestWithUser) {
    const token = cookieValue(request.headers.cookie);
    const session = token ? await this.store.findSessionByToken(token) : null;
    const user = session ? await this.store.findUserById(session.userId) : null;
    if (!user) unauthorized();
    return { session: session!, user: user! };
  }
  private async newSession(userId: string, reply: FastifyReply) {
    const token = randomBytes(32).toString('base64url');
    await this.store.createSession({ userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 604800000) });
    setSession(reply, token);
  }

  @Post('/auth/signup')
  async signup(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = signupInputSchema.safeParse(body);
    const data = input.success ? input.data : badRequest('Please check the account details.');
    if (await this.store.findUserByEmail(data.email)) fail(409, 'ACCOUNT_EXISTS', 'An account already exists for this email.');
    const user = await this.store.createUser({ email: data.email.toLowerCase(), passwordHash: hashPassword(data.password), role: roleForDomain(data.role), displayName: data.name });
    await this.newSession(user.id, reply);
    return { user: publicUser(user) };
  }

  @Post('/auth/login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = loginInputSchema.safeParse(body);
    const data = input.success ? input.data : unauthorized('Invalid email or password');
    const user = await this.store.findUserByEmail(data.email);
    if (!user || !verifyPassword(data.password, user.passwordHash)) unauthorized('Invalid email or password');
    const authenticatedUser = user!;
    await this.newSession(authenticatedUser.id, reply);
    return { user: publicUser(authenticatedUser) };
  }

  @Post('/auth/logout')
  async logout(@Req() request: RequestWithUser, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = cookieValue(request.headers.cookie); const session = token ? await this.store.findSessionByToken(token) : null;
    if (session) await this.store.deleteSession(session.id);
    reply.header('set-cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); reply.status(204);
  }

  @Get('/auth/me')
  async me(@Req() request: RequestWithUser) { return { user: publicUser((await this.current(request)).user) }; }

  @Post('/vendor/profile')
  @HttpCode(201)
  async saveVendorProfile(@Req() request: RequestWithUser, @Body() body: unknown) {
    const { user } = await this.current(request); if (user.role !== 'PRINTER_OWNER') forbidden();
    const parsed = vendorProfileInputSchema.safeParse(body);
    const data = parsed.success ? parsed.data : badRequest('Please provide a valid vendor profile.');
    return { vendor: await this.store.upsertVendorProfile({ userId: user.id, ...data, isPublished: true }) };
  }

  @Post('/vendor/printers')
  @HttpCode(201)
  async addPrinter(@Req() request: RequestWithUser, @Body() body: unknown) {
    const { user } = await this.current(request); if (user.role !== 'PRINTER_OWNER') forbidden();
    const vendor = await this.store.findVendorProfileByUserId(user.id); if (!vendor) fail(409, 'VENDOR_PROFILE_REQUIRED', 'Create your vendor profile before adding a printer.');
    const parsed = printerInputSchema.safeParse(body);
    const data = parsed.success ? parsed.data : badRequest('Please provide valid printer details.');
    return { printer: await this.store.createPrinter({ vendorId: vendor!.id, ...data, isActive: true }) };
  }

  @Get('/vendor/printers')
  async myPrinters(@Req() request: RequestWithUser) {
    const { user } = await this.current(request); if (user.role !== 'PRINTER_OWNER') forbidden();
    const vendor = await this.store.findVendorProfileByUserId(user.id); if (!vendor) return { printers: [] };
    return { printers: await this.store.listPrintersByVendor(vendor.id) };
  }

  @Get('/vendor/contacts')
  async vendorContacts(@Req() request: RequestWithUser) {
    const { user } = await this.current(request); if (user.role !== 'PRINTER_OWNER') forbidden();
    const vendor = await this.store.findVendorProfileByUserId(user.id); if (!vendor) return { contacts: [] };
    return { contacts: await this.store.listVendorContacts(vendor.id) };
  }

  @Get('/vendors/:slug')
  async publicVendor(@Param('slug') slug: string) {
    const vendor = await this.store.findVendorProfileBySlug(slug); if (!vendor) fail(404, 'VENDOR_NOT_FOUND', 'This vendor page is not available.');
    const { userId: _userId, ...publicProfile } = vendor!;
    return { vendor: publicProfile, printers: await this.store.listPrintersByVendor(vendor!.id) };
  }

  @Post('/vendors/:slug/contact')
  @HttpCode(201)
  async contactVendor(@Req() request: RequestWithUser, @Param('slug') slug: string, @Body() body: unknown) {
    const { user } = await this.current(request); if (user.role !== 'BUYER') forbidden();
    const vendor = await this.store.findVendorProfileBySlug(slug); if (!vendor) fail(404, 'VENDOR_NOT_FOUND', 'This vendor page is not available.');
    const parsed = vendorContactInputSchema.safeParse(body);
    const data = parsed.success ? parsed.data : badRequest('Please add a message before contacting this vendor.');
    return { contact: await this.store.createVendorContact({ vendorId: vendor!.id, buyerId: user.id, ...data, status: 'NEW' }) };
  }

  @Post('/rfqs')
  async createRfq(@Req() request: RequestWithUser, @Headers('idempotency-key') headerKey: string | undefined, @Body() body: unknown) {
    const { user } = await this.current(request); if (user.role !== 'BUYER') forbidden();
    const raw = (body ?? {}) as Record<string, unknown>;
    const input = createRfqInputSchema.safeParse({ ...raw, idempotencyKey: headerKey ?? raw.idempotencyKey });
    const data = input.success ? input.data : badRequest('An Idempotency-Key header is required.');
    const idempotencyKey = data.idempotencyKey;
    if (!idempotencyKey) badRequest('An Idempotency-Key header is required.');
    return { rfq: await this.store.createRfq({ ...data, buyerId: user.id, idempotencyKey: idempotencyKey!, state: RfqState.OPEN_FOR_QUOTES, description: data.notes ?? null, deadline: data.neededBy ?? null, material: data.material ?? null, finish: data.finish ?? null }) };
  }

  @Get('/rfqs/mine')
  async mine(@Req() request: RequestWithUser) { const { user } = await this.current(request); if (user.role !== 'BUYER') forbidden(); return { rfqs: await this.store.listRfqsByBuyer(user.id) }; }
  @Get('/rfqs/inbox')
  async inbox(@Req() request: RequestWithUser) { const { user } = await this.current(request); if (user.role !== 'PRINTER_OWNER') forbidden(); return { rfqs: await this.store.listOpenRfqs() }; }

  @Post('/rfqs/:id/quotes')
  @HttpCode(201)
  async createQuote(@Req() request: RequestWithUser, @Param('id') rfqId: string, @Body() body: unknown) {
    const { user } = await this.current(request); if (user.role !== 'PRINTER_OWNER') forbidden();
    const rfq = await this.store.findRfqById(rfqId); if (!rfq || rfq.state !== RfqState.OPEN_FOR_QUOTES) forbidden();
    const parsed = createQuoteInputSchema.safeParse({ ...(body as Record<string, unknown>), rfqId });
    const data = parsed.success ? parsed.data : badRequest('Please provide a valid quote amount and lead time.');
    const quote = await this.store.createQuote({ rfqId, supplierId: user.id, state: QuoteState.VISIBLE_TO_BUYER, totalAmountInr: Math.ceil(data.amountPaise / 100), currency: 'INR', deliveryDate: new Date(Date.now() + data.leadTimeDays * 86400000), expiresAt: data.expiresAt ?? null, notes: data.notes ?? null });
    await this.store.updateRfq(rfq!.id, { state: transitionRfq(rfq!.state, RfqState.QUOTES_RECEIVED) });
    return { quote };
  }

  @Get('/rfqs/:id/quotes')
  async quotes(@Req() request: RequestWithUser, @Param('id') rfqId: string) {
    const { user } = await this.current(request); const rfq = await this.store.findRfqById(rfqId);
    if (!rfq || (rfq.buyerId !== user.id && user.role !== 'PRINTER_OWNER')) forbidden();
    return { quotes: await this.store.listQuotesByRfq(rfqId) };
  }

  @Post('/quotes/:id/accept')
  @HttpCode(200)
  async acceptQuote(@Req() request: RequestWithUser, @Param('id') quoteId: string) {
    const { user } = await this.current(request); if (user.role !== 'BUYER') forbidden();
    const quote = await this.store.findQuoteById(quoteId); const rfq = quote ? await this.store.findRfqById(quote.rfqId) : null;
    if (!quote || !rfq || rfq.buyerId !== user.id || quote.state !== QuoteState.VISIBLE_TO_BUYER) forbidden();
    const acceptedQuote = quote!;
    const selectedRfq = rfq!;
    const updatedQuote = await this.store.updateQuote(acceptedQuote.id, { state: transitionQuote(acceptedQuote.state, QuoteState.ACCEPTED) });
    const updatedRfq = await this.store.updateRfq(selectedRfq.id, { state: transitionRfq(selectedRfq.state, RfqState.QUOTE_SELECTED) });
    return { quote: updatedQuote, rfq: updatedRfq };
  }

  @Post('/rfqs/:id/upload-intent')
  async uploadIntent(@Req() request: RequestWithUser, @Param('id') rfqId: string, @Body() body: unknown) {
    const { user } = await this.current(request); if (user.role !== 'BUYER') forbidden();
    const rfq = await this.store.findRfqById(rfqId); if (!rfq || rfq.buyerId !== user.id) forbidden();
    const ownedRfq = rfq!;
    const payload = body as { fileName?: unknown; contentType?: unknown; byteSize?: unknown };
    const fileName = String(payload.fileName ?? '').trim(); const contentType = String(payload.contentType ?? '').trim(); const byteSize = Number(payload.byteSize);
    const types = ['model/stl', 'model/obj', 'model/step', 'model/3mf', 'application/octet-stream'];
    if (!fileName || fileName.length > 180 || !types.includes(contentType) || !Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > 100 * 1024 * 1024) badRequest('Unsupported or oversized design file.');
    const env = getServerEnv();
    if (!process.env.R2_ENDPOINT || env.R2_ENDPOINT.startsWith('http://localhost') || env.R2_ACCESS_KEY_ID.startsWith('development-')) fail(503, 'STORAGE_UNAVAILABLE', 'File storage is not configured.');
    const key = `rfqs/${ownedRfq.id}/${createHash('sha256').update(`${user.id}:${fileName}:${Date.now()}`).digest('hex')}-${fileName}`;
    const uploadUrl = await this.storage.createUploadUrl({ key, contentType, byteSize });
    await this.store.createRfqFile({ rfqId: ownedRfq.id, storageKey: key, originalFilename: fileName, contentType, byteSize, state: 'PENDING' });
    return { uploadUrl, key, expiresInSeconds: 300 };
  }
}
