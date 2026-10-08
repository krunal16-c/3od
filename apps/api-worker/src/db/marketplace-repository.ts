import type {
  AuditEntityType,
  AuditEvent,
  Notification,
  Order,
  Payment,
  PaymentWebhookEvent,
  Printer,
  PrinterBlackout,
  Quote,
  Rfq,
  RfqFile,
  Session,
  User,
  VendorContact,
  VendorProfile,
  VendorReportSummary,
} from '@3od/domain';
import type {
  CreateAuditEventInput,
  CreateNotificationInput,
  CreateOrderInput,
  CreatePaymentInput,
  CreatePaymentWebhookEventInput,
  CreatePrinterInput,
  CreatePrinterBlackoutInput,
  CreateQuoteInput,
  CreateRfqFileInput,
  CreateRfqInput,
  CreateSessionInput,
  CreateUserInput,
  CreateVendorContactInput,
  CreateVendorProfileInput,
  D1DatabaseLike,
  D1PreparedStatementLike,
  MarketplaceRepository,
} from './types.js';
import {
  decodeBoolean,
  decodeDate,
  decodeJson,
  decodeStringArray,
  encodeBoolean,
  encodeDate,
  encodeJson,
  encodeStringArray,
} from './codec.js';
import { PaymentState } from '@3od/domain';

type Row = Record<string, unknown>;

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date();
const rows = async <T>(statement: D1PreparedStatementLike) => statement.all<Row>().then((result) => result.results.map((row) => rowTo<T>(row)));
const run = async (statement: D1PreparedStatementLike) => statement.run();

function rowTo<T>(row: Row): T {
  return row as T;
}

function userFromRow(row: Row): User {
  return { id: String(row.id), email: String(row.email), passwordHash: String(row.password_hash), role: row.role as User['role'], displayName: row.display_name === null ? null : String(row.display_name), emailVerifiedAt: row.email_verified_at === null || row.email_verified_at === undefined ? null : decodeDate(row.email_verified_at), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function sessionFromRow(row: Row): Session {
  return { id: String(row.id), userId: String(row.user_id), tokenHash: String(row.token_hash), expiresAt: decodeDate(row.expires_at), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function vendorFromRow(row: Row): VendorProfile {
  return { id: String(row.id), userId: String(row.user_id), slug: String(row.slug), businessName: String(row.business_name), bio: row.bio === null ? null : String(row.bio), city: row.city === null ? null : String(row.city), state: row.state === null ? null : String(row.state), serviceAreas: decodeStringArray(row.service_areas), isPublished: decodeBoolean(row.is_published), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function printerFromRow(row: Row): Printer {
  return { id: String(row.id), vendorId: String(row.vendor_id), name: String(row.name), model: row.model === null ? null : String(row.model), technologies: decodeStringArray(row.technologies), materials: decodeStringArray(row.materials), processes: decodeStringArray(row.processes) as Printer['processes'], minOrderQuantity: Number(row.min_order_quantity), leadTimeDays: Number(row.lead_time_days), isActive: decodeBoolean(row.is_active), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function printerBlackoutFromRow(row: Row): PrinterBlackout {
  return { id: String(row.id), printerId: String(row.printer_id), startsOn: decodeDate(row.starts_on), endsOn: decodeDate(row.ends_on), reason: row.reason === null ? null : String(row.reason), createdAt: decodeDate(row.created_at) };
}

function contactFromRow(row: Row): VendorContact {
  return { id: String(row.id), vendorId: String(row.vendor_id), buyerId: String(row.buyer_id), message: String(row.message), phone: row.phone === null ? null : String(row.phone), status: row.status as VendorContact['status'], createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function rfqFromRow(row: Row): Rfq {
  return { id: String(row.id), buyerId: String(row.buyer_id), idempotencyKey: String(row.idempotency_key), title: String(row.title), process: (row.process ?? '3d_printing') as Rfq['process'], state: row.state as Rfq['state'], description: row.description === null ? null : String(row.description), quantity: row.quantity === null ? null : Number(row.quantity), material: row.material === null ? null : String(row.material), finish: row.finish === null ? null : String(row.finish), deadline: row.deadline === null ? null : decodeDate(row.deadline), tolerance: row.tolerance === null ? null : String(row.tolerance), location: row.location === null ? null : String(row.location), shippingPreference: row.shipping_preference as Rfq['shippingPreference'], createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function fileFromRow(row: Row): RfqFile {
  return { id: String(row.id), rfqId: String(row.rfq_id), storageKey: String(row.storage_key), originalFilename: String(row.original_filename), contentType: String(row.content_type), byteSize: Number(row.byte_size), state: row.state as RfqFile['state'], createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function quoteFromRow(row: Row): Quote {
  return { id: String(row.id), rfqId: String(row.rfq_id), supplierId: String(row.supplier_id), idempotencyKey: row.idempotency_key === null || row.idempotency_key === undefined ? null : String(row.idempotency_key), state: row.state as Quote['state'], totalAmountInr: Number(row.total_amount_inr), currency: 'INR', deliveryDate: row.delivery_date === null ? null : decodeDate(row.delivery_date), expiresAt: row.expires_at === null ? null : decodeDate(row.expires_at), notes: row.notes === null ? null : String(row.notes), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function auditFromRow(row: Row): AuditEvent {
  return { id: String(row.id), actorUserId: row.actor_user_id === null ? null : String(row.actor_user_id), entityType: row.entity_type as AuditEntityType, entityId: String(row.entity_id), action: String(row.action), metadata: decodeJson(row.metadata), createdAt: decodeDate(row.created_at) };
}

function orderFromRow(row: Row): Order {
  return {
    id: String(row.id),
    buyerId: String(row.buyer_id),
    vendorId: String(row.vendor_id),
    rfqId: String(row.rfq_id),
    quoteId: String(row.quote_id),
    status: row.status as Order['status'],
    pickupAddress: row.pickup_address === null ? null : String(row.pickup_address),
    shippingAddress: row.shipping_address === null ? null : String(row.shipping_address),
    trackingNumber: row.tracking_number === null ? null : String(row.tracking_number),
    deliveryConfirmedAt: row.delivery_confirmed_at === null ? null : decodeDate(row.delivery_confirmed_at),
    createdAt: decodeDate(row.created_at),
    updatedAt: decodeDate(row.updated_at),
  };
}

function notificationFromRow(row: Row): Notification {
  return { id: String(row.id), userId: String(row.user_id), orderId: String(row.order_id), type: row.type as Notification['type'], createdAt: decodeDate(row.created_at) };
}

function paymentFromRow(row: Row): Payment {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    buyerId: String(row.buyer_id),
    vendorId: String(row.vendor_id),
    amountPaise: Number(row.amount_paise),
    currency: 'INR',
    state: row.state as PaymentState,
    provider: String(row.provider),
    providerPaymentId: row.provider_payment_id === null ? null : String(row.provider_payment_id),
    idempotencyKey: String(row.idempotency_key),
    createdAt: decodeDate(row.created_at),
    updatedAt: decodeDate(row.updated_at),
  };
}

function webhookEventFromRow(row: Row): PaymentWebhookEvent {
  return {
    id: String(row.id),
    provider: String(row.provider),
    providerEventId: String(row.provider_event_id),
    eventType: String(row.event_type),
    payloadHash: String(row.payload_hash),
    processedAt: row.processed_at === null ? null : decodeDate(row.processed_at),
    createdAt: decodeDate(row.created_at),
  };
}

export class D1MarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async findUserByEmail(email: string) { const statement = this.db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email.trim().toLowerCase()); const row = await statement.first<Row>(); return row ? userFromRow(row) : null; }
  async findUserById(userId: string) { const row = await this.db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(userId).first<Row>(); return row ? userFromRow(row) : null; }
  async createUser(input: CreateUserInput) { const timestamp = now(); const value: User = { ...input, id: id('user'), emailVerifiedAt: input.emailVerifiedAt ?? null, createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO users (id, email, password_hash, role, display_name, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.email.trim().toLowerCase(), value.passwordHash, value.role, value.displayName, value.emailVerifiedAt ? encodeDate(value.emailVerifiedAt) : null, encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async markUserEmailVerified(userId: string) { const timestamp = now(); await run(this.db.prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?').bind(encodeDate(timestamp), encodeDate(timestamp), userId)); return this.findUserById(userId); }

  async findSessionByTokenHash(tokenHash: string) { const row = await this.db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1').bind(tokenHash, encodeDate(now())).first<Row>(); return row ? sessionFromRow(row) : null; }
  async createSession(input: CreateSessionInput) { const timestamp = now(); const value: Session = { ...input, id: id('session'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(value.id, value.userId, value.tokenHash, encodeDate(value.expiresAt), encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async deleteSession(sessionId: string) { const result = await run(this.db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId)); return (result.meta?.changes ?? 0) > 0; }

  async findRfqById(rfqId: string) { const row = await this.db.prepare('SELECT * FROM rfqs WHERE id = ? LIMIT 1').bind(rfqId).first<Row>(); return row ? rfqFromRow(row) : null; }
  async findRfqByBuyerAndIdempotencyKey(buyerId: string, key: string) { const row = await this.db.prepare('SELECT * FROM rfqs WHERE buyer_id = ? AND idempotency_key = ? LIMIT 1').bind(buyerId, key).first<Row>(); return row ? rfqFromRow(row) : null; }
  async createRfq(input: CreateRfqInput) { const existing = await this.findRfqByBuyerAndIdempotencyKey(input.buyerId, input.idempotencyKey); if (existing) return existing; const timestamp = now(); const value: Rfq = { ...input, process: input.process ?? '3d_printing', id: id('rfq'), createdAt: timestamp, updatedAt: timestamp }; try { await run(this.db.prepare('INSERT INTO rfqs (id, buyer_id, idempotency_key, title, process, state, description, quantity, material, finish, deadline, tolerance, location, shipping_preference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.buyerId, value.idempotencyKey, value.title, value.process, value.state, value.description, value.quantity, value.material, value.finish, value.deadline ? encodeDate(value.deadline) : null, value.tolerance ?? null, value.location ?? null, value.shippingPreference ?? null, encodeDate(timestamp), encodeDate(timestamp))); } catch (error) { const retry = await this.findRfqByBuyerAndIdempotencyKey(input.buyerId, input.idempotencyKey); if (retry) return retry; throw error; } return value; }
  async listRfqsByBuyer(buyerId: string) { return rows<Rfq>(this.db.prepare('SELECT * FROM rfqs WHERE buyer_id = ? ORDER BY created_at DESC').bind(buyerId)).then((items) => items.map((row) => rfqFromRow(row as unknown as Row))); }
  async listOpenRfqs() { return rows<Rfq>(this.db.prepare("SELECT * FROM rfqs WHERE state = 'OPEN_FOR_QUOTES' ORDER BY created_at DESC")).then((items) => items.map((row) => rfqFromRow(row as unknown as Row))); }
  async updateRfq(rfqId: string, patch: Partial<Rfq>) { const current = await this.findRfqById(rfqId); if (!current) return null; const updated = { ...current, ...patch, id: rfqId, updatedAt: now() }; await run(this.db.prepare('UPDATE rfqs SET title = ?, process = ?, state = ?, description = ?, quantity = ?, material = ?, finish = ?, deadline = ?, tolerance = ?, location = ?, shipping_preference = ?, updated_at = ? WHERE id = ?').bind(updated.title, updated.process, updated.state, updated.description, updated.quantity, updated.material, updated.finish, updated.deadline ? encodeDate(updated.deadline) : null, updated.tolerance ?? null, updated.location ?? null, updated.shippingPreference ?? null, encodeDate(updated.updatedAt), rfqId)); return updated; }

  async findQuoteById(quoteId: string) { const row = await this.db.prepare('SELECT * FROM quotes WHERE id = ? LIMIT 1').bind(quoteId).first<Row>(); return row ? quoteFromRow(row) : null; }
  async findQuoteBySupplierAndIdempotencyKey(supplierId: string, key: string) { const row = await this.db.prepare('SELECT * FROM quotes WHERE supplier_id = ? AND idempotency_key = ? LIMIT 1').bind(supplierId, key).first<Row>(); return row ? quoteFromRow(row) : null; }
  async listQuotesByRfq(rfqId: string) { const result = await this.db.prepare('SELECT * FROM quotes WHERE rfq_id = ? ORDER BY created_at DESC').bind(rfqId).all<Row>(); return result.results.map(quoteFromRow); }
  async createQuote(input: CreateQuoteInput) { if (input.idempotencyKey) { const existing = await this.findQuoteBySupplierAndIdempotencyKey(input.supplierId, input.idempotencyKey); if (existing) return existing; } const timestamp = now(); const value: Quote = { ...input, id: id('quote'), createdAt: timestamp, updatedAt: timestamp }; try { await run(this.db.prepare('INSERT INTO quotes (id, rfq_id, supplier_id, idempotency_key, state, total_amount_inr, currency, delivery_date, expires_at, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.rfqId, value.supplierId, value.idempotencyKey ?? null, value.state, value.totalAmountInr, value.currency, value.deliveryDate ? encodeDate(value.deliveryDate) : null, value.expiresAt ? encodeDate(value.expiresAt) : null, value.notes, encodeDate(timestamp), encodeDate(timestamp))); } catch (error) { if (input.idempotencyKey) { const retry = await this.findQuoteBySupplierAndIdempotencyKey(input.supplierId, input.idempotencyKey); if (retry) return retry; } throw error; } return value; }
  async updateQuote(quoteId: string, patch: Partial<Quote>) { const current = await this.findQuoteById(quoteId); if (!current) return null; const updated = { ...current, ...patch, id: quoteId, updatedAt: now() }; await run(this.db.prepare('UPDATE quotes SET state = ?, total_amount_inr = ?, delivery_date = ?, expires_at = ?, notes = ?, updated_at = ? WHERE id = ?').bind(updated.state, updated.totalAmountInr, updated.deliveryDate ? encodeDate(updated.deliveryDate) : null, updated.expiresAt ? encodeDate(updated.expiresAt) : null, updated.notes, encodeDate(updated.updatedAt), quoteId)); return updated; }

  async findOrderById(orderId: string) { const row = await this.db.prepare('SELECT * FROM orders WHERE id = ? LIMIT 1').bind(orderId).first<Row>(); return row ? orderFromRow(row) : null; }
  async findOrderByQuoteId(quoteId: string) { const row = await this.db.prepare('SELECT * FROM orders WHERE quote_id = ? LIMIT 1').bind(quoteId).first<Row>(); return row ? orderFromRow(row) : null; }
  async listOrdersByParticipant(userId: string) { const result = await this.db.prepare('SELECT * FROM orders WHERE buyer_id = ? OR vendor_id = ? ORDER BY created_at DESC').bind(userId, userId).all<Row>(); return result.results.map(orderFromRow); }
  async createOrder(input: CreateOrderInput) { const timestamp = now(); const value: Order = { ...input, id: id('order'), deliveryConfirmedAt: input.deliveryConfirmedAt ?? null, pickupAddress: input.pickupAddress ?? null, shippingAddress: input.shippingAddress ?? null, trackingNumber: input.trackingNumber ?? null, createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO orders (id, buyer_id, vendor_id, rfq_id, quote_id, status, pickup_address, shipping_address, tracking_number, delivery_confirmed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.buyerId, value.vendorId, value.rfqId, value.quoteId, value.status, value.pickupAddress, value.shippingAddress, value.trackingNumber, value.deliveryConfirmedAt ? encodeDate(value.deliveryConfirmedAt) : null, encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async updateOrder(orderId: string, patch: Partial<Order>) { const current = await this.findOrderById(orderId); if (!current) return null; const updated = { ...current, ...patch, id: orderId, updatedAt: now() }; await run(this.db.prepare('UPDATE orders SET status = ?, pickup_address = ?, shipping_address = ?, tracking_number = ?, delivery_confirmed_at = ?, updated_at = ? WHERE id = ?').bind(updated.status, updated.pickupAddress, updated.shippingAddress, updated.trackingNumber, updated.deliveryConfirmedAt ? encodeDate(updated.deliveryConfirmedAt) : null, encodeDate(updated.updatedAt), orderId)); return updated; }

  async createRfqFile(input: CreateRfqFileInput) { const timestamp = now(); const value: RfqFile = { ...input, id: id('rfq-file'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO rfq_files (id, rfq_id, storage_key, original_filename, content_type, byte_size, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.rfqId, value.storageKey, value.originalFilename, value.contentType, value.byteSize, value.state, encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async listRfqFilesByRfq(rfqId: string) { const result = await this.db.prepare('SELECT * FROM rfq_files WHERE rfq_id = ? ORDER BY created_at ASC').bind(rfqId).all<Row>(); return result.results.map(fileFromRow); }

  async findVendorProfileByUserId(userId: string) { const row = await this.db.prepare('SELECT * FROM vendor_profiles WHERE user_id = ? LIMIT 1').bind(userId).first<Row>(); return row ? vendorFromRow(row) : null; }
  async findVendorProfileBySlug(slug: string) { const row = await this.db.prepare('SELECT * FROM vendor_profiles WHERE slug = ? AND is_published = 1 LIMIT 1').bind(slug).first<Row>(); return row ? vendorFromRow(row) : null; }
  async upsertVendorProfile(input: CreateVendorProfileInput) { const existing = await this.findVendorProfileByUserId(input.userId); const timestamp = now(); const value: VendorProfile = { ...input, id: existing?.id ?? id('vendor'), createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO vendor_profiles (id, user_id, slug, business_name, bio, city, state, service_areas, is_published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET slug = excluded.slug, business_name = excluded.business_name, bio = excluded.bio, city = excluded.city, state = excluded.state, service_areas = excluded.service_areas, is_published = excluded.is_published, updated_at = excluded.updated_at').bind(value.id, value.userId, value.slug, value.businessName, value.bio, value.city, value.state, encodeStringArray(value.serviceAreas), encodeBoolean(value.isPublished), encodeDate(value.createdAt), encodeDate(value.updatedAt))); return value; }
  async listPrintersByVendor(vendorId: string) { const result = await this.db.prepare('SELECT * FROM printers WHERE vendor_id = ? AND is_active = 1 ORDER BY created_at DESC').bind(vendorId).all<Row>(); return result.results.map(printerFromRow); }
  async createPrinter(input: CreatePrinterInput) { const timestamp = now(); const value: Printer = { ...input, processes: input.processes ?? ['3d_printing'], leadTimeDays: input.leadTimeDays ?? 5, id: id('printer'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO printers (id, vendor_id, name, model, technologies, materials, processes, min_order_quantity, lead_time_days, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.vendorId, value.name, value.model, encodeStringArray(value.technologies), encodeStringArray(value.materials), encodeStringArray(value.processes), value.minOrderQuantity, value.leadTimeDays, encodeBoolean(value.isActive), encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async findPrinterById(printerId: string) { const row = await this.db.prepare('SELECT * FROM printers WHERE id = ? LIMIT 1').bind(printerId).first<Row>(); return row ? printerFromRow(row) : null; }
  async listPrinterBlackouts(printerId: string) { const result = await this.db.prepare('SELECT * FROM printer_blackouts WHERE printer_id = ? ORDER BY starts_on ASC').bind(printerId).all<Row>(); return result.results.map(printerBlackoutFromRow); }
  async findOverlappingPrinterBlackout(printerId: string, startsOn: Date, endsOn: Date) { const row = await this.db.prepare('SELECT * FROM printer_blackouts WHERE printer_id = ? AND starts_on <= ? AND ends_on >= ? LIMIT 1').bind(printerId, encodeDate(endsOn), encodeDate(startsOn)).first<Row>(); return row ? printerBlackoutFromRow(row) : null; }
  async createPrinterBlackout(input: CreatePrinterBlackoutInput) { const value: PrinterBlackout = { ...input, id: id('blackout'), createdAt: now() }; await run(this.db.prepare('INSERT INTO printer_blackouts (id, printer_id, starts_on, ends_on, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(value.id, value.printerId, encodeDate(value.startsOn), encodeDate(value.endsOn), value.reason ?? null, encodeDate(value.createdAt))); return value; }
  async getVendorReportSummary(vendorId: string, userId: string): Promise<VendorReportSummary> {
    const vendor = await this.findVendorProfileByUserId(userId);
    if (!vendor || vendor.id !== vendorId) throw new Error('Vendor report ownership mismatch');
    const printerCount = Number((await this.db.prepare('SELECT COUNT(*) AS count FROM printers WHERE vendor_id = ? AND is_active = 1').bind(vendorId).first<{ count: number }>())?.count ?? 0);
    const quoteCount = Number((await this.db.prepare('SELECT COUNT(*) AS count FROM quotes WHERE supplier_id = ?').bind(userId).first<{ count: number }>())?.count ?? 0);
    const acceptedQuoteCount = Number((await this.db.prepare("SELECT COUNT(*) AS count FROM quotes WHERE supplier_id = ? AND state = 'ACCEPTED'").bind(userId).first<{ count: number }>())?.count ?? 0);
    const orderCount = Number((await this.db.prepare('SELECT COUNT(*) AS count FROM orders WHERE vendor_id = ?').bind(userId).first<{ count: number }>())?.count ?? 0);
    const earningsInr = Number((await this.db.prepare("SELECT COALESCE(SUM(q.total_amount_inr), 0) AS total FROM quotes q INNER JOIN orders o ON o.quote_id = q.id WHERE q.supplier_id = ? AND o.vendor_id = ? AND o.status <> 'CANCELLED'").bind(userId, userId).first<{ total: number }>())?.total ?? 0);
    const openRfqCount = Number((await this.db.prepare("SELECT COUNT(*) AS count FROM rfqs WHERE state IN ('OPEN_FOR_QUOTES', 'QUOTES_RECEIVED')").first<{ count: number }>())?.count ?? 0);
    return { printerCount, openRfqCount, quoteCount, acceptedQuoteCount, orderCount, earningsInr };
  }
  async createVendorContact(input: CreateVendorContactInput) { const timestamp = now(); const value: VendorContact = { ...input, phone: input.phone ?? null, id: id('contact'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO vendor_contacts (id, vendor_id, buyer_id, message, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.vendorId, value.buyerId, value.message, value.phone, value.status, encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async listVendorContacts(vendorId: string) { const result = await this.db.prepare('SELECT * FROM vendor_contacts WHERE vendor_id = ? ORDER BY created_at DESC, rowid DESC').bind(vendorId).all<Row>(); return result.results.map(contactFromRow); }
  async countVendorContactsByBuyerSince(buyerId: string, since: Date) { const row = await this.db.prepare('SELECT COUNT(*) AS count FROM vendor_contacts WHERE buyer_id = ? AND created_at >= ?').bind(buyerId, encodeDate(since)).first<{ count: number }>(); return Number(row?.count ?? 0); }

  async createAuditEvent(input: CreateAuditEventInput) { const timestamp = now(); const value: AuditEvent = { ...input, id: id('audit'), createdAt: timestamp }; await run(this.db.prepare('INSERT INTO audit_events (id, actor_user_id, entity_type, entity_id, action, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.actorUserId, value.entityType, value.entityId, value.action, encodeJson(value.metadata), encodeDate(timestamp))); return value; }
  async listAuditEvents(entityType: AuditEntityType, entityId: string) { const result = await this.db.prepare('SELECT * FROM audit_events WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').bind(entityType, entityId).all<Row>(); return result.results.map(auditFromRow); }
  async createNotification(input: CreateNotificationInput) { const timestamp = now(); const value: Notification = { ...input, id: id('notification'), createdAt: timestamp }; await run(this.db.prepare('INSERT INTO notifications (id, user_id, order_id, type, created_at) VALUES (?, ?, ?, ?, ?)').bind(value.id, value.userId, value.orderId, value.type, encodeDate(timestamp))); return value; }
  async listNotificationsByUser(userId: string) { const result = await this.db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all<Row>(); return result.results.map(notificationFromRow); }
  async findPaymentById(paymentId: string) { const row = await this.db.prepare('SELECT * FROM payments WHERE id = ? LIMIT 1').bind(paymentId).first<Row>(); return row ? paymentFromRow(row) : null; }
  async findPaymentByOrderId(orderId: string) { const row = await this.db.prepare('SELECT * FROM payments WHERE order_id = ? LIMIT 1').bind(orderId).first<Row>(); return row ? paymentFromRow(row) : null; }
  async findPaymentByProviderPaymentId(providerPaymentId: string) { const row = await this.db.prepare('SELECT * FROM payments WHERE provider_payment_id = ? LIMIT 1').bind(providerPaymentId).first<Row>(); return row ? paymentFromRow(row) : null; }
  async findPaymentByIdempotencyKey(buyerId: string, key: string) { const row = await this.db.prepare('SELECT * FROM payments WHERE buyer_id = ? AND idempotency_key = ? LIMIT 1').bind(buyerId, key).first<Row>(); return row ? paymentFromRow(row) : null; }
  async createPayment(input: CreatePaymentInput) { const existing = await this.findPaymentByIdempotencyKey(input.buyerId, input.idempotencyKey); if (existing) return existing; const timestamp = now(); const value: Payment = { ...input, id: id('payment'), providerPaymentId: input.providerPaymentId ?? null, createdAt: timestamp, updatedAt: timestamp }; try { await run(this.db.prepare('INSERT INTO payments (id, order_id, buyer_id, vendor_id, amount_paise, currency, state, provider, provider_payment_id, idempotency_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.orderId, value.buyerId, value.vendorId, value.amountPaise, value.currency, value.state, value.provider, value.providerPaymentId, value.idempotencyKey, encodeDate(timestamp), encodeDate(timestamp))); } catch (error) { const retry = await this.findPaymentByIdempotencyKey(input.buyerId, input.idempotencyKey); if (retry) return retry; throw error; } return value; }
  async updatePayment(paymentId: string, patch: Partial<Payment>) { const current = await this.findPaymentById(paymentId); if (!current) return null; const updated = { ...current, ...patch, id: paymentId, updatedAt: now() }; await run(this.db.prepare('UPDATE payments SET state = ?, provider_payment_id = ?, updated_at = ? WHERE id = ?').bind(updated.state, updated.providerPaymentId ?? null, encodeDate(updated.updatedAt), paymentId)); return updated; }
  async findWebhookEvent(provider: string, providerEventId: string) { const row = await this.db.prepare('SELECT * FROM payment_webhook_events WHERE provider = ? AND provider_event_id = ? LIMIT 1').bind(provider, providerEventId).first<Row>(); return row ? webhookEventFromRow(row) : null; }
  async createWebhookEvent(input: CreatePaymentWebhookEventInput) { const existing = await this.findWebhookEvent(input.provider, input.providerEventId); if (existing) return existing; const timestamp = now(); const value: PaymentWebhookEvent = { ...input, id: id('payment-event'), processedAt: input.processedAt ?? null, createdAt: timestamp }; try { await run(this.db.prepare('INSERT INTO payment_webhook_events (id, provider, provider_event_id, event_type, payload_hash, processed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.provider, value.providerEventId, value.eventType, value.payloadHash, value.processedAt ? encodeDate(value.processedAt) : null, encodeDate(timestamp))); } catch (error) { const retry = await this.findWebhookEvent(input.provider, input.providerEventId); if (retry) return retry; throw error; } return value; }
}
