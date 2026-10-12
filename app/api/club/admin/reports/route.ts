import { adminDb } from '@/lib/supabase/admin';
import { clubApi, must, ok, query, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { listReports, resolveReport } from '@/lib/club/moderation/reports.service';

export const dynamic = 'force-dynamic';

/** Rows of `table` by id, or none when nothing of that type was reported. */
const byIds = (db: any, table: string, cols: string, key: string, ids: string[]) =>
  ids.length ? db.from(table).select(cols).in(key, ids).then(must) : Promise.resolve([]);

/** GET /api/club/admin/reports?status=open — the Red Flag queue, with a preview of each reported item. */
export const GET = clubApi('AdminReports', async (request) => {
  const db = adminDb();
  await requireStaff(db);
  const reports = await listReports(db, query(request).get('status') || 'open');
  const ids = (type: string) => reports.filter((r) => r.target_type === type).map((r) => r.target_id);
  const [messages, users, posts, comments, meetups] = await Promise.all([
    byIds(db, 'club_messages', 'id, sender_id, body, hidden', 'id', ids('message')),
    byIds(db, 'viber_profiles', 'user_id, viber_id, status, muted_until, shadow_banned', 'user_id', ids('user')),
    byIds(db, 'club_posts', 'id, author_id, body, place, hidden', 'id', ids('post')),
    byIds(db, 'club_post_comments', 'id, author_id, body, hidden', 'id', ids('comment')),
    byIds(db, 'club_meetups', 'id, host_id, title, note, venue, city, hidden', 'id', ids('meetup')),
  ]);
  const find = (rows: any[], key: string, id: string) => rows.find((x) => x[key] === id) ?? null;
  // Posts and comments carry their author as sender_id, so the same member actions apply.
  const asSent = (row: any) => (row ? { ...row, sender_id: row.author_id } : null);
  // A meetup is shown as its title and place, with the host as the member the actions apply to.
  const asMeetup = (row: any) => (row ? { ...row, body: [row.title, row.note].filter(Boolean).join(' — '), place: [row.venue, row.city].filter(Boolean).join(', '), sender_id: row.host_id } : null);
  return ok({
    reports: reports.map((r) => ({
      ...r,
      preview: r.target_type === 'message' ? find(messages, 'id', r.target_id)
        : r.target_type === 'user' ? find(users, 'user_id', r.target_id)
          : r.target_type === 'post' ? asSent(find(posts, 'id', r.target_id))
            : r.target_type === 'comment' ? asSent(find(comments, 'id', r.target_id))
              : r.target_type === 'meetup' ? asMeetup(find(meetups, 'id', r.target_id)) : null,
    })),
  });
});

/** POST /api/club/admin/reports { report_id, outcome: actioned|dismissed, note? } */
export const POST = clubApi('AdminResolveReport', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db);
  const body = await readBody(request);
  return ok({ report: await resolveReport(db, user.id, String(body.report_id || ''), body.outcome, body.note) });
});
