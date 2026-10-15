/** Small, pure helpers for how a postcard looks: its tilt, and the day printed in its postmark. */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Each postcard lies a little differently on the wall, between -1.4 and +1.4 degrees, and always the same one. */
export function postcardTilt(id: string): number {
  return Math.round((((hash(id) % 2801) / 1000) - 1.4) * 10) / 10;
}

/** "14 OCT", as a postmark prints it (the venue's own day, in Indian time). */
export function postmarkDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }).replace(/\./g, '').toUpperCase();
}

/** The venue name as it fits round a postmark: upper case, at most 16 characters. */
export function postmarkName(venue: string): string {
  const clean = (venue || 'Vibers').trim().toUpperCase();
  return clean.length > 16 ? `${clean.slice(0, 15).trimEnd()}…` : clean;
}
