import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { AppModule } from './main.js';

describe('API Nest module', () => {
  it('compiles through Nest testing utilities', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();

    expect(module).toBeDefined();
    await module.close();
  });
});
