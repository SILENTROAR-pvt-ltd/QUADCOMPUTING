import { invalidateTablesCache } from './get-tables.service';
import { cleanZone, matchZone } from './table-zones';

/**
 * Saving a table's zone (migration 20261018000003 adds the column). Until that migration is applied the column does not
 * exist, and naming it would fail the whole save: so the column is probed once (and again after a minute), and without it
 * a table is still created or changed, only its zone is left out, which the caller reports as `zone_saved: false`.
 */
let unavailableUntil = 0;

export async function zoneColumnAvailable(supabase: any): Promise<boolean> {
  if (Date.now() < unavailableUntil) return false;
  const { error } = await supabase.from('restaurant_tables').select('zone').limit(1);
  if (error) { unavailableUntil = Date.now() + 60_000; return false; }
  return true;
}

/** The zone to store for what was typed: the spelling the venue already uses, or null for none. */
export async function resolveZone(supabase: any, businessId: string, input: unknown): Promise<string | null> {
  if (!cleanZone(input)) return null;
  const { data } = await supabase.from('restaurant_tables').select('zone').eq('business_id', businessId).not('zone', 'is', null);
  return matchZone(input, (data ?? []).map((r: any) => r.zone));
}

/** Renames a zone for every table in it (or merges it into another zone; an empty name removes the zone from them). */
export async function renameZone(supabase: any, businessId: string, from: unknown, to: unknown): Promise<{ success: true; renamed: number; zone_saved: boolean }> {
  const old = cleanZone(from);
  if (!old) throw new Error('zone to rename is required');
  if (!(await zoneColumnAvailable(supabase))) return { success: true, renamed: 0, zone_saved: false };
  const target = await resolveZone(supabase, businessId, to);
  const { data, error } = await supabase.from('restaurant_tables').update({ zone: target }).eq('business_id', businessId).eq('zone', old).select('id');
  if (error) throw new Error(`Failed to rename the zone: ${error.message}`);
  invalidateTablesCache(businessId);
  return { success: true, renamed: data?.length ?? 0, zone_saved: true };
}
