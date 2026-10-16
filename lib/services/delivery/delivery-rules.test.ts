import { describe, expect, it } from 'vitest';
import { canAdvanceDelivery, haversineKm, quoteDelivery, type DeliverySettings, type LatLng } from './delivery-rules';
import { newDeliveryTableNumber, parseDeliveryRequest, parseDeliverySettingsInput } from './delivery-input';

const VENUE: LatLng = { lat: 12.9716, lng: 77.5946 };
const EARTH_RADIUS_KM = 6371;

/** The point `km` kilometres due north of `from` (haversine distance back to `from` is exactly `km`). */
const northOf = (from: LatLng, km: number): LatLng => ({ lat: from.lat + (km / EARTH_RADIUS_KM) * (180 / Math.PI), lng: from.lng });

/** The HTTP status an input check throws with, or null when it passes. */
const statusOf = (fn: () => unknown): number | null => {
  try {
    fn();
    return null;
  } catch (err: any) {
    return err.status ?? -1;
  }
};

const terms = (over: Partial<DeliverySettings> = {}): DeliverySettings => ({
  enabled: true, radiusKm: 5, minOrder: 300, fee: 40, venue: VENUE, ...over,
});

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(VENUE, VENUE)).toBe(0);
  });

  it('measures a due-north offset exactly', () => {
    expect(haversineKm(VENUE, northOf(VENUE, 10))).toBeCloseTo(10, 6);
  });

  it('is symmetric', () => {
    const other = northOf(VENUE, 3.7);
    expect(haversineKm(VENUE, other)).toBeCloseTo(haversineKm(other, VENUE), 9);
  });
});

describe('quoteDelivery: radius', () => {
  it('accepts a guest well inside the radius and reports the distance', () => {
    const quote = quoteDelivery(terms(), northOf(VENUE, 2), 500);
    expect(quote).toEqual({ ok: true, distanceKm: 2, fee: 40 });
  });

  it('accepts a guest just inside the radius', () => {
    expect(quoteDelivery(terms(), northOf(VENUE, 4.999), 500).ok).toBe(true);
  });

  it('refuses a guest outside the radius, with the distance in the message', () => {
    const quote = quoteDelivery(terms(), northOf(VENUE, 7.5), 500);
    expect(quote.ok).toBe(false);
    if (quote.ok) return;
    expect(quote.code).toBe('DELIVERY_OUT_OF_RANGE');
    expect(quote.distanceKm).toBe(7.5);
    expect(quote.message).toContain('5 km');
  });

  it('refuses everything when delivery is switched off', () => {
    const quote = quoteDelivery(terms({ enabled: false }), northOf(VENUE, 1), 500);
    expect(quote).toMatchObject({ ok: false, code: 'DELIVERY_OFF' });
  });

  it('refuses delivery when the venue has no location, because the radius cannot be checked', () => {
    const quote = quoteDelivery(terms({ venue: null }), northOf(VENUE, 1), 500);
    expect(quote).toMatchObject({ ok: false, code: 'DELIVERY_NO_VENUE_LOCATION' });
  });

  it('checks the radius before the minimum order', () => {
    const quote = quoteDelivery(terms({ minOrder: 1000 }), northOf(VENUE, 9), 100);
    expect(quote).toMatchObject({ ok: false, code: 'DELIVERY_OUT_OF_RANGE' });
  });
});

describe('quoteDelivery: minimum order', () => {
  it('accepts an items total exactly at the minimum', () => {
    expect(quoteDelivery(terms({ minOrder: 300 }), northOf(VENUE, 1), 300).ok).toBe(true);
  });

  it('refuses an items total one paisa below the minimum', () => {
    const quote = quoteDelivery(terms({ minOrder: 300 }), northOf(VENUE, 1), 299.99);
    expect(quote).toMatchObject({ ok: false, code: 'DELIVERY_BELOW_MINIMUM' });
    if (!quote.ok) expect(quote.message).toContain('₹300');
  });

  it('has no minimum when the venue sets it to zero', () => {
    expect(quoteDelivery(terms({ minOrder: 0 }), northOf(VENUE, 1), 20).ok).toBe(true);
  });
});

describe('quoteDelivery: fee', () => {
  it('charges the venue flat fee', () => {
    const quote = quoteDelivery(terms({ fee: 40 }), northOf(VENUE, 1), 500);
    expect(quote).toMatchObject({ ok: true, fee: 40 });
  });

  it('charges nothing for free delivery', () => {
    const quote = quoteDelivery(terms({ fee: 0 }), northOf(VENUE, 1), 500);
    expect(quote).toMatchObject({ ok: true, fee: 0 });
  });

  it('rounds the fee to whole paise', () => {
    const quote = quoteDelivery(terms({ fee: 39.999 }), northOf(VENUE, 1), 500);
    expect(quote).toMatchObject({ ok: true, fee: 40 });
  });
});

describe('canAdvanceDelivery', () => {
  it('allows each step forward, starting from nothing', () => {
    expect(canAdvanceDelivery(null, 'received')).toBe(true);
    expect(canAdvanceDelivery('received', 'preparing')).toBe(true);
    expect(canAdvanceDelivery('preparing', 'out_for_delivery')).toBe(true);
    expect(canAdvanceDelivery('out_for_delivery', 'delivered')).toBe(true);
  });

  it('refuses to go back, to the same stage, or past delivered', () => {
    expect(canAdvanceDelivery('preparing', 'received')).toBe(false);
    expect(canAdvanceDelivery('preparing', 'preparing')).toBe(false);
    expect(canAdvanceDelivery('delivered', 'out_for_delivery')).toBe(false);
    expect(canAdvanceDelivery('delivered', 'delivered')).toBe(false);
  });
});

describe('parseDeliveryRequest', () => {
  const good = { address: '  12 MG Road,   Bengaluru 560001 ', phone: '+91 98765-43210', lat: 12.97, lng: 77.59, payment: 'upi' };

  it('trims the address, strips phone punctuation and maps upi to advance payment', () => {
    expect(parseDeliveryRequest(good)).toEqual({
      address: '12 MG Road, Bengaluru 560001', phone: '+919876543210', lat: 12.97, lng: 77.59, payment: 'upi_advance',
    });
  });

  it('keeps cash on delivery as cod', () => {
    expect(parseDeliveryRequest({ ...good, payment: 'cod' }).payment).toBe('cod');
  });

  it.each([
    ['a short address', { address: 'MG Road' }],
    ['a phone number that is too short', { phone: '98765' }],
    ['a latitude out of range', { lat: 95 }],
    ['a missing longitude', { lng: undefined }],
    ['an unknown payment', { payment: 'card' }],
  ])('refuses %s with a 400', (_label, patch) => {
    expect(statusOf(() => parseDeliveryRequest({ ...good, ...patch }))).toBe(400);
  });
});

describe('parseDeliverySettingsInput', () => {
  const base = { enabled: true, radiusKm: 5, minOrder: 300, fee: 40, venueLat: VENUE.lat, venueLng: VENUE.lng };

  it('reads the owner terms and the venue location', () => {
    expect(parseDeliverySettingsInput(base)).toEqual({ enabled: true, radiusKm: 5, minOrder: 300, fee: 40, venue: VENUE });
  });

  it('needs a venue location before delivery can be turned on', () => {
    expect(() => parseDeliverySettingsInput({ ...base, venueLat: undefined, venueLng: undefined })).toThrow(/location/);
  });

  it('keeps a venue location when delivery is off', () => {
    expect(parseDeliverySettingsInput({ ...base, enabled: false }).enabled).toBe(false);
  });

  it('refuses a radius outside 0.5 to 100 km, even while delivery is off', () => {
    expect(() => parseDeliverySettingsInput({ ...base, radiusKm: 0 })).toThrow(/radius/);
    expect(() => parseDeliverySettingsInput({ ...base, enabled: false, radiusKm: 250 })).toThrow(/radius/);
  });

  it('refuses a half-entered venue location', () => {
    expect(() => parseDeliverySettingsInput({ ...base, venueLng: undefined })).toThrow(/latitude and the longitude/);
  });
});

describe('newDeliveryTableNumber', () => {
  it('makes a table-style bill number that the order pipeline accepts', () => {
    const table = newDeliveryTableNumber();
    expect(table).toMatch(/^DLV-[A-Z0-9]{8}$/);
    expect(table.length).toBeLessThanOrEqual(12);
  });

  it('makes a new number each time, so deliveries never share a bill', () => {
    expect(new Set(Array.from({ length: 50 }, newDeliveryTableNumber)).size).toBe(50);
  });
});
