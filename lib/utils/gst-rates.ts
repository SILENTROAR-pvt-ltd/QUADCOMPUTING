// Single source of GST rates for POS and receipts.
// Restaurant food & beverage is billed at 5% (the same rate the guest QR order
// pipeline charges — lib/utils/qr-session.ts); services, room add-ons and ad-hoc
// charges at 18%. Venue-specific rates can still be set per catalog item via
// metadata.tax_rate (lib/services/catalog/catalog-formatter.util.ts).
export const FOOD_GST_RATE = 0.05;
export const SERVICE_GST_RATE = 0.18;

const FOOD_TYPES = new Set(['food', 'food_beverage', 'beverage', 'drink']);

export function defaultGstRate(item: { item_type?: string | null; kind?: string | null; category?: string | null }): number {
  const type = (item.item_type || item.kind || '').toLowerCase();
  if (FOOD_TYPES.has(type) || item.category === 'F&B') return FOOD_GST_RATE;
  return SERVICE_GST_RATE;
}

/** "5%", or "5% + 18%" when a bill mixes rates. */
export function formatGstRates(rates: number[]): string {
  const unique = Array.from(new Set(rates.filter((r) => Number.isFinite(r) && r > 0).map((r) => Math.round(r * 10000) / 100)))
    .sort((a, b) => a - b);
  return unique.length ? unique.map((r) => `${r}%`).join(' + ') : '0%';
}
