// Pure validation of an instant meetup. No money, no consent step, no review: it goes live on posting.
import { cleanText } from '../identity/identity-rules';
import { containsProfanity } from '../identity/profanity';
import { MAX_AHEAD_DAYS, MAX_MEETUP_HOURS, MEETUP_KEYS } from './meetup-kinds';

export type MeetupInput =
  | { ok: true; row: { kind: string; title: string; note: string | null; venue: string | null; city: string; starts_at: string; ends_at: string; capacity: number | null }; placeId: string | null }
  | { ok: false; error: string };
const no = (error: string): MeetupInput => ({ ok: false, error });
const HOUR = 3_600_000;

/** Up to four photo paths, and only ones the host uploaded themselves (meetups/<host id>/...). */
export function cleanCovers(raw: unknown, hostId: string): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.filter((p): p is string => typeof p === 'string' && p.startsWith(`meetups/${hostId}/`) && !p.includes('..')))).slice(0, 4);
}

export function parseMeetup(body: Record<string, any>, now: Date = new Date()): MeetupInput {
  const kind = String(body.kind ?? '');
  if (!MEETUP_KEYS.includes(kind)) return no('Choose what kind of meetup this is.');
  const title = cleanText(body.title, 80);
  if (!title || title.length < 3) return no('Give your meetup a title of at least 3 characters.');
  const note = cleanText(body.note, 280);
  const venue = cleanText(body.venue, 120);
  for (const text of [title, note, venue]) if (text && containsProfanity(text)) return no('Please rephrase that. Keep it friendly.');

  const city = cleanText(body.city, 60);
  if (!city || city.length < 2) return no('Say where it is: a city or a place.');

  // "now" starts at this moment; otherwise a chosen time between a few minutes ago and two weeks ahead.
  const starts = body.when === 'now' || body.starts_at == null || body.starts_at === '' ? new Date(now) : new Date(body.starts_at);
  if (Number.isNaN(starts.getTime())) return no('Choose a valid start time.');
  if (starts.getTime() < now.getTime() - 10 * 60_000) return no('That time has already passed.');
  if (starts.getTime() > now.getTime() + MAX_AHEAD_DAYS * 24 * HOUR) return no(`Meetups can be posted up to ${MAX_AHEAD_DAYS} days ahead.`);

  const hours = body.hours == null || body.hours === '' ? 2 : Number(body.hours);
  if (!Number.isFinite(hours) || hours < 1 || hours > MAX_MEETUP_HOURS) return no(`A meetup lasts between 1 and ${MAX_MEETUP_HOURS} hours.`);

  let capacity: number | null = null;
  if (body.capacity != null && body.capacity !== '') {
    capacity = Math.round(Number(body.capacity));
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 500) return no('Spots must be between 2 and 500, or leave it open.');
  }
  const placeId = typeof body.place_id === 'string' && body.place_id ? body.place_id : null;
  return {
    ok: true,
    placeId,
    row: {
      kind, title, note, venue, city, capacity,
      starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + Math.round(hours * HOUR)).toISOString(),
    },
  };
}
