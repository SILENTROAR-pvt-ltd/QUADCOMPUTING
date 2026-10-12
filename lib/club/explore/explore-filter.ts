// The Explore feed's shape and its search and filter rules. Pure, so the server answers a filtered
// request and the screen can filter a loaded feed instantly, with the same result.
import { meetupLabel } from '../meetups/meetup-kinds';

export interface ExploreItem {
  source: 'plan' | 'meetup';
  id: string;
  /** trip | event | together | coffee | food | walk | party | music | sports | dev | creative | wellness */
  type: string;
  title: string;
  note: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  live: boolean;
  cover: string | null;
  price: number;
  going: number;
  capacity: number | null;
  full: boolean;
  verified: boolean;
  faces: Array<{ name: string; avatar_url: string | null }>;
  host: { user_id: string; name: string; avatar_url: string | null } | null;
  me: { hosting: boolean; going: boolean };
  /** For lists of your own: draft | submitted | approved | rejected | cancelled | completed | open | ended. */
  status?: string;
}

export interface ExploreOptions {
  q?: string | null;
  /** One type to show; empty for all. */
  type?: string | null;
  /** Free text matched against where the thing is. */
  location?: string | null;
  /** Only what is on right now. */
  live?: boolean;
  /** Only what starts before this moment (ISO), e.g. the end of today. */
  until?: string | null;
}

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export function filterExplore(items: ExploreItem[], opts: ExploreOptions): ExploreItem[] {
  const q = norm(opts.q).slice(0, 80);
  const where = norm(opts.location).slice(0, 80);
  const type = norm(opts.type);
  const until = opts.until ? Date.parse(opts.until) : NaN;
  return items.filter((i) =>
    (!type || i.type === type)
    && (!opts.live || i.live)
    && (Number.isNaN(until) || Date.parse(i.starts_at) <= until)
    && (!where || norm(`${i.location ?? ''} ${i.title}`).includes(where))
    && (!q || norm([i.title, i.note, i.location, i.host?.name, meetupLabel(i.type), i.type].join(' ')).includes(q)));
}

/** Live first, then by start time; with `near`, things in that place come before the rest of the same group. */
export function sortExplore(items: ExploreItem[], near?: string | null): ExploreItem[] {
  const home = norm(near);
  const here = (i: ExploreItem) => (home && norm(i.location).includes(home) ? 1 : 0);
  return [...items].sort((a, b) => Number(b.live) - Number(a.live) || here(b) - here(a) || Date.parse(a.starts_at) - Date.parse(b.starts_at));
}
