import type {
  AuditEntityType,
  AuditEvent,
  Printer,
  Quote,
  Rfq,
  RfqFile,
  Session,
  User,
  VendorContact,
  VendorProfile,
} from '@3od/domain';
import type {
  CreateAuditEventInput,
  CreatePrinterInput,
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

type Row = Record<string, unknown>;

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date();
const rows = async <T>(statement: D1PreparedStatementLike) => statement.all<Row>().then((result) => result.results.map((row) => rowTo<T>(row)));
const run = async (statement: D1PreparedStatementLike) => statement.run();

function rowTo<T>(row: Row): T {
  return row as T;
}

function userFromRow(row: Row): User {
  return { id: String(row.id), email: String(row.email), passwordHash: String(row.password_hash), role: row.role as User['role'], displayName: row.display_name === null ? null : String(row.display_name), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function sessionFromRow(row: Row): Session {
  return { id: String(row.id), userId: String(row.user_id), tokenHash: String(row.token_hash), expiresAt: decodeDate(row.expires_at), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function vendorFromRow(row: Row): VendorProfile {
  return { id: String(row.id), userId: String(row.user_id), slug: String(row.slug), businessName: String(row.business_name), bio: row.bio === null ? null : String(row.bio), city: row.city === null ? null : String(row.city), state: row.state === null ? null : String(row.state), serviceAreas: decodeStringArray(row.service_areas), isPublished: decodeBoolean(row.is_published), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function printerFromRow(row: Row): Printer {
  return { id: String(row.id), vendorId: String(row.vendor_id), name: String(row.name), model: row.model === null ? null : String(row.model), technologies: decodeStringArray(row.technologies), materials: decodeStringArray(row.materials), minOrderQuantity: Number(row.min_order_quantity), isActive: decodeBoolean(row.is_active), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function contactFromRow(row: Row): VendorContact {
  return { id: String(row.id), vendorId: String(row.vendor_id), buyerId: String(row.buyer_id), message: String(row.message), phone: row.phone === null ? null : String(row.phone), status: row.status as VendorContact['status'], createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function rfqFromRow(row: Row): Rfq {
  return { id: String(row.id), buyerId: String(row.buyer_id), idempotencyKey: String(row.idempotency_key), title: String(row.title), state: row.state as Rfq['state'], description: row.description === null ? null : String(row.description), quantity: row.quantity === null ? null : Number(row.quantity), material: row.material === null ? null : String(row.material), finish: row.finish === null ? null : String(row.finish), deadline: row.deadline === null ? null : decodeDate(row.deadline), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function fileFromRow(row: Row): RfqFile {
  return { id: String(row.id), rfqId: String(row.rfq_id), storageKey: String(row.storage_key), originalFilename: String(row.original_filename), contentType: String(row.content_type), byteSize: Number(row.byte_size), state: row.state as RfqFile['state'], createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function quoteFromRow(row: Row): Quote {
  return { id: String(row.id), rfqId: String(row.rfq_id), supplierId: String(row.supplier_id), state: row.state as Quote['state'], totalAmountInr: Number(row.total_amount_inr), currency: 'INR', deliveryDate: row.delivery_date === null ? null : decodeDate(row.delivery_date), expiresAt: row.expires_at === null ? null : decodeDate(row.expires_at), notes: row.notes === null ? null : String(row.notes), createdAt: decodeDate(row.created_at), updatedAt: decodeDate(row.updated_at) };
}

function auditFromRow(row: Row): AuditEvent {
  return { id: String(row.id), actorUserId: row.actor_user_id === null ? null : String(row.actor_user_id), entityType: row.entity_type as AuditEntityType, entityId: String(row.entity_id), action: String(row.action), metadata: decodeJson(row.metadata), createdAt: decodeDate(row.created_at) };
}

export class D1MarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async findUserByEmail(email: string) { const statement = this.db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email.trim().toLowerCase()); const row = await statement.first<Row>(); return row ? userFromRow(row) : null; }
  async findUserById(userId: string) { const row = await this.db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(userId).first<Row>(); return row ? userFromRow(row) : null; }
  async createUser(input: CreateUserInput) { const timestamp = now(); const value: User = { ...input, id: id('user'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO users (id, email, password_hash, role, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.email.trim().toLowerCase(), value.passwordHash, value.role, value.displayName, encodeDate(timestamp), encodeDate(timestamp))); return value; }

  async findSessionByTokenHash(tokenHash: string) { const row = await this.db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1').bind(tokenHash, encodeDate(now())).first<Row>(); return row ? sessionFromRow(row) : null; }
  async createSession(input: CreateSessionInput) { const timestamp = now(); const value: Session = { ...input, id: id('session'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(value.id, value.userId, value.tokenHash, encodeDate(value.expiresAt), encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async deleteSession(sessionId: string) { const result = await run(this.db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId)); return (result.meta?.changes ?? 0) > 0; }

  async findRfqById(rfqId: string) { const row = await this.db.prepare('SELECT * FROM rfqs WHERE id = ? LIMIT 1').bind(rfqId).first<Row>(); return row ? rfqFromRow(row) : null; }
  async findRfqByBuyerAndIdempotencyKey(buyerId: string, key: string) { const row = await this.db.prepare('SELECT * FROM rfqs WHERE buyer_id = ? AND idempotency_key = ? LIMIT 1').bind(buyerId, key).first<Row>(); return row ? rfqFromRow(row) : null; }
  async createRfq(input: CreateRfqInput) { const existing = await this.findRfqByBuyerAndIdempotencyKey(input.buyerId, input.idempotencyKey); if (existing) return existing; const timestamp = now(); const value: Rfq = { ...input, id: id('rfq'), createdAt: timestamp, updatedAt: timestamp }; try { await run(this.db.prepare('INSERT INTO rfqs (id, buyer_id, idempotency_key, title, state, description, quantity, material, finish, deadline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.buyerId, value.idempotencyKey, value.title, value.state, value.description, value.quantity, value.material, value.finish, value.deadline ? encodeDate(value.deadline) : null, encodeDate(timestamp), encodeDate(timestamp))); } catch (error) { const retry = await this.findRfqByBuyerAndIdempotencyKey(input.buyerId, input.idempotencyKey); if (retry) return retry; throw error; } return value; }
  async listRfqsByBuyer(buyerId: string) { return rows<Rfq>(this.db.prepare('SELECT * FROM rfqs WHERE buyer_id = ? ORDER BY created_at DESC').bind(buyerId)).then((items) => items.map((row) => rfqFromRow(row as unknown as Row))); }
  async listOpenRfqs() { return rows<Rfq>(this.db.prepare("SELECT * FROM rfqs WHERE state = 'OPEN_FOR_QUOTES' ORDER BY created_at DESC")).then((items) => items.map((row) => rfqFromRow(row as unknown as Row))); }
  async updateRfq(rfqId: string, patch: Partial<Rfq>) { const current = await this.findRfqById(rfqId); if (!current) return null; const updated = { ...current, ...patch, id: rfqId, updatedAt: now() }; await run(this.db.prepare('UPDATE rfqs SET state = ?, description = ?, quantity = ?, material = ?, finish = ?, deadline = ?, updated_at = ? WHERE id = ?').bind(updated.state, updated.description, updated.quantity, updated.material, updated.finish, updated.deadline ? encodeDate(updated.deadline) : null, encodeDate(updated.updatedAt), rfqId)); return updated; }

  async findQuoteById(quoteId: string) { const row = await this.db.prepare('SELECT * FROM quotes WHERE id = ? LIMIT 1').bind(quoteId).first<Row>(); return row ? quoteFromRow(row) : null; }
  async listQuotesByRfq(rfqId: string) { const result = await this.db.prepare('SELECT * FROM quotes WHERE rfq_id = ? ORDER BY created_at DESC').bind(rfqId).all<Row>(); return result.results.map(quoteFromRow); }
  async createQuote(input: CreateQuoteInput) { const timestamp = now(); const value: Quote = { ...input, id: id('quote'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO quotes (id, rfq_id, supplier_id, state, total_amount_inr, currency, delivery_date, expires_at, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.rfqId, value.supplierId, value.state, value.totalAmountInr, value.currency, value.deliveryDate ? encodeDate(value.deliveryDate) : null, value.expiresAt ? encodeDate(value.expiresAt) : null, value.notes, encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async updateQuote(quoteId: string, patch: Partial<Quote>) { const current = await this.findQuoteById(quoteId); if (!current) return null; const updated = { ...current, ...patch, id: quoteId, updatedAt: now() }; await run(this.db.prepare('UPDATE quotes SET state = ?, total_amount_inr = ?, delivery_date = ?, expires_at = ?, notes = ?, updated_at = ? WHERE id = ?').bind(updated.state, updated.totalAmountInr, updated.deliveryDate ? encodeDate(updated.deliveryDate) : null, updated.expiresAt ? encodeDate(updated.expiresAt) : null, updated.notes, encodeDate(updated.updatedAt), quoteId)); return updated; }

  async createRfqFile(input: CreateRfqFileInput) { const timestamp = now(); const value: RfqFile = { ...input, id: id('rfq-file'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO rfq_files (id, rfq_id, storage_key, original_filename, content_type, byte_size, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.rfqId, value.storageKey, value.originalFilename, value.contentType, value.byteSize, value.state, encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async listRfqFilesByRfq(rfqId: string) { const result = await this.db.prepare('SELECT * FROM rfq_files WHERE rfq_id = ? ORDER BY created_at ASC').bind(rfqId).all<Row>(); return result.results.map(fileFromRow); }

  async findVendorProfileByUserId(userId: string) { const row = await this.db.prepare('SELECT * FROM vendor_profiles WHERE user_id = ? LIMIT 1').bind(userId).first<Row>(); return row ? vendorFromRow(row) : null; }
  async findVendorProfileBySlug(slug: string) { const row = await this.db.prepare('SELECT * FROM vendor_profiles WHERE slug = ? AND is_published = 1 LIMIT 1').bind(slug).first<Row>(); return row ? vendorFromRow(row) : null; }
  async upsertVendorProfile(input: CreateVendorProfileInput) { const existing = await this.findVendorProfileByUserId(input.userId); const timestamp = now(); const value: VendorProfile = { ...input, id: existing?.id ?? id('vendor'), createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO vendor_profiles (id, user_id, slug, business_name, bio, city, state, service_areas, is_published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET slug = excluded.slug, business_name = excluded.business_name, bio = excluded.bio, city = excluded.city, state = excluded.state, service_areas = excluded.service_areas, is_published = excluded.is_published, updated_at = excluded.updated_at').bind(value.id, value.userId, value.slug, value.businessName, value.bio, value.city, value.state, encodeStringArray(value.serviceAreas), encodeBoolean(value.isPublished), encodeDate(value.createdAt), encodeDate(value.updatedAt))); return value; }
  async listPrintersByVendor(vendorId: string) { const result = await this.db.prepare('SELECT * FROM printers WHERE vendor_id = ? AND is_active = 1 ORDER BY created_at DESC').bind(vendorId).all<Row>(); return result.results.map(printerFromRow); }
  async createPrinter(input: CreatePrinterInput) { const timestamp = now(); const value: Printer = { ...input, id: id('printer'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO printers (id, vendor_id, name, model, technologies, materials, min_order_quantity, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.vendorId, value.name, value.model, encodeStringArray(value.technologies), encodeStringArray(value.materials), value.minOrderQuantity, encodeBoolean(value.isActive), encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async createVendorContact(input: CreateVendorContactInput) { const timestamp = now(); const value: VendorContact = { ...input, id: id('contact'), createdAt: timestamp, updatedAt: timestamp }; await run(this.db.prepare('INSERT INTO vendor_contacts (id, vendor_id, buyer_id, message, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.vendorId, value.buyerId, value.message, value.phone, value.status, encodeDate(timestamp), encodeDate(timestamp))); return value; }
  async listVendorContacts(vendorId: string) { const result = await this.db.prepare('SELECT * FROM vendor_contacts WHERE vendor_id = ? ORDER BY created_at DESC, rowid DESC').bind(vendorId).all<Row>(); return result.results.map(contactFromRow); }

  async createAuditEvent(input: CreateAuditEventInput) { const timestamp = now(); const value: AuditEvent = { ...input, id: id('audit'), createdAt: timestamp }; await run(this.db.prepare('INSERT INTO audit_events (id, actor_user_id, entity_type, entity_id, action, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(value.id, value.actorUserId, value.entityType, value.entityId, value.action, encodeJson(value.metadata), encodeDate(timestamp))); return value; }
  async listAuditEvents(entityType: AuditEntityType, entityId: string) { const result = await this.db.prepare('SELECT * FROM audit_events WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').bind(entityType, entityId).all<Row>(); return result.results.map(auditFromRow); }
}
