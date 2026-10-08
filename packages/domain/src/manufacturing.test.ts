import { describe, expect, it } from 'vitest';
import { canVendorQuoteProcess, getManufacturingProcess, hasEnabledCapability, isEnabledManufacturingProcess, validateManufacturingRequest } from './manufacturing.js';

describe('manufacturing process catalog', () => {
  it('exposes only 3D printing as enabled until later capabilities are launched', () => {
    expect(isEnabledManufacturingProcess('3d_printing')).toBe(true);
    expect(isEnabledManufacturingProcess('cnc_milling')).toBe(false);
    expect(getManufacturingProcess('cnc_milling')?.availability).toBe('coming_next');
  });

  it('requires process-specific engineering fields when a process is enabled', () => {
    expect(validateManufacturingRequest({ process: '3d_printing' })).toEqual({ ok: true });
    expect(validateManufacturingRequest({ process: 'cnc_milling', material: 'Aluminium', tolerance: '±0.1 mm' })).toMatchObject({ ok: false, code: 'PROCESS_NOT_AVAILABLE' });
  });

  it('matches only enabled vendor capabilities', () => {
    expect(hasEnabledCapability(['3d_printing'])).toBe(true);
    expect(hasEnabledCapability(['cnc_milling'])).toBe(false);
    expect(canVendorQuoteProcess(['3d_printing'], '3d_printing')).toBe(true);
    expect(canVendorQuoteProcess(['3d_printing'], 'cnc_milling')).toBe(false);
  });
});
