import type { Session, User } from '@3od/domain';
import type { MarketplaceRepository } from '../db/types.js';

export const SESSION_COOKIE = '3od_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export function createSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  let binary = '';
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function parseSessionCookie(header: string | null | undefined): string | null {
  const value = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return value ? value.slice(SESSION_COOKIE.length + 1) || null : null;
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.displayName ?? user.email,
    role: user.role === 'PRINTER_OWNER' ? 'printer_owner' as const : 'buyer' as const,
  };
}

export async function authenticate(request: Request, repository: MarketplaceRepository): Promise<{ session: Session; user: User } | null> {
  const token = parseSessionCookie(request.headers.get('Cookie'));
  if (!token) return null;
  const session = await repository.findSessionByTokenHash(await hashSessionToken(token));
  if (!session) return null;
  const user = await repository.findUserById(session.userId);
  return user ? { session, user } : null;
}
