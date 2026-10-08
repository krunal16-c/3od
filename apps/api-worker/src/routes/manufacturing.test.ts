import { describe, expect, it } from 'vitest';
import { createApp } from '../http.js';

describe('manufacturing process routes', () => {
  it('returns process availability without presenting future processes as enabled', async () => {
    const response = await createApp().request('/manufacturing/processes', {}, {
      APP_ORIGIN: 'https://app.3od.example',
      NODE_ENV: 'test',
      SESSION_SECRET: 'worker-session-secret-that-is-long-enough',
      DB: {} as D1Database,
      FILES: {} as R2Bucket,
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as { processes: Array<{ id: string; availability: string }> };
    expect(payload.processes.find((process) => process.id === '3d_printing')?.availability).toBe('enabled');
    expect(payload.processes.find((process) => process.id === 'cnc_milling')?.availability).toBe('coming_next');
    expect(payload.processes.find((process) => process.id === 'injection_molding')?.availability).toBe('planned');
  });
});
