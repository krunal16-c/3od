export type NodeEnvironment = 'development' | 'test' | 'production';

export interface WorkerEnv {
  APP_ORIGIN?: string;
  NODE_ENV?: string;
  SESSION_SECRET?: string;
  DB?: D1Database;
  FILES?: R2Bucket;
}

export interface ValidatedWorkerEnv {
  APP_ORIGIN: string;
  NODE_ENV: NodeEnvironment;
  SESSION_SECRET: string;
  DB: D1Database;
  FILES: R2Bucket;
}

export class EnvironmentError extends Error {
  readonly statusCode = 500;
  readonly code = 'INVALID_ENVIRONMENT';

  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

export function validateEnvironment(environment: WorkerEnv): ValidatedWorkerEnv {
  const nodeEnvironment = environment.NODE_ENV ?? 'development';

  if (!isNodeEnvironment(nodeEnvironment)) {
    throw new EnvironmentError('NODE_ENV must be development, test, or production');
  }

  if (!environment.APP_ORIGIN || !isHttpOrigin(environment.APP_ORIGIN)) {
    throw new EnvironmentError('APP_ORIGIN must be a valid HTTP or HTTPS origin');
  }

  if (!environment.SESSION_SECRET || environment.SESSION_SECRET.length < 32) {
    throw new EnvironmentError('SESSION_SECRET must be at least 32 characters');
  }

  if (!environment.DB) {
    throw new EnvironmentError('DB binding is required');
  }

  if (!environment.FILES) {
    throw new EnvironmentError('FILES binding is required');
  }

  return {
    APP_ORIGIN: environment.APP_ORIGIN,
    NODE_ENV: nodeEnvironment,
    SESSION_SECRET: environment.SESSION_SECRET,
    DB: environment.DB,
    FILES: environment.FILES,
  };
}

function isNodeEnvironment(value: string): value is NodeEnvironment {
  return value === 'development' || value === 'test' || value === 'production';
}

function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
  } catch {
    return false;
  }
}
