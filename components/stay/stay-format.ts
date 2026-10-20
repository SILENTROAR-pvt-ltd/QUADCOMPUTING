// Small formatting helpers shared by the stay pages (showcase, self check-in, in-room).

export const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** Today's date in India time as YYYY-MM-DD. */
export const todayIst = (at = new Date()) => new Date(at.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.max(0, Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000));

/** "Sat, 25 Oct" */
export const shortDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "25 Oct, 2:30 pm" from an ISO instant, in India time. */
export const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface StayType {
  id: string;
  name: string;
  price: number;
  occupancy: number;
  photos: string[];
  amenities: string[];
  addons: Array<{ name: string; price: number }>;
  rooms_total: number;
  vacant_now: number;
  available_for_dates: number | null;
}

export interface StayVenue {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  address: string | null;
  phones: string[];
  categories: string[];
  checkin_time: string | null;
  checkout_time: string | null;
  self_checkin_enabled: boolean;
  in_room_dining_enabled: boolean;
}
