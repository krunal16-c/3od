import { describe, expect, it } from 'vitest';
import { getServerEnv } from './server.js';

const productionEnv = {
  NODE_ENV: 'production',
  API_PORT: '4000',
  DATABASE_URL: 'postgresql://db.example.test:5432/3od',
  APP_ORIGIN: 'https://app.example.test',
  WEB_ORIGINS: 'https://app.example.test,https://www.example.test',
  SESSION_SECRET: 'a'.repeat(32),
  R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  R2_BUCKET: '3od-production',
  R2_ACCESS_KEY_ID: 'access-key',
  R2_SECRET_ACCESS_KEY: 'secret-key',
};

describe('server environment', () => {
  it('rejects production startup when required security and storage settings are missing', () => {
    expect(() => getServerEnv({ NODE_ENV: 'production' })).toThrow();
  });

  it('provides safe local defaults outside production', () => {
    expect(getServerEnv({ NODE_ENV: 'development' })).toMatchObject({
      APP_ORIGIN: 'http://localhost:3000',
      WEB_ORIGINS: expect.arrayContaining(['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:3002']),
      SESSION_SECRET: expect.any(String),
    });
  });

  it('normalizes an explicit production allowlist', () => {
    expect(getServerEnv(productionEnv)).toMatchObject({
      APP_ORIGIN: 'https://app.example.test',
      WEB_ORIGINS: ['https://app.example.test', 'https://www.example.test'],
    });
  });

  it('rejects a production wildcard origin and short session secret', () => {
    expect(() =>
      getServerEnv({
        ...productionEnv,
        WEB_ORIGINS: '*',
        SESSION_SECRET: 'too-short',
      }),
    ).toThrow();
  });
});
