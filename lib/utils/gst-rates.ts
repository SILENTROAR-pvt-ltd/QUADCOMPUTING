// Single source of GST rates for POS, accommodations, dining, and receipts.
// Under Indian GST Council Mandates (Notification No. 11/2017 & 03/2022-Central Tax (Rate)):
// 1. Restaurant Food & Beverage: 5% (standalone without ITC)
// 2. Accommodations / Room Tariffs:
//    - Declared tariff <= ₹7,500/night: 12%
//    - Declared tariff > ₹7,500/night: 18%
// 3. Support Services, Room Add-ons, and ad-hoc charges: 18%
// Venue-specific rates can still be overridden per catalog item via metadata.tax_rate.

export const FOOD_GST_RATE = 0.05;
export const SERVICE_GST_RATE = 0.18;
export const ACCOMMODATION_LOW_GST_RATE = 0.12;  // <= ₹7,500 per day/unit
export const ACCOMMODATION_HIGH_GST_RATE = 0.18; // > ₹7,500 per day/unit
export const ACCOMMODATION_GST_THRESHOLD = 7500; // ₹7,500 threshold per GST Council

/** Standard Accounting Code (SAC) under GST */
export const SAC_CODES = {
  FOOD_AND_BEVERAGE: '996331',
  ACCOMMODATION_TIER1: '996311', // <= 7,500
  ACCOMMODATION_TIER2: '996311', // > 7,500
  SERVICES_GENERAL: '999799',
} as const;

export function accommodationGstRate(tariffPerNight: number): number {
  if (!Number.isFinite(tariffPerNight) || tariffPerNight <= 0) return ACCOMMODATION_HIGH_GST_RATE;
  return tariffPerNight <= ACCOMMODATION_GST_THRESHOLD ? ACCOMMODATION_LOW_GST_RATE : ACCOMMODATION_HIGH_GST_RATE;
}

const FOOD_TYPES = new Set(['food', 'food_beverage', 'beverage', 'drink']);
const ROOM_TYPES = new Set(['room', 'room_accommodation', 'accommodation']);

export function defaultGstRate(item: {
  item_type?: string | null;
  kind?: string | null;
  category?: string | null;
  price?: number | { amountMinor?: number } | unknown;
}): number {
  const type = (item.item_type || item.kind || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  if (FOOD_TYPES.has(type) || item.category === 'F&B') return FOOD_GST_RATE;

  if (ROOM_TYPES.has(type) || cat.includes('accommodation') || cat === 'rooms') {
    let rawPrice: number | null = null;
    if (typeof item.price === 'number') {
      rawPrice = item.price;
    } else if (item.price && typeof (item.price as any).amountMinor === 'number') {
      rawPrice = (item.price as any).amountMinor / 100;
    }
    if (rawPrice !== null && Number.isFinite(rawPrice)) {
      return accommodationGstRate(rawPrice);
    }
  }

  return SERVICE_GST_RATE;
}


/** "5%", or "5% + 18%" when a bill mixes rates. */
export function formatGstRates(rates: number[]): string {
  const unique = Array.from(new Set(rates.filter((r) => Number.isFinite(r) && r > 0).map((r) => Math.round(r * 10000) / 100)))
    .sort((a, b) => a - b);
  return unique.length ? unique.map((r) => `${r}%`).join(' + ') : '0%';
}

