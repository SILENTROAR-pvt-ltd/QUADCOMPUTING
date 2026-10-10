import type { SupabaseClient } from '@supabase/supabase-js';
import type { HostProfile } from '@/types';
import type { HostWorkspaceSnapshot } from '@/lib/store/host-workspace.store';

/** Maps the host's `profiles` row (+ their venue) to the client workspace profile. */
export function toHostProfile(row: any, business: any, email?: string | null): HostProfile {
  return {
    hostId: row?.id,
    fullName: row?.full_name || '',
    displayName: row?.full_name || business?.business_name || '',
    legalEntityName: business?.business_name || row?.full_name || '',
    role: row?.role || 'host',
    phone: row?.phone || '',
    email: row?.email || email || '',
    gender: row?.gender || '',
    dob: row?.dob || '',
    bio: row?.ecosystem_statement || '',
    ecosystemStatement: row?.ecosystem_statement || undefined,
    categories: Array.isArray(row?.categories_handled) ? row.categories_handled : [],
    offersAccommodation: Boolean(row?.offers_accommodation),
  };
}

export const hostRepository = {
  /**
   * Server-side workspace snapshot. The profile used to be hard-coded to null,
   * so everything that reads it client-side (the Accommodations sidebar item,
   * the profile form's toggles, room add-ons in the catalog/POS) behaved as if
   * the host had never enabled anything.
   */
  async load(supabase?: SupabaseClient, userId?: string, business?: any, email?: string | null): Promise<HostWorkspaceSnapshot> {
    let profile: HostProfile | null = null;
    if (supabase && userId) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      profile = toHostProfile(data, business, email);
    }
    return { profile, propertyBranches: [], serviceCatalog: [], revision: 0 };
  },
};
