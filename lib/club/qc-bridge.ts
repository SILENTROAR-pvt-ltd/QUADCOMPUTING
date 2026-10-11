// The only Club module that reads Quad Computing tables, and it only reads. "Checked in" means an
// active dine-in session under the person's Vibers @handle, or an open room stay under their phone.
import { must } from './http';

const last10 = (phone: string | null | undefined) => String(phone || '').replace(/\D/g, '').slice(-10);
const phoneVariants = (ten: string) => [ten, `91${ten}`, `+91${ten}`, `0${ten}`];

/** The partner property (QC venue id) this member is checked in at right now, if any. */
export async function currentPartnerStay(db: any, handle: string, phone: string | null): Promise<string | null> {
  const partners = must(await db.from('property_marketplace').select('business_id').eq('status', 'verified').not('business_id', 'is', null)) as any[];
  const ids = Array.from(new Set(partners.map((p) => p.business_id)));
  if (ids.length === 0) return null;

  const dining = must(await db.from('dine_in_sessions').select('business_id').eq('guest_handle', handle).eq('status', 'active')
    .in('business_id', ids).limit(1)) as any[];
  if (dining[0]) return dining[0].business_id;

  const ten = last10(phone);
  if (ten.length !== 10) return null;
  const stays = must(await db.from('room_stay_logs').select('business_id').is('check_out_time', null).in('business_id', ids)
    .in('guest_phone', phoneVariants(ten)).limit(1)) as any[];
  return stays[0]?.business_id ?? null;
}

/** Vibers accounts of everyone checked in at any QC property now (for event announcements). */
export async function checkedInUserIds(db: any): Promise<string[]> {
  const sessions = must(await db.from('dine_in_sessions').select('guest_handle').eq('status', 'active')
    .not('guest_handle', 'is', null).limit(2000)) as any[];
  const handles = Array.from(new Set(sessions.map((s) => s.guest_handle).filter(Boolean)));
  const stays = must(await db.from('room_stay_logs').select('guest_phone').is('check_out_time', null).limit(2000)) as any[];
  const phones = Array.from(new Set(stays.map((s) => last10(s.guest_phone)).filter((p) => p.length === 10))).flatMap(phoneVariants);

  const ids = new Set<string>();
  for (let i = 0; i < handles.length; i += 200) {
    const rows = must(await db.from('vibers_accounts').select('user_id').in('handle', handles.slice(i, i + 200))) as any[];
    rows.forEach((r) => ids.add(r.user_id));
  }
  for (let i = 0; i < phones.length; i += 200) {
    const rows = must(await db.from('vibers_accounts').select('user_id').in('phone', phones.slice(i, i + 200))) as any[];
    rows.forEach((r) => ids.add(r.user_id));
  }
  return Array.from(ids);
}

/** QC venues this person hosts, so a business member can link their marketplace listing to one. */
export async function hostedVenues(db: any, userId: string): Promise<Array<{ id: string; name: string }>> {
  const rows = must(await db.from('businesses').select('id, business_name, name').eq('host_id', userId)) as any[];
  return rows.map((b) => ({ id: b.id, name: b.business_name || b.name || 'Venue' }));
}
