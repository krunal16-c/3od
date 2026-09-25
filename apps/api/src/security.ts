export type SecurityEnvironment = {
  NODE_ENV: 'development' | 'test' | 'production';
  WEB_ORIGINS: string[];
};

export function getSecurityOptions(env: SecurityEnvironment) {
  return {
    cors: {
      origin: env.WEB_ORIGINS,
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    },
    rateLimit: {
      max: env.NODE_ENV === 'production' ? 100 : 300,
      timeWindow: '1 minute',
      allowList: [],
      addHeaders: true,
    },
  } as const;
}
