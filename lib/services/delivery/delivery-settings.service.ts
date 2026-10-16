import type { DeliverySettings } from './delivery-rules';
import type { DeliverySettingsInput } from './delivery-input';

const SETTINGS_COLUMNS = 'delivery_enabled, delivery_radius_km, delivery_min_order, delivery_fee, delivery_lat, delivery_lng, upi_id, business_name, name';

const num = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Maps a businesses row to the terms the checks use. Missing or null columns fall back to "no delivery". */
export function settingsFromRow(row: Record<string, any> | null | undefined): DeliverySettings {
  const lat = row?.delivery_lat == null ? null : num(row.delivery_lat);
  const lng = row?.delivery_lng == null ? null : num(row.delivery_lng);
  return {
    enabled: Boolean(row?.delivery_enabled),
    radiusKm: num(row?.delivery_radius_km, 5),
    minOrder: num(row?.delivery_min_order),
    fee: num(row?.delivery_fee),
    venue: lat !== null && lng !== null ? { lat, lng } : null,
  };
}

/** The venue's delivery terms as the database has them now. Read on every delivery order; the order is never trusted with them. */
export async function loadDeliverySettings(db: any, businessId: string): Promise<DeliverySettings> {
  const { data, error } = await db.from('businesses').select(SETTINGS_COLUMNS).eq('id', businessId).maybeSingle();
  if (error) throw error;
  return settingsFromRow(data);
}

/** Saves the owner's delivery terms. The caller has already checked the owner and parsed the input. */
export async function saveDeliverySettings(db: any, businessId: string, input: DeliverySettingsInput): Promise<void> {
  const { error } = await db.from('businesses').update({
    delivery_enabled: input.enabled,
    delivery_radius_km: input.radiusKm,
    delivery_min_order: input.minOrder,
    delivery_fee: input.fee,
    delivery_lat: input.venue?.lat ?? null,
    delivery_lng: input.venue?.lng ?? null,
  }).eq('id', businessId);
  if (error) throw error;
}

/** The public part of the terms, for the guest's cart: nothing here is private (the UPI ID is printed on the bill anyway). */
export function publicDeliveryTerms(row: Record<string, any> | null | undefined) {
  const settings = settingsFromRow(row);
  return {
    enabled: settings.enabled && settings.venue !== null,
    radius_km: settings.radiusKm,
    min_order: settings.minOrder,
    fee: settings.fee,
    upi_id: row?.upi_id || null,
    business_name: row?.business_name || row?.name || 'Venue',
  };
}

export async function loadPublicDeliveryTerms(db: any, businessId: string) {
  const { data, error } = await db.from('businesses').select(SETTINGS_COLUMNS).eq('id', businessId).maybeSingle();
  if (error) throw error;
  return publicDeliveryTerms(data);
}
