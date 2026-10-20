// Whether the kitchen takes in-room orders right now, from the venue's operating hours (the same table the table
// reservations use, set under Reservations > Operating hours). A venue with no hours saved is open all day.

export interface HoursRow { weekday: number; open_time: string; close_time: string; is_closed: boolean }

export type DiningReason = 'open' | 'no_hours' | 'closed_today' | 'before_open' | 'after_close';
export interface DiningWindow { open: boolean; reason: DiningReason; opensAt: string | null; closesAt: string | null }

const hhmm = (t: string | null | undefined) => (t || '').slice(0, 5);

/** India-time weekday and HH:MM of an instant. */
export function istClock(now: Date) {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  return { weekday: ist.getUTCDay(), time: ist.toISOString().slice(11, 16) };
}

export function diningWindow(rows: HoursRow[], now = new Date()): DiningWindow {
  if (!rows.length) return { open: true, reason: 'no_hours', opensAt: null, closesAt: null };
  const { weekday, time } = istClock(now);
  const today = rows.find((r) => Number(r.weekday) === weekday);
  if (!today) return { open: true, reason: 'no_hours', opensAt: null, closesAt: null };
  if (today.is_closed) return { open: false, reason: 'closed_today', opensAt: null, closesAt: null };
  const opensAt = hhmm(today.open_time) || '10:00';
  const closesAt = hhmm(today.close_time) || '22:00';
  if (time < opensAt) return { open: false, reason: 'before_open', opensAt, closesAt };
  if (time >= closesAt) return { open: false, reason: 'after_close', opensAt, closesAt };
  return { open: true, reason: 'open', opensAt, closesAt };
}

/** A line for the guest: "Kitchen opens at 7:30 am" and the like. */
export function diningMessage(w: DiningWindow): string {
  const pretty = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${ampm}`;
  };
  if (w.open) return w.closesAt ? `Kitchen open until ${pretty(w.closesAt)}` : 'Kitchen open';
  if (w.reason === 'closed_today') return 'The kitchen is closed today';
  if (w.reason === 'before_open' && w.opensAt) return `Kitchen opens at ${pretty(w.opensAt)}`;
  if (w.reason === 'after_close' && w.opensAt) return `Kitchen is closed for the night · opens at ${pretty(w.opensAt)}`;
  return 'The kitchen is closed right now';
}

export async function loadDiningWindow(db: any, businessId: string, now = new Date()): Promise<DiningWindow> {
  const { data, error } = await db.from('venue_operating_hours').select('weekday, open_time, close_time, is_closed').eq('business_id', businessId);
  if (error) {
    // The hours table is optional (reservations migration); without it the kitchen is treated as open.
    if (error.code === '42P01') return diningWindow([], now);
    throw error;
  }
  return diningWindow(data || [], now);
}
