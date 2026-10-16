import type { VendorInput } from './vendor-input';

const COLUMNS = 'id, name, category, whatsapp_phone, qr_image, notes, created_at, updated_at';

export async function listVendors(db: any, businessId: string) {
  const { data, error } = await db.from('venue_vendors').select(COLUMNS).eq('business_id', businessId).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function createVendor(db: any, businessId: string, input: VendorInput) {
  const { data, error } = await db.from('venue_vendors').insert({ ...input, business_id: businessId }).select(COLUMNS).single();
  if (error) throw error;
  return data;
}

/** Edits only the host's own vendor; null when it is not theirs or no longer exists. */
export async function updateVendor(db: any, businessId: string, id: string, patch: Partial<VendorInput>) {
  const { data, error } = await db.from('venue_vendors').update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id).eq('business_id', businessId).select(COLUMNS).maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteVendor(db: any, businessId: string, id: string): Promise<boolean> {
  const { data, error } = await db.from('venue_vendors').delete().eq('id', id).eq('business_id', businessId).select('id');
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** The host's guest orders from the last two days, newest first, for sharing with a vendor. Cancelled ones are left out. */
export async function recentOrdersToShare(db: any, businessId: string) {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db.from('orders')
    .select('id, table_number, customer_name, customer_phone, delivery_address, items, created_at, status, grand_total')
    .eq('business_id', businessId).gte('created_at', since).not('status', 'in', '("cancelled","CANCELLED")')
    .order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return data ?? [];
}
