/**
 * Delivery terms the host sets in My profile, and the check every delivery order passes against them.
 * Pure: no database and no clock, so the radius, minimum order and fee rules can be unit tested on their own.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeliverySettings {
  enabled: boolean;
  radiusKm: number;
  /** Items total before GST that a delivery order must reach. 0 means no minimum. */
  minOrder: number;
  /** Flat delivery fee added to the bill. 0 means free delivery. */
  fee: number;
  /** The venue's own location. Without it the radius cannot be checked, so delivery is refused. */
  venue: LatLng | null;
}

export type DeliveryRefusalCode =
  | 'DELIVERY_OFF'
  | 'DELIVERY_NO_VENUE_LOCATION'
  | 'DELIVERY_OUT_OF_RANGE'
  | 'DELIVERY_BELOW_MINIMUM';

export type DeliveryQuote =
  | { ok: true; distanceKm: number; fee: number }
  | { ok: false; code: DeliveryRefusalCode; message: string; distanceKm: number | null };

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres (haversine). Accurate to well under a metre at delivery-radius scales. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rupees to paise, so amounts are compared as whole paise and never by float rounding. */
const paise = (rupees: number) => Math.round(rupees * 100);

/**
 * Checks a delivery order against the venue's terms, in this order: delivery on, venue located, inside the radius,
 * at or above the minimum items total. Distance is compared before rounding, so a guest exactly on the radius is in.
 * The fee is the venue's flat fee, whatever the client sent.
 */
export function quoteDelivery(settings: DeliverySettings, guest: LatLng, itemsSubtotal: number): DeliveryQuote {
  if (!settings.enabled) {
    return { ok: false, code: 'DELIVERY_OFF', message: 'This venue is not taking delivery orders right now.', distanceKm: null };
  }
  if (!settings.venue) {
    return {
      ok: false, code: 'DELIVERY_NO_VENUE_LOCATION', distanceKm: null,
      message: 'This venue has not set its delivery location yet, so delivery cannot be checked. Please order at the table.',
    };
  }

  const exactKm = haversineKm(settings.venue, guest);
  const distanceKm = Math.round(exactKm * 100) / 100;
  if (exactKm > settings.radiusKm) {
    return {
      ok: false, code: 'DELIVERY_OUT_OF_RANGE', distanceKm,
      message: `Sorry, we deliver within ${settings.radiusKm} km. Your address is about ${distanceKm} km away.`,
    };
  }

  if (settings.minOrder > 0 && paise(itemsSubtotal) < paise(settings.minOrder)) {
    return {
      ok: false, code: 'DELIVERY_BELOW_MINIMUM', distanceKm,
      message: `Delivery needs at least ₹${settings.minOrder} of food. Add a little more to your order.`,
    };
  }

  return { ok: true, distanceKm, fee: Math.round(Math.max(0, settings.fee) * 100) / 100 };
}

/** Where a delivery sits in its life. The host moves an order forward only; delivered is the last stage. */
export const DELIVERY_STATUSES = ['received', 'preparing', 'out_for_delivery', 'delivered'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  received: 'Received',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

export function isDeliveryStatus(value: unknown): value is DeliveryStatus {
  return typeof value === 'string' && (DELIVERY_STATUSES as readonly string[]).includes(value);
}

/** True when `to` is a later stage than `from`. Equal or earlier stages are refused. */
export function canAdvanceDelivery(from: DeliveryStatus | null | undefined, to: DeliveryStatus): boolean {
  const fromIndex = from ? DELIVERY_STATUSES.indexOf(from) : -1;
  return DELIVERY_STATUSES.indexOf(to) > fromIndex;
}
