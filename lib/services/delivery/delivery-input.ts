import { randomBytes } from 'crypto';
import type { LatLng } from './delivery-rules';

export const DELIVERY_TABLE_PREFIX = 'DLV-';

export type DeliveryPayment = 'cod' | 'upi_advance';

export interface DeliveryRequest extends LatLng {
  address: string;
  phone: string;
  payment: DeliveryPayment;
}

export interface DeliverySettingsInput {
  enabled: boolean;
  radiusKm: number;
  minOrder: number;
  fee: number;
  venue: LatLng | null;
}

const badRequest = (message: string) => Object.assign(new Error(message), { status: 400 });

const isFiniteIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const toNumber = (value: unknown): number => (typeof value === 'string' && value.trim() !== '' ? Number(value) : (value as number));

/** The address, phone and location a guest sends with a delivery order. Throws a 400 error that names the problem. */
export function parseDeliveryRequest(raw: unknown): DeliveryRequest {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const address = typeof d.address === 'string' ? d.address.trim().replace(/\s+/g, ' ') : '';
  if (address.length < 10 || address.length > 300) {
    throw badRequest('Invalid delivery address. Enter a full address (10 to 300 characters).');
  }
  const phone = typeof d.phone === 'string' ? d.phone.replace(/[\s()-]/g, '') : '';
  if (!/^\+?\d{10,13}$/.test(phone)) throw badRequest('Invalid delivery phone. Enter a 10-digit mobile number.');
  const lat = toNumber(d.lat);
  const lng = toNumber(d.lng);
  if (!isFiniteIn(lat, -90, 90) || !isFiniteIn(lng, -180, 180)) {
    throw badRequest('Invalid delivery location. Share your location so we can check the delivery range.');
  }
  if (d.payment !== 'cod' && d.payment !== 'upi') throw badRequest('Invalid payment choice. Pay on delivery or by UPI.');
  return { address, phone, lat, lng, payment: d.payment === 'upi' ? 'upi_advance' : 'cod' };
}

/** A table-style bill number for one delivery order. Random, so each delivery is its own bill and never joins another. */
export function newDeliveryTableNumber(): string {
  const token = randomBytes(6).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, 'X');
  return `${DELIVERY_TABLE_PREFIX}${token}`;
}

/** The owner's delivery terms. Each value is checked here, so the database never stores a nonsense radius or fee. */
export function parseDeliverySettingsInput(raw: unknown): DeliverySettingsInput {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const enabled = Boolean(d.enabled);
  const radiusKm = toNumber(d.radiusKm);
  const minOrder = toNumber(d.minOrder ?? 0);
  const fee = toNumber(d.fee ?? 0);
  if (!isFiniteIn(radiusKm, 0.5, 100)) throw badRequest('Delivery radius must be between 0.5 and 100 km.');
  if (!isFiniteIn(minOrder, 0, 100000)) throw badRequest('Minimum order must be between ₹0 and ₹1,00,000.');
  if (!isFiniteIn(fee, 0, 10000)) throw badRequest('Delivery fee must be between ₹0 and ₹10,000.');

  const hasLat = d.venueLat !== undefined && d.venueLat !== null && d.venueLat !== '';
  const hasLng = d.venueLng !== undefined && d.venueLng !== null && d.venueLng !== '';
  if (hasLat !== hasLng) throw badRequest('Set both the latitude and the longitude of the venue, or neither.');
  let venue: LatLng | null = null;
  if (hasLat) {
    const lat = toNumber(d.venueLat);
    const lng = toNumber(d.venueLng);
    if (!isFiniteIn(lat, -90, 90) || !isFiniteIn(lng, -180, 180)) throw badRequest('The venue location is not a valid place on the map.');
    venue = { lat, lng };
  }
  if (enabled && !venue) throw badRequest('Set the venue location before turning delivery on.');

  return { enabled, radiusKm, minOrder, fee, venue };
}
