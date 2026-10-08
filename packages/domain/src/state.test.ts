import { describe, expect, it } from 'vitest';
import {
  OrderStatus,
  QuoteState,
  RfqState,
  transitionOrder,
  transitionQuote,
  transitionRfq,
} from './state';

describe('RFQ state transitions', () => {
  it('allows a submitted RFQ to open for quotes and then receive quotes', () => {
    expect(transitionRfq(RfqState.SUBMITTED, RfqState.OPEN_FOR_QUOTES)).toBe(
      RfqState.OPEN_FOR_QUOTES,
    );
    expect(
      transitionRfq(RfqState.OPEN_FOR_QUOTES, RfqState.QUOTES_RECEIVED),
    ).toBe(RfqState.QUOTES_RECEIVED);
  });

  it('forbids a cancelled RFQ from reopening', () => {
    expect(() =>
      transitionRfq(RfqState.CANCELLED, RfqState.OPEN_FOR_QUOTES),
    ).toThrow('Invalid RFQ state transition');
  });
});

describe('order state transitions', () => {
  it('allows a vendor to move an accepted order through production and shipping', () => {
    expect(transitionOrder(OrderStatus.ACCEPTED, OrderStatus.AWAITING_PAYMENT)).toBe(OrderStatus.AWAITING_PAYMENT);
    expect(transitionOrder(OrderStatus.AWAITING_PAYMENT, OrderStatus.IN_PRODUCTION)).toBe(OrderStatus.IN_PRODUCTION);
    expect(transitionOrder(OrderStatus.IN_PRODUCTION, OrderStatus.QUALITY_CHECK)).toBe(OrderStatus.QUALITY_CHECK);
    expect(transitionOrder(OrderStatus.QUALITY_CHECK, OrderStatus.SHIPPED)).toBe(OrderStatus.SHIPPED);
  });

  it('allows delivery confirmation and dispute entry but rejects invalid jumps', () => {
    expect(transitionOrder(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(OrderStatus.DELIVERED);
    expect(transitionOrder(OrderStatus.DELIVERED, OrderStatus.DISPUTED)).toBe(OrderStatus.DISPUTED);
    expect(() => transitionOrder(OrderStatus.ACCEPTED, OrderStatus.SHIPPED)).toThrow('Invalid order state transition');
  });
});

describe('quote state transitions', () => {
  it('allows a submitted quote to become visible and accepted', () => {
    expect(transitionQuote(QuoteState.SUBMITTED, QuoteState.VISIBLE_TO_BUYER)).toBe(
      QuoteState.VISIBLE_TO_BUYER,
    );
    expect(
      transitionQuote(QuoteState.VISIBLE_TO_BUYER, QuoteState.ACCEPTED),
    ).toBe(QuoteState.ACCEPTED);
  });

  it('forbids an expired quote from being accepted', () => {
    expect(() =>
      transitionQuote(QuoteState.EXPIRED, QuoteState.ACCEPTED),
    ).toThrow('Invalid quote state transition');
  });
});
