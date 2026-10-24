// Notices the super admin pushes to every venue's control center (maintenance, new features, urgent problems). A notice
// shows from its start until it ends or is withdrawn. Venues read only the live ones.
import { recordAdminAction, type AdminActor } from './admin-audit';

export type Severity = 'info' | 'warning' | 'critical';
const SEVERITIES: Severity[] = ['info', 'warning', 'critical'];
const COLUMNS = 'id, title, body, severity, starts_at, ends_at, created_at, withdrawn_at';

export function parseAnnouncement(body: any): { ok: true; value: { title: string; body: string | null; severity: Severity; hours: number | null } } | { ok: false; error: string } {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const text = typeof body?.body === 'string' && body.body.trim() ? body.body.trim() : null;
  const hours = body?.hours == null || body.hours === '' ? null : Math.round(Number(body.hours));
  if (title.length < 3 || title.length > 120) return { ok: false, error: 'Give the notice a title of 3 to 120 characters.' };
  if (text && text.length > 600) return { ok: false, error: 'Keep the message under 600 characters.' };
  if (!SEVERITIES.includes(body?.severity)) return { ok: false, error: 'Choose info, warning or critical.' };
  if (hours !== null && (!Number.isFinite(hours) || hours < 1 || hours > 24 * 30)) return { ok: false, error: 'Show it for 1 hour to 30 days, or until withdrawn.' };
  return { ok: true, value: { title, body: text, severity: body.severity, hours } };
}

export async function listAnnouncements(db: any) {
  const { data, error } = await db.from('platform_announcements').select(COLUMNS).order('created_at', { ascending: false }).limit(50);
  return error ? { ready: false, announcements: [] as any[] } : { ready: true, announcements: data || [] };
}

/** The notices showing now, most severe first. Empty (never an error) before the migration. */
export async function activeAnnouncements(db: any, now = Date.now()) {
  const at = new Date(now).toISOString();
  const { data, error } = await db.from('platform_announcements').select('id, title, body, severity, starts_at, ends_at')
    .is('withdrawn_at', null).lte('starts_at', at).or(`ends_at.is.null,ends_at.gt.${at}`).order('starts_at', { ascending: false }).limit(5);
  if (error) return [];
  const rank = { critical: 0, warning: 1, info: 2 } as Record<string, number>;
  return (data || []).sort((a: any, b: any) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));
}

export async function createAnnouncement(db: any, actor: AdminActor, a: { title: string; body: string | null; severity: Severity; hours: number | null }, now = Date.now()) {
  const row = { title: a.title, body: a.body, severity: a.severity, created_by: actor.id, starts_at: new Date(now).toISOString(), ends_at: a.hours ? new Date(now + a.hours * 3_600_000).toISOString() : null };
  const { data, error } = await db.from('platform_announcements').insert(row).select(COLUMNS).single();
  if (error) return { ok: false as const, error: 'Could not publish the notice. Is supabase/apply-pending-2026-10-24c.sql applied?' };
  await recordAdminAction(db, actor, 'announcement_publish', null, { id: data.id, title: a.title, severity: a.severity, hours: a.hours });
  return { ok: true as const, announcement: data };
}

export async function withdrawAnnouncement(db: any, actor: AdminActor, id: string, now = Date.now()) {
  const { data, error } = await db.from('platform_announcements').update({ withdrawn_at: new Date(now).toISOString() }).eq('id', id).is('withdrawn_at', null).select('id, title').maybeSingle();
  if (error || !data) return { ok: false as const, error: 'That notice is already withdrawn or no longer exists.' };
  await recordAdminAction(db, actor, 'announcement_withdraw', null, { id, title: data.title });
  return { ok: true as const };
}
