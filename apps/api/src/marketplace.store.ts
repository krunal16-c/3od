import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Quote, Rfq, RfqFile, Session, User, UserRole } from '@3od/domain';
import { QuoteState, RfqState } from '@3od/domain';

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateSessionInput = Omit<Session, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateRfqInput = Omit<Rfq, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateQuoteInput = Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateRfqFileInput = Omit<RfqFile, 'id' | 'createdAt' | 'updatedAt'>;

export abstract class MarketplaceStore {
  abstract findUserByEmail(email: string): Promise<User | null>;
  abstract findUserById(id: string): Promise<User | null>;
  abstract createUser(input: CreateUserInput): Promise<User>;
  abstract findSessionByToken(token: string): Promise<Session | null>;
  abstract createSession(input: CreateSessionInput): Promise<Session>;
  abstract deleteSession(id: string): Promise<boolean>;
  abstract findRfqById(id: string): Promise<Rfq | null>;
  abstract findRfqByBuyerAndIdempotencyKey(buyerId: string, key: string): Promise<Rfq | null>;
  abstract createRfq(input: CreateRfqInput): Promise<Rfq>;
  abstract listRfqsByBuyer(buyerId: string): Promise<readonly Rfq[]>;
  abstract listOpenRfqs(): Promise<readonly Rfq[]>;
  abstract updateRfq(id: string, patch: Partial<Rfq>): Promise<Rfq | null>;
  abstract findQuoteById(id: string): Promise<Quote | null>;
  abstract listQuotesByRfq(rfqId: string): Promise<readonly Quote[]>;
  abstract createQuote(input: CreateQuoteInput): Promise<Quote>;
  abstract updateQuote(id: string, patch: Partial<Quote>): Promise<Quote | null>;
  abstract createRfqFile(input: CreateRfqFileInput): Promise<RfqFile>;
}

@Injectable()
export class InMemoryMarketplaceStore extends MarketplaceStore {
  private readonly users = new Map<string, User>();
  private readonly sessions = new Map<string, Session>();
  private readonly rfqs = new Map<string, Rfq>();
  private readonly quotes = new Map<string, Quote>();
  private readonly files = new Map<string, RfqFile>();
  private sequence = 0;

  private nextId(prefix: string) { return `${prefix}-${++this.sequence}`; }
  async findUserByEmail(email: string) { const normalized = email.trim().toLowerCase(); return [...this.users.values()].find((user) => user.email === normalized) ?? null; }
  async findUserById(id: string) { return this.users.get(id) ?? null; }
  async createUser(input: CreateUserInput) { const now = new Date(); const user = { ...input, id: this.nextId('user'), createdAt: now, updatedAt: now }; this.users.set(user.id, user); return user; }
  async findSessionByToken(token: string) { const session = [...this.sessions.values()].find((candidate) => candidate.tokenHash === hashToken(token)) ?? null; return session && session.expiresAt > new Date() ? session : null; }
  async createSession(input: CreateSessionInput) { const now = new Date(); const session = { ...input, id: this.nextId('session'), createdAt: now, updatedAt: now }; this.sessions.set(session.id, session); return session; }
  async deleteSession(id: string) { return this.sessions.delete(id); }
  async findRfqById(id: string) { return this.rfqs.get(id) ?? null; }
  async findRfqByBuyerAndIdempotencyKey(buyerId: string, key: string) { return [...this.rfqs.values()].find((rfq) => rfq.buyerId === buyerId && rfq.idempotencyKey === key) ?? null; }
  async createRfq(input: CreateRfqInput) { const existing = await this.findRfqByBuyerAndIdempotencyKey(input.buyerId, input.idempotencyKey); if (existing) return existing; const now = new Date(); const rfq = { ...input, id: this.nextId('rfq'), createdAt: now, updatedAt: now }; this.rfqs.set(rfq.id, rfq); return rfq; }
  async listRfqsByBuyer(buyerId: string) { return [...this.rfqs.values()].filter((rfq) => rfq.buyerId === buyerId); }
  async listOpenRfqs() { return [...this.rfqs.values()].filter((rfq) => rfq.state === RfqState.OPEN_FOR_QUOTES); }
  async updateRfq(id: string, patch: Partial<Rfq>) { const current = this.rfqs.get(id); if (!current) return null; const updated = { ...current, ...patch, updatedAt: new Date() }; this.rfqs.set(id, updated); return updated; }
  async findQuoteById(id: string) { return this.quotes.get(id) ?? null; }
  async listQuotesByRfq(rfqId: string) { return [...this.quotes.values()].filter((quote) => quote.rfqId === rfqId); }
  async createQuote(input: CreateQuoteInput) { const existing = [...this.quotes.values()].find((quote) => quote.rfqId === input.rfqId && quote.supplierId === input.supplierId && quote.state !== QuoteState.REJECTED); if (existing) return existing; const now = new Date(); const quote = { ...input, id: this.nextId('quote'), createdAt: now, updatedAt: now }; this.quotes.set(quote.id, quote); return quote; }
  async updateQuote(id: string, patch: Partial<Quote>) { const current = this.quotes.get(id); if (!current) return null; const updated = { ...current, ...patch, updatedAt: new Date() }; this.quotes.set(id, updated); return updated; }
  async createRfqFile(input: CreateRfqFileInput) { const now = new Date(); const file = { ...input, id: this.nextId('rfq-file'), createdAt: now, updatedAt: now }; this.files.set(file.id, file); return file; }
}

export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
export function verifyPassword(password: string, encoded: string) { const [salt, expected] = encoded.split(':'); if (!salt || !expected) return false; const actual = scryptSync(password, salt, 64).toString('hex'); const actualBuffer = Buffer.from(actual, 'hex'); const expectedBuffer = Buffer.from(expected, 'hex'); return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer); }
export function publicUser(user: User) { return { id: user.id, email: user.email, name: user.displayName, role: roleForApi(user.role) }; }
export function roleForApi(role: UserRole) { return role === 'PRINTER_OWNER' ? 'printer_owner' : role === 'ADMIN' ? 'admin' : 'buyer'; }
export function roleForDomain(role: 'buyer' | 'printer_owner') { return role === 'printer_owner' ? 'PRINTER_OWNER' : 'BUYER'; }
