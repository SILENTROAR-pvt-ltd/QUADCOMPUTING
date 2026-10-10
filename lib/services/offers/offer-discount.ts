// Turns a live offer's badge into a bill discount the host can apply. "50% OFF" is a percentage and
// "₹100 OFF" is a flat amount. Badges with no amount ("Happy Hour", "1+1 Free") return null, so the host
// enters the amount by hand.
export type OfferDiscount = { type: 'percentage' | 'flat'; value: number };

export function offerDiscount(badge: string): OfferDiscount | null {
  const percent = badge.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) {
    const value = Number(percent[1]);
    return value > 0 && value <= 100 ? { type: 'percentage', value } : null;
  }
  const flat = badge.match(/₹\s*(\d+(?:\.\d+)?)/);
  if (flat) {
    const value = Number(flat[1]);
    return value > 0 ? { type: 'flat', value } : null;
  }
  return null;
}
