// What a host may send when publishing or editing a live event. Everything is checked and trimmed here, so the
// database only ever sees clean values and the guest feed never shows a half-filled event.
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export type EventStatus = 'DRAFT' | 'LIVE' | 'CANCELLED';
export const EVENT_STATUSES: readonly EventStatus[] = ['DRAFT', 'LIVE', 'CANCELLED'];
export const EVENT_CATEGORIES = ['Live Music', 'DJ Night', 'Acoustic Lounge', 'Comedy', 'Festival', 'Workshop', 'Live Event'] as const;

export interface EventFields {
  title: string;
  description: string | null;
  banner_url: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  entry_fee: number;
  perks: string[];
  /** The guest pool: how many people the event takes in all. */
  capacity: number | null;
  /** Optional split of the pool; null = no limit for that gender. Together they never exceed the pool. */
  male_capacity: number | null;
  female_capacity: number | null;
  status: EventStatus;
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const isoOrNull = (v: unknown): string | null => {
  const t = Date.parse(String(v ?? ''));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

/** A banner must be an http(s) address: it is rendered in an <img> on every guest's phone. */
export function cleanBannerUrl(v: unknown): string | null | 'INVALID' {
  const s = String(v ?? '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : 'INVALID';
  } catch {
    return 'INVALID';
  }
}

/** Parses an event. With `partial`, only the fields that were sent are returned (for an edit). */
export function parseEvent(body: any, opts: { partial?: boolean } = {}): Parsed<Partial<EventFields>> {
  const out: Partial<EventFields> = {};
  const has = (k: string) => body?.[k] !== undefined;
  const need = (k: string) => !opts.partial || has(k);

  if (need('title')) {
    const title = clean(body?.title, 120);
    if (title.length < 2) return { ok: false, error: 'Give the event a title.' };
    out.title = title;
  }
  if (need('starts_at')) {
    const starts = isoOrNull(body?.starts_at);
    if (!starts) return { ok: false, error: 'Choose when the event starts.' };
    out.starts_at = starts;
  }
  if (has('ends_at')) {
    const ends = body.ends_at === null || body.ends_at === '' ? null : isoOrNull(body.ends_at);
    if (body.ends_at && !ends) return { ok: false, error: 'The end time is not a valid date.' };
    const start = out.starts_at ?? isoOrNull(body?.starts_at);
    if (ends && start && Date.parse(ends) <= Date.parse(start)) return { ok: false, error: 'The event must end after it starts.' };
    out.ends_at = ends;
  }
  if (has('description')) out.description = clean(body.description, 1000) || null;
  if (has('banner_url')) {
    const banner = cleanBannerUrl(body.banner_url);
    if (banner === 'INVALID') return { ok: false, error: 'The banner must be a web address starting with https://.' };
    out.banner_url = banner;
  }
  if (has('category')) out.category = clean(body.category, 40) || 'Live Event';
  else if (!opts.partial) out.category = 'Live Event';

  if (has('entry_fee')) {
    const fee = Number(body.entry_fee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000) return { ok: false, error: 'The entry fee must be 0 or more.' };
    out.entry_fee = Math.round(fee * 100) / 100;
  } else if (!opts.partial) out.entry_fee = 0;

  if (has('perks')) {
    const list = Array.isArray(body.perks) ? body.perks : String(body.perks ?? '').split(/[\n,]/);
    out.perks = list.map((p: unknown) => clean(p, 60)).filter(Boolean).slice(0, 8);
  } else if (!opts.partial) out.perks = [];

  if (has('capacity')) {
    if (body.capacity === null || body.capacity === '') out.capacity = null;
    else {
      const cap = Number(body.capacity);
      if (!Number.isInteger(cap) || cap < 1 || cap > 100000) return { ok: false, error: 'Capacity must be a whole number, 1 or more.' };
      out.capacity = cap;
    }
  }
  const seats = (k: 'male_capacity' | 'female_capacity'): number | null | 'BAD' => {
    if (body[k] === null || body[k] === undefined || body[k] === '') return null;
    const n = Number(body[k]);
    return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : 'BAD';
  };
  if (has('male_capacity') || has('female_capacity') || has('capacity')) {
    // The pool and its split are one decision: an edit sends all three, so the split is always checked against the pool.
    if (opts.partial && !(has('capacity') && has('male_capacity') && has('female_capacity'))) return { ok: false, error: 'Send the guest pool and its split together.' };
    const male = seats('male_capacity'), female = seats('female_capacity');
    if (male === 'BAD' || female === 'BAD') return { ok: false, error: 'Seats for men and women must be whole numbers, 0 or more.' };
    if ((male !== null || female !== null) && out.capacity == null) return { ok: false, error: 'Set the total number of guests before splitting it between men and women.' };
    if ((male ?? 0) + (female ?? 0) > (out.capacity ?? 0) && (male !== null || female !== null)) return { ok: false, error: `Men and women together cannot be more than the ${out.capacity} guests in the pool.` };
    out.male_capacity = male;
    out.female_capacity = female;
  }
  if (has('status')) {
    const s = String(body.status).toUpperCase() as EventStatus;
    if (!EVENT_STATUSES.includes(s)) return { ok: false, error: 'Status must be Live, Draft or Cancelled.' };
    out.status = s;
  } else if (!opts.partial) out.status = 'LIVE';

  if (opts.partial && Object.keys(out).length === 0) return { ok: false, error: 'Nothing to change.' };
  return { ok: true, value: out };
}
