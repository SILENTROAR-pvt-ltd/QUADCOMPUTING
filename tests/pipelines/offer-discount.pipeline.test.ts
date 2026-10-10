import { describe, it, expect } from 'vitest';
import { offerDiscount } from '@/lib/services/offers/offer-discount';

describe('Live offers at the till: badge to bill discount', () => {
  it('reads a percentage badge', () => {
    expect(offerDiscount('50% OFF')).toEqual({ type: 'percentage', value: 50 });
    expect(offerDiscount('12.5% off second cup')).toEqual({ type: 'percentage', value: 12.5 });
  });

  it('reads a flat rupee badge', () => {
    expect(offerDiscount('₹100 OFF')).toEqual({ type: 'flat', value: 100 });
  });

  it('leaves badges with no amount to the host', () => {
    expect(offerDiscount('Happy Hour')).toBeNull();
    expect(offerDiscount('1+1 Free')).toBeNull();
    expect(offerDiscount('150% OFF')).toBeNull();
    expect(offerDiscount('₹0 OFF')).toBeNull();
  });
});
