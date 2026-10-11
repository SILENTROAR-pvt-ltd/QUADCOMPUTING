// In-app notifications. Inserted in batches so a club-wide announcement is a handful of writes.
import { must } from './http';

export interface Notice { kind: string; title: string; body?: string | null; link?: string | null }

const BATCH = 500;

export async function notify(db: any, userIds: string[], notice: Notice): Promise<number> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  for (let i = 0; i < unique.length; i += BATCH) {
    const rows = unique.slice(i, i + BATCH).map((user_id) => ({
      user_id, kind: notice.kind, title: notice.title, body: notice.body ?? null, link: notice.link ?? null,
    }));
    must(await db.from('club_notifications').insert(rows));
  }
  return unique.length;
}

export async function listNotifications(db: any, userId: string, limit = 30) {
  return must(await db.from('club_notifications').select('id, kind, title, body, link, read_at, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)) as any[];
}

export async function unreadNotificationCount(db: any, userId: string): Promise<number> {
  const rows = must(await db.from('club_notifications').select('id').eq('user_id', userId).is('read_at', null).limit(100)) as any[];
  return rows.length;
}

export async function markNotificationsRead(db: any, userId: string, ids?: string[]) {
  let q = db.from('club_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
  if (ids?.length) q = q.in('id', ids);
  must(await q);
}
