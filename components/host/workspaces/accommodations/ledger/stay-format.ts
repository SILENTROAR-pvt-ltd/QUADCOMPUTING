// How the stay history writes dates, money and statuses, the same on the row and in the detail.

const IST = 'Asia/Kolkata';

export const inr = (n: number | string | null | undefined, paise = false) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', paise ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })}`;

export const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const dayShort = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' }) : '');
export const time = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true }) : '');
export const when = (iso?: string | null) => (iso ? `${dayShort(iso)}, ${time(iso)}` : '');

/** "ready_for_settlement" → "Ready for settlement". */
export const statusLabel = (s: string) => {
  const t = String(s || '').replace(/_/g, ' ').toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : '';
};

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The guest's ID as the desk recorded it: type and number, from the split fields or the older "Type: number" string. */
export function guestId(stay: { id_type?: string | null; id_number?: string | null; guest_id_proof?: string | null }): { type: string | null; number: string | null } {
  if (stay.id_type || stay.id_number) return { type: stay.id_type || null, number: stay.id_number || null };
  const raw = stay.guest_id_proof || '';
  if (!raw) return { type: null, number: null };
  const i = raw.indexOf(':');
  return i > 0 ? { type: raw.slice(0, i).trim(), number: raw.slice(i + 1).trim() } : { type: 'Govt ID', number: raw.trim() };
}
