import { describe, expect, it } from 'vitest';
import {
  QuoteState,
  RfqState,
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
