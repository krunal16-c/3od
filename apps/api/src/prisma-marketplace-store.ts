import type { Printer, Quote, Rfq, RfqFile, Session, User, VendorContact, VendorProfile } from '@3od/domain';
import { RfqState } from '@3od/domain';
import { hashToken, MarketplaceStore, type CreatePrinterInput, type CreateQuoteInput, type CreateRfqFileInput, type CreateRfqInput, type CreateSessionInput, type CreateUserInput, type CreateVendorContactInput, type CreateVendorProfileInput } from './marketplace.store.js';

type Delegate = object;
export type PrismaMarketplaceClient = { user?: Delegate; session?: Delegate; rfq?: Delegate; quote?: Delegate; rfqFile?: Delegate; vendorProfile?: Delegate; printer?: Delegate; vendorContact?: Delegate };

export class PrismaMarketplaceStore extends MarketplaceStore {
  constructor(private readonly prisma: PrismaMarketplaceClient) { super(); }
  private delegate(name: keyof PrismaMarketplaceClient) { const value = this.prisma[name]; if (!value) throw new Error(`Prisma ${String(name)} delegate is unavailable`); return value; }
  private async call<T>(name: keyof PrismaMarketplaceClient, method: string, args: { where?: unknown; data?: unknown; orderBy?: unknown }) { const fn = (this.delegate(name) as Record<string, unknown>)[method]; if (typeof fn !== 'function') throw new Error(`Prisma ${String(name)}.${method} is unavailable`); return await fn.call(this.delegate(name), args) as T; }
  async findUserByEmail(email: string) { return await this.call<User | null>('user', 'findUnique', { where: { email: email.trim().toLowerCase() } }); }
  async findUserById(id: string) { return await this.call<User | null>('user', 'findUnique', { where: { id } }); }
  async createUser(input: CreateUserInput) { return await this.call<User>('user', 'create', { data: { ...input, email: input.email.trim().toLowerCase() } }); }
  async findSessionByToken(token: string) { const session = await this.call<Session | null>('session', 'findUnique', { where: { tokenHash: hashToken(token) } }); return session && session.expiresAt > new Date() ? session : null; }
  async createSession(input: CreateSessionInput) { return await this.call<Session>('session', 'create', { data: input }); }
  async deleteSession(id: string) { await this.call('session', 'delete', { where: { id } }); return true; }
  async findRfqById(id: string) { return await this.call<Rfq | null>('rfq', 'findUnique', { where: { id } }); }
  async findRfqByBuyerAndIdempotencyKey(buyerId: string, key: string) { return await this.call<Rfq | null>('rfq', 'findUnique', { where: { buyerId_idempotencyKey: { buyerId, idempotencyKey: key } } }); }
  async createRfq(input: CreateRfqInput) { const existing = await this.findRfqByBuyerAndIdempotencyKey(input.buyerId, input.idempotencyKey); if (existing) return existing; return await this.call<Rfq>('rfq', 'create', { data: input }); }
  async listRfqsByBuyer(buyerId: string) { return await this.call<Rfq[]>('rfq', 'findMany', { where: { buyerId }, orderBy: { createdAt: 'desc' } }); }
  async listOpenRfqs() { return await this.call<Rfq[]>('rfq', 'findMany', { where: { state: RfqState.OPEN_FOR_QUOTES }, orderBy: { createdAt: 'desc' } }); }
  async updateRfq(id: string, patch: Partial<Rfq>) { return await this.call<Rfq>('rfq', 'update', { where: { id }, data: patch }); }
  async findQuoteById(id: string) { return await this.call<Quote | null>('quote', 'findUnique', { where: { id } }); }
  async listQuotesByRfq(rfqId: string) { return await this.call<Quote[]>('quote', 'findMany', { where: { rfqId }, orderBy: { createdAt: 'desc' } }); }
  async createQuote(input: CreateQuoteInput) { return await this.call<Quote>('quote', 'create', { data: input }); }
  async updateQuote(id: string, patch: Partial<Quote>) { return await this.call<Quote>('quote', 'update', { where: { id }, data: patch }); }
  async createRfqFile(input: CreateRfqFileInput) { return await this.call<RfqFile>('rfqFile', 'create', { data: input }); }
  async findVendorProfileByUserId(userId: string) { return await this.call<VendorProfile | null>('vendorProfile', 'findUnique', { where: { userId } }); }
  async findVendorProfileBySlug(slug: string) { return await this.call<VendorProfile | null>('vendorProfile', 'findUnique', { where: { slug } }); }
  async upsertVendorProfile(input: CreateVendorProfileInput) { const { userId, ...profile } = input; return await this.call<VendorProfile>('vendorProfile', 'upsert', { where: { userId }, data: { create: input, update: profile } }); }
  async listPrintersByVendor(vendorId: string) { return await this.call<Printer[]>('printer', 'findMany', { where: { vendorId, isActive: true }, orderBy: { createdAt: 'desc' } }); }
  async createPrinter(input: CreatePrinterInput) { return await this.call<Printer>('printer', 'create', { data: input }); }
  async createVendorContact(input: CreateVendorContactInput) { return await this.call<VendorContact>('vendorContact', 'create', { data: input }); }
  async listVendorContacts(vendorId: string) { return await this.call<VendorContact[]>('vendorContact', 'findMany', { where: { vendorId }, orderBy: { createdAt: 'desc' } }); }
}
