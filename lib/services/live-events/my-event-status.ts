// A guest's own answers from the venue on the events they asked to join: still waiting, confirmed, or declined. A guest is
// matched only by what proves it is them: their sign-in, or the request ids this phone received when it sent the requests.
// A typed phone number or email never looks a booking up.
import { UUID_REGEX } from '@/lib/auth/guest-validate';

export type LeadStatus = 'INTERESTED' | 'CONFIRMED' | 'DECLINED';
export interface MyEventStatus { lead_id: string; status: LeadStatus; party_size: number; updated_at: string | null }

const MAX_IDS = 30;
const COLUMNS = 'id, event_id, status, party_size, updated_at, created_at';

/** The request ids a phone sent, cleaned: real UUIDs only, at most 30. */
export function readLeadIds(raw: string | null): string[] {
  return Array.from(new Set(String(raw || '').split(',').map((s) => s.trim()).filter((s) => UUID_REGEX.test(s)))).slice(0, MAX_IDS);
}

/** Per event id, the guest's latest request: from the ids this phone holds, and from the signed-in guest's own key. */
export async function myEventStatuses(db: any, businessId: string, leadIds: string[], guestKey: string | null): Promise<Record<string, MyEventStatus>> {
  const reads: Array<PromiseLike<{ data: any[] | null; error: any }>> = [];
  if (leadIds.length) reads.push(db.from('event_guest_leads').select(COLUMNS).eq('business_id', businessId).in('id', leadIds));
  if (guestKey) reads.push(db.from('event_guest_leads').select(COLUMNS).eq('business_id', businessId).eq('guest_key', guestKey));
  const results = await Promise.all(reads);
  const out: Record<string, MyEventStatus> = {};
  const seenAt: Record<string, number> = {};
  for (const { data, error } of results) {
    if (error) continue;
    for (const r of data || []) {
      const at = Date.parse(r.updated_at || r.created_at || '') || 0;
      if (out[r.event_id] && at < seenAt[r.event_id]) continue;
      seenAt[r.event_id] = at;
      out[r.event_id] = { lead_id: r.id, status: r.status, party_size: Number(r.party_size) || 1, updated_at: r.updated_at ?? null };
    }
  }
  return out;
}
