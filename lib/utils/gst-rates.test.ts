import { describe, it, expect } from 'vitest';
import {
  defaultGstRate,
  formatGstRates,
  accommodationGstRate,
  FOOD_GST_RATE,
  SERVICE_GST_RATE,
  ACCOMMODATION_LOW_GST_RATE,
  ACCOMMODATION_HIGH_GST_RATE,
  SAC_CODES,
} from './gst-rates';

describe('GST rates', () => {
  it('bills food at the same 5% the guest QR order pipeline charges', () => {
    expect(defaultGstRate({ item_type: 'food' })).toBe(FOOD_GST_RATE);
    expect(defaultGstRate({ kind: 'food_beverage' })).toBe(0.05);
    expect(defaultGstRate({ category: 'F&B' })).toBe(0.05);
  });

  it('bills services, rooms and unknown items at 18% when price is not specified', () => {
    expect(defaultGstRate({ item_type: 'service' })).toBe(SERVICE_GST_RATE);
    expect(defaultGstRate({ kind: 'accommodation' })).toBe(0.18);
    expect(defaultGstRate({})).toBe(0.18);
  });

  it('enforces GST Council dual-slab room tariffs: 12% for <= 7500, 18% for > 7500', () => {
    expect(accommodationGstRate(5000)).toBe(ACCOMMODATION_LOW_GST_RATE);
    expect(accommodationGstRate(7500)).toBe(ACCOMMODATION_LOW_GST_RATE);
    expect(accommodationGstRate(7501)).toBe(ACCOMMODATION_HIGH_GST_RATE);
    expect(accommodationGstRate(12000)).toBe(ACCOMMODATION_HIGH_GST_RATE);

    expect(defaultGstRate({ kind: 'accommodation', price: 4500 })).toBe(0.12);
    expect(defaultGstRate({ kind: 'accommodation', price: 7500 })).toBe(0.12);
    expect(defaultGstRate({ kind: 'accommodation', price: 9000 })).toBe(0.18);
    expect(defaultGstRate({ item_type: 'room', price: 6000 })).toBe(0.12);
    expect(defaultGstRate({ item_type: 'room', price: 10000 })).toBe(0.18);
  });

  it('labels the rates actually applied instead of a fixed 18%', () => {
    expect(formatGstRates([0.05, 0.05])).toBe('5%');
    expect(formatGstRates([0.18, 0.05])).toBe('5% + 18%');
    expect(formatGstRates([0.12, 0.05])).toBe('5% + 12%');
    expect(formatGstRates([])).toBe('0%');
  });

  it('provides official SAC codes for GST invoicing', () => {
    expect(SAC_CODES.FOOD_AND_BEVERAGE).toBe('996331');
    expect(SAC_CODES.ACCOMMODATION_TIER1).toBe('996311');
    expect(SAC_CODES.ACCOMMODATION_TIER2).toBe('996311');
  });
});

