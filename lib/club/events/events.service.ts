// Event and tour plans by any approved Viber. Drafts are edited freely; submitting needs the
// creator's signed responsibility and consent (version, time, IP and Viber ID are recorded).
import { fail, must } from '../http';
import { parseEvent } from './event-input';
import type { ClubEvent, ViberProfile } from '../types';

export const EVENT_COLUMNS =
  'id, creator_id, title, kind, cover_paths, starts_at, ends_at, venue, transport, food, activities, budget, cancellation_policy, safety_protocol, price_min, price_max, capacity, ticket_price, payment_schedule, fee_bps, status, verified, review_note, created_at';

export async function loadEvent(db: any, id: string): Promise<ClubEvent> {
  const event = must(await db.from('club_events').select(EVENT_COLUMNS).eq('id', id).maybeSingle()) as ClubEvent | null;
  if (!event) fail(404, 'Plan not found.');
  return event;
}

/** Approved and completed plans are public to members; anything else only to its creator and staff. */
export function canSee(event: ClubEvent, viewerId: string, staff: boolean) {
  return staff || event.creator_id === viewerId || event.status === 'approved' || event.status === 'completed';
}

export async function createEvent(db: any, creator: ViberProfile, body: Record<string, any>) {
  const parsed = parseEvent(body, creator.user_id);
  if (!parsed.ok) fail(400, parsed.error);
  return must(await db.from('club_events').insert({ ...parsed.row, creator_id: creator.user_id, status: 'draft', verified: false })
    .select(EVENT_COLUMNS).single()) as ClubEvent;
}

export async function updateEvent(db: any, creator: ViberProfile, id: string, body: Record<string, any>) {
  const event = await loadEvent(db, id);
  if (event.creator_id !== creator.user_id) fail(403, 'Only the creator can edit this plan.');
  if (event.status !== 'draft' && event.status !== 'rejected') fail(409, 'A submitted plan cannot be edited.');
  const parsed = parseEvent(body, creator.user_id);
  if (!parsed.ok) fail(400, parsed.error);
  return must(await db.from('club_events').update({ ...parsed.row, status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', id).select(EVENT_COLUMNS).single()) as ClubEvent;
}

export async function activeConsent(db: any): Promise<{ version: number; body: string }> {
  const row = must(await db.from('club_consent_versions').select('version, body').eq('active', true)
    .order('version', { ascending: false }).limit(1).maybeSingle()) as { version: number; body: string } | null;
  if (!row) fail(503, 'The consent agreement is not set up yet.', 'not_ready');
  return row;
}

export async function submitEvent(db: any, creator: ViberProfile, id: string, body: Record<string, any>, meta: { ip: string; userAgent: string | null }) {
  const event = await loadEvent(db, id);
  if (event.creator_id !== creator.user_id) fail(403, 'Only the creator can submit this plan.');
  if (event.status !== 'draft') fail(409, 'Only a draft can be submitted.');
  const consent = await activeConsent(db);
  if (body.agree !== true || Number(body.consent_version) !== consent.version) fail(400, 'Read and accept the responsibility and consent agreement.', 'consent_required');

  const signed = await db.from('club_event_consents').insert({
    event_id: id, user_id: creator.user_id, viber_id: creator.viber_id, version: consent.version, ip: meta.ip, user_agent: meta.userAgent?.slice(0, 300) ?? null,
  });
  if (signed.error && signed.error.code !== '23505') throw signed.error;
  const rows = must(await db.from('club_events').update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'draft').select(EVENT_COLUMNS)) as ClubEvent[];
  if (rows.length === 0) fail(409, 'This plan was already submitted.');
  return rows[0];
}

export async function listEvents(db: any, opts: { mine?: string; status?: string; limit?: number } = {}) {
  let q = db.from('club_events').select(EVENT_COLUMNS);
  if (opts.mine) q = q.eq('creator_id', opts.mine);
  else q = q.eq('status', opts.status || 'approved');
  return must(await q.order('starts_at', { ascending: true }).limit(opts.limit ?? 50)) as ClubEvent[];
}
