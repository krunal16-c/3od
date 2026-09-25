export type ApiMode = 'api' | 'demo';
export type ApiRole = 'buyer' | 'printer_owner';

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: ApiRole;
};

export type SignupInput = {
  email: string;
  password: string;
  name: string;
  role: ApiRole;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type CreateRfqInput = {
  title: string;
  material?: string;
  finish?: string;
  quantity: number;
  neededBy?: string;
  notes?: string;
};

export type AuthResponse = { user: ApiUser };
export type CreateRfqResponse = { rfq: { id: string } };
export type UploadIntentResponse = { uploadUrl: string; key: string; expiresInSeconds: number };

type ApiErrorPayload = {
  statusCode?: unknown;
  code?: unknown;
  message?: unknown;
  requestId?: unknown;
  details?: unknown;
};

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(payload: { statusCode: number; code: string; message: string; requestId?: string; details?: unknown }) {
    super(payload.message);
    this.name = 'ApiClientError';
    this.statusCode = payload.statusCode;
    this.code = payload.code;
    this.requestId = payload.requestId;
    this.details = payload.details;
  }
}

export const apiMode: ApiMode = process.env.NEXT_PUBLIC_API_MODE === 'demo' ? 'demo' : 'api';

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, init: { method: string; body?: unknown; headers?: Record<string, string> }): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: init.method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    const payload = isRecord(body) ? body as ApiErrorPayload : {};
    throw new ApiClientError({
      statusCode: typeof payload.statusCode === 'number' ? payload.statusCode : response.status,
      code: typeof payload.code === 'string' ? payload.code : 'HTTP_ERROR',
      message: typeof payload.message === 'string' ? payload.message : `Request failed with status ${response.status}.`,
      requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined,
      details: payload.details,
    });
  }

  return body as T;
}

export function signup(input: SignupInput) {
  return request<AuthResponse>('/auth/signup', { method: 'POST', body: input });
}

export function login(input: LoginInput) {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: input });
}

export function createRfq(input: CreateRfqInput, idempotencyKey: string) {
  return request<CreateRfqResponse>('/rfqs', {
    method: 'POST',
    body: input,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function createUploadIntent(rfqId: string, file: File) {
  return request<UploadIntentResponse>(`/rfqs/${encodeURIComponent(rfqId)}/upload-intent`, {
    method: 'POST',
    body: { fileName: file.name, contentType: file.type || 'application/octet-stream', byteSize: file.size },
  });
}

export async function uploadDesign(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!response.ok) throw new ApiClientError({ statusCode: response.status, code: 'UPLOAD_FAILED', message: 'The design file could not be uploaded. Please try again.' });
}

export function dashboardPathForUser(user: Pick<ApiUser, 'role'>) {
  return user.role === 'buyer' ? '/dashboard/buyer' : '/dashboard/owner';
}
