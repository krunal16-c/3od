export enum RfqState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  OPEN_FOR_QUOTES = 'OPEN_FOR_QUOTES',
  QUOTES_RECEIVED = 'QUOTES_RECEIVED',
  QUOTE_SELECTED = 'QUOTE_SELECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum QuoteState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VISIBLE_TO_BUYER = 'VISIBLE_TO_BUYER',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum OrderStatus {
  ACCEPTED = 'ACCEPTED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  IN_PRODUCTION = 'IN_PRODUCTION',
  QUALITY_CHECK = 'QUALITY_CHECK',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

const rfqTransitions: Record<RfqState, readonly RfqState[]> = {
  [RfqState.DRAFT]: [RfqState.SUBMITTED, RfqState.CANCELLED],
  [RfqState.SUBMITTED]: [
    RfqState.OPEN_FOR_QUOTES,
    RfqState.REJECTED,
    RfqState.CANCELLED,
  ],
  [RfqState.OPEN_FOR_QUOTES]: [
    RfqState.QUOTES_RECEIVED,
    RfqState.EXPIRED,
    RfqState.CANCELLED,
  ],
  [RfqState.QUOTES_RECEIVED]: [
    RfqState.QUOTE_SELECTED,
    RfqState.EXPIRED,
    RfqState.CANCELLED,
  ],
  [RfqState.QUOTE_SELECTED]: [],
  [RfqState.EXPIRED]: [],
  [RfqState.CANCELLED]: [],
  [RfqState.REJECTED]: [],
};

const quoteTransitions: Record<QuoteState, readonly QuoteState[]> = {
  [QuoteState.DRAFT]: [QuoteState.SUBMITTED],
  [QuoteState.SUBMITTED]: [QuoteState.VISIBLE_TO_BUYER],
  [QuoteState.VISIBLE_TO_BUYER]: [
    QuoteState.ACCEPTED,
    QuoteState.REJECTED,
    QuoteState.EXPIRED,
  ],
  [QuoteState.ACCEPTED]: [],
  [QuoteState.REJECTED]: [],
  [QuoteState.EXPIRED]: [],
};

const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.ACCEPTED]: [OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.AWAITING_PAYMENT]: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
  [OrderStatus.IN_PRODUCTION]: [OrderStatus.QUALITY_CHECK, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
  [OrderStatus.QUALITY_CHECK]: [OrderStatus.SHIPPED, OrderStatus.IN_PRODUCTION, OrderStatus.DISPUTED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.DISPUTED],
  [OrderStatus.DELIVERED]: [OrderStatus.DISPUTED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.DISPUTED]: [],
};

export function transitionRfq(current: RfqState, next: RfqState): RfqState {
  if (!rfqTransitions[current].includes(next)) {
    throw new Error(`Invalid RFQ state transition: ${current} -> ${next}`);
  }
  return next;
}

export function transitionQuote(current: QuoteState, next: QuoteState): QuoteState {
  if (!quoteTransitions[current].includes(next)) {
    throw new Error(`Invalid quote state transition: ${current} -> ${next}`);
  }
  return next;
}

export function transitionOrder(current: OrderStatus, next: OrderStatus): OrderStatus {
  if (!orderTransitions[current].includes(next)) {
    throw new Error(`Invalid order state transition: ${current} -> ${next}`);
  }
  return next;
}
