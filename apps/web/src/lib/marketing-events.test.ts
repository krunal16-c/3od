import { afterEach, describe, expect, it } from 'vitest';
import { trackMarketingEvent } from './marketing-events';

const originalWindow = globalThis.window;
const originalCustomEvent = globalThis.CustomEvent;

afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.CustomEvent = originalCustomEvent;
});

describe('marketing events', () => {
  it('emits only an aggregate event and non-sensitive source', () => {
    const events: Event[] = [];
    const dataLayer: Array<Record<string, unknown>> = [];
    globalThis.CustomEvent = class extends Event {
      detail: unknown;

      constructor(type: string, init?: CustomEventInit) {
        super(type);
        this.detail = init?.detail;
      }
    } as unknown as typeof CustomEvent;
    globalThis.window = {
      dataLayer,
      dispatchEvent: (event: Event) => {
        events.push(event);
        return true;
      },
    } as unknown as Window & typeof globalThis;

    trackMarketingEvent('rfq_submitted', '3d-printing-india');

    expect(dataLayer).toEqual([{ event: 'rfq_submitted', source: '3d-printing-india' }]);
    expect(events).toHaveLength(1);
    expect((events[0] as CustomEvent).detail).toEqual({ event: 'rfq_submitted', source: '3d-printing-india' });
  });
});
