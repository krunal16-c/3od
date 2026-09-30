import type {
  AuditEntityType,
  AuditEvent,
  CreateInput,
  Printer,
  Quote,
  Rfq,
  RfqFile,
  Session,
  User,
  VendorContact,
  VendorProfile,
} from '@3od/domain';

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

export type CreateUserInput = CreateInput<User>;
export type CreateSessionInput = CreateInput<Session>;
export type CreateRfqInput = CreateInput<Rfq>;
export type CreateRfqFileInput = CreateInput<RfqFile>;
export type CreateQuoteInput = CreateInput<Quote>;
export type CreateVendorProfileInput = CreateInput<VendorProfile>;
export type CreatePrinterInput = CreateInput<Printer>;
export type CreateVendorContactInput = CreateInput<VendorContact>;
export type CreateAuditEventInput = CreateInput<AuditEvent>;

export interface MarketplaceRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
  markUserEmailVerified(id: string): Promise<User | null>;
  findSessionByTokenHash(tokenHash: string): Promise<Session | null>;
  createSession(input: CreateSessionInput): Promise<Session>;
  deleteSession(id: string): Promise<boolean>;
  findRfqById(id: string): Promise<Rfq | null>;
  findRfqByBuyerAndIdempotencyKey(buyerId: string, key: string): Promise<Rfq | null>;
  createRfq(input: CreateRfqInput): Promise<Rfq>;
  listRfqsByBuyer(buyerId: string): Promise<readonly Rfq[]>;
  listOpenRfqs(): Promise<readonly Rfq[]>;
  updateRfq(id: string, patch: Partial<Rfq>): Promise<Rfq | null>;
  findQuoteById(id: string): Promise<Quote | null>;
  listQuotesByRfq(rfqId: string): Promise<readonly Quote[]>;
  createQuote(input: CreateQuoteInput): Promise<Quote>;
  updateQuote(id: string, patch: Partial<Quote>): Promise<Quote | null>;
  createRfqFile(input: CreateRfqFileInput): Promise<RfqFile>;
  listRfqFilesByRfq(rfqId: string): Promise<readonly RfqFile[]>;
  findVendorProfileByUserId(userId: string): Promise<VendorProfile | null>;
  findVendorProfileBySlug(slug: string): Promise<VendorProfile | null>;
  upsertVendorProfile(input: CreateVendorProfileInput): Promise<VendorProfile>;
  listPrintersByVendor(vendorId: string): Promise<readonly Printer[]>;
  createPrinter(input: CreatePrinterInput): Promise<Printer>;
  createVendorContact(input: CreateVendorContactInput): Promise<VendorContact>;
  listVendorContacts(vendorId: string): Promise<readonly VendorContact[]>;
  createAuditEvent(input: CreateAuditEventInput): Promise<AuditEvent>;
  listAuditEvents(entityType: AuditEntityType, entityId: string): Promise<readonly AuditEvent[]>;
}
