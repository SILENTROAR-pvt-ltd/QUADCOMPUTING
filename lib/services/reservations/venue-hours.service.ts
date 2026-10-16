export interface VenueStatus {
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  reservationsEnabled: boolean;
}

export interface WeekdayHours {
  weekday: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export async function getVenueStatus(db: any, businessId: string): Promise<VenueStatus> {
  const { data, error } = await db.rpc('venue_status_now', { p_business_id: businessId });
  if (error || !data?.[0]) {
    return { isOpen: false, opensAt: null, closesAt: null, reservationsEnabled: false };
  }
  const r = data[0];
  return {
    isOpen: Boolean(r.is_open),
    opensAt: r.opens_at ?? null,
    closesAt: r.closes_at ?? null,
    reservationsEnabled: Boolean(r.reservations_enabled),
  };
}

export async function getVenueHours(db: any, businessId: string): Promise<WeekdayHours[]> {
  const { data } = await db.from('venue_operating_hours').select('weekday,open_time,close_time,is_closed').eq('business_id', businessId).order('weekday');
  return (data ?? []).map((r: any) => ({
    weekday: r.weekday,
    openTime: r.open_time?.slice(0, 5) ?? '10:00',
    closeTime: r.close_time?.slice(0, 5) ?? '22:00',
    isClosed: Boolean(r.is_closed),
  }));
}

export async function upsertVenueHours(db: any, businessId: string, rows: WeekdayHours[]): Promise<void> {
  const payload = rows.map((r) => ({ business_id: businessId, weekday: r.weekday, open_time: r.openTime, close_time: r.closeTime, is_closed: r.isClosed }));
  await db.from('venue_operating_hours').upsert(payload, { onConflict: 'business_id,weekday' });
}

/** Returns "HH:MM" slots on a given ISO date, at 60-min intervals, excluding the last hour before close. */
export function generateSlots(openTime: string, closeTime: string): string[] {
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  const slots: string[] = [];
  for (let t = openMin; t <= closeMin - 60; t += 60) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

/** Weekday of a calendar date, independent of the server's timezone. */
export const weekdayOf = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

/** Today's date in India time (YYYY-MM-DD), whatever the server's timezone. */
export const todayIst = (at = new Date()) => new Date(at.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export async function getAvailableSlotsForDate(db: any, businessId: string, isoDate: string): Promise<string[]> {
  const { data } = await db.from('venue_operating_hours').select('open_time,close_time,is_closed').eq('business_id', businessId).eq('weekday', weekdayOf(isoDate)).maybeSingle();
  if (!data || data.is_closed) return [];
  return generateSlots(data.open_time?.slice(0, 5) ?? '10:00', data.close_time?.slice(0, 5) ?? '22:00');
}
