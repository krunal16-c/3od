import type {
  AuditEntityType,
  AuditEvent,
  CreateInput,
  Notification,
  Order,
  Payment,
  PaymentWebhookEvent,
  Printer,
  PrinterBlackout,
  Quote,
  Rfq,
  RfqProcess,
  RfqFile,
  Session,
  User,
  VendorContact,
  VendorProfile,
  VendorReportSummary,
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
export type CreateRfqInput = Omit<CreateInput<Rfq>, 'process'> & { process?: RfqProcess };
export type CreateRfqFileInput = CreateInput<RfqFile>;
export type CreateQuoteInput = CreateInput<Quote>;
export type CreateVendorProfileInput = CreateInput<VendorProfile>;
export type CreatePrinterInput = Omit<CreateInput<Printer>, 'processes' | 'leadTimeDays'> & Partial<Pick<Printer, 'processes' | 'leadTimeDays'>>;
export type CreatePrinterBlackoutInput = CreateInput<PrinterBlackout>;
export type CreateVendorContactInput = CreateInput<VendorContact>;
export type CreateAuditEventInput = CreateInput<AuditEvent>;
export type CreateOrderInput = CreateInput<Order>;
export type CreateNotificationInput = CreateInput<Notification>;
export type CreatePaymentInput = CreateInput<Payment>;
export type CreatePaymentWebhookEventInput = CreateInput<PaymentWebhookEvent>;

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
  findQuoteBySupplierAndIdempotencyKey(supplierId: string, key: string): Promise<Quote | null>;
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
  findPrinterById(id: string): Promise<Printer | null>;
  listPrinterBlackouts(printerId: string): Promise<readonly PrinterBlackout[]>;
  findOverlappingPrinterBlackout(printerId: string, startsOn: Date, endsOn: Date): Promise<PrinterBlackout | null>;
  createPrinterBlackout(input: CreatePrinterBlackoutInput): Promise<PrinterBlackout>;
  getVendorReportSummary(vendorId: string, userId: string): Promise<VendorReportSummary>;
  createVendorContact(input: CreateVendorContactInput): Promise<VendorContact>;
  listVendorContacts(vendorId: string): Promise<readonly VendorContact[]>;
  countVendorContactsByBuyerSince(buyerId: string, since: Date): Promise<number>;
  createAuditEvent(input: CreateAuditEventInput): Promise<AuditEvent>;
  listAuditEvents(entityType: AuditEntityType, entityId: string): Promise<readonly AuditEvent[]>;
  findOrderById(id: string): Promise<Order | null>;
  findOrderByQuoteId(quoteId: string): Promise<Order | null>;
  listOrdersByParticipant(userId: string): Promise<readonly Order[]>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order | null>;
  createNotification(input: CreateNotificationInput): Promise<Notification>;
  listNotificationsByUser(userId: string): Promise<readonly Notification[]>;
  findPaymentById(id: string): Promise<Payment | null>;
  findPaymentByOrderId(orderId: string): Promise<Payment | null>;
  findPaymentByProviderPaymentId(providerPaymentId: string): Promise<Payment | null>;
  findPaymentByIdempotencyKey(buyerId: string, key: string): Promise<Payment | null>;
  createPayment(input: CreatePaymentInput): Promise<Payment>;
  updatePayment(id: string, patch: Partial<Payment>): Promise<Payment | null>;
  findWebhookEvent(provider: string, providerEventId: string): Promise<PaymentWebhookEvent | null>;
  createWebhookEvent(input: CreatePaymentWebhookEventInput): Promise<PaymentWebhookEvent>;
}
