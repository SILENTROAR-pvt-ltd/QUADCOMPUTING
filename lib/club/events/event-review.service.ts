// Staff review of submitted plans. Approval opens the plan's discussion room and announces it to
// every approved Viber and to everyone checked in at a QC property right now.
import { fail, must } from '../http';
import { cleanText } from '../identity/identity-rules';
import { notify } from '../notifications.service';
import { approvedMemberIds } from '../membership/members';
import { checkedInUserIds } from '../qc-bridge';
import { logModeration } from '../moderation/moderation-log';
import { eventRoom, joinRoom } from '../chat/rooms.service';
import { EVENT_COLUMNS, loadEvent } from './events.service';

async function decide(db: any, staffId: string, id: string, patch: Record<string, unknown>) {
  const rows = must(await db.from('club_events').update({ ...patch, reviewed_by: staffId, reviewed_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'submitted').select(EVENT_COLUMNS)) as any[];
  if (rows.length === 0) fail(409, 'Only a submitted plan can be reviewed.');
  return rows[0];
}

export async function approveEvent(db: any, staffId: string, id: string) {
  const event = await decide(db, staffId, id, { status: 'approved', review_note: null });
  const room = await eventRoom(db, id);
  await joinRoom(db, room.id, event.creator_id);
  await logModeration(db, { actorId: staffId, action: 'approve_event', targetType: 'event', targetId: id, targetUserId: event.creator_id });

  const audience = new Set([...(await approvedMemberIds(db)), ...(await checkedInUserIds(db))]);
  audience.delete(event.creator_id);
  const reached = await notify(db, Array.from(audience), {
    kind: 'event', title: `New plan: ${event.title}`, body: 'Tap to see the details and join the discussion.', link: `/club/events/${id}`,
  });
  await notify(db, [event.creator_id], { kind: 'event', title: 'Your plan is approved', body: event.title, link: `/club/events/${id}` });
  return { event, reached };
}

export async function rejectEvent(db: any, staffId: string, id: string, rawNote: unknown) {
  const note = cleanText(rawNote, 500);
  if (!note) fail(400, 'Write a short reason the creator can read.');
  const event = await decide(db, staffId, id, { status: 'rejected', review_note: note });
  await logModeration(db, { actorId: staffId, action: 'reject_event', targetType: 'event', targetId: id, targetUserId: event.creator_id, note });
  await notify(db, [event.creator_id], { kind: 'event', title: 'Your plan needs changes', body: note, link: `/club/events/${id}` });
  return event;
}

/** The creator (or staff) marks a plan finished once it has ended; this opens the NOC check. */
export async function completeEvent(db: any, actorId: string, id: string, staff: boolean, now = new Date()) {
  const event = await loadEvent(db, id);
  if (!staff && event.creator_id !== actorId) fail(403, 'Only the creator can complete this plan.');
  if (event.status !== 'approved') fail(409, 'Only an approved plan can be completed.');
  if (new Date(event.ends_at).getTime() > now.getTime()) fail(409, 'The plan has not ended yet.');
  return must(await db.from('club_events').update({ status: 'completed', completed_at: now.toISOString() })
    .eq('id', id).eq('status', 'approved').select(EVENT_COLUMNS).single());
}
