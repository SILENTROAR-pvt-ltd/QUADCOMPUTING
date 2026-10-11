// Interest and spots. "Interested" members join the plan's discussion room to ask questions first;
// reserving a spot makes them a participant who pays on the plan's schedule (free plans confirm now).
import { fail, must } from '../http';
import { eventRoom, joinRoom } from '../chat/rooms.service';
import { splitBySchedule } from '../money';
import { loadEvent } from './events.service';
import type { ClubEvent, ViberProfile } from '../types';

function assertOpen(event: ClubEvent, now: Date) {
  if (event.status !== 'approved') fail(409, 'This plan is not open.');
  if (new Date(event.starts_at).getTime() <= now.getTime()) fail(409, 'This plan has already started.');
}

export async function markInterested(db: any, eventId: string, member: ViberProfile, now = new Date()) {
  const event = await loadEvent(db, eventId);
  assertOpen(event, now);
  const res = await db.from('club_event_interest').insert({ event_id: eventId, user_id: member.user_id });
  if (res.error && res.error.code !== '23505') throw res.error;
  const room = await eventRoom(db, eventId);
  await joinRoom(db, room.id, member.user_id);
  return { roomId: room.id };
}

export async function reserveSpot(db: any, eventId: string, member: ViberProfile, now = new Date()) {
  const event = await loadEvent(db, eventId);
  assertOpen(event, now);
  if (event.creator_id === member.user_id) fail(400, 'You are hosting this plan.');
  const existing = must(await db.from('club_event_participants').select('status').eq('event_id', eventId).eq('user_id', member.user_id).maybeSingle()) as any;
  if (existing && existing.status !== 'cancelled') return { status: existing.status };

  const taken = must(await db.from('club_event_participants').select('user_id').eq('event_id', eventId).neq('status', 'cancelled')) as any[];
  if (taken.length >= event.capacity) fail(409, 'This plan is full.', 'full');
  const status = event.ticket_price === 0 ? 'confirmed' : 'reserved';
  const row = { event_id: eventId, user_id: member.user_id, status, total_due: event.ticket_price, paid: 0 };
  if (existing) must(await db.from('club_event_participants').update(row).eq('event_id', eventId).eq('user_id', member.user_id));
  else must(await db.from('club_event_participants').insert(row));
  const room = await eventRoom(db, eventId);
  await joinRoom(db, room.id, member.user_id);
  return { status };
}

/** The next unpaid step of this participant's schedule, or null when fully paid. */
export function nextInstallment(event: Pick<ClubEvent, 'payment_schedule'>, totalDue: number, paid: number) {
  const parts = splitBySchedule(totalDue, event.payment_schedule);
  let covered = 0;
  for (let i = 0; i < parts.length; i++) {
    covered += parts[i];
    if (paid < covered) return { index: i + 1, label: event.payment_schedule[i].label, amount: covered - paid, of: parts.length };
  }
  return null;
}

export async function participants(db: any, eventId: string) {
  return must(await db.from('club_event_participants').select('user_id, status, total_due, paid, created_at').eq('event_id', eventId)) as any[];
}
