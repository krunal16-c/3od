export enum PaymentState {
  CREATED = 'CREATED',
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUND_PENDING = 'REFUND_PENDING',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

const paymentTransitions: Record<PaymentState, readonly PaymentState[]> = {
  [PaymentState.CREATED]: [PaymentState.REQUIRES_ACTION, PaymentState.CANCELLED, PaymentState.FAILED],
  [PaymentState.REQUIRES_ACTION]: [PaymentState.AUTHORIZED, PaymentState.FAILED, PaymentState.CANCELLED],
  [PaymentState.AUTHORIZED]: [PaymentState.CAPTURED, PaymentState.FAILED, PaymentState.CANCELLED],
  [PaymentState.CAPTURED]: [PaymentState.REFUND_PENDING],
  [PaymentState.FAILED]: [],
  [PaymentState.REFUND_PENDING]: [PaymentState.PARTIALLY_REFUNDED, PaymentState.REFUNDED, PaymentState.FAILED],
  [PaymentState.PARTIALLY_REFUNDED]: [PaymentState.REFUND_PENDING, PaymentState.REFUNDED],
  [PaymentState.REFUNDED]: [],
  [PaymentState.CANCELLED]: [],
};

export function transitionPayment(current: PaymentState, next: PaymentState): PaymentState {
  if (!paymentTransitions[current].includes(next)) {
    throw new Error(`Invalid payment state transition: ${current} -> ${next}`);
  }
  return next;
}

/** Payment must be confirmed by the API/webhook flow before production begins. */
export function canStartProduction(paymentState: PaymentState, paymentRequired: boolean): boolean {
  return !paymentRequired || paymentState === PaymentState.CAPTURED;
}

export interface SettlementInput {
  grossAmountPaise: number;
  platformFeeBasisPoints: number;
  gstOnPlatformFeeBasisPoints: number;
}

export interface SettlementBreakdown {
  currency: 'INR';
  grossAmountPaise: number;
  platformFeePaise: number;
  gstOnPlatformFeePaise: number;
  vendorPayoutPaise: number;
}

function validateBasisPoints(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`${fieldName} must be between 0 and 10000 basis points`);
  }
}

export function calculateSettlement(input: SettlementInput): SettlementBreakdown {
  if (!Number.isSafeInteger(input.grossAmountPaise) || input.grossAmountPaise < 0) {
    throw new Error('gross amount must be a non-negative integer in paise');
  }
  validateBasisPoints(input.platformFeeBasisPoints, 'platform fee');
  validateBasisPoints(input.gstOnPlatformFeeBasisPoints, 'GST on platform fee');

  const grossAmount = BigInt(input.grossAmountPaise);
  const platformFeePaise = Number((grossAmount * BigInt(input.platformFeeBasisPoints)) / 10_000n);
  const gstOnPlatformFeePaise = Number(
    (BigInt(platformFeePaise) * BigInt(input.gstOnPlatformFeeBasisPoints)) / 10_000n,
  );
  const vendorPayoutPaise = input.grossAmountPaise - platformFeePaise - gstOnPlatformFeePaise;
  if (![platformFeePaise, gstOnPlatformFeePaise, vendorPayoutPaise].every(Number.isSafeInteger)) {
    throw new Error('settlement exceeds safe integer range');
  }

  return {
    currency: 'INR',
    grossAmountPaise: input.grossAmountPaise,
    platformFeePaise,
    gstOnPlatformFeePaise,
    vendorPayoutPaise,
  };
}
