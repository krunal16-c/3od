import { describe, expect, it } from 'vitest';
import {
  PaymentState,
  calculateSettlement,
  canStartProduction,
  transitionPayment,
} from './payment-state.js';

describe('payment state', () => {
  it('only allows server-confirmed capture to unlock production', () => {
    expect(canStartProduction(PaymentState.CAPTURED, true)).toBe(true);
    expect(canStartProduction(PaymentState.AUTHORIZED, true)).toBe(false);
    expect(canStartProduction(PaymentState.FAILED, true)).toBe(false);
    expect(canStartProduction(PaymentState.FAILED, false)).toBe(true);
  });

  it('rejects impossible payment transitions', () => {
    expect(transitionPayment(PaymentState.CREATED, PaymentState.REQUIRES_ACTION)).toBe(
      PaymentState.REQUIRES_ACTION,
    );
    expect(() => transitionPayment(PaymentState.CREATED, PaymentState.CAPTURED)).toThrow(
      'Invalid payment state transition',
    );
    expect(() => transitionPayment(PaymentState.REFUNDED, PaymentState.CAPTURED)).toThrow();
  });

  it('calculates an integer INR settlement with a GST-ready fee breakdown', () => {
    expect(
      calculateSettlement({
        grossAmountPaise: 100_000,
        platformFeeBasisPoints: 500,
        gstOnPlatformFeeBasisPoints: 1800,
      }),
    ).toEqual({
      currency: 'INR',
      grossAmountPaise: 100_000,
      platformFeePaise: 5_000,
      gstOnPlatformFeePaise: 900,
      vendorPayoutPaise: 94_100,
    });
  });

  it('rejects unsafe fee configuration and amounts', () => {
    expect(() =>
      calculateSettlement({
        grossAmountPaise: 1_000,
        platformFeeBasisPoints: 10_001,
        gstOnPlatformFeeBasisPoints: 0,
      }),
    ).toThrow('basis points');
    expect(() =>
      calculateSettlement({
        grossAmountPaise: -1,
        platformFeeBasisPoints: 500,
        gstOnPlatformFeeBasisPoints: 1800,
      }),
    ).toThrow('gross amount');
  });
});
