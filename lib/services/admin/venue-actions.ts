// What a super admin can do to a venue, checked before anything touches the database. Pure: parsing and the new
// subscription fields only; venue-actions.service.ts applies them and writes the audit row.
const DAY = 86_400_000;
const PLAN_TIERS = ['m1_pro', 'm2_pro', 'rhodium_annual'] as const;
const TRIAL_TIERS = ['m1_pro', 'm2_pro'] as const;
const REVIEW = ['pending', 'approved', 'needs_docs', 'rejected'] as const;

export type VenueAction =
  | { action: 'set_plan'; planTier: (typeof PLAN_TIERS)[number]; days: number }
  | { action: 'start_trial'; planTier: (typeof TRIAL_TIERS)[number]; days: number }
  | { action: 'extend'; days: number }
  | { action: 'to_per_bill' }
  | { action: 'set_vibey'; days: number }
  | { action: 'end_vibey' }
  | { action: 'waive_setup' }
  | { action: 'suspend'; reason: string }
  | { action: 'resume' }
  | { action: 'review'; status: (typeof REVIEW)[number]; note: string | null };

const int = (v: unknown, min: number, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min && n <= max ? n : null; };
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export function parseVenueAction(body: any): { ok: true; value: VenueAction } | { ok: false; error: string } {
  switch (body?.action) {
    case 'set_plan': {
      const days = int(body.days ?? 365, 1, 1100);
      if (!PLAN_TIERS.includes(body.planTier) || !days) return { ok: false, error: 'Choose a plan and 1 to 1,100 days.' };
      return { ok: true, value: { action: 'set_plan', planTier: body.planTier, days } };
    }
    case 'start_trial': {
      const days = int(body.days ?? 30, 1, 90);
      if (!TRIAL_TIERS.includes(body.planTier) || !days) return { ok: false, error: 'A free month is for M¹-Pro or M²-Pro, 1 to 90 days.' };
      return { ok: true, value: { action: 'start_trial', planTier: body.planTier, days } };
    }
    case 'extend': case 'set_vibey': {
      const days = int(body.days, 1, 730);
      return days ? { ok: true, value: { action: body.action, days } } : { ok: false, error: 'Give 1 to 730 days.' };
    }
    case 'suspend': {
      const reason = text(body.reason, 300);
      return reason ? { ok: true, value: { action: 'suspend', reason } } : { ok: false, error: 'Say why the venue is suspended (kept in the admin log).' };
    }
    case 'review':
      return REVIEW.includes(body.status) ? { ok: true, value: { action: 'review', status: body.status, note: text(body.note, 500) } } : { ok: false, error: 'Choose a review status.' };
    case 'to_per_bill': case 'end_vibey': case 'waive_setup': case 'resume':
      return { ok: true, value: { action: body.action } };
    default:
      return { ok: false, error: 'Unknown action.' };
  }
}

const later = (from: unknown, days: number, now: number) => new Date(Math.max(now, Date.parse(String(from)) || 0) + days * DAY).toISOString();

/** The subscription fields an action sets, from the current row. An error when the action makes no sense for it. */
export function subscriptionPatch(a: Exclude<VenueAction, { action: 'review' }>, sub: any, now = Date.now()): { patch: Record<string, unknown> } | { error: string } {
  const at = new Date(now).toISOString();
  switch (a.action) {
    case 'set_plan': return { patch: { plan_tier: a.planTier, status: 'active', trial_ends_at: null, expires_at: new Date(now + a.days * DAY).toISOString() } };
    case 'start_trial': return { patch: { plan_tier: a.planTier, status: 'trial', trial_ends_at: new Date(now + a.days * DAY).toISOString(), expires_at: null, trial_used_at: sub?.trial_used_at || at } };
    case 'to_per_bill': return { patch: { plan_tier: 'pay_as_you_go', status: 'active', trial_ends_at: null, expires_at: null } };
    case 'set_vibey': return { patch: { vibey_until: later(sub?.vibey_until, a.days, now) } };
    case 'end_vibey': return { patch: { vibey_until: null } };
    case 'waive_setup': return sub?.setup_fee_paid_at ? { error: 'The setup is already paid or waived.' } : { patch: { setup_fee_paid_at: at } };
    case 'suspend': return sub?.status === 'suspended' ? { error: 'The venue is already suspended.' } : { patch: { status: 'suspended' } };
    case 'resume': {
      if (sub?.status !== 'suspended') return { error: 'The venue is not suspended.' };
      const trial = !sub.expires_at && sub.trial_ends_at && Date.parse(sub.trial_ends_at) > now;
      return { patch: { status: trial ? 'trial' : 'active' } };
    }
    case 'extend': {
      if (sub?.status === 'trial') return { patch: { trial_ends_at: later(sub.trial_ends_at, a.days, now) } };
      if (!sub || ['pay_as_you_go', 'rhodium_ppb'].includes(sub.plan_tier)) return { error: 'You earn, we earn has no end date to extend. Give a plan instead.' };
      return { patch: { expires_at: later(sub.expires_at, a.days, now) } };
    }
  }
}
