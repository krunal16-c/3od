import { describe, expect, it } from 'vitest';
import { demoAccounts, demoPrinters, demoRfqs, demoVendorProfile } from './demo-seed-data.js';

describe('demo marketplace seed', () => {
  it('contains safe synthetic buyer and vendor credentials', () => {
    expect(demoAccounts.buyer.email).toBe('buyer.demo@3od.in');
    expect(demoAccounts.vendor.email).toBe('vendor.demo@3od.in');
    expect(demoAccounts.buyer.password).not.toBe(demoAccounts.vendor.password);
    expect(demoAccounts.buyer.password).toContain('Demo');
  });

  it('contains a publishable vendor profile, MOQ printers, and RFQs', () => {
    expect(demoVendorProfile.slug).toBe('demo-maker-studio');
    expect(demoPrinters).toHaveLength(3);
    expect(demoPrinters.every((printer) => printer.minOrderQuantity > 0)).toBe(true);
    expect(demoRfqs).toHaveLength(3);
    expect(demoRfqs.every((rfq) => rfq.quantity > 0 && rfq.idempotencyKey.startsWith('demo-'))).toBe(true);
  });
});
