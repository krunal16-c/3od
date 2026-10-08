export type MarketingEventName = 'rfq_form_viewed' | 'rfq_submitted';

type MarketingEvent = {
  event: MarketingEventName;
  source?: string;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/** Sends aggregate funnel signals only; never include emails, files, tokens, or private RFQ details. */
export function trackMarketingEvent(event: MarketingEventName, source?: string) {
  if (typeof window === 'undefined') return;

  const payload: MarketingEvent = { event, ...(source ? { source } : {}) };
  window.dataLayer?.push(payload);
  window.dispatchEvent(new CustomEvent('3od:marketing', { detail: payload }));
}
