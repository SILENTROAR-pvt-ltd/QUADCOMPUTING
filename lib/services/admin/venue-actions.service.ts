// Applies a super-admin action to one venue: the subscription change (or the review), then the audit row with the
// row before and after. Plan caches on this server are dropped so the venue sees the change at once.
import { clearEntitlements } from '@/lib/services/billing/feature-gate';
import { AUDIT_NOT_READY, auditReady, recordAdminAction, type AdminActor } from './admin-audit';
import { subscriptionPatch, type VenueAction } from './venue-actions';

export type ActionResult = { ok: true; message: string } | { ok: false; status: number; error: string };

const SUB_COLUMNS = 'venue_id, plan_tier, status, trial_ends_at, expires_at, trial_used_at, setup_fee_paid_at, vibey_until';

export async function runVenueAction(db: any, venueId: string, a: VenueAction, actor: AdminActor, now = Date.now()): Promise<ActionResult> {
  const { data: venue } = await db.from('businesses').select('id, business_name, name').eq('id', venueId).maybeSingle();
  if (!venue) return { ok: false, status: 404, error: 'Venue not found.' };
  if (!(await auditReady(db))) return { ok: false, status: 503, error: AUDIT_NOT_READY };

  if (a.action === 'review') {
    const row = { venue_id: venueId, status: a.status, note: a.note, reviewed_by: actor.id, reviewed_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() };
    const { error } = await db.from('platform_venue_reviews').upsert(row, { onConflict: 'venue_id' });
    if (error) return { ok: false, status: 500, error: 'Could not save the review.' };
    await recordAdminAction(db, actor, 'venue_review', venueId, { status: a.status, note: a.note });
    return { ok: true, message: `Review set to ${a.status.replace('_', ' ')}.` };
  }

  const { data: before } = await db.from('venue_subscriptions').select(SUB_COLUMNS).eq('venue_id', venueId).maybeSingle();
  const change = subscriptionPatch(a, before, now);
  if ('error' in change) return { ok: false, status: 409, error: change.error };
  const patch = { ...change.patch, updated_at: new Date(now).toISOString() };
  const { error } = before
    ? await db.from('venue_subscriptions').update(patch).eq('venue_id', venueId)
    : await db.from('venue_subscriptions').insert({ venue_id: venueId, plan_tier: 'pay_as_you_go', status: 'active', ...patch });
  if (error) {
    console.error('[admin] venue action failed', { venueId, action: a.action, code: error.code });
    return { ok: false, status: 500, error: 'The change could not be saved.' };
  }
  clearEntitlements(venueId);
  await recordAdminAction(db, actor, `venue_${a.action}`, venueId, { request: a, before, after: change.patch });
  return { ok: true, message: `${venue.business_name || venue.name}: ${a.action.replace(/_/g, ' ')} done.` };
}
