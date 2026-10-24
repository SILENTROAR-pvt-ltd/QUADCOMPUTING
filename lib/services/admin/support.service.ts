// Support: venues raise tickets from My profile; the super admin works them in /admin/support. Also the live stays
// monitor: every occupied room across venues, flagged when its check-out date has passed or the guest asked to leave.
import { businessDateString } from '@/lib/utils/business-day';
import { recordAdminAction, type AdminActor } from './admin-audit';
import { readAll } from './read-all';

const CATEGORIES = ['technical', 'billing', 'account', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const STATUSES = ['open', 'in_progress', 'resolved'];
const COLUMNS = 'id, venue_id, subject, body, category, priority, status, admin_note, created_at, updated_at, resolved_at';
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function parseTicket(body: any) {
  const subject = str(body?.subject); const text = str(body?.body);
  if (subject.length < 3 || subject.length > 140) return { ok: false as const, error: 'Give a subject of 3 to 140 characters.' };
  if (text.length < 3 || text.length > 4000) return { ok: false as const, error: 'Describe the problem (up to 4,000 characters).' };
  const category = CATEGORIES.includes(body?.category) ? body.category : 'technical';
  const priority = PRIORITIES.includes(body?.priority) ? body.priority : 'normal';
  return { ok: true as const, value: { subject, body: text, category, priority } };
}

export async function createTicket(db: any, venueId: string, userId: string | null, t: { subject: string; body: string; category: string; priority: string }) {
  const { data, error } = await db.from('support_tickets').insert({ venue_id: venueId, created_by: userId, status: 'open', ...t }).select(COLUMNS).single();
  return error ? { ok: false as const, error: 'Support is not open yet. Please call or email us meanwhile.' } : { ok: true as const, ticket: data };
}

export async function venueTickets(db: any, venueId: string) {
  const { data, error } = await db.from('support_tickets').select(COLUMNS).eq('venue_id', venueId).order('created_at', { ascending: false }).limit(20);
  return error ? [] : data || [];
}

export async function listTickets(db: any, status: string | null) {
  let q = db.from('support_tickets').select(COLUMNS).order('created_at', { ascending: false }).limit(200);
  if (status && STATUSES.includes(status)) q = q.eq('status', status);
  const [tickets, biz] = await Promise.all([q, readAll(db, 'businesses', 'id, business_name, name, contact_phone')]);
  if (tickets.error) return { ready: false, tickets: [] as any[] };
  const venues = new Map<string, any>((biz.data || []).map((b: any) => [b.id, b]));
  const rank = { urgent: 0, high: 1, normal: 2, low: 3 } as Record<string, number>;
  return {
    ready: true,
    tickets: (tickets.data || []).map((t: any) => ({ ...t, venue: venues.get(t.venue_id)?.business_name || venues.get(t.venue_id)?.name || 'Venue', phone: venues.get(t.venue_id)?.contact_phone || null }))
      .sort((a: any, b: any) => Number(a.status === 'resolved') - Number(b.status === 'resolved') || (rank[a.priority] - rank[b.priority]) || String(b.created_at || '').localeCompare(String(a.created_at || ''))),
  };
}

export async function updateTicket(db: any, actor: AdminActor, id: string, body: any, now = Date.now()) {
  const patch: Record<string, unknown> = { updated_at: new Date(now).toISOString() };
  if (body?.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { ok: false as const, error: 'Choose open, in progress or resolved.' };
    patch.status = body.status; patch.resolved_at = body.status === 'resolved' ? new Date(now).toISOString() : null;
  }
  if (body?.admin_note !== undefined) patch.admin_note = str(body.admin_note).slice(0, 2000) || null;
  const { data, error } = await db.from('support_tickets').update(patch).eq('id', id).select(COLUMNS).maybeSingle();
  if (error || !data) return { ok: false as const, error: 'Could not update the ticket.' };
  await recordAdminAction(db, actor, 'ticket_update', data.venue_id, { id, status: patch.status, note: patch.admin_note !== undefined });
  return { ok: true as const, ticket: data };
}

/** Occupied rooms on every venue; overdue = the booked check-out day has passed and the room is still occupied. */
export async function loadLiveStays(db: any, now = Date.now()) {
  const today = businessDateString(now);
  const [rooms, biz] = await Promise.all([
    readAll(db, 'rooms', 'id, business_id, room_number, guest_name, check_in_date, check_out_date, checkout_request, late_checkout_request', (q) => q.eq('status', 'OCCUPIED')),
    readAll(db, 'businesses', 'id, business_name, name, contact_phone'),
  ]);
  const venues = new Map<string, any>((biz.data || []).map((b: any) => [b.id, b]));
  return (rooms.data || []).map((r: any) => ({
    id: r.id, venue: venues.get(r.business_id)?.business_name || venues.get(r.business_id)?.name || 'Venue', phone: venues.get(r.business_id)?.contact_phone || null,
    room: r.room_number, guest: r.guest_name, checkIn: r.check_in_date, checkOut: r.check_out_date,
    overdue: Boolean(r.check_out_date && String(r.check_out_date).slice(0, 10) < today), checkoutAsked: Boolean(r.checkout_request), lateAsked: Boolean(r.late_checkout_request),
  })).sort((a: any, b: any) => Number(b.overdue) - Number(a.overdue) || Number(b.checkoutAsked) - Number(a.checkoutAsked));
}
