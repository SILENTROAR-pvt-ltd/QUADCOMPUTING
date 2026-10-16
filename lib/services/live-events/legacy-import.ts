// Turns an old "Moment" from the photo vault into a live event. A moment carried its time as free text ("Tonight @ 8:30
// PM", "Sat 25 Oct @ 7 PM", "Friday @ 9pm"); this reads that into a real start time, in the venue's time (India).
const IST_MS = 5.5 * 60 * 60 * 1000;
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** A moment in IST as a real instant. */
const istInstant = (y: number, m: number, d: number, h: number, min: number) => new Date(Date.UTC(y, m, d, h, min) - IST_MS);
const istParts = (t: number) => { const d = new Date(t + IST_MS); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay() }; };

function readTime(text: string): { h: number; min: number } {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(text.split('@')[1] ?? text);
  if (!m) return { h: 20, min: 0 };
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!ap && h >= 1 && h <= 11) h += 12; // "8" with no am/pm, for a venue's event, means evening
  return h > 23 || min > 59 ? { h: 20, min: 0 } : { h, min };
}

/**
 * When a legacy moment's time text means, counted from `now`. "Tonight", "today", a weekday or no day at all means the next
 * time that clock reading comes round (a moment that stays up is, in effect, always about the coming night); an explicit
 * date means that date, in this year or the next.
 */
export function legacyStart(timeTag: string | null | undefined, now: number): Date {
  const tag = String(timeTag || '').trim();
  const lower = tag.toLowerCase();
  const { h, min } = readTime(tag);
  const today = istParts(now);

  const dateMatch = new RegExp(`(\\d{1,2})\\s*(${MONTHS.join('|')})`, 'i').exec(lower);
  if (dateMatch) {
    const month = MONTHS.indexOf(dateMatch[2].slice(0, 3).toLowerCase());
    let start = istInstant(today.y, month, Number(dateMatch[1]), h, min);
    if (start.getTime() < now - 12 * 3600_000) start = istInstant(today.y + 1, month, Number(dateMatch[1]), h, min);
    return start;
  }

  let dayOffset = 0;
  if (/tomorrow/.test(lower)) dayOffset = 1;
  else {
    const dow = DAYS.findIndex((d) => new RegExp(`\\b${d}`).test(lower));
    if (dow >= 0) dayOffset = (dow - today.dow + 7) % 7;
  }
  let start = istInstant(today.y, today.m, today.d + dayOffset, h, min);
  // Tonight's time has already gone by: the next one is tomorrow's.
  if (dayOffset === 0 && start.getTime() < now - 2 * 3600_000) start = istInstant(today.y, today.m, today.d + 1, h, min);
  return start;
}

export interface LegacyMoment { id: string; title: string; category: string | null; time_tag: string | null; image_url: string | null; description: string | null }

/** The event fields for a legacy moment. */
export function legacyToEvent(m: LegacyMoment, now: number) {
  return {
    title: m.title.replace(/\s+/g, ' ').trim().slice(0, 120),
    description: (m.description || '').replace(/\s+/g, ' ').trim().slice(0, 1000) || null,
    banner_url: m.image_url && /^https?:\/\//i.test(m.image_url) ? m.image_url : null,
    category: (m.category || 'Live Event').trim().slice(0, 40) || 'Live Event',
    starts_at: legacyStart(m.time_tag, now).toISOString(),
    entry_fee: 0, perks: [] as string[], status: 'LIVE' as const,
  };
}
