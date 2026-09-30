import { QuoteState, RfqState } from './state';

export type UserRole = 'BUYER' | 'PRINTER_OWNER' | 'ADMIN';
export type VendorContactStatus = 'NEW' | 'READ' | 'REPLIED' | 'CLOSED';
export type RfqFileState = 'PENDING' | 'VALIDATED' | 'REJECTED';
export type AuditEntityType = 'USER' | 'SESSION' | 'RFQ' | 'RFQ_FILE' | 'QUOTE';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  displayName: string | null;
  emailVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorProfile {
  id: string;
  userId: string;
  slug: string;
  businessName: string;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  serviceAreas: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Printer {
  id: string;
  vendorId: string;
  name: string;
  model?: string | null;
  technologies: string[];
  materials: string[];
  minOrderQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorContact {
  id: string;
  vendorId: string;
  buyerId: string;
  message: string;
  phone?: string | null;
  status: VendorContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rfq {
  id: string;
  buyerId: string;
  idempotencyKey: string;
  title: string;
  state: RfqState;
  description?: string | null;
  quantity?: number | null;
  material?: string | null;
  finish?: string | null;
  deadline?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RfqFile {
  id: string;
  rfqId: string;
  storageKey: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  state: RfqFileState;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quote {
  id: string;
  rfqId: string;
  supplierId: string;
  state: QuoteState;
  totalAmountInr: number;
  currency: 'INR';
  deliveryDate?: Date | null;
  expiresAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEvent {
  id: string;
  actorUserId?: string | null;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type CreateInput<T extends { id: string }> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface Repository<T extends { id: string }, Create extends Partial<T> = Partial<T>> {
  findById(id: string): Promise<T | null>;
  list(): Promise<readonly T[]>;
  create(input: Create): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
}

export interface UserRepository extends Repository<User, CreateInput<User>> {
  findByEmail(email: string): Promise<User | null>;
}

export interface SessionRepository extends Repository<Session, CreateInput<Session>> {
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  deleteById(id: string): Promise<boolean>;
}

export interface RfqRepository extends Repository<Rfq, CreateInput<Rfq>> {
  findByBuyerId(buyerId: string): Promise<readonly Rfq[]>;
  findByBuyerIdAndIdempotencyKey(
    buyerId: string,
    idempotencyKey: string,
  ): Promise<Rfq | null>;
}

export interface RfqFileRepository extends Repository<RfqFile, CreateInput<RfqFile>> {
  findByRfqId(rfqId: string): Promise<readonly RfqFile[]>;
}

export interface QuoteRepository extends Repository<Quote, CreateInput<Quote>> {
  findByRfqId(rfqId: string): Promise<readonly Quote[]>;
  findBySupplierId(supplierId: string): Promise<readonly Quote[]>;
}

export interface AuditEventRepository
  extends Repository<AuditEvent, CreateInput<AuditEvent>> {
  findByEntity(entityType: AuditEntityType, entityId: string): Promise<readonly AuditEvent[]>;
}

class InMemoryRepository<
  T extends { id: string },
  Create extends Partial<T> = Partial<T>,
> implements Repository<T, Create>
{
  protected readonly records = new Map<string, T>();
  private nextId = 1;

  async findById(id: string): Promise<T | null> {
    return this.records.get(id) ?? null;
  }

  async list(): Promise<readonly T[]> {
    return [...this.records.values()];
  }

  async create(input: Create): Promise<T> {
    const now = new Date();
    const record = {
      ...input,
      id: `memory-${this.nextId++}`,
      createdAt: now,
      updatedAt: now,
    } as unknown as T;
    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    const existing = this.records.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  async count(): Promise<number> {
    return this.records.size;
  }
}

export class InMemoryUserRepository
  extends InMemoryRepository<User, CreateInput<User>>
  implements UserRepository
{
  async findByEmail(email: string): Promise<User | null> {
    return [...this.records.values()].find((user) => user.email === email) ?? null;
  }
}

export class InMemorySessionRepository
  extends InMemoryRepository<Session, CreateInput<Session>>
  implements SessionRepository
{
  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return [...this.records.values()].find((session) => session.tokenHash === tokenHash) ?? null;
  }

  async deleteById(id: string): Promise<boolean> {
    return this.records.delete(id);
  }
}

export class InMemoryRfqRepository
  extends InMemoryRepository<Rfq, CreateInput<Rfq>>
  implements RfqRepository
{
  override async create(input: CreateInput<Rfq>): Promise<Rfq> {
    const existing = await this.findByBuyerIdAndIdempotencyKey(
      input.buyerId,
      input.idempotencyKey,
    );
    return existing ?? super.create(input);
  }

  async findByBuyerId(buyerId: string): Promise<readonly Rfq[]> {
    return [...this.records.values()].filter((rfq) => rfq.buyerId === buyerId);
  }

  async findByBuyerIdAndIdempotencyKey(
    buyerId: string,
    idempotencyKey: string,
  ): Promise<Rfq | null> {
    return (
      [...this.records.values()].find(
        (rfq) => rfq.buyerId === buyerId && rfq.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }
}

export class InMemoryRfqFileRepository
  extends InMemoryRepository<RfqFile, CreateInput<RfqFile>>
  implements RfqFileRepository
{
  async findByRfqId(rfqId: string): Promise<readonly RfqFile[]> {
    return [...this.records.values()].filter((file) => file.rfqId === rfqId);
  }
}

export class InMemoryQuoteRepository
  extends InMemoryRepository<Quote, CreateInput<Quote>>
  implements QuoteRepository
{
  async findByRfqId(rfqId: string): Promise<readonly Quote[]> {
    return [...this.records.values()].filter((quote) => quote.rfqId === rfqId);
  }

  async findBySupplierId(supplierId: string): Promise<readonly Quote[]> {
    return [...this.records.values()].filter((quote) => quote.supplierId === supplierId);
  }
}

export class InMemoryAuditEventRepository
  extends InMemoryRepository<AuditEvent, CreateInput<AuditEvent>>
  implements AuditEventRepository
{
  async findByEntity(
    entityType: AuditEntityType,
    entityId: string,
  ): Promise<readonly AuditEvent[]> {
    return [...this.records.values()].filter(
      (event) => event.entityType === entityType && event.entityId === entityId,
    );
  }
}
