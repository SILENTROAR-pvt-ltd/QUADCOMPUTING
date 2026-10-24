// The super admin's own trail: every change made from /admin is recorded in platform_admin_actions (append-only).
// A change is refused while the table is missing, so nothing done from the dashboard ever goes unrecorded.
export interface AdminActor { id: string; email: string | null }

const MISSING = new Set(['42P01', 'PGRST205']);
export const AUDIT_NOT_READY = 'The admin log is not set up yet. Run supabase/apply-pending-2026-10-24c.sql, then try again.';

/** True when the admin log table exists and can be written. */
export async function auditReady(db: any): Promise<boolean> {
  const { error } = await db.from('platform_admin_actions').select('id').limit(1);
  return !error;
}

/** Records one action. Returns false (and says why in the server log) when the row could not be written. */
export async function recordAdminAction(db: any, actor: AdminActor, action: string, venueId: string | null, detail: Record<string, unknown>): Promise<boolean> {
  const { error } = await db.from('platform_admin_actions').insert({ admin_id: actor.id, admin_email: actor.email, action, venue_id: venueId, detail });
  if (error) console.error('[admin-audit] could not record', { action, venueId, code: error.code, missing: MISSING.has(error.code) });
  return !error;
}

/** The latest actions, newest first (optionally for one venue). */
export async function listAdminActions(db: any, venueId?: string, limit = 50) {
  let q = db.from('platform_admin_actions').select('id, admin_email, action, venue_id, detail, created_at').order('created_at', { ascending: false }).limit(limit);
  if (venueId) q = q.eq('venue_id', venueId);
  const { data, error } = await q;
  return error ? { ready: false, actions: [] as any[] } : { ready: true, actions: data || [] };
}
