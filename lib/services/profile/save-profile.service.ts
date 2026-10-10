import { randomUUID } from 'node:crypto';
import type { ProfileInput } from './profile-input';

// Columns added by migration 20261010000010; without it they are left out and the rest still saves.
const NEW_COLUMNS = ['legal_name', 'registration_type', 'pan_number', 'fssai_number', 'contact_phone', 'checkin_time', 'checkout_time'];
const missingColumn = (e: any) => e && ['42703', 'PGRST204'].includes(e.code);

type Saved = { ok: true; needsUpdate: boolean } | { ok: false; status: number; error: string };

/** Saves the owner, the venue (with banking and locks) and its address. PINs are never touched here. */
export async function saveProfile(supabase: any, userId: string, businessId: string, p: ProfileInput): Promise<Saved> {
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId, role: 'host', ...p.owner, categories_handled: p.venueTypes, offers_accommodation: p.offersAccommodation,
  }, { onConflict: 'id' });
  if (profileErr) throw profileErr;

  const update = (values: Record<string, unknown>) => supabase.from('businesses').update(values)
    .eq('id', businessId).eq('host_id', userId).select('id');
  let res = await update(p.venue);
  let needsUpdate = false;
  if (missingColumn(res.error)) {
    needsUpdate = true;
    res = await update(Object.fromEntries(Object.entries(p.venue).filter(([k]) => !NEW_COLUMNS.includes(k))));
  }
  if (res.error) throw res.error;
  if (!res.data?.length) return { ok: false, status: 404, error: 'Venue not found for your account. Nothing was saved.' };

  const { data: loc, error: locErr } = await supabase.from('locations').select('id').eq('business_id', businessId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (locErr) throw locErr;
  const location = { ...p.location, branch_name: p.venue.business_name };
  const { error: writeErr } = loc
    ? await supabase.from('locations').update(location).eq('id', loc.id)
    : await supabase.from('locations').insert({ ...location, business_id: businessId, qr_code_hash: `qr_${randomUUID().slice(0, 12)}` });
  if (writeErr) throw writeErr;

  return { ok: true, needsUpdate };
}
