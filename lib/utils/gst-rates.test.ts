import { describe, it, expect } from 'vitest';
import { defaultGstRate, formatGstRates, FOOD_GST_RATE, SERVICE_GST_RATE } from './gst-rates';

describe('GST rates', () => {
  it('bills food at the same 5% the guest QR order pipeline charges', () => {
    expect(defaultGstRate({ item_type: 'food' })).toBe(FOOD_GST_RATE);
    expect(defaultGstRate({ kind: 'food_beverage' })).toBe(0.05);
    expect(defaultGstRate({ category: 'F&B' })).toBe(0.05);
  });

  it('bills services, rooms and unknown items at 18%', () => {
    expect(defaultGstRate({ item_type: 'service' })).toBe(SERVICE_GST_RATE);
    expect(defaultGstRate({ kind: 'accommodation' })).toBe(0.18);
    expect(defaultGstRate({})).toBe(0.18);
  });

  it('labels the rates actually applied instead of a fixed 18%', () => {
    expect(formatGstRates([0.05, 0.05])).toBe('5%');
    expect(formatGstRates([0.18, 0.05])).toBe('5% + 18%');
    expect(formatGstRates([])).toBe('0%');
  });
});
