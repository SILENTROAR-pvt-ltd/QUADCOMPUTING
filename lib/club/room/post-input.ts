// What a Common Room post may contain: up to 1,000 characters (profanity starred out), an optional
// place (picked from the list; its name and region come from the server, never from the client), and
// an optional approved plan to point people at.
import { maskProfanity } from '../identity/profanity';

export const REGIONS = ['india', 'asia', 'europe', 'americas', 'africa', 'oceania'] as const;
export type Region = (typeof REGIONS)[number];

export const POST_MAX = 1000;
export const COMMENT_MAX = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Multi-line text with control characters removed, edges trimmed and profanity starred out. */
export function cleanBody(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return maskProfanity(raw.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\n{3,}/g, '\n\n').trim());
}

export function isRegion(value: unknown): value is Region {
  return typeof value === 'string' && (REGIONS as readonly string[]).includes(value);
}

export interface PostInput { body: string; place_id: string | null; event_id: string | null }

export function parsePost(body: Record<string, any>): { ok: true; row: PostInput } | { ok: false; error: string } {
  const text = cleanBody(body.body);
  if (!text) return { ok: false, error: 'Write something first.' };
  if (text.length > POST_MAX) return { ok: false, error: `Keep posts under ${POST_MAX.toLocaleString('en-IN')} characters.` };
  const placeId = body.place_id ? String(body.place_id) : null;
  if (placeId && !UUID.test(placeId)) return { ok: false, error: 'Choose a place from the list.' };
  const eventId = body.event_id ? String(body.event_id) : null;
  if (eventId && !UUID.test(eventId)) return { ok: false, error: 'That plan cannot be attached.' };
  return { ok: true, row: { body: text, place_id: placeId, event_id: eventId } };
}
